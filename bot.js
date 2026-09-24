// ============================================================
// BOT SUPREMO DO SERVIDOR — ADMIN + RPG MULTIPLAYER + IA AUTO-EVOLUTIVA
// ============================================================

require('dotenv').config();
const fs = require('fs');

process.on('unhandledRejection', (reason) => {
  console.error('[Sistema] Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Sistema] Uncaught Exception:', err && err.message ? err.message : err);
});

const { 
  Client, 
  GatewayIntentBits, 
  Partials,
  ActivityType,
  PermissionFlagsBits,
  EmbedBuilder 
} = require('discord.js');

const banco = require('./sistema/banco');
const MestreIA = require('./sistema/mestre_ia');
const SistemaDeAprendizado = require('./sistema/aprendizado');
const LoreEngine = require('./sistema/lore_engine');
const SistemaDeMusica = require('./sistema/musica');
const analytics = require('./sistema/analytics');
const SistemaDeOpinioes = require('./sistema/opinioes');
const SistemaSocial = require('./sistema/social');
const SistemaPotePlutao = require('./sistema/poteplutao');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CANAL_MELHORIAS = (process.env.CANAL_MELHORIAS || 'melhorias').toLowerCase();
const PREFIXO = process.env.PREFIXO || '!';

if (!TOKEN || TOKEN === 'COLOQUE_SEU_TOKEN_AQUI') {
  console.log('\n❌ [Aviso] DISCORD_BOT_TOKEN não preenchido no .env');
  console.log('👉 Pegue o token no Discord Developer Portal e cole no .env da pasta bot-discord-supremo\n');
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message]
});

const mestre = new MestreIA(GEMINI_KEY);
const aprendizado = new SistemaDeAprendizado(GEMINI_KEY);
const loreEngine = new LoreEngine(mestre);
const musica = new SistemaDeMusica(GEMINI_KEY);
const opinioes = new SistemaDeOpinioes(GEMINI_KEY);
const potePlutao = new SistemaPotePlutao(GEMINI_KEY);
const executoresAime = {
  tocarMusica: async (guild, member, canalTexto, busca) => {
    if (!guild) return;
    let voiceChannel = member?.voice?.channel;
    if (!voiceChannel && member?.id) {
      voiceChannel = guild.channels.cache.find(c => c.isVoiceBased() && c.members.has(member.id));
    }
    if (!voiceChannel) {
      voiceChannel = guild.channels.cache.find(c => c.isVoiceBased() && c.members.filter(m => !m.user.bot).size > 0);
    }
    if (!voiceChannel) {
      await canalTexto.send('🎧 *Aimê: "Entra numa call de voz aí antes pra eu poder entrar e botar essa pedrada pra gente curtir!"*').catch(() => {});
      return;
    }

    await canalTexto.send(`🎶 *Aimê: "Soltando o som agora na call **${voiceChannel.name}**! Cola lá!"*`).catch(() => {});
    await musica.tocar(guild, voiceChannel, canalTexto, busca, member ? member.user : client.user);
  },
  agirRpg: async (channel, autor, acao) => {
    const res = await mestre.processarAcao('1550999849602781224', 'Aimê', acao);
    if (res && res.narracao) {
      const embedAcaoAime = {
        title: `🔮 Aimê (Feiticeira Arcana) jogou uma ação!`,
        description: `> *"${acao}"*\n\n🎲 **Resultado:** ${res.narracao.narrativa}`,
        color: 0x9b59b6,
        footer: { text: `Aimê • Jogadora de Eldoria • Nível ${res.jogadorAtualizado?.nivel || 3}` }
      };
      await channel.send({ embeds: [embedAcaoAime] }).catch(() => {});
    }
  }
};

const social = new SistemaSocial(GEMINI_KEY, opinioes, executoresAime, client);

// Servidor HTTP leve para manter o bot ativo no Render e suportar UptimeRobot
const http = require('http');
const axios = require('axios');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  if (req.url === '/ping' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', bot: 'Aimê', uptime: Math.floor(process.uptime()) }));
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Aimê Bot está Online e Ativa no Discord!');
}).listen(PORT, () => {
  console.log(`🌐 Servidor Web ativo na porta ${PORT} (Render / UptimeRobot)`);
});

// Sistema Anti-Inatividade (Keep-Alive) para o plano Free do Render não entrar em suspensão
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  console.log(`📡 [Anti-Inatividade] Ativo com URL: ${RENDER_URL}`);
  setInterval(() => {
    axios.get(`${RENDER_URL}/ping`)
      .then(() => console.log('🔄 [Anti-Inatividade] Ping enviado com sucesso para manter o bot acordado!'))
      .catch(err => console.log('⚠️ [Anti-Inatividade] Aviso no ping:', err.message));
  }, 10 * 60 * 1000);
}

client.once('clientReady', async () => {
  social.setClient(client);

  // 1. Atualizar Bio / Sobre Mim do perfil da Aimê no Discord
  try {
    if (client.application) {
      await client.application.edit({
        description: 'Aimê • 20 anos • Carioca ☀️\n' +
                     'Marrenta, autêntica e sem paciência pra papo furado 💅\n' +
                     'Toco suas músicas favoritas, mestro o RPG do servidor e resenho no chat.\n' +
                     'Pode me chamar nos canais ou no privado (DM)!'
      });
      console.log('✅ Bio / Sobre Mim da Aimê configurado no Discord!');
    }
  } catch (err) {
    console.log('ℹ️ Bio da aplicação mantida:', err.message);
  }

  // 2. Sistema de Presença e Status Dinâmico Realista (Ouvindo, Jogando, Custom)
  const atualizarPresencaRealista = () => {
    try {
      const hora = new Date().getHours();
      let opcoes = [];

      if (hora >= 0 && hora < 6) {
        opcoes = [
          { name: 'Lofi hip hop pra dormir 💤', type: ActivityType.Listening },
          { name: 'Buscando o sono perdido', type: ActivityType.Playing },
          { name: 'Vídeos aleatórios às 3 da manhã', type: ActivityType.Watching },
          { name: 'Valorant na calada da noite', type: ActivityType.Playing },
          { name: 'com insônia e sem paciência 🥱', type: ActivityType.Custom }
        ];
      } else if (hora >= 6 && hora < 12) {
        opcoes = [
          { name: 'Playlist café & preguiça ☕', type: ActivityType.Listening },
          { name: 'Sobrevivendo à manhã', type: ActivityType.Playing },
          { name: 'nem acordei direito ainda 😴', type: ActivityType.Custom },
          { name: 'Vídeos no YouTube', type: ActivityType.Watching }
        ];
      } else if (hora >= 12 && hora < 18) {
        opcoes = [
          { name: 'Valorant (só passando raiva)', type: ActivityType.Playing },
          { name: 'Trap & Funk RJ no talo 🔥', type: ActivityType.Listening },
          { name: 'Fofocas no Twitter / X 👀', type: ActivityType.Watching },
          { name: 'Roblox com a galera', type: ActivityType.Playing },
          { name: 'Discord pelo celular 📱', type: ActivityType.Custom }
        ];
      } else {
        opcoes = [
          { name: 'Spotify com a galera 🎶', type: ActivityType.Listening },
          { name: 'Eldoria RPG 🎲', type: ActivityType.Playing },
          { name: 'paciência tá em falta hoje 💅', type: ActivityType.Custom },
          { name: 'Série na Netflix 🍿', type: ActivityType.Watching },
          { name: 'Resenhando no Discord', type: ActivityType.Playing }
        ];
      }

      const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];
      client.user.setPresence({
        activities: [escolha],
        status: 'online'
      });
    } catch (e) {}
  };

  atualizarPresencaRealista();
  setInterval(atualizarPresencaRealista, 15 * 60 * 1000);

  console.log('\n' + '═'.repeat(65));
  console.log(`👑 BOT SUPREMO ONLINE COMO: ${client.user.tag}`);
  console.log('═'.repeat(65));
  console.log(`🧠 Monitorando canal de aprendizado: #${CANAL_MELHORIAS}`);
  console.log(`🎶 Sistema de Música com IA (Gemini DJ) pronto para chamadas de voz!`);
  console.log(`📊 Motor de Data Analytics e Psicologia Social de Membros ativo!`);
  console.log(`⚔️  Sistema de RPG Multiplayer ativo com vinculação por ID de usuário!`);
  console.log(`🛡️  Administração e moderação prontas para uso.`);
  console.log('═'.repeat(65) + '\n');

  // Sistema de Espontaneidade Independente e Orgânica por Servidor
  // Intervalo longo e respeitoso: entre 4 a 8 horas (240 a 480 minutos), apenas se o chat estiver quieto há mais de 2 horas
  const agendarEspontaneidadeGuild = (guild) => {
    const minutosAleatorios = Math.floor(Math.random() * (480 - 240 + 1)) + 240;
    const ms = minutosAleatorios * 60 * 1000;

    setTimeout(async () => {
      try {
        const canalGeral = guild.channels.cache.find(c => 
          c.isTextBased() && (c.name.includes('geral') || c.name.includes('chat') || c.name.includes('resenha') || c.name.includes('general'))
        );
        if (canalGeral) {
          const agora = Date.now();
          const ultimaMsg = social.ultimaMensagemCanalTimestamp.get(canalGeral.id) || 0;
          const minutosSemFalar = (agora - ultimaMsg) / 60000;
          if (minutosSemFalar >= 120) {
            await social.puxarAssuntoOcioso(canalGeral);
          }
        }
      } catch (err) {
        console.log(`[Espontaneidade] Aviso no servidor "${guild.name}":`, err.message);
      } finally {
        agendarEspontaneidadeGuild(guild);
      }
    }, ms);
  };

  client.guilds.cache.forEach(guild => {
    agendarEspontaneidadeGuild(guild);
  });

  client.on('guildCreate', guild => {
    agendarEspontaneidadeGuild(guild);
  });

  // Enviar mensagem de apresentação apenas em servidores novos (uma única vez!)
  if (!banco.dados.servidoresAvisados) {
    banco.dados.servidoresAvisados = client.guilds.cache.map(g => g.id);
    banco.salvar();
  }

  client.guilds.cache.forEach(async (guild) => {
    try {
      // Se já mandou boas-vindas neste servidor antes, não manda de novo! Fica quieto.
      if (banco.dados.servidoresAvisados.includes(guild.id)) {
        return;
      }

      const canalGeral = guild.channels.cache.find(c => 
        c.isTextBased() && (c.name.includes('geral') || c.name.includes('chat') || c.name.includes('general'))
      ) || guild.channels.cache.find(c => c.isTextBased());

      if (canalGeral) {
        const embedChegada = {
          title: `👑 Aimê chegou ao ${guild.name}!`,
          description: `Salve, galera! Eu sou a **Aimê**, guardiã, administradora e mestre de RPG do servidor com Inteligência Artificial!\n\n` +
                       `🎲 **RPG Multiplayer (Cada um controla o seu herói):**\n` +
                       `• \`!criar <Classe> <Nome>\` → Crie seu aventureiro (ex: \`!criar Guerreiro Gustavo\` ou \`!criar Mago Lucas\`)\n` +
                       `• \`!agir <o que você quer fazer>\` → Faça qualquer ação na história (as possibilidades são infinitas!)\n` +
                       `• \`!craft\` → Combine itens do seu inventário para forjar novas relíquias\n` +
                       `• \`!party\` → Veja o grupo com as barras de vida de todo mundo\n` +
                       `• \`!ajuda\` → Ver todos os comandos\n\n` +
                       `🧠 **Canal de Aprendizado (#melhorias):**\n` +
                       `Mandem ideias de mecânicas, comandos e regras no canal de melhorias que eu aprendo na hora e crio os comandos sozinha!`,
          color: 0x9b59b6,
          footer: { text: `Aimê • Mestre de Jogo e Guardiã do Servidor` },
          timestamp: new Date().toISOString()
        };

        await canalGeral.send({ embeds: [embedChegada] });
        banco.dados.servidoresAvisados.push(guild.id);
        banco.salvar();
        console.log(`[Chegada] Mensagem inicial enviada no #${canalGeral.name} do servidor ${guild.name}!`);
      }
    } catch (e) {
      console.error('[Chegada] Não foi possível enviar no canal geral:', e.message);
    }
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const isDM = !message.guild;
  const canalLog = isDM ? '[DM Privada]' : `[#${message.channel.name || 'desconhecido'}]`;
  console.log(`[Chat] ${canalLog} ${message.author.username}: ${message.content}`);

  // 1. Data Analytics do Servidor (registra quem falou, contagem de caracteres, última atividade)
  analytics.registrarMensagem(message);

  // 2. Buffer de Conversa Social recente para contexto orgânico
  social.atualizarBuffer(message.channel.id, message.author.username, message.content);

  // 3. Sistema de Opiniões & Julgamentos sobre membros em background
  opinioes.avaliarAtitudeSocial(
    message.author.username,
    message.author.id,
    message.content,
    message.mentions && message.mentions.users ? message.mentions.users.first() : null
  ).catch(() => {});

  const canalNome = isDM ? 'dm-privada' : (message.channel.name ? message.channel.name.toLowerCase() : 'geral');
  const conteudo = message.content.trim();

  // Se o usuário mandou mensagem no privado (DM) ou está em conversa ativa no canal do servidor:
  if (isDM && !conteudo.startsWith(PREFIXO)) {
    await social.responderConversa(message, { ativa: true, tipo: 'dm_privada' });
    return;
  }

  const emConversa = await social.estaEmConversaAtiva(message, client.user);
  if (!conteudo.startsWith(PREFIXO) && emConversa && emConversa.ativa) {
    await social.responderConversa(message, emConversa);
    return;
  }

  // ==========================================================
  // 1. CANAL #MELHORIAS (O BOT APRENDE E CRIA COMANDOS EM TEMPO REAL)
  // Aceita #melhorias, #sugestoes, ou qualquer variação
  // ==========================================================
  const isCanalMelhorias = canalNome.includes('melhoria') || canalNome.includes('sugest');
  if (isCanalMelhorias) {
    try {
      await message.react('🧠').catch(() => {});
      const processamento = await aprendizado.processarSugestao(message.author.username, conteudo);

      if (processamento.sucesso) {
        let textoComando = '';
        if (processamento.comandoRegistrado) {
          textoComando = `\n\n🚀 **NOVO COMANDO CRIADO E ATIVADO:** \`${processamento.comandoRegistrado.sintaxe}\`\n` +
                         `📖 *${processamento.comandoRegistrado.descricao}*\n` +
                         `✨ Qualquer aventureiro já pode digitar este comando agora mesmo no chat!`;
        }

        const embedMelhoria = {
          title: processamento.comandoRegistrado ? `🚀 Novo Comando Criado Automaticamente!` : `🧠 Nova Habilidade/Regra Aprendida!`,
          description: `O cérebro da IA assimilou a sugestão de **${message.author.username}**:\n\n` +
                       `📌 **Regra Absorvida:** *${processamento.dados.regraResumida}*\n` +
                       `🏷️ **Categoria:** \`${processamento.dados.categoria.toUpperCase()}\`\n\n` +
                       `💬 *${processamento.dados.respostaParaCanal}*` +
                       textoComando,
          color: processamento.comandoRegistrado ? 0xe67e22 : 0x9b59b6,
          footer: { text: `Total de conhecimentos: ${banco.dados.aprendizados.length} • Comandos dinâmicos: ${banco.listarComandosDinamicos().length}` },
          timestamp: new Date().toISOString()
        };
        await message.reply({ embeds: [embedMelhoria] });
      } else {
        await message.reply(processamento.respostaParaCanal);
      }
    } catch (err) {
      console.error('[Melhorias] Erro ao processar mensagem:', err);
    }
    return;
  }

  // Se não começar com o prefixo, avalia interação espontânea de membro humano (reação emoji ou intromissão)
  if (!conteudo.startsWith(PREFIXO)) {
    await social.avaliarMensagemComum(message);
    return;
  }

  const args = conteudo.slice(PREFIXO.length).trim().split(/ +/);
  const comando = args.shift().toLowerCase();

  // ==========================================================
  // 2. COMANDOS DO RPG MULTIPLAYER
  // ==========================================================

  // CRIAR AVENTUREIRO (Vinculado ao ID do Discord)
  if (comando === 'criar') {
    const userId = message.author.id;
    const jaExiste = banco.obterJogador(userId);

    if (jaExiste) {
      return message.reply(`❌ Você já possui o aventureiro **${jaExiste.nome}** (${jaExiste.classe})! Para ver sua ficha, digite \`!status\`.`);
    }

    const classe = args[0];
    const nome = args.slice(1).join(' ');

    if (!classe || !nome) {
      return message.reply(`⚠️ Formato incorreto! Use: \`!criar <Classe> <Nome>\`\nExemplo: \`!criar Guerreiro Gustavo\` ou \`!criar Mago Arcano Eldor\``);
    }

    const novo = banco.criarJogador(userId, nome, classe);

    const embedCriacao = {
      title: `⚔️ Aventureiro Criado com Sucesso!`,
      description: `Bem-vindo ao reino, **${novo.nome}**!\nSua ficha foi vinculada permanentemente à sua conta do Discord.\n\n` +
                   `💖 **HP:** ${mestre.gerarBarra(novo.hp, novo.hpMax, 'vida')}\n` +
                   `⚡ **Mana:** ${mestre.gerarBarra(novo.mana, novo.manaMax, 'mana')}\n` +
                   `🪙 **Ouro Inicial:** ${novo.ouro} moedas\n` +
                   `🎒 **Inventário:** ${novo.inventario.join(', ')}\n\n` +
                   `👉 Digite \`!agir <o que você quer fazer>\` para participar da aventura!`,
      color: 0x2ecc71,
      footer: { text: `ID do Jogador: ${userId} • Apenas você pode agir por este herói.` }
    };

    return message.reply({ embeds: [embedCriacao] });
  }

  // AGIR NO RPG (Suporta: !agir <texto>, !agir 1/2/3, ou atalhos diretos como !1, !2, !3)
  const isComandoNumero = /^[1-9]$/.test(comando);
  if (comando === 'agir' || isComandoNumero) {
    const userId = message.author.id;
    const jogador = banco.obterJogador(userId);

    if (!jogador) {
      return message.reply(`❌ Você ainda não tem um aventureiro! Crie o seu com: \`!criar <Classe> <Nome>\``);
    }

    if (jogador.hp <= 0) {
      return message.reply(`💀 **${jogador.nome}** está desmaiado sem pontos de vida! Digite \`!descansar\` para se recuperar ou peça para um aliado usar uma poção de cura.`);
    }

    let acaoTexto = isComandoNumero ? comando : args.join(' ');
    
    // Se o jogador digitou um número (ex: !agir 1, !agir 2 ou !1, !2)
    const numero = parseInt(acaoTexto.trim());
    const opcoesDisponiveis = banco.dados.ultimasOpcoes || [];
    if (!isNaN(numero) && numero >= 1 && numero <= opcoesDisponiveis.length) {
      acaoTexto = opcoesDisponiveis[numero - 1];
    }

    if (!acaoTexto) {
      return message.reply(`⚠️ Diga o que seu herói vai fazer ou escolha um número! Exemplo: \`!agir 1\` ou \`!agir ataco com minha espada\``);
    }

    await message.channel.sendTyping();

    try {
      const resultado = await mestre.processarTurno(jogador, acaoTexto);
      await message.reply({ embeds: [resultado.embed] });

      // Se houve revelação histórica de lore, publica automaticamente no canal #lore!
      if (resultado.dados && resultado.dados.revelacaoHistorica) {
        await loreEngine.publicarRevelacao(
          message.guild, 
          resultado.dados.revelacaoHistorica.titulo, 
          resultado.dados.revelacaoHistorica.texto, 
          jogador.nome
        );
      }

      // Se surgiu novo alvo com recompensa
      if (resultado.dados && resultado.dados.novoAlvoRecompensa) {
        banco.adicionarRecompensa(
          resultado.dados.novoAlvoRecompensa.alvo,
          resultado.dados.novoAlvoRecompensa.recompensaOuro,
          resultado.dados.novoAlvoRecompensa.perigo,
          resultado.dados.novoAlvoRecompensa.local
        );
        await loreEngine.publicarMuralRecompensas(message.guild);
      }

      // Se subiu de nível ou matou chefe, atualiza o ranking oficial
      if (resultado.dados && (resultado.dados.xpGanho >= 30 || (banco.dados.monstroAtual && banco.dados.monstroAtual.hp === 0))) {
        await loreEngine.publicarRanking(message.guild);
      }

    } catch (err) {
      console.error('[RPG] Erro no turno:', err);
      message.reply('❌ O Mestre se atrapalhou com os pergaminhos antigos. Tente novamente!');
    }
    return;
  }

  // STATUS INDIVIDUAL (COM HABILIDADES, MAGIAS E ATRIBUTOS EXPANSÍVEIS)
  if (comando === 'status') {
    const userId = message.author.id;
    const jogador = banco.obterJogador(userId);

    if (!jogador) {
      return message.reply(`❌ Você não tem personagem criado. Use \`!criar <Classe> <Nome>\``);
    }

    const listaHabs = (jogador.habilidades && jogador.habilidades.length > 0)
      ? jogador.habilidades.map(h => `• 🔮 \`${h}\``).join('\n')
      : '*Nenhuma habilidade despertada ainda.*';

    let atributosExtrasTexto = '';
    if (jogador.atributosExtras && Object.keys(jogador.atributosExtras).length > 0) {
      atributosExtrasTexto = '\n\n🏷️ **Atributos & Títulos Adicionais:**\n' +
        Object.entries(jogador.atributosExtras).map(([k, v]) => `• **${k}:** ${v}`).join('\n');
    }

    const embedStatus = {
      title: `📜 Ficha de ${jogador.nome}`,
      description: `👤 **Classe:** ${jogador.classe} (Nível ${jogador.nivel})\n` +
                   `📍 **Localização:** **${jogador.localizacao || 'Aethelgard (Capital)'}**\n` +
                   `💖 **HP:** ${mestre.gerarBarra(jogador.hp, jogador.hpMax, 'vida')}\n` +
                   `⚡ **Mana:** ${mestre.gerarBarra(jogador.mana, jogador.manaMax, 'mana')}\n` +
                   `⚔️ **Experiência:** ${jogador.xp}/${jogador.xpProximoNivel} XP\n` +
                   `🪙 **Ouro:** ${jogador.ouro} moedas\n\n` +
                   `✨ **Habilidades & Magias:**\n${listaHabs}\n\n` +
                   `🎒 **Inventário:**\n${jogador.inventario.length > 0 ? jogador.inventario.map(i => `• ${i}`).join('\n') : '*Mochila vazia*'}` +
                   atributosExtrasTexto,
      color: 0x3498db,
      footer: { text: `Aventureiro vinculado a @${message.author.username} • Use !craft para forjar novos itens` }
    };

    return message.reply({ embeds: [embedStatus] });
  }

  // PARTY (Mostra todo o grupo de amigos no servidor agrupados por região)
  if (comando === 'party' || comando === 'grupo') {
    const jogadores = banco.listarTodosJogadores();

    if (jogadores.length === 0) {
      return message.reply('❌ Nenhum jogador na party ainda! Usem `!criar <Classe> <Nome>` para ingressar no grupo.');
    }

    let lista = '';
    jogadores.forEach(j => {
      lista += `🛡️ **${j.nome}** (${j.classe} Nív. ${j.nivel}) - <@${j.id}>\n`;
      lista += `  📍 Local: **${j.localizacao || 'Aethelgard (Capital)'}**\n`;
      lista += `  💖 HP: ${mestre.gerarBarra(j.hp, j.hpMax, 'vida')} | ⚡ Mana: ${mestre.gerarBarra(j.mana, j.manaMax, 'mana')}\n\n`;
    });

    const embedParty = {
      title: `👥 Grupo de Aventureiros (${jogadores.length} Heróis Espalhados pelo Mundo)`,
      description: lista + `🏰 **Cenário Global:** ${banco.dados.cenarioAtual.nome}\n` +
                   (banco.dados.monstroAtual ? `👾 **Monstro no Horizonte:** ${banco.dados.monstroAtual.nome}` : '🌿 **Área calma no momento**'),
      color: 0xe67e22,
      footer: { text: `Heróis na mesma região podem duelar ou lutar juntos! Use !ondeestou ou !viajar` }
    };

    return message.reply({ embeds: [embedParty] });
  }

  // DESCANSAR NA FOGUEIRA
  if (comando === 'descansar') {
    const userId = message.author.id;
    const jogador = banco.obterJogador(userId);

    if (!jogador) return message.reply('❌ Crie um herói primeiro com `!criar <Classe> <Nome>`.');

    jogador.hp = jogador.hpMax;
    jogador.mana = jogador.manaMax;
    banco.salvar();

    return message.reply(`🔥 **${jogador.nome}** descansou junto à fogueira. Pontos de Vida (HP) e Mana 100% restaurados!`);
  }

  // ==========================================================
  // 3. COMANDOS DE ADMINISTRAÇÃO E CONHECIMENTO
  // ==========================================================

  // VER CÉREBRO DA IA (Tudo o que aprendeu no canal #melhorias)
  if (comando === 'cerebro' || comando === 'memoria') {
    const aprendizados = banco.dados.aprendizados;

    if (aprendizados.length === 0) {
      return message.reply(`🧠 Meu cérebro ainda está limpo! Mande ideias no canal <#${CANAL_MELHORIAS}> para eu começar a aprender.`);
    }

    let texto = aprendizados.map(a => `• **[${a.categoria.toUpperCase()}]** Sugerido por **${a.autor}**:\n  *"${a.regraIA}"*`).join('\n\n');

    const embedCerebro = {
      title: `🧠 Conhecimentos Aprendidos pela IA (${aprendizados.length} Regras)`,
      description: `Estas são as regras e ideias que os players ensinaram e que eu sigo nas campanhas:\n\n${texto}`,
      color: 0x9b59b6,
      footer: { text: `Envie novas ideias no canal #${CANAL_MELHORIAS} para expandir meu cérebro!` }
    };

    return message.reply({ embeds: [embedCerebro] });
  }

  // LIMPAR CHAT (Moderação)
  if (comando === 'limpar') {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.reply('❌ Você não tem permissão para gerenciar mensagens!');
    }

    const quantidade = parseInt(args[0]);
    if (isNaN(quantidade) || quantidade < 1 || quantidade > 99) {
      return message.reply('⚠️ Informe a quantidade de mensagens para apagar (entre 1 e 99). Ex: `!limpar 10`');
    }

    await message.channel.bulkDelete(quantidade + 1, true).catch(err => {
      message.reply('❌ Não foi possível apagar mensagens com mais de 14 dias.');
    });

    const aviso = await message.channel.send(`🧹 Limpei **${quantidade}** mensagens com sucesso!`);
    setTimeout(() => aviso.delete().catch(() => {}), 4000);
    return;
  }

  // RANKING OFICIAL
  if (comando === 'ranking' || comando === 'top') {
    const postou = await loreEngine.publicarRanking(message.guild);
    if (!postou) {
      const ranking = banco.obterRanking();
      let desc = '';
      ranking.forEach((j, i) => {
        desc += `**${i+1}º Lugar:** ${j.nome} (${j.classe} Nív. ${j.nivel}) - 🪙 ${j.ouro} Ouro | XP: ${j.xp}\n`;
      });
      return message.reply({
        embeds: [{
          title: `🏆 Ranking de Aventureiros`,
          description: desc || 'Nenhum aventureiro ativo ainda.',
          color: 0xf1c40f
        }]
      });
    } else {
      return message.reply('🏆 **Ranking Oficial atualizado com sucesso no canal de Lore!**');
    }
  }

  // MURAL DE RECOMPENSAS (BOUNTIES)
  if (comando === 'recompensas' || comando === 'bounties' || comando === 'procurados') {
    const postou = await loreEngine.publicarMuralRecompensas(message.guild);
    if (postou) {
      return message.reply('⚔️ **Mural de Recompensas e Caçadas postado no canal de Lore!**');
    } else {
      return message.reply('⚠️ Crie um canal chamado `#lore` para fixar o mural de caçadas oficiais!');
    }
  }

  // MAPA DO MUNDO
  if (comando === 'mapa' || comando === 'map') {
    const postou = await loreEngine.publicarMapa(
      message.guild, 
      'Reino Central de Eldoria & Torre Alta de Aethelgard',
      'Cartografia ancestral mostrando as rotas de exploração, ruínas esquecidas e abismos vulcânicos.'
    );
    if (postou) {
      return message.reply('🗺️ **Mapa do mundo revelado com sucesso no canal de Lore!**');
    } else {
      return message.reply('⚠️ Crie um canal chamado `#lore` para que o mapa seja traçado!');
    }
  }

  // COLOCAR RECOMPENSA NA CABEÇA DE UM JOGADOR (PVP BOUNTY)
  if (comando === 'procurar' || comando === 'bounty') {
    const contratante = banco.obterJogador(message.author.id);
    const mencao = message.mentions.users.first();

    if (!mencao) {
      return message.reply(`⚠️ Marque o jogador que você quer colocar a prêmio! Exemplo: \`!procurar @Amigo 50 Traiu o grupo na caverna\``);
    }

    if (mencao.id === message.author.id) {
      return message.reply(`❌ Você não pode colocar uma recompensa pela sua própria cabeça!`);
    }

    const alvoJogador = banco.obterJogador(mencao.id);
    if (!alvoJogador) {
      return message.reply(`❌ Este usuário ainda não possui um herói criado no RPG!`);
    }

    const valorOuro = parseInt(args[1]);
    if (isNaN(valorOuro) || valorOuro < 10) {
      return message.reply(`⚠️ Informe um valor válido de recompensa em ouro (mínimo de 10 moedas). Ex: \`!procurar @${mencao.username} 50 Motivo da caçada\``);
    }

    if (contratante && contratante.ouro < valorOuro) {
      return message.reply(`❌ Você não tem moedas suficientes! Você tem 🪙 **${contratante.ouro}** ouro e precisa de **${valorOuro}**.`);
    }

    const motivo = args.slice(2).join(' ') || 'Considerado perigoso e procurado por crimes contra a Party';

    if (contratante) {
      contratante.ouro -= valorOuro;
      banco.salvar();
    }

    const novaBounty = banco.adicionarBountyJogador(
      mencao.id,
      alvoJogador.nome,
      valorOuro,
      message.author.username,
      motivo
    );

    await loreEngine.publicarCartazProcurado(message.guild, novaBounty);
    await loreEngine.publicarMuralRecompensas(message.guild);

    return message.reply(`🚨 **MANDADO DE CAÇADA EMITIDO!** O cartaz oficial de procurado contra **${alvoJogador.nome}** por **${valorOuro} moedas** foi fixado no canal de Lore!`);
  }

  // DUELO PVP ENTRE JOGADORES (Lutar contra um amigo ou caçar jogador procurado)
  if (comando === 'duelo' || comando === 'pvp') {
    const atacante = banco.obterJogador(message.author.id);
    if (!atacante) return message.reply('❌ Você precisa criar seu herói primeiro com `!criar <Classe> <Nome>`!');

    const mencao = message.mentions.users.first();
    if (!mencao) return message.reply('⚠️ Marque o adversário que você deseja duelar! Exemplo: `!duelo @Amigo`');
    if (mencao.id === message.author.id) return message.reply('❌ Você não pode duelar contra você mesmo!');

    const defensor = banco.obterJogador(mencao.id);
    if (!defensor) return message.reply('❌ O adversário marcado não tem herói criado no RPG!');

    if (atacante.hp <= 0) return message.reply('💀 Você está ferido e sem HP! Descanse na fogueira com `!descansar` antes de duelar.');
    if (defensor.hp <= 0) return message.reply(`💀 **${defensor.nome}** já está desmaiado e sem HP!`);

    // VALIDAÇÃO DE DISTÂNCIA E LOCALIZAÇÃO: Só pode duelar se estiverem na mesma região!
    const locAtacante = atacante.localizacao || 'Aethelgard (Capital)';
    const locDefensor = defensor.localizacao || 'Aethelgard (Capital)';

    if (locAtacante !== locDefensor) {
      return message.reply(`🧭 **DISTÂNCIA MUITO GRANDE!** Você não pode atacar **${defensor.nome}** agora!\n\n` +
        `• 📍 Você está em: **${locAtacante}**\n` +
        `• 📍 ${defensor.nome} está em: **${locDefensor}**\n\n` +
        `👉 O mundo é vasto! Para caçá-lo ou enfrentá-lo, você precisa viajar até a região dele usando: \`!viajar ${locDefensor.split(' ')[0]}\`!`);
    }

    await message.channel.sendTyping();

    // Rolar d20 para os dois jogadores
    const dadoAtacante = mestre.rolarD20(atacante.nivel);
    const dadoDefensor = mestre.rolarD20(defensor.nivel);

    let vencedor = null;
    let perdedor = null;
    let empate = false;

    if (dadoAtacante.total > dadoDefensor.total) {
      vencedor = atacante;
      perdedor = defensor;
    } else if (dadoDefensor.total > dadoAtacante.total) {
      vencedor = defensor;
      perdedor = atacante;
    } else {
      empate = true;
    }

    if (empate) {
      return message.reply(`⚔️ **EMPATE ÉPICO NO DUELO!** Os dois heróis colidiram suas armas com o mesmo resultado de dados (${dadoAtacante.total} x ${dadoDefensor.total}) e recuaram ofegantes!`);
    }

    // Aplicar consequências
    perdedor.hp = 0;
    const saqueOuro = Math.min(perdedor.ouro, 15);
    perdedor.ouro -= saqueOuro;
    vencedor.ouro += saqueOuro;
    vencedor.xp += 35;

    let textoBounty = '';
    // Verificar se o perdedor tinha a cabeça a prêmio!
    const bountyPaga = banco.reivindicarBountyJogador(perdedor.id, vencedor.nome);
    if (bountyPaga) {
      vencedor.ouro += bountyPaga.recompensaOuro;
      textoBounty = `\n\n🎯 **RECOMPENSA COBRADA!** **${perdedor.nome}** estava na lista de PROCURADOS! **${vencedor.nome}** recebeu as **${bountyPaga.recompensaOuro} moedas de ouro** da caçada!`;
      await loreEngine.publicarMuralRecompensas(message.guild);
      await loreEngine.publicarRevelacao(
        message.guild,
        `A Queda do Renegado: ${perdedor.nome}`,
        `Em um duelo sangrento diante de todos, o temido ${perdedor.nome} foi abatido pelas mãos de ${vencedor.nome}, reivindicando a recompensa oficial.`,
        vencedor.nome
      );
    }

    banco.salvar();
    await loreEngine.publicarRanking(message.guild);

    const imagemDuelo = loreEngine.gerarUrlImagem(`epic fantasy pvp duel two warriors clashing blades sparks flying cinematic arena lighting dramatic angle 8k`);

    const embedDuelo = {
      title: `⚔️ RESULTADO DO DUELO: ${vencedor.nome.toUpperCase()} VENCEU!`,
      description: `💥 **Confronto Mortal entre Jogadores:**\n\n` +
                   `🎲 **${atacante.nome}:** Rolou d20 (**${dadoAtacante.d20}** + ${dadoAtacante.mod}) = **${dadoAtacante.total}**\n` +
                   `🎲 **${defensor.nome}:** Rolou d20 (**${dadoDefensor.d20}** + ${dadoDefensor.mod}) = **${dadoDefensor.total}**\n\n` +
                   `🏆 **VENCEDOR:** **${vencedor.nome}** (+35 XP | +${saqueOuro} Ouro saqueado)\n` +
                   `💀 **DERROTADO:** **${perdedor.nome}** (Desmaiado - 0 HP)` +
                   textoBounty,
      color: 0xe74c3c,
      image: { url: imagemDuelo },
      footer: { text: `Duelo de Honra • Use !descansar para reviver o herói caído` },
      timestamp: new Date().toISOString()
    };

    return message.reply({ embeds: [embedDuelo] });
  }

  // ONDE ESTOU (Ver localização e quem está por perto)
  if (comando === 'ondeestou' || comando === 'local' || comando === 'regiao') {
    const jogador = banco.obterJogador(message.author.id);
    if (!jogador) return message.reply('❌ Crie seu herói primeiro com `!criar <Classe> <Nome>`.');

    const locNome = jogador.localizacao || 'Aethelgard (Capital)';
    const regiao = banco.obterRegiao(locNome) || {
      nome: locNome,
      descricao: 'Território sob a luz de Eldoria.',
      perigo: 'Desconhecido',
      promptImagem: 'fantasy medieval territory landmark landscape 8k'
    };

    const companheiros = banco.obterJogadoresNaRegiao(locNome)
      .filter(j => j.id !== message.author.id);

    let textoCompanheiros = companheiros.length > 0
      ? companheiros.map(j => `• 👤 **${j.nome}** (${j.classe} Nív. ${j.nivel})`).join('\n')
      : '*Você está sozinho nesta área no momento.*';

    const regioesMundo = Object.values(banco.dados.regioes || {}).map(r => `• \`!viajar ${r.id}\` → **${r.nome}** (${r.perigo})`).join('\n');

    const imgUrl = loreEngine.gerarUrlImagem(regiao.promptImagem || 'medieval fantasy territory landscape 8k');

    const embedLocal = {
      title: `📍 SUA LOCALIZAÇÃO: ${regiao.nome.toUpperCase()}`,
      description: `*${regiao.descricao}*\n\n` +
                   `⚠️ **Nível de Perigo:** \`${regiao.perigo}\`\n\n` +
                   `👥 **HERÓIS PRESENTES NESTA MESMA ÁREA:**\n${textoCompanheiros}\n\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `🧭 **ROTAS DE VIAGEM DISPONÍVEIS:**\n${regioesMundo}\n\n` +
                   `💡 *Jogadores na mesma área podem lutar juntos ou duelar!*`,
      color: 0x1abc9c,
      image: { url: imgUrl },
      footer: { text: `Sistema de Localização de Eldoria • Use !viajar <destino>` }
    };

    return message.reply({ embeds: [embedLocal] });
  }

  // VIAJAR PELO MUNDO
  if (comando === 'viajar' || comando === 'ir') {
    const jogador = banco.obterJogador(message.author.id);
    if (!jogador) return message.reply('❌ Crie seu herói primeiro com `!criar <Classe> <Nome>`.');

    const destino = args.join(' ').trim();
    if (!destino) {
      const regioesDisponiveis = Object.values(banco.dados.regioes || {}).map(r => `• \`!viajar ${r.id}\` → **${r.nome}**`).join('\n');
      return message.reply(`⚠️ Para onde você deseja viajar? Escolha um destino:\n${regioesDisponiveis}`);
    }

    const regiaoDestino = banco.obterRegiao(destino);
    if (!regiaoDestino) {
      return message.reply(`❌ Região desconhecida! Destinos válidos: \`aethelgard\`, \`catacumbas\`, \`floresta\`, \`pantano\`, \`vulcao\`.`);
    }

    if ((jogador.localizacao || 'Aethelgard (Capital)').toLowerCase().includes(regiaoDestino.nome.toLowerCase())) {
      return message.reply(`⚠️ Você já está em **${regiaoDestino.nome}**!`);
    }

    await message.channel.sendTyping();

    // Rolar dado de viagem d20
    const dadoViagem = mestre.rolarD20(jogador.nivel);
    let danoEstrada = 0;
    let relatoViagem = '';

    if (dadoViagem.d20 <= 4) {
      danoEstrada = 15;
      jogador.hp = Math.max(1, jogador.hp - danoEstrada);
      relatoViagem = `💥 **EMBOSCADA NA ESTRADA!** Bandidos e feras atacaram a caravana durante a travessia. Você lutou bravamente mas perdeu **15 de HP** antes de alcançar o destino!`;
    } else if (dadoViagem.d20 === 20) {
      jogador.ouro += 20;
      relatoViagem = `🌟 **VIAGEM GLORIOSA!** Você encontrou uma trilha secreta esquecida e desenterrou um pequeno baú com **20 moedas de ouro**!`;
    } else {
      relatoViagem = `🐎 A jornada pelas estradas de Eldoria foi calma. Após horas de marcha, você avistou os limites da nova região.`;
    }

    banco.moverJogador(message.author.id, regiaoDestino.nome);

    const companheiros = banco.obterJogadoresNaRegiao(regiaoDestino.nome)
      .filter(j => j.id !== message.author.id);

    let textoComp = companheiros.length > 0 
      ? `\n\n👥 **Heróis avistados nesta região:** ${companheiros.map(j => `**${j.nome}**`).join(', ')}` 
      : `\n\n🌿 *Nenhum outro jogador avistado por aqui ainda.*`;

    const imgUrl = loreEngine.gerarUrlImagem(regiaoDestino.promptImagem);

    const embedViagem = {
      title: `🧭 CHEGADA EM: ${regiaoDestino.nome.toUpperCase()}`,
      description: `🎲 **Rolagem de Viagem (d20):** **${dadoViagem.d20}**\n\n` +
                   `${relatoViagem}\n\n` +
                   `📍 **Novo Local:** **${regiaoDestino.nome}**\n` +
                   `📖 *${regiaoDestino.descricao}*\n` +
                   `💖 **Seu HP Atual:** ${mestre.gerarBarra(jogador.hp, jogador.hpMax, 'vida')}` +
                   textoComp,
      color: 0x2980b9,
      image: { url: imgUrl },
      footer: { text: `Viagem concluída • Digite !agir para explorar a nova região` }
    };

    return message.reply({ embeds: [embedViagem] });
  }

  // RASTREAR JOGADOR OU ALVO PROCURADO
  if (comando === 'rastrear' || comando === 'buscar') {
    const jogador = banco.obterJogador(message.author.id);
    if (!jogador) return message.reply('❌ Crie seu herói primeiro com `!criar <Classe> <Nome>`.');

    const mencao = message.mentions.users.first();
    if (!mencao) return message.reply('⚠️ Marque quem você deseja rastrear! Ex: `!rastrear @Jogador`');

    const alvo = banco.obterJogador(mencao.id);
    if (!alvo) return message.reply('❌ O jogador marcado não possui herói no mundo de Eldoria.');

    await message.channel.sendTyping();
    const dadoRastreio = mestre.rolarD20(jogador.nivel);

    const locAlvo = alvo.localizacao || 'Aethelgard (Capital)';
    const bountyAlvo = banco.obterBountyDeJogador(mencao.id);

    let avisoBounty = bountyAlvo ? `\n🚨 **ATENÇÃO:** Este alvo possui uma **RECOMPENSA DE ${bountyAlvo.recompensaOuro} OURO** pela cabeça!` : '';

    const embedRastreio = {
      title: `🔍 RASTREAMENTO DE ALVO: ${alvo.nome.toUpperCase()}`,
      description: `🎲 **Teste de Percepção (d20):** **${dadoRastreio.d20}**\n\n` +
                   `Os rastros e pistas no chão indicam que **${alvo.nome}** (<@${mencao.id}>) está em:\n` +
                   `📍 **${locAlvo}**\n\n` +
                   `• **Classe do Alvo:** ${alvo.classe} (Nível ${alvo.nivel})\n` +
                   `• **Condição de Vida:** ${mestre.gerarBarra(alvo.hp, alvo.hpMax, 'vida')}` +
                   avisoBounty +
                   `\n\n👉 *Use \`!viajar ${locAlvo.split(' ')[0]}\` para ir até a região dele e confrontá-lo!*`,
      color: 0xe67e22,
      footer: { text: `Habilidade de Investigação • Rastreador: ${jogador.nome}` }
    };

    return message.reply({ embeds: [embedRastreio] });
  }

  // SINCRONIZAR MURAL COMPLETO NO CANAL DE LORE
  if (comando === 'atualizarlore' || comando === 'mural') {
    await loreEngine.publicarMapa(message.guild, 'Reino Central de Eldoria', 'Mapa das terras conhecidas e rotas de caçada.');
    await loreEngine.publicarMuralRecompensas(message.guild);
    await loreEngine.publicarRanking(message.guild);
    return message.reply('📜 **Canal de Lore atualizado com: Mapa Oficial + Mural de Recompensas + Ranking!**');
  }

  // MENU DE AJUDA
  if (comando === 'ajuda' || comando === 'help') {
    const embedAjuda = {
      title: `👑 Comandos do Bot Supremo (RPG + Música + Viagem + PvP + Lore + Auto-Evolução)`,
      description: `**🎶 SISTEMA DE MÚSICA & DJ IA (NA CALL DE VOZ):**\n` +
                   `• \`!music <nome ou link>\` (ou \`!play\`) → O Gemini DJ busca a música e toca na sua call!\n` +
                   `• \`!pausar\` / \`!continuar\` → Pausa e retoma a reprodução\n` +
                   `• \`!pular\` → Pula para a próxima música da fila\n` +
                   `• \`!fila\` → Exibe a lista de músicas aguardando\n` +
                   `• \`!tocando\` → Mostra detalhes da faixa atual\n` +
                   `• \`!parar\` (ou \`!sair\`) → Encerra a música e desconecta da call\n\n` +
                   `**🗡️ COMANDOS DE RPG (Anti-Trapaça por ID):**\n` +
                   `• \`!criar <Classe> <Nome>\` → Cria seu aventureiro vinculado à sua conta\n` +
                   `• \`!agir <sua ação>\` ou \`!1\`, \`!2\`, \`!3\` → Realiza sua ação no RPG\n` +
                   `• \`!craft <item 1> + <item 2>\` → Forja e combina itens da sua mochila\n` +
                   `• \`!habilidades\` → Consulta seu grimório de magias e técnicas\n` +
                   `• \`!party\` → Mostra todos os amigos espalhados pelo mundo\n` +
                   `• \`!status\` → Mostra sua ficha, localização, ouro, magias e itens\n` +
                   `• \`!descansar\` → Recupera HP e Mana na fogueira\n\n` +
                   `**🧭 LOCALIZAÇÃO & VIAGEM:**\n` +
                   `• \`!ondeestou\` → Mostra sua região e quem está por perto\n` +
                   `• \`!viajar <destino>\` → Viaja pelo mapa (ex: \`!viajar catacumbas\`, \`!viajar vulcao\`)\n` +
                   `• \`!rastrear @Jogador\` → Procura rastros de onde um jogador está\n\n` +
                   `**⚔️ CAÇADA & PVP ENTRE JOGADORES:**\n` +
                   `• \`!procurar @Jogador <ouro> <motivo>\` → Coloca a cabeça de um amigo a prêmio no canal #lore!\n` +
                   `• \`!duelo @Jogador\` → Duela contra alguém na mesma região e saqueia o ouro!\n\n` +
                   `**📜 LORE, MAPAS & RANKING (Canal #lore):**\n` +
                   `• \`!ranking\` → Placar com os heróis mais fortes do servidor\n` +
                   `• \`!recompensas\` → Cartazes de procurados e monstros ativos\n` +
                   `• \`!mapa\` → Exibe a cartografia de Eldoria\n` +
                   `**📊 DATA ANALYTICS & SOCIAL:**\n` +
                   `• \`!analytics\` (ou \`!stats\`) → Dashboard completo com quem mais fala, veteranos e estatísticas\n` +
                   `• \`!visto @Membro\` → Vê quando um membro falou pela última vez e o que disse\n` +
                   `• Marque \`@Aimê\` → Converse naturalmente, pergunte dados do servidor ou opiniões sinceras!\n\n` +
                   `**🧠 AUTO-APRENDIZADO (#melhorias):**\n` +
                   `• Poste qualquer ideia ou novo comando no canal **#melhorias**!\n` +
                   `• \`!cerebro\` → Lista todas as regras aprendidas pela IA\n` +
                   `• \`!comandos\` → Lista novos comandos criados pela comunidade!\n\n` +
                   `**🛡️ ADMINISTRAÇÃO:**\n` +
                   `• \`!limpar <1-99>\` → Apaga mensagens do canal (moderadores)`,
      color: 0x2D8B7A,
      footer: { text: `Aimê • Administradora, Mestre de RPG, DJ e Embaixadora PotePlutão 🪐` }
    };

    return message.reply({ embeds: [embedAjuda] });
  }

  // ==========================================================
  // POTEPLUTÃO — CARDÁPIO, MARKETING INSTAGRAM & PARCERIAS
  // ==========================================================

  // CARDÁPIO DE SABORES
  if (['sabores', 'cardapio', 'menu', 'saborespote'].includes(comando)) {
    const embedCardapio = potePlutao.obterCardapioEmbed();
    return message.reply({ embeds: [embedCardapio] });
  }

  // APRESENTAÇÃO GERAL POTEPLUTÃO
  if (['pote', 'poteplutao', 'plutao'].includes(comando)) {
    const embedPote = {
      title: '🪐 Bem-vindo à PotePlutão • Cremes Gelados Artesanais',
      description: 'A sobremesa mais gelada da galáxia, direto de **São Luís - MA**!\n\n' +
                   'Receita autoral de cremes ultragelados a **-18°C**, super aerados e tão leves que parecem gravidade zero.\n\n' +
                   '🍨 **Sabores Disponíveis (Pote 120ml por R$ 5,00):**\n' +
                   '• 🟡 **Maracujá** — Refrescante com sementes e polpa natural\n' +
                   '• 🟢 **Limão** — Cítrico com raspas frescas artesanais\n' +
                   '• 🔴 **Morango** — Clássico aveludado com calda de frutas\n' +
                   '• 🍫 **Chocolate** — Cacau 50% com granulado nobre crocante\n\n' +
                   '📌 *Comandos rápidos:*\n' +
                   '• `!sabores` → Cardápio completo com detalhes\n' +
                   '• `!postar [sabor]` → Gerar post pro Instagram com foto\n' +
                   '• `!parceria` → Preços de atacado para restaurantes e padarias\n\n' +
                   '📲 **Peça pelo WhatsApp oficial:** `(98) 99193-9476`',
      color: 0x2D8B7A,
      footer: { text: 'PotePlutão • Zero Gravidade • Jardim São Cristóvão' }
    };
    return message.reply({ embeds: [embedPote] });
  }

  // GERAR E PUBLICAR POST DO INSTAGRAM
  if (['postar', 'post', 'instagram', 'insta', 'postinsta'].includes(comando)) {
    const termo = args.join(' ').trim();
    await message.channel.sendTyping();

    const usarIA = termo.includes('ia') || termo.includes('novo') || termo.includes('criativo');
    const resultado = await potePlutao.gerarPost(termo, usarIA);

    const payload = { embeds: [resultado.embed] };
    if (resultado.fotoPath) {
      payload.files = [{ attachment: resultado.fotoPath, name: resultado.fotoNome }];
    }

    try {
      await message.reply(payload);
    } finally {
      if (resultado.fotoPath && fs.existsSync(resultado.fotoPath) && resultado.fotoNome && resultado.fotoNome.startsWith('post_')) {
        try { fs.unlinkSync(resultado.fotoPath); } catch (_) {}
      }
    }
    return;
  }

  // PROPOSTA B2B / PARCERIA PARA COMÉRCIOS
  if (['parceria', 'atacado', 'revenda', 'comercio'].includes(comando)) {
    const embedParceria = potePlutao.obterParceriaEmbed();
    return message.reply({ embeds: [embedParceria] });
  }

  // ==========================================================
  // DATA ANALYTICS & SOCIAL (!analytics, !visto)
  // ==========================================================
  if (['analytics', 'stats', 'estatisticas', 'dados'].includes(comando)) {
    const embedDashboard = analytics.gerarDashboardEmbed(message.guild);
    return message.reply({ embeds: [embedDashboard] });
  }

  if (['visto', 'lastseen', 'ondeesta', 'procurarmembro'].includes(comando)) {
    const alvo = args.join(' ').replace(/[<@!>]/g, '').trim();
    if (!alvo) {
      return message.reply('🔍 Digite o nome ou mencione alguém para eu ver quando falou por último! Ex: `!visto @Gustavo` ou `!visto Rocha`');
    }
    const info = analytics.obterUltimaFala(alvo);
    if (!info) {
      return message.reply(`🔍 Não encontrei nenhuma mensagem recente de **${alvo}** nos meus registros.`);
    }
    const embedVisto = {
      title: `👁️ Última Atividade de ${info.username}`,
      description: `📍 **Canal:** <#${info.canal}>\n` +
                   `⏱️ **Visto há:** \`${info.tempoAtras}\` (${new Date(info.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})\n` +
                   `💬 **Última mensagem:**\n> *"${info.texto}"*`,
      color: 0x3498db,
      footer: { text: `Aimê Analytics • Membro ID: ${info.userId}` }
    };
    return message.reply({ embeds: [embedVisto] });
  }

  // ==========================================================
  // 5. SISTEMA DE MÚSICA COM IA (GEMINI DJ + CANAL DE VOZ)
  // ==========================================================

  // TOCAR MÚSICA (!music, !play, !tocar, !som)
  if (['music', 'play', 'tocar', 'som'].includes(comando)) {
    const argsTexto = args.join(' ');
    return await musica.processarComandoMusic(message, argsTexto);
  }

  // PAUSAR
  if (comando === 'pausar' || comando === 'pause') {
    const pausou = musica.pausar(message.guild.id);
    if (pausou) {
      return message.reply('⏸️ **Música pausada!** Digite `!continuar` para retomar.');
    } else {
      return message.reply('⚠️ Nenhuma música tocando no momento.');
    }
  }

  // CONTINUAR / DESPAUSAR
  if (['continuar', 'resume', 'despausar', 'despause'].includes(comando)) {
    const despausou = musica.continuar(message.guild.id);
    if (despausou) {
      return message.reply('▶️ **Música retomada!**');
    } else {
      return message.reply('⚠️ Nenhuma música pausada no momento.');
    }
  }

  // PULAR MÚSICA
  if (['pular', 'skip', 'next'].includes(comando)) {
    const pulou = musica.pular(message.guild.id);
    if (pulou) {
      return message.reply('⏭️ **Música pulada!** Tocando a próxima da fila...');
    } else {
      return message.reply('⚠️ Nenhuma música na fila para pular.');
    }
  }

  // FILA DE REPRODUÇÃO
  if (comando === 'fila' || comando === 'queue') {
    const fila = musica.obterFila(message.guild.id);
    if (!fila || (!fila.tocando && fila.musicas.length === 0)) {
      return message.reply('📭 A fila de músicas está vazia! Peça uma com `!music <nome>`');
    }

    let desc = `🎶 **Tocando Agora:**\n` +
               `**[${fila.tocando.titulo}](${fila.tocando.url})** (\`${fila.tocando.duracao}\`) - Pedido por <@${fila.tocando.pedidoPor.id}>\n\n` +
               `📜 **Próximas na Fila (${fila.musicas.length} músicas):**\n`;

    if (fila.musicas.length === 0) {
      desc += '*Nenhuma outra música na fila. Adicione mais com `!music <nome>`!*';
    } else {
      fila.musicas.slice(0, 10).forEach((m, idx) => {
        desc += `**${idx + 1}.** [${m.titulo}](${m.url}) (\`${m.duracao}\`) - <@${m.pedidoPor.id}>\n`;
      });
      if (fila.musicas.length > 10) {
        desc += `\n*... e mais ${fila.musicas.length - 10} músicas na fila!*`;
      }
    }

    const embedFila = {
      title: `🎵 Fila de Músicas — ${message.guild.name}`,
      description: desc,
      color: 0x9b59b6,
      footer: { text: `Use !pular para passar a faixa • !parar para sair da call` }
    };

    return message.reply({ embeds: [embedFila] });
  }

  // MÚSICA ATUAL
  if (['tocando', 'np', 'atual', 'nowplaying'].includes(comando)) {
    const fila = musica.obterFila(message.guild.id);
    if (!fila || !fila.tocando) {
      return message.reply('🔇 Nenhuma música tocando no momento. Peça uma com `!music <nome>`');
    }

    const m = fila.tocando;
    const embedAtual = {
      title: `🎶 Tocando Agora: ${m.titulo}`,
      url: m.url,
      description: `🎙️ **DJ Aimê:** *${m.comentarioDJ || 'Pedrada pura!'}*\n\n` +
                   `⏱️ **Duração:** \`${m.duracao}\` | 👤 **Canal:** \`${m.autor}\`\n` +
                   `🎧 **Pedido por:** <@${m.pedidoPor.id}>\n\n` +
                   `📍 **Fila:** ${fila.musicas.length} música(s) aguardando.`,
      color: 0x1abc9c,
      thumbnail: { url: m.thumbnail },
      footer: { text: `Aimê DJ • Use !pular para próxima faixa` }
    };

    return message.reply({ embeds: [embedAtual] });
  }

  // PARAR E SAIR DA CALL
  if (['parar', 'stop', 'sair', 'leave', 'desconectar'].includes(comando)) {
    const parou = musica.parar(message.guild.id);
    if (parou) {
      return message.reply('⏹️ **DJ Aimê parou a música, limpou a fila e saiu do canal de voz!** Até a próxima sessão! 👋');
    } else {
      return message.reply('⚠️ O bot não está em nenhum canal de voz no momento.');
    }
  }

  // ==========================================================
  // 4. MOTOR UNIVERSAL DE COMANDOS DINÂMICOS & MECÂNICAS
  // Captura !craft, !forjar, !habilidades, ou QUALQUER comando criado dinamicamente no #melhorias!
  // ==========================================================
  const cmdDinamico = banco.obterComandoDinamico(comando);
  const isComandoArcano = cmdDinamico || ['craft', 'forjar', 'habilidades', 'magias', 'alquimia', 'criaritem', 'sintetizar'].includes(comando);

  if (isComandoArcano) {
    const userId = message.author.id;
    const jogador = banco.obterJogador(userId);

    if (!jogador) {
      return message.reply(`❌ Você precisa criar um aventureiro antes de usar \`!${comando}\`! Use: \`!criar <Classe> <Nome>\``);
    }

    // Atalho amigável para consultar habilidades e magias
    if (comando === 'habilidades' || comando === 'magias') {
      const listaHabs = (jogador.habilidades && jogador.habilidades.length > 0)
        ? jogador.habilidades.map(h => `• 🔮 **${h}**`).join('\n')
        : '*Nenhuma habilidade despertada ainda.*';

      const embedHabs = {
        title: `✨ Grimório de Habilidades & Magias de ${jogador.nome}`,
        description: `Aqui estão os poderes e rituais que você domina:\n\n${listaHabs}\n\n` +
                     `💡 **Como Usar em Batalha ou Exploração:**\n` +
                     `Digite: \`!agir uso ${jogador.habilidades[0] || 'minha magia'} contra o inimigo\`!`,
        color: 0x9b59b6,
        footer: { text: `Classe: ${jogador.classe} (Nível ${jogador.nivel}) • Ganhe mais níveis para despertar novos poderes!` }
      };
      return message.reply({ embeds: [embedHabs] });
    }

    // Processamento Dinâmico por IA
    await message.channel.sendTyping();
    try {
      const resultado = await mestre.executarComandoDinamico(jogador, comando, args.join(' '));
      return message.reply({ embeds: [resultado.embed] });
    } catch (err) {
      console.error(`[Comando Dinâmico !${comando}] Erro:`, err);
      return message.reply(`⚠️ Ocorreu uma instabilidade mágica ao executar \`!${comando}\`. Tente novamente!`);
    }
  }

  // LISTAR COMANDOS DINÂMICOS DA COMUNIDADE
  if (comando === 'comandos' || comando === 'sistemas') {
    const dinamicos = banco.listarComandosDinamicos();
    if (dinamicos.length === 0) {
      return message.reply('🌿 Nenhum comando dinâmico criado pela comunidade ainda. Sugira no canal `#melhorias` para criar!');
    }

    let texto = dinamicos.map(d => `• \`${d.sintaxe || '!' + d.nome}\` → **${d.descricao}** (Criado por: *${d.criadoPor}*)`).join('\n');
    return message.reply({
      embeds: [{
        title: `🚀 Comandos Dinâmicos Criados pela Comunidade`,
        description: `Estes comandos foram assimilados diretamente pelo canal #melhorias e estão ativos:\n\n${texto}`,
        color: 0xe67e22,
        footer: { text: `Envie sugestões no canal #melhorias para o bot criar novos comandos sozinho!` }
      }]
    });
  }
});

// Login do bot
if (TOKEN && TOKEN !== 'COLOQUE_SEU_TOKEN_AQUI') {
  client.login(TOKEN).catch(e => {
    console.error('❌ Falha ao logar o bot no Discord:', e.message);
  });
}
