// ============================================================
// MÓDULO DE LORE DO MUNDO, RANKING, MAPAS E RECOMPENSAS
// Gerencia as publicações no canal dedicado #lore / #cronicas
// ============================================================

const banco = require('./banco');

class LoreEngine {
  constructor(mestreIA) {
    this.mestre = mestreIA;
  }

  // Localiza o canal de lore no servidor
  obterCanalLore(guild) {
    return guild.channels.cache.find(c => 
      c.isTextBased() && (
        c.name.includes('lore') || 
        c.name.includes('cronica') || 
        c.name.includes('historia') || 
        c.name.includes('mural') ||
        c.name.includes('reino')
      )
    );
  }

  gerarUrlImagem(promptIngles) {
    const seed = Math.floor(Math.random() * 999999);
    const promptLimpo = encodeURIComponent(
      `${promptIngles}, high fantasy vintage parchment illustration, ancient medieval lore, cinematic fantasy lighting, 8k resolution`
    );
    return `https://image.pollinations.ai/prompt/${promptLimpo}?width=1024&height=576&nologo=true&seed=${seed}`;
  }

  // Publica uma revelação histórica ou evento de lore marcante
  async publicarRevelacao(guild, titulo, texto, autorNome, promptImagem = null) {
    const canal = this.obterCanalLore(guild);
    if (!canal) return null;

    const imgPrompt = promptImagem || `ancient fantasy history revelation, mythical ruins, glowing runes, dark fantasy chronicle`;
    const imagemUrl = this.gerarUrlImagem(imgPrompt);

    banco.adicionarLore(titulo, texto, autorNome);

    const embed = {
      title: `📜 CRÔNICA HISTÓRICA: ${titulo.toUpperCase()}`,
      description: `*Registro do Passado gravado pelos acontecimentos de Eldoria:*\n\n` +
                   `${texto}\n\n` +
                   `🔍 **Descoberto através das ações de:** **${autorNome}**\n` +
                   `📅 **Data do Registro:** ${new Date().toLocaleDateString('pt-BR')}`,
      color: 0xd4af37, // Dourado antigo
      image: { url: imagemUrl },
      footer: { text: `Crônicas de Eldoria • Arquivo Histórico Oficial • Registro #${banco.dados.lore.length}` },
      timestamp: new Date().toISOString()
    };

    return await canal.send({ embeds: [embed] });
  }

  // Publica ou atualiza o Ranking Oficial de Jogadores
  async publicarRanking(guild) {
    const canal = this.obterCanalLore(guild);
    if (!canal) return null;

    const ranking = banco.obterRanking();
    if (ranking.length === 0) return null;

    let descricao = `O poder e a reputação dos heróis que caminham por Eldoria:\n\n`;

    ranking.forEach((j, index) => {
      let medalha = '🏅';
      if (index === 0) medalha = '🥇 **CAMPEÃO ATUAL**';
      else if (index === 1) medalha = '🥈 **VICE-CAMPEÃO**';
      else if (index === 2) medalha = '🥉 **3º LUGAR**';
      else medalha = `**${index + 1}º Lugar**`;

      descricao += `${medalha}: **${j.nome}** (<@${j.id}>)\n`;
      descricao += `  • **Classe:** ${j.classe} | **Nível:** ${j.nivel} (XP: ${j.xp}/${j.xpProximoNivel})\n`;
      descricao += `  • **Vida:** ${this.mestre.gerarBarra(j.hp, j.hpMax, 'vida')}\n`;
      descricao += `  • **Riqueza:** 🪙 **${j.ouro}** moedas de ouro\n\n`;
    });

    const imagemRanking = this.gerarUrlImagem('epic fantasy champions standing on grand royal throne room hall of fame, golden banners, triumphant heroes, majestic lighting, 8k');

    const embedRanking = {
      title: `🏆 RANKING OFICIAL DE AVENTUREIROS — ${guild.name.toUpperCase()}`,
      description: descricao,
      color: 0xf1c40f, // Amarelo ouro
      image: { url: imagemRanking },
      footer: { text: `Atualizado dinamicamente • O ranking muda conforme os feitos no RPG` },
      timestamp: new Date().toISOString()
    };

    return await canal.send({ embeds: [embedRanking] });
  }

  // Publica o Mural de Recompensas e Caçadas (Monstros E Jogadores Procurados)
  async publicarMuralRecompensas(guild) {
    const canal = this.obterCanalLore(guild);
    if (!canal) return null;

    const monstros = banco.dados.recompensas || [];
    const jogadoresProcurados = (banco.dados.bountiesJogadores || []).filter(b => b.status === "VIVO OU MORTO");

    let texto = ``;

    if (jogadoresProcurados.length > 0) {
      texto += `💀 **JOGADORES PROCURADOS (PVP BOUNTIES - CABEÇA A PRÊMIO):**\n`;
      jogadoresProcurados.forEach(b => {
        texto += `🔴 **PROCURADO:** **${b.alvoNome}** (<@${b.alvoUserId}>)\n`;
        texto += `  • 🪙 **Recompensa pela Cabeça:** **${b.recompensaOuro} MOEDAS DE OURO**\n`;
        texto += `  • 📜 **Crime/Motivo:** *"${b.motivo}"*\n`;
        texto += `  • 👤 **Contratante:** ${b.colocadoPor}\n`;
        texto += `  • ⚔️ *Para caçá-lo, use no chat: \`!duelo @${b.alvoNome}\`*\n\n`;
      });
      texto += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    texto += `👾 **MONSTROS & CRIATURAS PROCURADAS:**\n`;
    monstros.forEach(r => {
      const statusIcon = r.status.includes('ABATIDO') ? '☠️' : '🎯';
      texto += `${statusIcon} **ALVO:** **${r.alvo}**\n`;
      texto += `  • 🪙 **Recompensa:** **${r.recompensaOuro} moedas de ouro**\n`;
      texto += `  • ⚠️ **Nível de Perigo:** ${r.perigo}\n`;
      texto += `  • 📍 **Último paradeiro:** ${r.local}\n`;
      texto += `  • 📌 **Situação:** \`${r.status}\`\n\n`;
    });

    const imagemUrl = this.gerarUrlImagem('wanted posters board medieval dark fantasy tavern, gold coins, assassin dagger, dramatic lighting');

    const embedRecompensas = {
      title: `⚔️ MURAL DE RECOMPENSAS & CAÇADAS (BOUNTIES)`,
      description: texto + `*Qualquer jogador que abater um monstro ou um jogador procurado em duelo receberá o ouro na mesma hora!*`,
      color: 0xc0392b, // Vermelho de caçada
      image: { url: imagemUrl },
      footer: { text: `Guilda de Caçadores • Recompensas Reais em Ouro • Use !procurar @Jogador <valor> <motivo>` },
      timestamp: new Date().toISOString()
    };

    return await canal.send({ embeds: [embedRecompensas] });
  }

  // Publica um cartaz oficial individual quando um JOGADOR se torna procurado
  async publicarCartazProcurado(guild, bounty) {
    const canal = this.obterCanalLore(guild);
    if (!canal) return null;

    const imagemUrl = this.gerarUrlImagem(`wanted poster of rogue criminal ${bounty.alvoNome}, dark fantasy parchment, sketch portrait, vintage wood background, 8k`);

    const embed = {
      title: `🚨 PROCURADO: VIVO OU MORTO — ${bounty.alvoNome.toUpperCase()}`,
      description: `Foi emitido um mandado de caçada oficial contra o herói **${bounty.alvoNome}** (<@${bounty.alvoUserId}>)!\n\n` +
                   `🪙 **RECOMPENSA PELA CABEÇA:** **${bounty.recompensaOuro} MOEDAS DE OURO**\n` +
                   `⚠️ **MOTIVO DA CAÇADA:** *"${bounty.motivo}"*\n` +
                   `📜 **EMISSOR:** ${bounty.colocadoPor}\n\n` +
                   `⚔️ **COMO REIVINDICAR:**\n` +
                   `Qualquer aventureiro pode desafiar ou emboscar este jogador no RPG digitando:\n` +
                   `\`!duelo <@${bounty.alvoNome}>\` no chat!\n` +
                   `Quem vencer o combate leva toda a recompensa para seu próprio inventário!`,
      color: 0x962d22,
      image: { url: imagemUrl },
      footer: { text: `Caçada de Jogador Autorizada • Cuidado: O alvo é perigoso!` },
      timestamp: new Date().toISOString()
    };

    return await canal.send({ embeds: [embed] });
  }

  // Publica um Mapa Cartográfico da Região
  async publicarMapa(guild, regiaoNome, descricao, promptImagem = null) {
    const canal = this.obterCanalLore(guild);
    if (!canal) return null;

    const p = promptImagem || `ancient fantasy world map, aged parchment cartography of mythical fantasy realm Eldoria, mountain ranges, dark fortresses, detailed topography, 8k`;
    const imagemUrl = this.gerarUrlImagem(p);

    const embedMapa = {
      title: `🗺️ CARTOGRAFIA REVELADA: ${regiaoNome.toUpperCase()}`,
      description: `*Um novo mapa ou território foi traçado pelos batedores da party:*\n\n` +
                   `${descricao}\n\n` +
                   `📍 **Território:** ${regiaoNome}\n` +
                   `🧭 **Segurança:** Áreas inexploradas podem conter perigos desconhecidos.`,
      color: 0x16a085, // Verde água / mapa
      image: { url: imagemUrl },
      footer: { text: `Cartografia de Eldoria • Mapa Oficial` },
      timestamp: new Date().toISOString()
    };

    return await canal.send({ embeds: [embedMapa] });
  }
}

module.exports = LoreEngine;
