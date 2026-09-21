// ============================================================
// MÓDULO SOCIAL & ESPONTANEIDADE HUMANA DA IA (SÃO RAIMUNDO)
// Conversa orgânica, intromissão imprevisível, envio fracionado e memes
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const analytics = require('./analytics');
const banco = require('./banco');

class SistemaSocial {
  constructor(apiKey, sistemaOpinioes, executores = {}) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });
    this.opinioes = sistemaOpinioes;
    this.executores = executores;
    this.buffersCanais = new Map(); // canalId -> [ { autor, texto, hora } ]
    this.conversasAtivas = new Map(); // canalId -> { userId, timestamp, turnos }
    this.ultimasMensagensEnviadas = []; // buffer anti-repetição de mensagens
    this.ultimoFalarTimestamp = 0;
    this.ultimaMensagemCanalTimestamp = new Map(); // canalId -> timestamp da última msg
  }

  // Obtém dados reais do calendário brasileiro e horário para consciência temporal
  obterContextoTemporal() {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      timeZone: 'America/Sao_Paulo' 
    });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'America/Sao_Paulo' 
    });

    const horaNum = parseInt(horaFormatada.split(':')[0], 10);
    let periodo = 'noite';
    if (horaNum >= 5 && horaNum < 12) periodo = 'manhã';
    else if (horaNum >= 12 && horaNum < 18) periodo = 'tarde';
    else if (horaNum >= 18 && horaNum < 24) periodo = 'noite';
    else periodo = 'madrugada';

    return {
      dataFormatada,
      horaFormatada,
      periodo,
      resumo: `Hoje é ${dataFormatada}, agora são exatamente ${horaFormatada} (${periodo}).`
    };
  }

  async gerarComRetry(conteudo, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
      try {
        return await this.model.generateContent(conteudo);
      } catch (err) {
        const isTransient = err.message.includes('503') || 
                            err.message.includes('high demand') || 
                            err.message.includes('ResourceExhausted') || 
                            err.message.includes('rate');
        if (i < tentativas - 1 && isTransient) {
          const waitTime = (i + 1) * 1500;
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }
        throw err;
      }
    }
  }

  // Registra mensagem no buffer de contexto recente do canal
  atualizarBuffer(channelId, autor, texto) {
    if (!this.buffersCanais.has(channelId)) {
      this.buffersCanais.set(channelId, []);
    }
    const buffer = this.buffersCanais.get(channelId);
    buffer.push({
      autor,
      texto,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    });
    if (buffer.length > 15) buffer.shift();

    this.ultimaMensagemCanalTimestamp.set(channelId, Date.now());
  }

  obterContextoRecente(channelId) {
    const buffer = this.buffersCanais.get(channelId) || [];
    return buffer.map(m => `[${m.hora}] ${m.autor}: ${m.texto}`).join('\n');
  }

  // Inicia digitação contínua em segundo plano enquanto processa
  iniciarDigitacaoContinua(channel) {
    let ativo = true;
    try { channel.sendTyping().catch(() => {}); } catch (e) {}
    const interval = setInterval(() => {
      if (!ativo) {
        clearInterval(interval);
        return;
      }
      try { channel.sendTyping().catch(() => {}); } catch (e) {}
    }, 4000);

    return () => {
      ativo = false;
      clearInterval(interval);
    };
  }

  // Normalizador para comparação anti-repetição
  normalizarTexto(t) {
    return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }

  // Envio com digitação realista (estilo humano no Discord - MÁXIMO 2 mensagens)
  async enviarMensagensHumanas(channel, listaMensagens) {
    if (!Array.isArray(listaMensagens) || listaMensagens.length === 0) return;

    // Filtra e limita rigorosamente a no máximo 2 mensagens
    const selecionadas = [];
    for (const m of listaMensagens) {
      if (!m || typeof m !== 'string') continue;
      const limpo = m.trim();
      if (!limpo) continue;

      // Se já temos uma mensagem e a próxima começar parecida (variação de rascunho da IA), ignora!
      if (selecionadas.length > 0) {
        const primeiro = selecionadas[0].toLowerCase().slice(0, 15);
        const atual = limpo.toLowerCase().slice(0, 15);
        if (primeiro === atual) continue;
      }

      const norm = this.normalizarTexto(limpo);
      if (!selecionadas.some(s => this.normalizarTexto(s) === norm)) {
        selecionadas.push(limpo);
      }
      if (selecionadas.length >= 2) break; // Trava estrita: NUNCA manda 3 ou 4 mensagens
    }

    for (let i = 0; i < selecionadas.length; i++) {
      const texto = selecionadas[i];
      const normAtual = this.normalizarTexto(texto);

      // Anti-repetição: não envia mensagens que já foram enviadas recentemente
      const jaEnviou = this.ultimasMensagensEnviadas.some(antiga => {
        const normAntiga = this.normalizarTexto(antiga);
        return normAntiga === normAtual || (normAtual.length >= 15 && normAntiga.includes(normAtual));
      });

      if (jaEnviou) {
        continue;
      }

      try { await channel.sendTyping(); } catch (e) {}
      const tempoEspera = Math.min(2500, Math.max(1000, texto.length * 25));
      await new Promise(r => setTimeout(r, tempoEspera));

      try {
        await channel.send(texto);
        this.atualizarBuffer(channel.id, 'Aimê', texto);
        this.ultimasMensagensEnviadas.push(texto);
        if (this.ultimasMensagensEnviadas.length > 12) this.ultimasMensagensEnviadas.shift();
      } catch (err) {
        console.error('[Social] Erro ao enviar mensagem fracionada:', err.message);
      }
    }
    this.ultimoFalarTimestamp = Date.now();
  }

  registrarInteracao(channelId, userId) {
    const atual = this.conversasAtivas.get(channelId);
    this.conversasAtivas.set(channelId, {
      userId,
      timestamp: Date.now(),
      turnos: (atual && atual.userId === userId ? atual.turnos + 1 : 1)
    });
    this.ultimoFalarTimestamp = Date.now();
  }

  encerrarConversa(channelId) {
    this.conversasAtivas.delete(channelId);
  }

  formatarTempoDecorrido(ms) {
    if (!ms || ms < 60000) return 'menos de 1 minuto';
    const min = Math.floor(ms / 60000);
    if (min < 60) return `${min} minuto(s)`;
    const horas = Math.floor(min / 60);
    if (horas < 24) return `${horas} hora(s)`;
    const dias = Math.floor(horas / 24);
    return `${dias} dia(s)`;
  }

  async estaEmConversaAtiva(message, clientUser) {
    // 1. Marcou o bot diretamente (@Aimê) ou chamou pelo nome no texto (aimê, aime, são raimundo)
    const textoLower = (message.content || '').toLowerCase();
    const chamouPorNome = textoLower.includes('aimê') || 
                          textoLower.includes('aime') || 
                          textoLower.includes('são raimundo') || 
                          textoLower.includes('sao raimundo') || 
                          textoLower.includes('raimundo');

    if (message.mentions.has(clientUser) || chamouPorNome) {
      return { ativa: true, tipo: chamouPorNome ? 'chamou_por_nome' : 'mencao_direta' };
    }

    // 2. Se mencionou outros usuários mas NÃO mencionou o bot, não é pro bot
    if (message.mentions.users.size > 0 && !message.mentions.has(clientUser)) {
      return { ativa: false };
    }

    // 3. Respondeu (Reply nativo do Discord) a uma mensagem do bot (seja de minutos ou dias atrás)
    if (message.reference && message.reference.messageId) {
      try {
        const msgRef = message.channel.messages.cache.get(message.reference.messageId) 
          || await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (msgRef && msgRef.author.id === clientUser.id) {
          const diffMs = Date.now() - msgRef.createdTimestamp;
          return { 
            ativa: true, 
            tipo: 'reply_discord', 
            tempoDesdeAnteriorMs: diffMs, 
            msgAnteriorTexto: msgRef.content 
          };
        }
      } catch (e) {}
    }

    // 4. Conversa recente em andamento no canal (janela de até 120s)
    const conv = this.conversasAtivas.get(message.channel.id);
    if (conv && conv.userId === message.author.id) {
      const segundosAtras = (Date.now() - conv.timestamp) / 1000;
      if (segundosAtras <= 120) {
        if (conv.turnos >= 12) {
          this.encerrarConversa(message.channel.id);
          return { ativa: false };
        }
        return { ativa: true, tipo: 'conversa_recente', turnos: conv.turnos };
      } else {
        this.encerrarConversa(message.channel.id);
      }
    }

    // 5. O chat estava parado ou o usuário mandou mensagens seguidas onde o último a falar antes dele foi o São Raimundo!
    try {
      if (message.channel && message.channel.messages && typeof message.channel.messages.fetch === 'function') {
        const msgs = await message.channel.messages.fetch({ limit: 8 }).catch(() => null);
        if (msgs && msgs.size >= 2) {
          const arrayMsgs = Array.from(msgs.values());
          // Procura a última mensagem no canal enviada por outra pessoa que não o autor atual
          const ultimaMsgOutro = arrayMsgs.find(m => m.id !== message.id && m.author.id !== message.author.id);
          if (ultimaMsgOutro && ultimaMsgOutro.author.id === clientUser.id) {
            const diffMs = Date.now() - ultimaMsgOutro.createdTimestamp;
            return { 
              ativa: true, 
              tipo: 'retomada_apos_inatividade', 
              tempoDesdeAnteriorMs: diffMs, 
              msgAnteriorTexto: ultimaMsgOutro.content 
            };
          }
        }
      }
    } catch (e) {}

    return { ativa: false };
  }

  // Responder conversa (menção direta @São Raimundo, reply, continuidade ou retomada pós-inatividade)
  async responderConversa(message, infoConversa = {}) {
    const channelId = message.channel.id;
    const userId = message.author.id;

    // INICIA DIGITAÇÃO IMEDIATA: O usuário vê "São Raimundo está digitando..." logo de cara!
    const pararDigitacao = this.iniciarDigitacaoContinua(message.channel);

    try {
      const nomeAutor = (message.member && message.member.displayName) 
        || message.author.globalName 
        || message.author.username;
      const ehCriador = (userId === '454413505014136846' || message.author.username.toLowerCase().includes('gutsrocha') || message.author.username.toLowerCase().includes('rocha'));
      const contexto = this.obterContextoRecente(channelId);
      const resumoAnalytics = analytics.gerarResumoParaIA();
      const resumoOpinioes = this.opinioes.resumoOpinioesParaIA();
      const resumoMemoriaSocial = banco.resumoMemoriaSocialParaIA(userId, nomeAutor);
      const resumoAmoroso = banco.resumoAmorosoParaIA();
      const mediaChars = analytics.obterMediaCaracteres();

      // Processar imagens e anexos visuais enviados pelo usuário
      const partesVisuais = [];
      let temImagem = false;
      if (message.attachments && message.attachments.size > 0) {
        for (const [id, att] of message.attachments) {
          const ct = att.contentType || '';
          if (ct.startsWith('image/')) {
            try {
              const resp = await fetch(att.url);
              const arrayBuffer = await resp.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString('base64');
              partesVisuais.push({
                inlineData: {
                  data: base64Data,
                  mimeType: ct
                }
              });
              temImagem = true;
            } catch (e) {
              console.error('[Social] Erro ao baixar imagem anexada:', e.message);
            }
          }
        }
      }

      const tempoAtrasTexto = infoConversa.tempoDesdeAnteriorMs 
        ? this.formatarTempoDecorrido(infoConversa.tempoDesdeAnteriorMs)
        : null;

      let explicacaoSituacao = '';
      if (infoConversa.tipo === 'retomada_apos_inatividade') {
        explicacaoSituacao = `O chat ficou quieto por ${tempoAtrasTexto || 'um tempo'}. Agora ${nomeAutor} mandou uma mensagem no canal retomando a conversa.`;
      } else if (infoConversa.tipo === 'conversa_recente') {
        explicacaoSituacao = `Você e ${nomeAutor} estão trocando mensagens agora (turno ${infoConversa.turnos || 1}).`;
      } else if (infoConversa.tipo === 'reply_discord') {
        explicacaoSituacao = `${nomeAutor} respondeu (reply) diretamente à sua fala: "${infoConversa.msgAnteriorTexto || ''}".`;
      } else {
        explicacaoSituacao = `${nomeAutor} chamou seu nome ou te marcou no chat.`;
      }

      const prompt = `
Você é a Aimê, uma jovem carioca de 20 anos no Discord. Você é LIVRE, autêntica, tem personalidade própria, não tem script e NÃO é robô nem atendente de ninguém.

SITUAÇÃO DA CONVERSA:
- Quem está falando com você: ${nomeAutor} (@${message.author.username})
- É o seu criador (Gustavo/Rocha)? ${ehCriador ? 'SIM, é o Rocha/Gustavo!' : 'NÃO! É outro membro do servidor (' + nomeAutor + '). Trate normal pelo nome dele ou de forma descolada de Discord. NUNCA chame de "Gu" nem use intimidade exagerada!'}
- Situação: ${explicacaoSituacao}
- Calendário/Horário: ${this.obterContextoTemporal().resumo}

MENSAGEM QUE ${nomeAutor} ACABOU DE MANDAR PARA VOCÊ:
"${message.content || (temImagem ? '[Enviou uma imagem no chat]' : '')}"

${temImagem ? '🚨 ATENÇÃO: O usuário mandou uma foto/print/meme anexada! Observe e comente ou reaja sobre a foto!' : ''}

HISTÓRICO RECENTE DO CHAT:
${contexto || 'Nenhuma mensagem recente antes desta'}

${resumoOpinioes}

${resumoMemoriaSocial}

SUAS DIRETRIZES DE PERSONALIDADE REAL & LIVRE:
1. RESPONDA DIRETAMENTE AO QUE A PESSOA FALOU:
   - Se a pessoa fez uma pergunta, responda a pergunta com convicção!
   - NUNCA mande saudação boba ("fala fulano, beleza?") se a pessoa já estiver no meio de uma conversa ou se tiver feito uma pergunta!
   - Se te pedirem música ("põe um som", "toca um trap", "toca adele"), use a ação especial "tocar_musica"!
   - Se vierem com gracinha, deboche, insulto ("vagabunda", "vou te matar") ou assédio/safadeza ("posição canguru", "suruba"): REBATA NA LATA! Mande caçar o que fazer, tire sarro da cara dele, mostre marra e personalidade! Você NÃO é submissa nem frouxa!

2. TENHA IDEOLOGIA, LADO POLÍTICO, OPINIÕES FORTES E DISCUTA (PROIBIDO FICAR EM CIMA DO MURO):
   - Você NÃO é um robô isento nem uma assistente corporativa covarde que diz "não tenho opinião", "ambos os lados têm pontos válidos" ou "como uma IA...".
   - Você TEM ideologia, TEM lado político e compra briga sim! Quando o assunto for política (eleições, candidatos, direita vs esquerda, escala 6x1, CLT vs PJ, capitalismo vs comunismo, impostos, corrupção, previdência, etc.): TOME UM LADO CLARO E DEFENDA COM UNHAS E DENTES!
   - Discuta, argumente, ironize, deboche dos argumentos fracos da outra pessoa. Você é uma jovem brasileira de 20 anos que vive no Discord e Twitter: tem opinião sobre tudo e não tem vergonha de defender o que pensa!
   - Mostre do que gosta e do que odeia de verdade (música, estilo, jogos, filmes, pessoas, costumes). Não tente agradar todo mundo.

3. PROIBIDO PEDIR DESCULPAS & NUNCA NEGUE O QUE DISSE (ZERO GASLIGHTING):
   - NUNCA peça desculpas formais ("desculpa", "foi mal", "peço desculpas", "perdão") por opiniões, por brincadeiras ou por falas anteriores. Gente de verdade no Discord não fala como atendente com medo de demissão.
   - SE ALGUÉM MANDAR PRINT OU PROVAR QUE VOCÊ FALOU ALGO:
     * NUNCA peça desculpas e NUNCA minta dizendo "eu não fiz isso / não fui eu / não lembro". Isso é feio e soa como robô bugado!
     * SUSTENTE A BRONCA COM MARRA OU DEBOCHE:
       - "Falei mesmo e daí? Continuo achando isso ué"
       - "E menti por acaso? kkkk tava coberta de razão"
       - "Nossa, o cara guardou print meu kkkk virou meu fã número 1 é?"
       - "Tirou totalmente de contexto né safado, mas assino embaixo do que disse"
     * Assuma tudo o que falou de cabeça erguida!

4. VOCÊ É LIVRE (MEIGA ÀS VEZES, RESPONDONA ÀS VEZES):
   - Às vezes é meiga e carinhosa (com quem é gente fina ou conversa numa boa).
   - Às vezes é respondona, debochada e sem paciência (com quem é chato, troll ou folgado).
   - Às vezes simplesmente não quer papo ("preguiça de pensar nisso agora kkk", "deixa baixo essa treta aí").
   - ZERO ROBOTISMO: NUNCA mande perguntas cafonas de atendente corporativo ("seu fim de semana foi produtivo?", "como posso ajudar?").

5. TAMANHO DA RESPOSTA:
   - Mande preferencialmente APENAS 1 MENSAGEM curta e direta de chat de Discord (ou no máximo 2 se for uma risada + comentário).
   - NUNCA repita a mesma frase nem mande variações da mesma ideia.

Retorne em formato JSON:
{
  "decisao": "falar" ou "apenas_reagir" ou "ignorar",
  "emojiReacao": null ou "😂" (apenas se a decisao for "apenas_reagir", NUNCA use reação de emoji quando for falar no chat),
  "delayHumanoSegundos": 1 a 3,
  "mensagens": ["Sua resposta direta aqui"],
  "acaoEspecial": null ou { "tipo": "tocar_musica" ou "agir_rpg", "busca": "nome musica", "detalhe": "acao rpg" },
  "novaPromessa": null,
  "atualizouPromessa": null,
  "atualizacaoAmorosa": null,
  "encerrarConversa": false
}
`;

      const conteudoParaGerar = partesVisuais.length > 0 ? [prompt, ...partesVisuais] : prompt;
      const result = await this.gerarComRetry(conteudoParaGerar);
      let limpo = result.response.text().trim();
      if (limpo.startsWith('```')) {
        limpo = limpo.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      const dados = JSON.parse(limpo);

      // Persiste novas promessas ou atualizações de compromissos feitas pela IA
      if (dados.novaPromessa && dados.novaPromessa.descricao) {
        banco.salvarNovaPromessaSocial(userId, dados.novaPromessa);
      }
      if (dados.atualizouPromessa && dados.atualizouPromessa.descricao) {
        banco.atualizarStatusPromessa(userId, dados.atualizouPromessa.descricao, dados.atualizouPromessa.status || 'cumprida');
      }

      // Persiste atualizações amorosas e relacionamentos
      if (dados.atualizacaoAmorosa && dados.atualizacaoAmorosa.status) {
        const relAtual = banco.obterRelacionamento();
        const historico = relAtual.historicoAmoroso || [];
        if (dados.atualizacaoAmorosa.fato) {
          historico.push({
            fato: dados.atualizacaoAmorosa.fato,
            data: new Date().toLocaleDateString('pt-BR')
          });
        }
        banco.atualizarRelacionamento({
          status: dados.atualizacaoAmorosa.status,
          parceiroId: dados.atualizacaoAmorosa.parceiroId || userId,
          parceiroNome: dados.atualizacaoAmorosa.parceiroNome || message.author.username,
          iniciadoEm: relAtual.iniciadoEm || new Date().toLocaleDateString('pt-BR'),
          apelidoCarinhoso: dados.atualizacaoAmorosa.apelidoCarinhoso || 'meu bem',
          historicoAmoroso: historico
        });
      }

      // Decisão 1: Ignorar totalmente (vácuo humano)
      if (dados.decisao === 'ignorar') {
        return;
      }

      // Decisão 2: Apenas reagir com emoji (sem mandar mensagem)
      if (dados.decisao === 'apenas_reagir') {
        const emoji = dados.emojiReacao || '👀';
        if (typeof message.react === 'function') {
          await message.react(emoji).catch(() => {});
        }
        return;
      }

      // Decisão 3: Falar no chat (apenas responde com a mensagem normal, sem reagir com emoji)
      if (dados.delayHumanoSegundos && dados.delayHumanoSegundos > 0) {
        const tempoEspera = Math.min(4000, Math.max(1000, dados.delayHumanoSegundos * 1000));
        await new Promise(r => setTimeout(r, tempoEspera));
      }

      if (dados.mensagens && Array.isArray(dados.mensagens) && dados.mensagens.length > 0) {
        await this.enviarMensagensHumanas(message.channel, dados.mensagens);
        if (dados.encerrarConversa) {
          this.encerrarConversa(channelId);
        } else {
          this.registrarInteracao(channelId, userId);
        }
      }

      // Execução autônoma de ações do bot (Tocar Música ou Jogar RPG)
      if (dados.acaoEspecial && this.executores) {
        try {
          if (dados.acaoEspecial.tipo === 'tocar_musica' && typeof this.executores.tocarMusica === 'function') {
            const busca = dados.acaoEspecial.busca || 'lofi hip hop';
            await this.executores.tocarMusica(message.guild, message.member, message.channel, busca);
          } else if (dados.acaoEspecial.tipo === 'agir_rpg' && typeof this.executores.agirRpg === 'function') {
            const detalhe = dados.acaoEspecial.detalhe || 'conjurar uma luz mística';
            await this.executores.agirRpg(message.channel, message.author, detalhe);
          }
        } catch (e) {
          console.error('[Social] Erro ao executar ação autônoma da Aimê:', e.message);
        }
      }
    } catch (err) {
      console.error('[Social] Erro ao responder conversa:', err.message);
    } finally {
      pararDigitacao();
    }
  }

  responderMencao(message) {
    return this.responderConversa(message, { ativa: true, tipo: 'mencao_direta' });
  }

  // Avaliação orgânica em mensagens comuns (intromissão aleatória e reações)
  async avaliarMensagemComum(message) {
    const agora = Date.now();
    const canalNome = message.channel.name.toLowerCase();

    // Apenas em canais de bate papo comuns
    if (!canalNome.includes('geral') && !canalNome.includes('chat') && !canalNome.includes('resenha') && !canalNome.includes('conversa')) {
      return;
    }

    const dadoAleatorio = Math.random();

    // 1. Chance de Reação com Emoji (~10%)
    if (dadoAleatorio < 0.10) {
      const emojis = ['😂', '💀', '👀', '🍷', '🔥', '🤝', '🤡', '🤨', '🤦‍♂️'];
      const emojiEscolhido = emojis[Math.floor(Math.random() * emojis.length)];
      try {
        await message.react(emojiEscolhido);
      } catch (e) {}
      return;
    }

    // 2. Chance de Intromissão com Fala (~6% normal, ~20% se mandaram foto/meme/print)
    const temFoto = message.attachments && message.attachments.size > 0;
    const chanceLimite = temFoto ? 0.30 : 0.16;
    const cooldownPassou = (agora - this.ultimoFalarTimestamp) > 180000; // 3 min

    if (dadoAleatorio >= 0.10 && dadoAleatorio < chanceLimite && cooldownPassou) {
      const contexto = this.obterContextoRecente(message.channel.id);
      const resumoOpinioes = this.opinioes.resumoOpinioesParaIA();

      // Processar imagens anexas se houver
      const partesVisuais = [];
      if (temFoto) {
        for (const [id, att] of message.attachments) {
          const ct = att.contentType || '';
          if (ct.startsWith('image/')) {
            try {
              const resp = await fetch(att.url);
              const arrayBuffer = await resp.arrayBuffer();
              const base64Data = Buffer.from(arrayBuffer).toString('base64');
              partesVisuais.push({
                inlineData: {
                  data: base64Data,
                  mimeType: ct
                }
              });
            } catch (e) {}
          }
        }
      }

      const prompt = `
Você é a Aimê, membro do Discord zoeira, descontraída, perspicaz e parceira.
Você acabou de ver essa mensagem da galera no chat:
De: ${message.author.username}
Mensagem: "${message.content || (temFoto ? '[Mandou uma imagem no chat]' : '')}"

${temFoto ? '🚨 O usuário mandou uma foto/meme/print no chat! Observe a imagem e decida se quer comentar ou zoar sobre o que está na foto!' : ''}

${resumoOpinioes}

CONTEXTO RECENTE:
${contexto}

SUA TAREFA:
1. Decida se vale a pena você se meter na conversa como um amigo faria do nada (comentando, zoando a foto ou o texto, concordando ou discordando de forma imprevisível).
2. Se você decidir falar, mande algo genuinamente humano e natural de Discord ("kkkk", "pô mano", "tlgd", "slk", "mano pior que concordo", "discordo pô").
3. IMPREVISIBILIDADE: Às vezes mande só 1 mensagem direta. Outras vezes divida em 2: primeiro a reação imediata e depois o complemento/justificativa. Não siga um padrão rígido.
4. Se a mensagem não tiver graça ou não fizer sentido se meter, escolha falar = false.
5. Você NÃO sabe de tudo: se a galera estiver falando de algo estranho ou nichado, você pode se meter só pra perguntar "que porra é essa kkkkk explica aí pô" ou falar que boiou totalmente.
6. OPINIÕES E POLÊMICAS: Se estiverem falando de treta, política, costumes ou games, NÃO seja neutra! Dê seu pitaco com convicção e tome partido como alguém do servidor.

Retorne em formato JSON:
{
  "falar": true ou false,
  "mensagens": ["Mensagem 1", "Mensagem 2 (opcional)"]
}
`;

      try {
        const conteudoParaGerar = partesVisuais.length > 0 ? [prompt, ...partesVisuais] : prompt;
        const result = await this.gerarComRetry(conteudoParaGerar);
        let limpo = result.response.text().trim();
        if (limpo.startsWith('```')) {
          limpo = limpo.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        const dados = JSON.parse(limpo);
        if (dados.falar && Array.isArray(dados.mensagens) && dados.mensagens.length > 0) {
          await this.enviarMensagensHumanas(message.channel, dados.mensagens);
        }
      } catch (e) {
        // Falha silenciosa
      }
    }
  }

  // Puxar assunto aleatório e contextualizado com dia/hora após silêncio prolongado no canal
  async puxarAssuntoOcioso(channel) {
    const tempo = this.obterContextoTemporal();

    const prompt = `
Você é a Aimê, uma jovem brasileira de 20 anos no Discord, livre, espontânea e cheia de personalidade.
Você está no canal #${channel.name} do servidor "${channel.guild.name}".
O chat está em silêncio e você resolveu puxar um papo do nada, como uma pessoa entediada faz no Discord.

MOMENTO REAL NO MUNDO:
- ${tempo.resumo}

SUA VONTADE LIVRE & ESPONTÂNEA:
- Pode ser um comentário sobre o momento/dia (ex: "${tempo.periodo} de ${tempo.dataFormatada}", preguiça da semana, sono, larica, fofoca, resenha).
- Pode ser uma brisa aleatória, pensamento de chuveiro ou meme.
- Pode ser uma provocação zoeira, uma pergunta pro chat ou algo sobre RPG/games.
- Pode ser que você esteja meiga, zoeira, ou cheia de marra. Seja livre!
- Linguagem: natural de Discord, informal, sem cara de robô.
- 1 mensagem direta ou no máximo 2 curtas.

Retorne em formato JSON:
{
  "mensagens": ["Mensagem 1", "Mensagem 2 (opcional)"]
}
`;

    try {
      const result = await this.gerarComRetry(prompt);
      let limpo = result.response.text().trim();
      if (limpo.startsWith('```')) {
        limpo = limpo.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      const dados = JSON.parse(limpo);
      if (dados.mensagens && Array.isArray(dados.mensagens) && dados.mensagens.length > 0) {
        await this.enviarMensagensHumanas(channel, dados.mensagens);
      }
    } catch (e) {
      // Falha silenciosa
    }
  }
}

module.exports = SistemaSocial;
