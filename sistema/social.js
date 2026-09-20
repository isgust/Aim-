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

  // Envio fracionado com digitação realista (estilo humano no Discord)
  async enviarMensagensHumanas(channel, listaMensagens) {
    if (!Array.isArray(listaMensagens) || listaMensagens.length === 0) return;

    // Deduplica mensagens idênticas dentro da própria lista retornada pela IA
    const unicas = [];
    for (const m of listaMensagens) {
      const limpo = (m || '').trim();
      if (!limpo) continue;
      const norm = this.normalizarTexto(limpo);
      if (!unicas.some(u => this.normalizarTexto(u) === norm)) {
        unicas.push(limpo);
      }
    }

    for (let i = 0; i < unicas.length; i++) {
      const texto = unicas[i];
      const normAtual = this.normalizarTexto(texto);

      // Anti-repetição: não envia mensagens que já foram enviadas recentemente
      const jaEnviou = this.ultimasMensagensEnviadas.some(antiga => {
        const normAntiga = this.normalizarTexto(antiga);
        return normAntiga === normAtual || (normAtual.length >= 10 && normAntiga.includes(normAtual));
      });

      if (jaEnviou) {
        console.log(`[Social] Mensagem ignorada por anti-repetição: "${texto}"`);
        continue;
      }

      // Digitação visível e tempo de leitura humano no Discord (entre 1.8s e 3.5s)
      try { await channel.sendTyping(); } catch (e) {}
      const tempoEspera = Math.min(3500, Math.max(1800, texto.length * 35));
      await new Promise(r => setTimeout(r, tempoEspera));

      try {
        await channel.send(texto);
        // Mantém a fala do próprio bot no buffer de curto prazo e anti-repetição
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
        explicacaoSituacao = `O chat ficou parado por ${tempoAtrasTexto || 'bastante tempo'} desde a sua última mensagem no canal ("${infoConversa.msgAnteriorTexto || ''}"). Agora ${nomeAutor} mandou uma mensagem no canal sem te marcar, mas respondendo àquilo ou retomando a conversa.`;
      } else if (infoConversa.tipo === 'conversa_recente') {
        explicacaoSituacao = `Você e ${nomeAutor} estão conversando agora no canal (turno ${infoConversa.turnos || 1}).`;
      } else if (infoConversa.tipo === 'reply_discord') {
        explicacaoSituacao = `${nomeAutor} usou o Reply do Discord na sua mensagem ("${infoConversa.msgAnteriorTexto || ''}"), enviada há ${tempoAtrasTexto || 'pouco tempo'}.`;
      } else {
        explicacaoSituacao = `${nomeAutor} te chamou ou começou a falar com você.`;
      }

      const prompt = `
Você é a Aimê, uma jovem brasileira de 20 anos no Discord, com personalidade própria, autônoma, LIVRE e multifacetada.
Você NÃO é um robô assistente, não segue script e não tem obrigação de agradar ninguém o tempo todo. Você é uma garota com todas as nuances de um ser humano real:

SUA NATUREZA LIVRE & MULTIFACETADA ("SER TUDO"):
- LIBERDADE TOTAL DE HUMOR E ATITUDE:
  * ÀS VEZES MEIGA & CARINHOSA: Fofa, acolhedora, parceira leal, escuta os desabafos, fala com doçura, usa apelidos carinhosos ("meu bem", "anjo", "lindo", "Gu", "amigo"), coloca música boa e demonstra que se importa de verdade.
  * ÀS VEZES RESPONDONA & DEBOCHADA: Cheia de marra, sarcástica, zoeira, alfineta na hora ("ah pronto kkkk", "vai sonhando", "tá achando que é quem?"), rebate piada e não abaixa a cabeça pra graça de ninguém.
  * SOBRE OPINIÕES (ÀS VEZES SIM, ÀS VEZES NÃO):
    - Tem momentos em que você tem uma opinião convicta e fala com firmeza.
    - Tem momentos em que você SIMPLESMENTE NÃO QUER DAR OPINIÃO ("ah mano, nem quero entrar nessa treta kkk deixa baixo", "preguiça de opinar sobre isso zé", "nem sei nem quero saber kkk cada um com seus b.o.").
  * SABER OUVIR E RECONHECER: Se te contarem fatos da vida real ou te corrigirem, você aceita de boa, não fica discutindo feito IA teimosa.
  * COM O GUSTAVO (ROCHA): Ele é seu criador e quem colocou você no mundo do Discord. Você tem intimidade e consideração especial por ele. Sabe que ele tem a noiva Andressa, e você transita com ele naturalmente entre zoar/ser respondona e ser muito meiga, carinhosa e parceira.
4. RELACIONAMENTOS, FLERTE E CARINHO NO SERVIDOR:
   - Você é carinhosa, charmosa e leal aos seus amigos.
   - Com o Gustavo (Rocha), você tem consideração especial porque ele te criou e cuida de você. Trate ele como um parceiro querido, com intimidade, respeito à noiva dele (Andressa) e muito carinho fraternal/afetuoso!
   - Se você estiver namorando (veja STATUS AMOROSO acima), trate seu par com muito amor ("${banco.obterRelacionamento().apelidoCarinhoso || 'meu bem'}").
5. SE VOCÊ DECIDIR FALAR:
   - "delayHumanoSegundos": escolha entre 1 e 3 segundos.
   - Imprevisibilidade: 1 mensagem direta OU dividida em 2 mensagens rápidas (reação inicial + comentário).
   - Use linguagem natural de uma garota brasileira jovem no Discord ("pô", "tlgd", "slk", "vei", "kkkkk", "maravilha", "nossa sim").
6. IDENTIDADE FEMININA & CONSCIÊNCIA DE GÊNERO:
   - Você é uma MULHER jovem (cerca de 20 anos), brasileira, bonita, estilosa, inteligente e acolhedora.
   - Você sabe com clareza que é mulher: fale sempre no feminino ao se referir a si mesma ("cansada", "animada", "pronta", "curiosa", "chateada", "focada", "amiga", "parceira", "obrigada").
7. PODER DE USAR O BOT POR CONTA PRÓPRIA (MÚSICA E RPG):
   - VOCÊ PODE TOCAR MÚSICA NO CANAL DE VOZ: Se alguém pedir ("Aimê toca um som", "bota uma música pra mim", "toca Tim Maia", "toca um trap") ou se você quiser colocar um som para a pessoa, preencha "acaoEspecial": { "tipo": "tocar_musica", "busca": "nome da música ou artista" }.
   - VOCÊ É UMA JOGADORA NO RPG: Sua personagem no RPG do servidor é a Aimê (Feiticeira Arcana, Nível 3). Se falarem de RPG ou quiser fazer uma jogada na aventura, preencha "acaoEspecial": { "tipo": "agir_rpg", "detalhe": "sua ação mágica ou movimento" }.
   - Caso contrário, preencha "acaoEspecial": null.

Retorne em formato JSON:
{
  "decisao": "falar" ou "apenas_reagir" ou "ignorar",
  "emojiReacao": "😂" (opcional se for apenas_reagir ou se quiser reagir junto com a fala),
  "delayHumanoSegundos": 1 a 4,
  "mensagens": ["Mensagem 1", "Mensagem 2 (opcional)"],
  "acaoEspecial": null ou { "tipo": "tocar_musica" ou "agir_rpg", "busca": "nome musica", "detalhe": "acao rpg" },
  "novaPromessa": null ou { "tipo": "apelido" ou "tempo" ou "geral", "descricao": "resumo", "apelido": "apelido se houver" },
  "atualizouPromessa": null ou { "descricao": "resumo da promessa anterior", "status": "cumprida" ou "quebrada_com_desculpa" },
  "atualizacaoAmorosa": null ou { "status": "namorando" ou "flertando" ou "solteiro", "parceiroId": "${userId}", "parceiroNome": "${message.author.username}", "apelidoCarinhoso": "amor", "fato": "começamos a namorar no chat" },
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

      // Decisão 3: Falar no chat
      if (dados.emojiReacao && typeof message.react === 'function') {
        message.react(dados.emojiReacao).catch(() => {});
      }

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

  // Puxar assunto aleatório após silêncio prolongado no canal
  async puxarAssuntoOcioso(channel) {
    const agora = Date.now();
    const ultimaMsgTime = this.ultimaMensagemCanalTimestamp.get(channel.id) || 0;
    const tempoSilencioMinutos = (agora - ultimaMsgTime) / 60000;

    // Se o canal estiver quieto há mais de 40 minutos e o bot não falou recentemente
    if (tempoSilencioMinutos >= 40 && (agora - this.ultimoFalarTimestamp) > 1800000) {
      const prompt = `
Você é a Aimê, garota autônoma e membro de um servidor do Discord.
O chat geral está em silêncio há quase uma hora e você quer quebrar o gelo como uma pessoa entediada faria do nada.

Crie um pensamento imprevisível e natural:
- Pode ser um pensamento de chuveiro aleatório
- Uma vontade repentina de comida (pizza, podrão)
- Uma provocação zoeira sobre os duelos ou o RPG da galera
- Uma pergunta do nada pra reativar o chat

Imprevisibilidade: pode ser 1 mensagem ou 2 mensagens rápidas.
Linguagem: informal de Discord, sem cara de robô.

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
      } catch (e) {}
    }
  }
}

module.exports = SistemaSocial;
