// ============================================================
// SISTEMA DE BANCO DE DADOS E PERSISTÊNCIA
// ============================================================

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'dados.json');

class BancoDeDados {
  constructor() {
    this.dados = {
      jogadores: {}, // userId -> ficha
      monstroAtual: {
        nome: 'Dragão Jovem das Cavernas',
        hp: 120,
        hpMax: 120,
        status: 'Soltando fumaça pelas narinas'
      },
      cenarioAtual: {
        nome: 'Câmara do Fogo Antigo',
        descricao: 'Uma caverna vulcânica com pontes de obsidiana e rios de magma borbulhante.'
      },
      aprendizados: [], // regras aprendidas no canal #melhorias
      lore: [
        {
          id: 1,
          titulo: "A Era do Cataclismo e os Deuses Silenciosos",
          texto: "Há mil anos, a Primeira Fenda Arcano-Vulcânica rasgou o continente de Eldoria. Os antigos guardiões desapareceram, deixando para trás relíquias corrompidas e mapas estelares esquecidos nas profundezas das torres altas.",
          descobertaPor: "Ancestrais",
          data: "Era Antiga"
        }
      ],
      recompensas: [
        {
          id: 1,
          alvo: "Gor'Kresh, o Devorador de Ossos",
          recompensaOuro: 150,
          perigo: "ALTO (Rank A)",
          local: "Pântano das Brumas Negras",
          status: "ATIVO"
        },
        {
          id: 2,
          alvo: "Sombra Espreitadora de Aethelgard",
          recompensaOuro: 80,
          perigo: "MÉDIO (Rank B)",
          local: "Catacumbas Subterrâneas",
          status: "ATIVO"
        }
      ],
      mapas: [
        {
          id: 1,
          regiao: "Reino Central de Eldoria & Torre Alta de Aethelgard",
          descricao: "Cidadela de pedra ancestral cercada por abismos e florestas impenetráveis.",
          promptImagem: "ancient fantasy world map parchment, cartography of dark mythical realm, intricate details, vintage compass, aged paper, 8k"
        }
      ],
      regioes: {
        'aethelgard': {
          id: 'aethelgard',
          nome: 'Aethelgard (Capital)',
          descricao: 'Grande cidadela fortificada com tavernas, muralhas de pedra e a Torre Alta de magos.',
          perigo: 'Seguro / Moderado',
          conexoes: ['catacumbas', 'floresta'],
          promptImagem: 'grand medieval fantasy citadel Aethelgard with towering stone spires, bustling cobblestone plaza, dramatic sunset, 8k'
        },
        'catacumbas': {
          id: 'catacumbas',
          nome: 'Catacumbas Esquecidas',
          descricao: 'Criptas subterrâneas escuras cobertas de musgo bioluminescente e tumbas seladas.',
          perigo: 'Perigoso (Rank C)',
          conexoes: ['aethelgard', 'pantano'],
          promptImagem: 'dark underground crypts with glowing blue mushrooms, stone tombs, skeleton warriors, fantasy dungeon art, 8k'
        },
        'floresta': {
          id: 'floresta',
          nome: 'Floresta dos Murmúrios',
          descricao: 'Floresta ancestral densa e enevoada onde bestas ferozes e foragidos se escondem.',
          perigo: 'Perigoso (Rank B)',
          conexoes: ['aethelgard', 'vulcao'],
          promptImagem: 'mystical enchanted dark forest with towering mossy trees, eerie green fog, glowing spirits, fantasy atmosphere, 8k'
        },
        'pantano': {
          id: 'pantano',
          nome: 'Pântano das Brumas Negras',
          descricao: 'Pântano lodoso e fétido com águas venenosas e monstros grotescos de Rank A.',
          perigo: 'Muito Perigoso (Rank A)',
          conexoes: ['catacumbas', 'vulcao'],
          promptImagem: 'dark poisonous swamp with black waters, dead twisted trees, fog, monster eyes glowing in murky swamp, 8k'
        },
        'vulcao': {
          id: 'vulcao',
          nome: 'Pico da Forja Vulcânica',
          descricao: 'Montanha vulcânica de obsidiana e rios de lava, covil de dragões e elementais.',
          perigo: 'Extremo (Rank S)',
          conexoes: ['floresta', 'pantano'],
          promptImagem: 'epic volcanic mountain with lava rivers, dragon flying over caldera, burning obsidian fortress, cinematic lighting, 8k'
        }
      },
      sistemasDinamicos: {}
    };
    this.carregar();
  }

  carregar() {
    if (fs.existsSync(DB_PATH)) {
      try {
        const conteudo = fs.readFileSync(DB_PATH, 'utf8');
        this.dados = JSON.parse(conteudo);
        if (!this.dados.sistemasDinamicos) this.dados.sistemasDinamicos = {};
        if (!this.dados.estatisticas) this.dados.estatisticas = { usuarios: {}, canais: {}, totalMensagens: 0 };
        if (!this.dados.opinioesSobreMembros) this.dados.opinioesSobreMembros = {};
        if (!this.dados.memoriaSocial) this.dados.memoriaSocial = {};
        // Garantir que todos os jogadores tenham habilidades e atributos extras
        if (this.dados.jogadores) {
          for (const j of Object.values(this.dados.jogadores)) {
            if (!j.habilidades) j.habilidades = [];
            if (!j.atributosExtras) j.atributosExtras = {};
          }
        }
      } catch (e) {
        console.error('[Banco] Erro ao carregar dados, usando estado padrão:', e.message);
      }
    } else {
      this.salvar();
    }
  }

  salvar() {
    fs.writeFileSync(DB_PATH, JSON.stringify(this.dados, null, 2));
  }

  // ==========================================================
  // MEMÓRIA SOCIAL DE PROMESSAS, ACORDOS E APELIDOS COM MEMBROS
  // ==========================================================
  obterMemoriaSocial(userId) {
    if (!this.dados.memoriaSocial) this.dados.memoriaSocial = {};
    if (!this.dados.memoriaSocial[userId]) {
      this.dados.memoriaSocial[userId] = {
        apelidos: [],
        promessas: []
      };
    }
    return this.dados.memoriaSocial[userId];
  }

  salvarApelidoSocial(userId, apelido) {
    if (!apelido) return;
    const mem = this.obterMemoriaSocial(userId);
    if (!mem.apelidos) mem.apelidos = [];
    if (!mem.apelidos.includes(apelido.trim())) {
      mem.apelidos.push(apelido.trim());
      this.salvar();
    }
  }

  salvarNovaPromessaSocial(userId, promessa) {
    const mem = this.obterMemoriaSocial(userId);
    if (!mem.promessas) mem.promessas = [];
    if (promessa && promessa.descricao) {
      mem.promessas.push({
        id: Date.now().toString(),
        descricao: promessa.descricao,
        tipo: promessa.tipo || 'geral',
        cumprida: false,
        data: new Date().toLocaleDateString('pt-BR')
      });
      if (promessa.tipo === 'apelido' && promessa.apelido) {
        if (!mem.apelidos) mem.apelidos = [];
        if (!mem.apelidos.includes(promessa.apelido)) {
          mem.apelidos.push(promessa.apelido);
        }
      }
      if (mem.promessas.length > 10) mem.promessas.shift();
      this.salvar();
    }
  }

  atualizarStatusPromessa(userId, descricaoBusca, novoStatus) {
    const mem = this.obterMemoriaSocial(userId);
    if (mem && mem.promessas) {
      for (const p of mem.promessas) {
        if (p.descricao.toLowerCase().includes(descricaoBusca.toLowerCase()) || descricaoBusca.toLowerCase().includes(p.descricao.toLowerCase())) {
          p.status = novoStatus;
          p.cumprida = (novoStatus === 'cumprida');
          this.salvar();
          break;
        }
      }
    }
  }

  resumoMemoriaSocialParaIA(userId, nomeUsuario) {
    const mem = this.obterMemoriaSocial(userId);
    let linhas = [];

    if (mem.apelidos && mem.apelidos.length > 0) {
      linhas.push(`- Apelidos acordados/combinados para chamar ele: ${mem.apelidos.map(a => `"${a}"`).join(', ')}`);
    }

    if (mem.promessas && mem.promessas.length > 0) {
      const ativas = mem.promessas.slice(-5);
      linhas.push(`- Promessas / acordos que você fez com ele anteriormente:`);
      for (const p of ativas) {
        linhas.push(`  * "${p.descricao}" (feita em ${p.data}${p.status ? ` - status: ${p.status}` : ''})`);
      }
    }

    if (linhas.length === 0) {
      return `Nenhuma promessa anterior ou apelido específico registrado ainda com ${nomeUsuario}.`;
    }

    return `HISTÓRICO DE ACORDOS, PROMESSAS E APELIDOS COM ${nomeUsuario}:\n` + linhas.join('\n');
  }

  // ==========================================================
  // STATUS DE RELACIONAMENTO, FLERTE E ROMANCE DO SÃO RAIMUNDO
  // ==========================================================
  obterRelacionamento() {
    if (!this.dados.relacionamento) {
      this.dados.relacionamento = {
        status: 'solteiro', // 'solteiro', 'flertando', 'namorando', 'casado'
        parceiroId: null,
        parceiroNome: null,
        iniciadoEm: null,
        apelidoCarinhoso: null,
        historicoAmoroso: []
      };
    }
    return this.dados.relacionamento;
  }

  atualizarRelacionamento(novoEstado) {
    const rel = this.obterRelacionamento();
    Object.assign(rel, novoEstado);
    this.salvar();
    return rel;
  }

  resumoAmorosoParaIA() {
    const rel = this.obterRelacionamento();
    if (!rel || rel.status === 'solteiro') {
      return "STATUS AMOROSO: Você está SOLTEIRA, convicta, independente e NÃO quer flertar nem namorar com ninguém no servidor. Se alguém der em cima de você ou tentar bancar o cupido, dê um chega pra lá ou seja totalmente irônica e sarcástica!";
    }
    const fatos = (rel.historicoAmoroso && rel.historicoAmoroso.length > 0)
      ? rel.historicoAmoroso.slice(-3).map(h => h.fato).join('; ')
      : 'Sem fatos';
    return `STATUS AMOROSO: ${rel.status.toUpperCase()} de zoeira com ${rel.parceiroNome || 'alguém'}.\n` +
           `• Comportamento: Trate com ironia e zoeira. Você não é melosa e não busca romance sério.`;
  }

  // Obter ou criar jogador vinculado ao ID do Discord
  obterJogador(userId) {
    const j = this.dados.jogadores[userId] || null;
    if (j) {
      if (!j.habilidades) j.habilidades = [];
      if (!j.atributosExtras) j.atributosExtras = {};
    }
    return j;
  }

  gerarHabilidadesIniciais(classe) {
    const c = (classe || '').toLowerCase();
    if (c.includes('wicca')) {
      return ['Ritual das Cinzas', 'Canalização Lunar', 'Troca Equivalente Menor'];
    } else if (c.includes('mago') || c.includes('feiticeir') || c.includes('brux') || c.includes('arcano')) {
      return ['Orbe Arcano', 'Escudo Elemental', 'Raio Gélido'];
    } else if (c.includes('guerreiro') || c.includes('barbar') || c.includes('berserk')) {
      return ['Golpe Sísmico', 'Fúria de Batalha', 'Postura Inabalável'];
    } else if (c.includes('paladino') || c.includes('clerig') || c.includes('sacerdot')) {
      return ['Golpe Sagrado', 'Aura de Proteção', 'Imposição das Mãos'];
    } else if (c.includes('ladino') || c.includes('assassin') || c.includes('arqueir') || c.includes('cacador')) {
      return ['Ataque Furtivo', 'Disparo Preciso', 'Passo Fantasma'];
    }
    return ['Ataque Básico Aprimorado', 'Foco de Combate', 'Instinto de Sobrevivência'];
  }

  criarJogador(userId, nome, classe) {
    let hpInicial = 100;
    let manaInicial = 50;

    if (classe.toLowerCase().includes('mago') || classe.toLowerCase().includes('feiticeiro')) {
      hpInicial = 80;
      manaInicial = 120;
    } else if (classe.toLowerCase().includes('guerreiro') || classe.toLowerCase().includes('paladino') || classe.toLowerCase().includes('barbaro')) {
      hpInicial = 140;
      manaInicial = 30;
    } else if (classe.toLowerCase().includes('ladino') || classe.toLowerCase().includes('arqueiro')) {
      hpInicial = 95;
      manaInicial = 60;
    }

    const novoJogador = {
      id: userId,
      nome: nome,
      classe: classe,
      nivel: 1,
      hp: hpInicial,
      hpMax: hpInicial,
      mana: manaInicial,
      manaMax: manaInicial,
      ouro: 25,
      xp: 0,
      xpProximoNivel: 100,
      habilidades: this.gerarHabilidadesIniciais(classe),
      atributosExtras: {},
      inventario: ['Poção de Cura Menor', 'Mochila de Aventureiro'],
      localizacao: 'Aethelgard (Capital)',
      criadoEm: new Date().toISOString()
    };

    this.dados.jogadores[userId] = novoJogador;
    this.salvar();
    return novoJogador;
  }

  // Lista todos os jogadores do servidor
  listarTodosJogadores() {
    return Object.values(this.dados.jogadores);
  }

  // Adicionar um novo aprendizado do canal #melhorias
  adicionarAprendizado(autor, sugestao, regraIA, categoria = 'geral') {
    const aprendizado = {
      id: this.dados.aprendizados.length + 1,
      autor: autor,
      data: new Date().toLocaleString('pt-BR'),
      sugestao: sugestao,
      regraIA: regraIA,
      categoria: categoria
    };

    this.dados.aprendizados.push(aprendizado);
    this.salvar();
    return aprendizado;
  }

  // Retorna o compilado de conhecimentos que a IA aprendeu
  obterMemoriaCompilada() {
    if (this.dados.aprendizados.length === 0) {
      return "Nenhuma regra caseira adicionada ainda.";
    }
    return this.dados.aprendizados
      .map(a => `- [${a.categoria.toUpperCase()}] Sugerido por ${a.autor}: ${a.regraIA}`)
      .join('\n');
  }

  // Adicionar Lore / Registro Histórico
  adicionarLore(titulo, texto, descobertaPor) {
    if (!this.dados.lore) this.dados.lore = [];
    const novoRegistro = {
      id: this.dados.lore.length + 1,
      titulo,
      texto,
      descobertaPor,
      data: new Date().toLocaleDateString('pt-BR')
    };
    this.dados.lore.push(novoRegistro);
    this.salvar();
    return novoRegistro;
  }

  // Obter Ranking ordenado
  obterRanking() {
    const lista = Object.values(this.dados.jogadores || {});
    return lista.sort((a, b) => {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.ouro - a.ouro;
    });
  }

  // Adicionar Recompensa (Bounty)
  adicionarRecompensa(alvo, recompensaOuro, perigo, local) {
    if (!this.dados.recompensas) this.dados.recompensas = [];
    const nova = {
      id: this.dados.recompensas.length + 1,
      alvo,
      recompensaOuro,
      perigo,
      local,
      status: "ATIVO"
    };
    this.dados.recompensas.push(nova);
    this.salvar();
    return nova;
  }

  // Abater Monstro de Recompensa
  abaterRecompensa(nomeAlvo, nomeHerói) {
    if (!this.dados.recompensas) return null;
    const item = this.dados.recompensas.find(r => r.alvo.toLowerCase().includes(nomeAlvo.toLowerCase()) && r.status === "ATIVO");
    if (item) {
      item.status = `ABATIDO por ${nomeHerói}`;
      this.salvar();
      return item;
    }
    return null;
  }

  // Adicionar Recompensa pela cabeça de um JOGADOR
  adicionarBountyJogador(alvoUserId, alvoNome, valorOuro, colocadoPor, motivo) {
    if (!this.dados.bountiesJogadores) this.dados.bountiesJogadores = [];
    const nova = {
      id: this.dados.bountiesJogadores.length + 1,
      alvoUserId,
      alvoNome,
      recompensaOuro: valorOuro,
      colocadoPor,
      motivo,
      status: "VIVO OU MORTO",
      data: new Date().toLocaleDateString('pt-BR')
    };
    this.dados.bountiesJogadores.push(nova);
    this.salvar();
    return nova;
  }

  // Buscar bounty ativa por jogador
  obterBountyDeJogador(userId) {
    if (!this.dados.bountiesJogadores) return null;
    return this.dados.bountiesJogadores.find(b => b.alvoUserId === userId && b.status === "VIVO OU MORTO");
  }

  // Cobrar a recompensa de um jogador abatido
  reivindicarBountyJogador(alvoUserId, vencedorNome) {
    if (!this.dados.bountiesJogadores) return null;
    const bounty = this.dados.bountiesJogadores.find(b => b.alvoUserId === alvoUserId && b.status === "VIVO OU MORTO");
    if (bounty) {
      bounty.status = `ABATIDO por ${vencedorNome}`;
      this.salvar();
      return bounty;
    }
    return null;
  }

  // Buscar região por id ou nome parcial
  obterRegiao(termo) {
    if (!this.dados.regioes) return null;
    const t = termo.toLowerCase();
    for (const [key, regiao] of Object.entries(this.dados.regioes)) {
      if (key.toLowerCase() === t || regiao.nome.toLowerCase().includes(t)) {
        return regiao;
      }
    }
    return null;
  }

  // Mover jogador para uma nova região
  moverJogador(userId, novaRegiaoNome) {
    const jogador = this.obterJogador(userId);
    if (!jogador) return null;
    jogador.localizacao = novaRegiaoNome;
    this.salvar();
    return jogador;
  }

  // Obter todos os jogadores presentes em uma determinada região
  obterJogadoresNaRegiao(regiaoNome) {
    const todos = Object.values(this.dados.jogadores || {});
    return todos.filter(j => (j.localizacao || 'Aethelgard (Capital)').toLowerCase().includes(regiaoNome.toLowerCase()));
  }

  // Registrar ou atualizar um comando dinâmico gerado pelo #melhorias
  adicionarComandoDinamico(nome, config = {}) {
    if (!this.dados.sistemasDinamicos) this.dados.sistemasDinamicos = {};
    const cmdLimpo = nome.toLowerCase().replace(/^!/, '').trim();
    this.dados.sistemasDinamicos[cmdLimpo] = {
      nome: cmdLimpo,
      descricao: config.descricao || 'Mecânica dinâmica assimilada pela comunidade',
      sintaxe: config.sintaxe || `!${cmdLimpo}`,
      categoria: config.categoria || 'mecânica',
      regras: config.regras || '',
      criadoPor: config.criadoPor || 'Comunidade',
      criadoEm: new Date().toLocaleDateString('pt-BR')
    };
    this.salvar();
    return this.dados.sistemasDinamicos[cmdLimpo];
  }

  obterComandoDinamico(nome) {
    if (!this.dados.sistemasDinamicos) return null;
    const cmdLimpo = nome.toLowerCase().replace(/^!/, '').trim();
    return this.dados.sistemasDinamicos[cmdLimpo] || null;
  }

  listarComandosDinamicos() {
    if (!this.dados.sistemasDinamicos) return [];
    return Object.values(this.dados.sistemasDinamicos);
  }

  // Aplica mutações na ficha do jogador com segurança
  mutarJogador(userId, mutacoes = {}) {
    const jogador = this.obterJogador(userId);
    if (!jogador) return null;

    if (!jogador.habilidades) jogador.habilidades = [];
    if (!jogador.atributosExtras) jogador.atributosExtras = {};

    // Consumir itens (busca inteligente)
    if (Array.isArray(mutacoes.itensConsumidos)) {
      mutacoes.itensConsumidos.forEach(itemNome => {
        const buscado = itemNome.toLowerCase().trim();
        const idx = jogador.inventario.findIndex(
          i => i.toLowerCase().includes(buscado) || buscado.includes(i.toLowerCase())
        );
        if (idx !== -1) {
          jogador.inventario.splice(idx, 1);
        }
      });
    }

    // Adicionar novos itens
    if (Array.isArray(mutacoes.itensGanhos)) {
      mutacoes.itensGanhos.forEach(item => {
        if (typeof item === 'string' && item.trim()) {
          jogador.inventario.push(item.trim());
        }
      });
    }

    // Aprender novas habilidades
    if (Array.isArray(mutacoes.habilidadesGanhas)) {
      mutacoes.habilidadesGanhas.forEach(hab => {
        if (typeof hab === 'string' && hab.trim() && !jogador.habilidades.includes(hab.trim())) {
          jogador.habilidades.push(hab.trim());
        }
      });
    }

    // Alterações de valores numéricos
    if (typeof mutacoes.ouroGanho === 'number') jogador.ouro += mutacoes.ouroGanho;
    if (typeof mutacoes.ouroGasto === 'number') jogador.ouro = Math.max(0, jogador.ouro - mutacoes.ouroGasto);
    if (typeof mutacoes.hpMod === 'number') jogador.hp = Math.max(0, Math.min(jogador.hpMax, jogador.hp + mutacoes.hpMod));
    if (typeof mutacoes.manaMod === 'number') jogador.mana = Math.max(0, Math.min(jogador.manaMax, jogador.mana + mutacoes.manaMod));
    if (typeof mutacoes.xpGanho === 'number') {
      jogador.xp += mutacoes.xpGanho;
      while (jogador.xp >= jogador.xpProximoNivel) {
        jogador.nivel += 1;
        jogador.xp -= jogador.xpProximoNivel;
        jogador.xpProximoNivel = Math.floor(jogador.xpProximoNivel * 1.5);
        jogador.hpMax += 25;
        jogador.hp = jogador.hpMax;
        jogador.manaMax += 15;
        jogador.mana = jogador.manaMax;
      }
    }

    // Novos atributos dinâmicos arbitrários
    if (mutacoes.novosCamposFicha && typeof mutacoes.novosCamposFicha === 'object') {
      for (const [chave, valor] of Object.entries(mutacoes.novosCamposFicha)) {
        jogador.atributosExtras[chave] = valor;
      }
    }

    this.salvar();
    return jogador;
  }
}

module.exports = new BancoDeDados();
