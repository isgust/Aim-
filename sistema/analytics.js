// ============================================================
// MÓDULO DE DATA ANALYTICS DO SERVIDOR
// Rastreia mensagens, faladores, veterania e histórico de conversas
// ============================================================

const banco = require('./banco');

class SistemaDeAnalytics {
  constructor() {
    this.contadorSalvar = 0;
  }

  // Registrar cada mensagem que passa pelo servidor
  registrarMensagem(message) {
    if (!banco.dados.estatisticas) {
      banco.dados.estatisticas = { usuarios: {}, canais: {}, totalMensagens: 0 };
    }

    const stats = banco.dados.estatisticas;
    stats.totalMensagens = (stats.totalMensagens || 0) + 1;

    // Estatísticas por Canal
    const canalNome = message.channel.name || 'desconhecido';
    stats.canais[canalNome] = (stats.canais[canalNome] || 0) + 1;

    // Estatísticas por Usuário
    const userId = message.author.id;
    if (!stats.usuarios[userId]) {
      stats.usuarios[userId] = {
        id: userId,
        nome: message.author.username,
        apelido: message.member ? message.member.displayName : message.author.username,
        totalMensagens: 0,
        caracteresTotais: 0,
        primeiraMensagem: new Date().toISOString(),
        joinedAt: message.member && message.member.joinedAt ? message.member.joinedAt.toISOString() : null,
        historicoRecente: []
      };
    }

    const u = stats.usuarios[userId];
    u.nome = message.author.username;
    if (message.member) {
      u.apelido = message.member.displayName;
      if (message.member.joinedAt) u.joinedAt = message.member.joinedAt.toISOString();
    }
    u.totalMensagens += 1;
    u.caracteresTotais += message.content.length;
    u.ultimaMensagem = {
      conteudo: message.content,
      data: new Date().toISOString(),
      dataLegivel: new Date().toLocaleString('pt-BR'),
      canal: canalNome
    };

    // Manter histórico das últimas 8 mensagens do usuário
    if (!u.historicoRecente) u.historicoRecente = [];
    u.historicoRecente.push({
      texto: message.content,
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      canal: canalNome
    });
    if (u.historicoRecente.length > 8) u.historicoRecente.shift();

    // Salvar com debounce a cada 3 mensagens para eficiência de disco
    this.contadorSalvar++;
    if (this.contadorSalvar >= 3) {
      banco.salvar();
      this.contadorSalvar = 0;
    }
  }

  // Top faladores do servidor
  obterTopFaladores(limite = 5) {
    const usuarios = Object.values(banco.dados.estatisticas?.usuarios || {});
    return usuarios
      .sort((a, b) => b.totalMensagens - a.totalMensagens)
      .slice(0, limite);
  }

  // Procurar última mensagem de um membro específico
  obterUltimaFala(termo) {
    const termoLimpo = termo.toLowerCase().replace(/[@<#!>]/g, '').trim();
    const usuarios = Object.values(banco.dados.estatisticas?.usuarios || {});

    // Busca por ID exato ou por nome/apelido parcial
    const usuario = usuarios.find(u => 
      u.id === termoLimpo || 
      u.nome.toLowerCase().includes(termoLimpo) || 
      (u.apelido && u.apelido.toLowerCase().includes(termoLimpo))
    );

    return usuario || null;
  }

  // Membros veteranos (quem entrou primeiro no servidor)
  obterVeteranos(limite = 5) {
    const usuarios = Object.values(banco.dados.estatisticas?.usuarios || {})
      .filter(u => u.joinedAt);

    return usuarios
      .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))
      .slice(0, limite);
  }

  // Média de caracteres das mensagens do servidor
  obterMediaCaracteres() {
    const stats = banco.dados.estatisticas;
    if (!stats || !stats.totalMensagens || stats.totalMensagens === 0) return 30;
    let soma = 0;
    const lista = Object.values(stats.usuarios || {});
    lista.forEach(u => soma += (u.caracteresTotais || 0));
    return Math.round(soma / stats.totalMensagens) || 35;
  }

  // Resumo analítico formatado para injeção no cérebro da IA (Gemini)
  gerarResumoParaIA() {
    const stats = banco.dados.estatisticas || { totalMensagens: 0, canais: {}, usuarios: {} };
    const topFaladores = this.obterTopFaladores(5);
    const veteranos = this.obterVeteranos(3);

    let texto = `DADOS ANALÍTICOS DO SERVIDOR:\n`;
    texto += `- Total de mensagens registradas: ${stats.totalMensagens}\n`;
    texto += `- Membros que mais falam no chat: ` + 
      topFaladores.map(u => `${u.nome} (${u.totalMensagens} msgs)`).join(', ') + `\n`;
    texto += `- Veteranos com mais tempo de casa: ` + 
      veteranos.map(u => `${u.nome} (entrou em ${u.joinedAt ? u.joinedAt.split('T')[0] : 'antiguidade'})`).join(', ') + `\n`;

    // Lista rápida de última atividade dos membros conhecidos
    const listaUltimas = Object.values(stats.usuarios || {})
      .filter(u => u.ultimaMensagem)
      .slice(0, 8)
      .map(u => `• ${u.nome}: última mensagem em #${u.ultimaMensagem.canal} às ${u.ultimaMensagem.dataLegivel}: "${u.ultimaMensagem.conteudo.substring(0, 50)}"`)
      .join('\n');

    texto += `ÚLTIMAS FALAS RECENTES DOS MEMBROS:\n${listaUltimas || 'Nenhuma recente'}\n`;
    return texto;
  }

  // Dashboard visual para comando !analytics / !stats
  gerarDashboardEmbed(guild) {
    const stats = banco.dados.estatisticas || { totalMensagens: 0, canais: {}, usuarios: {} };
    const topFaladores = this.obterTopFaladores(5);
    const veteranos = this.obterVeteranos(3);

    // Canal mais ativo
    let canalTop = 'Nenhum';
    let canalTopMsgs = 0;
    for (const [canal, qtd] of Object.entries(stats.canais || {})) {
      if (qtd > canalTopMsgs) {
        canalTopMsgs = qtd;
        canalTop = `#${canal}`;
      }
    }

    let textoFaladores = topFaladores.length > 0
      ? topFaladores.map((u, i) => `**${i + 1}º** ${u.nome} (<@${u.id}>) — **${u.totalMensagens}** msgs`).join('\n')
      : '*Nenhum dado registrado ainda.*';

    let textoVeteranos = veteranos.length > 0
      ? veteranos.map((u, i) => `• **${u.nome}** — Entrou em \`${u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('pt-BR') : 'Data Indefinida'}\``).join('\n')
      : '*Sem datas registradas.*';

    return {
      title: `📊 DATA ANALYTICS DO SERVIDOR — ${guild.name.toUpperCase()}`,
      description: `Estatísticas em tempo real de atividade, engajamento e histórico dos membros:\n\n` +
                   `💬 **Total de Mensagens Analisadas:** **${stats.totalMensagens}** mensagens\n` +
                   `🔥 **Canal Mais Movimentado:** **${canalTop}** (${canalTopMsgs} msgs)\n` +
                   `📏 **Padrão Médio de Mensagem:** **${this.obterMediaCaracteres()}** caracteres\n\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `🏆 **TOP 5 MEMBROS MAIS ATIVOS (TAGARELAS):**\n${textoFaladores}\n\n` +
                   `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                   `🕰️ **VETERANIA (QUEM ESTÁ HÁ MAIS TEMPO):**\n${textoVeteranos}\n\n` +
                   `💡 *Dica: Você pode perguntar coisas como "@Aimê o Rocha falou algo hoje?" no chat!*`,
      color: 0x3498db,
      footer: { text: `Analytics por Aimê • Atualizado a cada mensagem` },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new SistemaDeAnalytics();
