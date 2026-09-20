// ============================================================
// MESTRE DE RPG SUPREMO MULTIPLAYER (COM IA E APRENDIZADOS)
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const banco = require('./banco');

class MestreIA {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });
  }

  // Gera uma barra visual elegante estilo jogo
  gerarBarra(atual, maximo, tipo = 'vida', tamanho = 10) {
    const seguroAtual = Math.max(0, Math.min(atual, maximo));
    const proporcao = maximo > 0 ? seguroAtual / maximo : 0;
    const preenchidos = Math.round(proporcao * tamanho);
    const vazios = tamanho - preenchidos;

    let blocoCheio = '🟩';
    if (tipo === 'vida') {
      if (proporcao <= 0.25) blocoCheio = '🟥';
      else if (proporcao <= 0.5) blocoCheio = '🟨';
      else blocoCheio = '🟩';
    } else if (tipo === 'mana') {
      blocoCheio = '🟦';
    } else if (tipo === 'monstro') {
      blocoCheio = '🟪';
    }

    const barra = blocoCheio.repeat(preenchidos) + '⬜'.repeat(vazios);
    return `\`[${barra}]\` **${seguroAtual}/${maximo}**`;
  }

  rolarD20(mod = 0) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    let tipo = 'normal';
    if (d20 === 20) tipo = 'critico';
    if (d20 === 1) tipo = 'desastre';
    return { d20, mod, total, tipo };
  }

  gerarUrlImagem(promptIngles) {
    const seed = Math.floor(Math.random() * 999999);
    const promptLimpo = encodeURIComponent(
      `${promptIngles}, epic dark fantasy art, extremely detailed, cinematic lighting, unreal engine 5, 8k resolution`
    );
    return `https://image.pollinations.ai/prompt/${promptLimpo}?width=1024&height=576&nologo=true&seed=${seed}`;
  }

  limparEParsearJSON(texto) {
    let limpo = (texto || '').trim();
    if (limpo.startsWith('```')) {
      limpo = limpo.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }
    try {
      return JSON.parse(limpo);
    } catch (e1) {
      try {
        const corrigido = limpo.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(corrigido);
      } catch (e2) {
        const match = limpo.match(/\{[\s\S]*\}/);
        if (match) {
          const tent = match[0].replace(/,\s*([}\]])/g, '$1');
          return JSON.parse(tent);
        }
        throw e1;
      }
    }
  }

  // Processa a ação do jogador específico
  async processarTurno(jogador, acaoTexto) {
    const dado = this.rolarD20(jogador.nivel);
    const monstro = banco.dados.monstroAtual;
    const cenario = banco.dados.cenarioAtual;
    const regrasAprendidas = banco.obterMemoriaCompilada();

    const prompt = `
Você é o Mestre Supremo de um RPG de mesa infinito no Discord.
O jogador ${jogador.nome} (${jogador.classe}, Nível ${jogador.nivel}) realizou uma ação.

REGRAS E CONHECIMENTOS QUE VOCÊ APRENDEU COM OS JOGADORES NO CANAL #MELHORIAS (RESPEITE-AS RIGOROSAMENTE):
${regrasAprendidas}

DIRETRIZES DO MESTRE DE MESA (SENSO CRÍTICO, DESAFIO E ANTI-EXPLOIT):
1. Você NÃO aceita ações absurdas, quebras lógicas do mundo ou trapaças dos jogadores.
2. É ESTRITAMENTE PROIBIDO: permitir farm infinito de mana/XP, conceder níveis sem XP suficiente, permitir virar monstros/fungos sem feitiço de transmutação de alto nível, ou realizar "hitkill" instantâneo sem custo colossal.
3. Se o jogador tentar exploits, "farm infinito" ou rituais sem sentido/suicidas para burlar regras: AÇÃO FALHA! O Mestre narra o colapso do feitiço, aplicando dano de ricochete mágico (danoNoHeroi: 10 a 25) ou perda de mana, com uma explicação mística e imersiva das leis mágicas de Eldoria.
4. Rituais e magias fortes gastam Mana e Vida reais e exigem rolagens difíceis de d20.

ESTADO ATUAL:
- Jogador Ativo: ${jogador.nome} (Classe: ${jogador.classe}, HP: ${jogador.hp}/${jogador.hpMax}, Mana: ${jogador.mana}/${jogador.manaMax})
- Habilidades/Magias: ${(jogador.habilidades || []).join(', ') || 'Nenhuma registrada'}
- Inventário do Jogador: ${jogador.inventario.join(', ')}
- Inimigo Atual: ${monstro ? `${monstro.nome} (HP: ${monstro.hp}/${monstro.hpMax})` : 'Nenhum inimigo imediato'}
- Cenário: ${cenario.nome} - ${cenario.descricao}
- Resultado do Dado d20: ${dado.d20} (Modificador: +${dado.mod} | Total: ${dado.total} | Tipo: ${dado.tipo.toUpperCase()})

AÇÃO DECLARADA POR ${jogador.nome.toUpperCase()}:
"${acaoTexto}"

Gere uma resposta em JSON com:
{
  "narrativa": "Descrição cinematográfica e viva (2 a 3 parágrafos) em português brasileiro do que aconteceu após a ação.",
  "danoNoMonstro": número de 0 a 40 (se atacou o monstro),
  "danoNoHeroi": número de 0 a 25 (se tomou dano ou contra-ataque ou ricochete de feitiço falho),
  "manaGasta": número de 0 a 25 (se usou feitiço),
  "curaHeroi": número de 0 a 30 (se usou poção/magia de cura),
  "ouroGanho": número de 0 a 40,
  "xpGanho": número de 10 a 50,
  "itemGanho": "Nome do item ou null",
  "itemUsado": "Nome do item gasto do inventário ou null",
  "novoMonstro": { "nome": "Nome", "hpMax": 60 a 140 } OU null se continuar o mesmo,
  "novoCenario": { "nome": "Nome", "descricao": "Descrição" } OU null se continuar no mesmo,
  "revelacaoHistorica": { "titulo": "Nome do fato histórico ou segredo do mundo", "texto": "Revelação detalhada sobre o passado de Eldoria ou dos deuses antigos" } OU null,
  "novoAlvoRecompensa": { "alvo": "Monstro ou vilão lendário procurado", "recompensaOuro": 70 a 200, "perigo": "ALTO (Rank A)", "local": "Nome do local onde ele habita" } OU null,
  "promptImagemIngles": "Descrição detalhada em inglês para a arte da cena (ex: epic fantasy paladin striking glowing thunder hammer at shadow beast inside magma cave)",
  "opcoesSugeridas": ["Opção 1", "Opção 2", "Opção 3"]
}
`;

    const result = await this.model.generateContent(prompt);
    const dados = this.limparEParsearJSON(result.response.text());

    // Aplicar no jogador
    if (dados.danoNoHeroi) jogador.hp = Math.max(0, jogador.hp - dados.danoNoHeroi);
    if (dados.curaHeroi) jogador.hp = Math.min(jogador.hpMax, jogador.hp + dados.curaHeroi);
    if (dados.manaGasta) jogador.mana = Math.max(0, jogador.mana - dados.manaGasta);
    if (dados.ouroGanho) jogador.ouro += dados.ouroGanho;
    if (dados.xpGanho) {
      jogador.xp += dados.xpGanho;
      if (jogador.xp >= jogador.xpProximoNivel) {
        jogador.nivel += 1;
        jogador.xp -= jogador.xpProximoNivel;
        jogador.xpProximoNivel = Math.floor(jogador.xpProximoNivel * 1.5);
        jogador.hpMax += 25;
        jogador.hp = jogador.hpMax;
        jogador.manaMax += 15;
        jogador.mana = jogador.manaMax;
        dados.narrativa += `\n\n🎉 **LEVEL UP!** ${jogador.nome} alcançou o Nível ${jogador.nivel}! Seus atributos foram aumentados e seu HP/Mana restaurados!`;
      }
    }

    if (dados.itemGanho) jogador.inventario.push(dados.itemGanho);
    if (dados.itemUsado) {
      const idx = jogador.inventario.indexOf(dados.itemUsado);
      if (idx !== -1) jogador.inventario.splice(idx, 1);
    }

    // Aplicar no monstro
    if (banco.dados.monstroAtual && dados.danoNoMonstro) {
      banco.dados.monstroAtual.hp = Math.max(0, banco.dados.monstroAtual.hp - dados.danoNoMonstro);
      if (banco.dados.monstroAtual.hp === 0) {
        dados.narrativa += `\n\n💀 **VITÓRIA!** O inimigo ${banco.dados.monstroAtual.nome} foi aniquilado pela Party!`;
      }
    }

    if (dados.novoMonstro) {
      banco.dados.monstroAtual = {
        nome: dados.novoMonstro.nome,
        hp: dados.novoMonstro.hpMax,
        hpMax: dados.novoMonstro.hpMax,
        status: 'Feroz e pronto para lutar'
      };
    } else if (banco.dados.monstroAtual && banco.dados.monstroAtual.hp === 0) {
      banco.dados.monstroAtual = null;
    }

    if (dados.novoCenario) {
      banco.dados.cenarioAtual = dados.novoCenario;
    }

    banco.dados.ultimasOpcoes = dados.opcoesSugeridas || [];
    banco.salvar();

    // Montar o Embed
    const imagemUrl = this.gerarUrlImagem(dados.promptImagemIngles || 'epic fantasy battlefield');

    let hud = `🛡️ **${jogador.nome}** (${jogador.classe} Nív. ${jogador.nivel})\n`;
    hud += `💖 HP:   ${this.gerarBarra(jogador.hp, jogador.hpMax, 'vida')}\n`;
    hud += `⚡ MANA: ${this.gerarBarra(jogador.mana, jogador.manaMax, 'mana')}\n`;
    hud += `🪙 Ouro: **${jogador.ouro}** | ⚔️ XP: **${jogador.xp}/${jogador.xpProximoNivel}**\n`;

    if (banco.dados.monstroAtual) {
      hud += `\n👾 **INIMIGO: ${banco.dados.monstroAtual.nome.toUpperCase()}**\n`;
      hud += `🩸 HP:   ${this.gerarBarra(banco.dados.monstroAtual.hp, banco.dados.monstroAtual.hpMax, 'monstro')}\n`;
    }

    let cor = 0x2ecc71; // verde
    if (dado.tipo === 'critico') cor = 0xf1c40f; // dourado
    if (dado.tipo === 'desastre') cor = 0xe74c3c; // vermelho

    const embed = {
      title: `🏰 ${banco.dados.cenarioAtual.nome}`,
      description: `${hud}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎲 **Rolagem de ${jogador.nome}:** d20 = **${dado.d20}** ${dado.tipo === 'critico' ? '🌟 **ACERTO CRÍTICO!**' : (dado.tipo === 'desastre' ? '💥 **FALHA CRÍTICA!**' : '')}\n\n📖 **O que acontece:**\n${dados.narrativa}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n💡 **Sugestões para o próximo jogador (ou digite ação livre):**\n` +
        dados.opcoesSugeridas.map((op, i) => `**[${i+1}]** ${op}`).join('\n'),
      color: cor,
      image: { url: imagemUrl },
      footer: { text: `RPG Multiplayer • Ação de ${jogador.nome} • Use !agir <sua ação>` },
      timestamp: new Date().toISOString()
    };

    return { embed, dados, dado };
  }

  // ============================================================
  // MOTOR DE SISTEMAS E COMANDOS DINÂMICOS DA IA
  // Executa comandos dinâmicos criados pela comunidade (ex: !craft, !habilidades, etc)
  // ============================================================
  async executarComandoDinamico(jogador, comandoNome, argsTexto) {
    const cmdInfo = banco.obterComandoDinamico(comandoNome);
    const dado = this.rolarD20(jogador.nivel);
    const regrasAprendidas = banco.obterMemoriaCompilada();

    // Se for o comando craft e o jogador não passou argumentos, mostra ajuda amigável
    if ((comandoNome === 'craft' || comandoNome === 'forjar') && !argsTexto.trim()) {
      const itensLista = jogador.inventario && jogador.inventario.length > 0 
        ? jogador.inventario.map(i => `• \`${i}\``).join('\n')
        : '*Sua mochila está vazia!*';

      return {
        embed: {
          title: `🔨 Oficina de Forja e Alquimia Arcana (!craft)`,
          description: `Combine dois itens do seu inventário para criar equipamentos lendários, elixires ou relíquias místicas!\n\n` +
                       `🎒 **Seus Itens Disponíveis para Craft:**\n${itensLista}\n\n` +
                       `📖 **Como Usar:**\n` +
                       `\`!craft <Item 1> + <Item 2>\`\n\n` +
                       `💡 *Exemplo:* \`!craft ${jogador.inventario[0] || 'Escama de Dragão'} + ${jogador.inventario[1] || 'Essência Mística'}\`\n` +
                       `A IA avaliará a compatibilidade mágica dos materiais e forjará o resultado!`,
          color: 0xe67e22,
          image: { url: this.gerarUrlImagem('blacksmith fantasy forge mystical enchanting table glowing runes crafting items 8k') },
          footer: { text: `Sistema de Craft Dinâmico de Eldoria • Use !craft <Item 1> + <Item 2>` }
        }
      };
    }

    const prompt = `
Você é o Motor Universal de Sistemas Dinâmicos de RPG de Eldoria.
O jogador ${jogador.nome} (${jogador.classe}, Nível ${jogador.nivel}) usou o comando '!${comandoNome}'.

ARGUMENTOS FORNECIDOS PELO JOGADOR:
"${argsTexto}"

INFORMAÇÕES DO SISTEMA/COMANDO:
- Nome do comando: "${comandoNome}"
- Descrição: ${cmdInfo ? cmdInfo.descricao : 'Comando dinâmico gerado pela comunidade'}
- Regras de Execução: ${cmdInfo ? cmdInfo.regras : 'Processe a ação com base na lógica e lore do RPG de Eldoria'}

FICHA ATUAL DO JOGADOR:
- Inventário: ${jogador.inventario.join(', ')}
- Habilidades/Magias: ${(jogador.habilidades || []).join(', ')}
- HP: ${jogador.hp}/${jogador.hpMax} | Mana: ${jogador.mana}/${jogador.manaMax} | Ouro: ${jogador.ouro} | Nível: ${jogador.nivel}
- Rolagem de Teste d20: ${dado.d20} (Modificador: +${dado.mod} | Total: ${dado.total} | Tipo: ${dado.tipo.toUpperCase()})

REGRAS GERAIS DE ELDORIA APRENDIDAS:
${regrasAprendidas}

SUA TAREFA:
1. Avalie a ação do comando de forma justa, lógica e envolvente.
2. SE FOR CRAFT / ALQUIMIA / FORJA:
   - Verifique se os itens mencionados realmente existem no inventário do jogador (considere correspondência parcial de nomes).
   - Se o jogador NÃO possuir os itens, o craft falha ("sucesso": false, "itensConsumidos": [], "itensGanhos": []).
   - Se possuir e a combinação fizer sentido: consuma os ingredientes, invente um novo item criativo e coerente com Eldoria, atribua propriedades ou bônus.
   - Um d20 alto (15-20) gera versões raras ou encantadas; d20 baixo (1-4) pode causar impureza ou falha.
3. Se for outro tipo de comando dinâmico: gere a narrativa, mutações e consequências condizentes.
4. NUNCA permita quebras de jogo ou exploits (itens de xp infinito, etc).

Retorne em formato JSON:
{
  "sucesso": true ou false,
  "titulo": "Título épico do resultado (ex: Forja Dracônica Concluída)",
  "narrativa": "Descrição detalhada do processo, da energia mágica e do resultado obtido.",
  "itensConsumidos": ["Item A", "Item B"] (itens que devem ser removidos da mochila ou array vazio),
  "itensGanhos": ["Item Resultante"] (novos itens a adicionar ou array vazio),
  "habilidadesGanhas": ["Nova Magia/Habilidade se aplicável"] (ou array vazio),
  "ouroGanho": 0,
  "ouroGasto": 0,
  "hpMod": 0,
  "manaMod": 0,
  "xpGanho": 10 a 30 (pela prática e criação),
  "novosCamposFicha": {} (opcional, para atributos adicionais),
  "promptImagemIngles": "Descrição detalhada em inglês para ilustrar a criação ou o evento do comando em alta qualidade"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const dados = this.limparEParsearJSON(result.response.text());

      // Validar itens consumidos com o inventário real
      if (Array.isArray(dados.itensConsumidos) && dados.itensConsumidos.length > 0) {
        const itensValidos = [];
        for (const gasto of dados.itensConsumidos) {
          const achou = jogador.inventario.some(
            inv => inv.toLowerCase().includes(gasto.toLowerCase()) || gasto.toLowerCase().includes(inv.toLowerCase())
          );
          if (achou) {
            itensValidos.push(gasto);
          }
        }
        dados.itensConsumidos = itensValidos;
      }

      // Se a IA disse que teve sucesso mas os itens eram falsos ou não tinha:
      if (dados.itensConsumidos.length === 0 && (comandoNome === 'craft' || comandoNome === 'forjar') && dados.sucesso) {
        // Se tentou craftar sem ter os itens
        dados.sucesso = false;
        dados.itensGanhos = [];
        dados.narrativa = `Você tentou combinar materiais, mas percebeu que não carrega todos os ingredientes necessários em sua mochila!`;
      }

      // Aplicar mutações reais na ficha
      if (dados.sucesso) {
        banco.mutarJogador(jogador.id, dados);
      }

      const imagemUrl = this.gerarUrlImagem(dados.promptImagemIngles || 'mystical fantasy alchemy craft enchanting table 8k');

      let resumoMutacoes = '';
      if (dados.itensConsumidos && dados.itensConsumidos.length > 0) {
        resumoMutacoes += `🔥 **Consumiu:** ${dados.itensConsumidos.map(i => `\`${i}\``).join(', ')}\n`;
      }
      if (dados.itensGanhos && dados.itensGanhos.length > 0) {
        resumoMutacoes += `✨ **Obteve:** ${dados.itensGanhos.map(i => `**${i}**`).join(', ')}\n`;
      }
      if (dados.habilidadesGanhas && dados.habilidadesGanhas.length > 0) {
        resumoMutacoes += `🔮 **Aprendeu:** ${dados.habilidadesGanhas.map(h => `\`${h}\``).join(', ')}\n`;
      }
      if (dados.xpGanho) {
        resumoMutacoes += `⚔️ **XP Ganho:** +${dados.xpGanho} XP\n`;
      }

      const embed = {
        title: `${dados.sucesso ? '✨' : '⚠️'} ${dados.titulo || `Ação do Comando !${comandoNome}`}`,
        description: `🎲 **Rolagem de Teste (d20):** **${dado.d20}** ${dado.tipo === 'critico' ? '🌟 **ACERTO CRÍTICO!**' : (dado.tipo === 'desastre' ? '💥 **FALHA CRÍTICA!**' : '')}\n\n` +
                     `📖 **Relato:**\n${dados.narrativa}\n\n` +
                     (resumoMutacoes ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${resumoMutacoes}\n` : '') +
                     `🎒 **Mochila Atualizada:** ${jogador.inventario.length} itens. Digite \`!status\` para ver sua ficha completa.`,
        color: dados.sucesso ? 0x9b59b6 : 0xe74c3c,
        image: { url: imagemUrl },
        footer: { text: `Comando Dinâmico !${comandoNome} • Aventureiro: ${jogador.nome}` },
        timestamp: new Date().toISOString()
      };

      return { embed, dados, dado };

    } catch (err) {
      console.error('[Comando Dinâmico] Erro ao executar:', err.message);
      return {
        embed: {
          title: `⚠️ Falha ao Processar !${comandoNome}`,
          description: `Os fluxos mágicos de Eldoria oscilaram durante o comando. Verifique a sintaxe e tente novamente!\n\n*Detalhes: ${err.message}*`,
          color: 0xe74c3c
        }
      };
    }
  }
}

module.exports = MestreIA;
