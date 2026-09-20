// ============================================================
// MÓDULO DE MÚSICA COM IA (GEMINI DJ + YT-DLP + DISCORD VOICE)
// Toca qualquer música na call com fila, comandos e IA DJ
// ============================================================

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus, 
  VoiceConnectionStatus,
  StreamType,
  entersState 
} = require('@discordjs/voice');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ytSearch = require('yt-search');
const YTDlpWrap = require('yt-dlp-wrap').default;

const BIN_DIR = path.join(__dirname, '..', 'bin');
const isWin = process.platform === 'win32';
const YTDLP_BINARY_NAME = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const YTDLP_PATH = path.join(BIN_DIR, YTDLP_BINARY_NAME);

class SistemaDeMusica {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    this.ytDlp = null;
    this.filas = new Map(); // guildId -> { connection, player, canalTexto, musicas: [], tocando: null, timeoutDesconexao }

    this.inicializarYtDlp();
  }

  async inicializarYtDlp() {
    try {
      if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });
      if (!fs.existsSync(YTDLP_PATH)) {
        console.log(`[Música] Baixando binário oficial do yt-dlp (${isWin ? 'Windows' : 'Linux'})...`);
        await YTDlpWrap.downloadFromGithub(YTDLP_PATH);
        if (!isWin) {
          try { fs.chmodSync(YTDLP_PATH, 0o755); } catch (e) {}
        }
        console.log('[Música] yt-dlp pronto para uso!');
      } else if (!isWin) {
        try { fs.chmodSync(YTDLP_PATH, 0o755); } catch (e) {}
      }
      this.ytDlp = new YTDlpWrap(YTDLP_PATH);
    } catch (err) {
      console.error('[Música] Falha ao inicializar yt-dlp:', err.message);
    }
  }

  // Gemini DJ: Resolve pedidos informais ou descrições em termos de busca precisos
  async consultarGeminiDJ(pedidoUsuario) {
    // Se for URL direta, não precisa da IA
    if (/^(https?:\/\/)/.test(pedidoUsuario.trim())) {
      return {
        termoBusca: pedidoUsuario.trim(),
        comentarioDJ: "Soltando a pedida direta do link!"
      };
    }

    const prompt = `
Você é o DJ Supremo do Discord, animado, estiloso e mestre em música de todos os gêneros.
O usuário pediu para tocar: "${pedidoUsuario}"

SUA TAREFA:
1. Identifique o título oficial mais provável da música e o artista (ex: se o usuário disser "aquela do eminem com rihanna", resolva para "Eminem ft. Rihanna - Love The Way You Lie").
2. Retorne o melhor termo de busca para o YouTube (título + artista + "official audio" ou "official video").
3. Escreva um comentário curto, empolgante de DJ de rádio (1 frase) sobre a música para mandar no chat.

Retorne em formato JSON:
{
  "termoBusca": "Nome Exato da Música e Artista",
  "nomeMusica": "Título",
  "artista": "Artista",
  "comentarioDJ": "Comentário no estilo DJ de rádio"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      let texto = result.response.text().trim();
      if (texto.startsWith('```')) {
        texto = texto.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(texto);
    } catch (e) {
      return {
        termoBusca: pedidoUsuario,
        comentarioDJ: "Mandando o som na caixa!"
      };
    }
  }

  // Busca no YouTube com yt-search
  async buscarMusica(termo) {
    try {
      const resultado = await ytSearch(termo);
      if (resultado && resultado.videos && resultado.videos.length > 0) {
        const video = resultado.videos[0];
        return {
          titulo: video.title,
          url: video.url,
          duracao: video.duration ? video.duration.timestamp : 'Ao Vivo',
          thumbnail: video.thumbnail || video.image,
          autor: video.author ? video.author.name : 'Desconhecido'
        };
      }
      return null;
    } catch (err) {
      console.error('[Música] Erro na busca do YouTube:', err.message);
      return null;
    }
  }

  // Obtém a URL direta e faz streaming contínuo em PCM via FFmpeg
  async obterRecursoAudio(url) {
    if (!this.ytDlp) {
      this.ytDlp = new YTDlpWrap(YTDLP_PATH);
    }

    let ffmpegExecutable = 'ffmpeg';
    try {
      ffmpegExecutable = require('ffmpeg-static') || 'ffmpeg';
    } catch (e) {}

    // Obter URL direta de streaming de áudio
    const args = [
      url,
      '-f', 'bestaudio/ba/b',
      '--no-playlist',
      '-g'
    ];

    const streamOutput = await this.ytDlp.execPromise(args);
    const audioUrl = streamOutput.trim().split('\n')[0].trim();

    const ffmpeg = spawn(ffmpegExecutable, [
      '-reconnect', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '5',
      '-i', audioUrl,
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true
    });

    if (resource.volume) {
      resource.volume.setVolume(1.0);
    }

    resource.ffmpegProcess = ffmpeg;
    return resource;
  }

  // Toca a próxima música da fila
  async tocarProxima(guildId) {
    const fila = this.filas.get(guildId);
    if (!fila) return;

    // Encerrar processo FFmpeg anterior se existir
    if (fila.recursoAtual && fila.recursoAtual.ffmpegProcess) {
      try { fila.recursoAtual.ffmpegProcess.kill(); } catch (e) {}
      fila.recursoAtual = null;
    }

    if (fila.musicas.length === 0) {
      fila.tocando = null;
      // Iniciar timer de 3 minutos para sair da call se ninguém colocar música
      fila.timeoutDesconexao = setTimeout(() => {
        if (fila.musicas.length === 0 && !fila.tocando) {
          if (fila.canalTexto) {
            fila.canalTexto.send('👋 *Fila vazia. A DJ Aimê saiu da call para poupar energia. Até a próxima!*').catch(() => {});
          }
          this.parar(guildId);
        }
      }, 180000);
      return;
    }

    // Limpar timer se havia
    if (fila.timeoutDesconexao) {
      clearTimeout(fila.timeoutDesconexao);
      fila.timeoutDesconexao = null;
    }

    const musica = fila.musicas.shift();
    fila.tocando = musica;

    try {
      const recurso = await this.obterRecursoAudio(musica.url);
      fila.recursoAtual = recurso;
      fila.player.play(recurso);

      if (fila.canalTexto) {
        const embedTocando = {
          title: `🎶 Tocando Agora: ${musica.titulo}`,
          url: musica.url,
          description: `🎙️ **DJ Aimê:** *${musica.comentarioDJ || 'Aumenta o volume que o som é brabo!'}*\n\n` +
                       `⏱️ **Duração:** \`${musica.duracao}\` | 👤 **Canal:** \`${musica.autor}\`\n` +
                       `🎧 **Pedido por:** <@${musica.pedidoPor.id}>\n\n` +
                       `💡 *Comandos: \`!pausar\`, \`!continuar\`, \`!pular\`, \`!fila\`, \`!parar\`*`,
          color: 0x1abc9c,
          thumbnail: { url: musica.thumbnail },
          footer: { text: `Aimê DJ • ${fila.musicas.length} música(s) restante(s) na fila` },
          timestamp: new Date().toISOString()
        };
        fila.canalTexto.send({ embeds: [embedTocando] }).catch(() => {});
      }
    } catch (err) {
      console.error('[Música] Falha ao tocar faixa:', err.message);
      if (fila.canalTexto) {
        fila.canalTexto.send(`❌ Não foi possível reproduzir **${musica.titulo}**: ${err.message}. Pulando para a próxima...`).catch(() => {});
      }
      this.tocarProxima(guildId);
    }
  }

  // Método Geral de Reprodução (usado por comandos e por ações autônomas da Aimê)
  async tocar(guild, canalVoz, canalTexto, argsTexto, solicitante) {
    if (!canalVoz) {
      if (canalTexto) canalTexto.send('🎧 *Aimê: "Entra numa call de voz aí antes pra eu poder colar e botar esse som pra você!"*').catch(() => {});
      return false;
    }
    if (!argsTexto || !argsTexto.trim()) {
      return false;
    }

    const guildId = guild.id;
    let fila = this.filas.get(guildId);

    if (canalTexto) {
      await canalTexto.sendTyping().catch(() => {});
    }

    // 1. Consultar a IA para interpretar o pedido
    const analiseIA = await this.consultarGeminiDJ(argsTexto);

    // 2. Buscar o vídeo no YouTube
    const video = await this.buscarMusica(analiseIA.termoBusca);
    if (!video) {
      if (canalTexto) canalTexto.send(`❌ *Aimê: "Não consegui encontrar nenhuma música para: '${argsTexto}'. Tenta mandar o título certinho ou o link!"*`).catch(() => {});
      return false;
    }

    video.comentarioDJ = analiseIA.comentarioDJ;
    video.pedidoPor = solicitante || { id: '1550999849602781224', username: 'Aimê' };

    // 3. Conectar na call de voz se ainda não estiver
    if (!fila) {
      try {
        const connection = joinVoiceChannel({
          channelId: canalVoz.id,
          guildId: guildId,
          adapterCreator: guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        connection.on('error', (err) => {
          console.error('[VoiceConnection Error]', err.message);
        });

        try {
          await entersState(connection, VoiceConnectionStatus.Ready, 15000);
        } catch (readyErr) {
          console.warn('[VoiceConnection] Alerta de estado Ready:', readyErr.message);
        }

        const player = createAudioPlayer();
        connection.subscribe(player);

        fila = {
          connection,
          player,
          canalTexto: canalTexto,
          musicas: [],
          tocando: null,
          timeoutDesconexao: null
        };

        this.filas.set(guildId, fila);

        player.on(AudioPlayerStatus.Idle, () => {
          this.tocarProxima(guildId);
        });

        player.on('error', (err) => {
          console.error('[Player Error]', err.message);
          this.tocarProxima(guildId);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5000),
            ]);
          } catch (e) {
            this.parar(guildId);
          }
        });

      } catch (err) {
        console.error('[Música] Erro ao conectar no canal de voz:', err);
        if (canalTexto) canalTexto.send('❌ Não consegui entrar no canal de voz. Verifique minhas permissões de voz!');
        return false;
      }
    }

    // 4. Adicionar à fila ou tocar imediatamente
    if (fila.tocando) {
      fila.musicas.push(video);
      const embedFila = {
        title: `🎵 Adicionada à Fila de Reprodução!`,
        url: video.url,
        description: `**[${video.titulo}](${video.url})**\n\n` +
                     `🎙️ *"${video.comentarioDJ}"*\n\n` +
                     `⏱️ **Duração:** \`${video.duracao}\`\n` +
                     `📍 **Posição na Fila:** #${fila.musicas.length}\n` +
                     `👤 **Pedido por:** <@${video.pedidoPor.id}>`,
        color: 0x3498db,
        thumbnail: { url: video.thumbnail },
        footer: { text: `Digite !fila para ver todas as músicas aguardando` }
      };
      if (canalTexto) canalTexto.send({ embeds: [embedFila] }).catch(() => {});
      return true;
    } else {
      fila.musicas.push(video);
      this.tocarProxima(guildId);
      return true;
    }
  }

  // Comando Principal: !music <nome ou link>
  async processarComandoMusic(message, argsTexto) {
    const canalVoz = message.member?.voice?.channel;
    if (!canalVoz) {
      return message.reply('🔊 **Você precisa estar em um canal de voz** para o bot tocar música!');
    }

    if (!argsTexto || !argsTexto.trim()) {
      return message.reply('⚠️ Diga o nome da música ou envie o link! Exemplo: `!music lofi hip hop` ou `!music Tim Maia`');
    }

    return await this.tocar(message.guild, canalVoz, message.channel, argsTexto, message.author);
  }

  // Pausar
  pausar(guildId) {
    const fila = this.filas.get(guildId);
    if (fila && fila.player) {
      return fila.player.pause();
    }
    return false;
  }

  // Continuar / Despausar
  continuar(guildId) {
    const fila = this.filas.get(guildId);
    if (fila && fila.player) {
      return fila.player.unpause();
    }
    return false;
  }

  // Pular
  pular(guildId) {
    const fila = this.filas.get(guildId);
    if (fila && fila.player) {
      fila.player.stop();
      return true;
    }
    return false;
  }

  // Parar e desconectar
  parar(guildId) {
    const fila = this.filas.get(guildId);
    if (fila) {
      if (fila.timeoutDesconexao) clearTimeout(fila.timeoutDesconexao);
      if (fila.recursoAtual && fila.recursoAtual.ffmpegProcess) {
        try { fila.recursoAtual.ffmpegProcess.kill(); } catch (e) {}
        fila.recursoAtual = null;
      }
      fila.musicas = [];
      fila.tocando = null;
      if (fila.player) fila.player.stop();
      if (fila.connection) {
        try { fila.connection.destroy(); } catch (e) {}
      }
      this.filas.delete(guildId);
      return true;
    }
    return false;
  }

  // Obter status da fila
  obterFila(guildId) {
    return this.filas.get(guildId) || null;
  }
}

module.exports = SistemaDeMusica;
