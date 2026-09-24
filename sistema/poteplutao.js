// ============================================================
// MÓDULO POTEPLUTÃO — GERADOR DINÂMICO DE POSTS (1080x1080)
// Layouts profissionais para Instagram, geração com IA e B2B
// ============================================================

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const FOTOS_DIR = path.join(__dirname, '..', 'fotos', 'poteplutao');
const BG_TEAL = path.join(FOTOS_DIR, 'instagram_bg_teal_cosmic.png');
const BG_WAVES = path.join(FOTOS_DIR, 'instagram_bg_cosmic_waves.png');

function removerAcentos(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SABORES = [
  {
    id: 'maracuja',
    nome: 'Maracujá da Galáxia',
    nomeCurto: 'Maracujá',
    badge: '⭐ Mais Pedido',
    cor: '#FFD166',
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-maracuja-real.jpg',
    descricao: 'Polpa natural da fruta com sementes e confeitos artesanais',
    detalhes: 'Textura aerada de gravidade zero • Trincando a -18°C',
    legendaPadrao: `💛 O mais pedido da galáxia: Creme Gelado de Maracujá! 🪐✨

Feito artesanalmente com a polpa natural da fruta e sementes selecionadas. Trincando de gelado (-18°C) e com uma textura aerada tão leve que parece gravidade zero! 

Perfeito para refrescar o calor de São Luís! ☀️🥄

📦 Pote individual de 120ml por apenas R$ 5,00.
🛵 Entregamos no Jardim São Cristóvão e região!

👉 Peça pelo link na bio ou chame no WhatsApp: (98) 99193-9476!

#PotePlutao #CremeGelado #SobremesaArtesanal #SaoLuis #Maracuja #GravidadeZero #GeladoDeVerdade`
  },
  {
    id: 'limao',
    nome: 'Limão Refrescante',
    nomeCurto: 'Limão',
    badge: '🌿 Cítrico & Suave',
    cor: '#7BD48A',
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-limao-real.jpg',
    descricao: 'Equilíbrio cítrico perfeito com raspas frescas e granulado',
    detalhes: 'Aveludado e gelado • O alívio certo pro calor de SLZ',
    legendaPadrao: `💚 Cítrico, aveludado e trincando de gelado! 🍋❄️

Nosso Creme Gelado de Limão traz o equilíbrio exato entre o azedinho da fruta e a cremosidade de outro planeta. Finalizado com raspas frescas e confeitos artesanais! 😋

Quer provar a verdadeira textura de gravidade zero?

🛵 Peça agora no WhatsApp pelo link da bio!
📍 Disponível também para pronta-entrega e revenda no comércio parceiro.

#PotePlutao #LimaoArtesanal #CremeGelado #SobremesaSLZ #SaoLuisMA #SlzMa #CalorDeSLZ`
  },
  {
    id: 'morango',
    nome: 'Morango Artesanal',
    nomeCurto: 'Morango',
    badge: '❤️ O Clássico',
    cor: '#FF6B8B',
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-morango-real.jpg',
    descricao: 'Doçura suave com calda de frutas e textura aveludada',
    detalhes: 'Leve como nuvem espacial • Vicia na primeira colherada',
    legendaPadrao: `🍓 Um clássico irresistível: Creme Gelado de Morango! 💖🪐

Textura aerada como uma nuvem, doce na medida certa e com aquela cremosidade que derrete na boca sem ser enjoativa. 

🍨 Pote de 120ml: a pausa doce que o seu dia merece.
📲 Peça já no WhatsApp (98) 99193-9476 ou confira no link da bio!

#PotePlutao #Morango #SobremesaGourmet #Artesanal #SaoLuis #ZeroGravidade`
  },
  {
    id: 'chocolate',
    nome: 'Chocolate Intenso 50%',
    nomeCurto: 'Chocolate',
    badge: '🍫 Cacau Nobre',
    cor: '#D4A373',
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-chocolate-real.jpg',
    descricao: 'Cacau 50% nobre com confeitos crocantes selecionados',
    detalhes: 'Creme denso e aveludado • Sabor marcante e profundo',
    legendaPadrao: `🍫 Para os apaixonados por intensidade: Creme Gelado de Chocolate! 🪐✨

Produzido com cacau nobre 50% e granulado crocante especial. Consistência aveludada, sabor marcante e temperatura ultragelada! ❄️🥄

Disponível para entrega individual ou em quantidade especial para o seu comércio/restaurante.

👉 Chame a gente no WhatsApp pelo link da bio!

#PotePlutao #ChocolateArtesanal #Cacau50 #SobremesaArtesanal #SaoLuisMa #SlzOnline`
  },
  {
    id: 'combo',
    nome: 'Combo da Galáxia',
    nomeCurto: 'Todos os Sabores',
    badge: '🛸 4 Sabores Reais',
    cor: '#A8E6CF',
    preco: 'R$ 20,00',
    tamanho: '4x 120ml',
    foto: 'potes-trio-real.jpg',
    descricao: 'Maracujá, Limão, Morango e Chocolate em um só pedido',
    detalhes: 'Experimente a coleção completa de gravidade zero',
    legendaPadrao: `🪐 Na dúvida de qual escolher? Experimente todos os 4 sabores! 💛💚💖🤎

Maracujá, Limão, Morango e Chocolate artesanal. Todos ultragelados a -18°C e com textura de gravidade zero! 🛸✨

Qual é o seu preferido de hoje?
Comente aqui embaixo! 👇

📦 Peça seu combo no WhatsApp (link na bio): (98) 99193-9476.

#PotePlutao #ComboDaGalaxia #CremesGelados #SaoLuis #Maranhao #SobremesaCaseira #ZeroGravidade`
  }
];

class SistemaPotePlutao {
  constructor(geminiKey = null) {
    this.geminiKey = geminiKey;
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        this.model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
      } catch (e) {
        this.model = null;
      }
    }
  }

  buscarSabor(termo) {
    if (!termo) return null;
    const t = removerAcentos(termo);
    return SABORES.find(s => removerAcentos(s.id).includes(t) || removerAcentos(s.nomeCurto).includes(t)) || null;
  }

  obterTodosSabores() {
    return SABORES;
  }

  obterCardapioEmbed() {
    const embed = new EmbedBuilder()
      .setTitle('🪐 Cardápio Oficial • PotePlutão')
      .setDescription(
        '**A sobremesa mais gelada da galáxia!** 🚀\n' +
        'Cremes artesanais ultragelados a **-18°C**, aerados e cremosos.\n' +
        'Tão leves que parecem flutuar em *gravidade zero*.\n\n' +
        '*(Lembrete oficial da marca: Nunca chame de mousse! É creme gelado artesanal.)*'
      )
      .setColor(0x2D8B7A)
      .setFooter({ text: 'PotePlutão • Direto de São Luís - MA • Potes de 120ml por R$ 5,00' })
      .setTimestamp();

    SABORES.filter(s => s.id !== 'combo').forEach(s => {
      embed.addFields({
        name: `${s.badge} ${s.nomeCurto} — ${s.preco}`,
        value: `${s.descricao}\n*${s.detalhes}*`,
        inline: false
      });
    });

    embed.addFields({
      name: '🛸 Combo 4 Sabores — R$ 20,00',
      value: 'Leve Maracujá, Limão, Morango e Chocolate para degustar todos!',
      inline: false
    });

    embed.addFields({
      name: '📲 Como pedir ou revender?',
      value: 'Chame no WhatsApp oficial: **(98) 99193-9476**\nOu gere posts para o Instagram com `!postar [sabor]`!',
      inline: false
    });

    return embed;
  }

  obterParceriaEmbed() {
    return new EmbedBuilder()
      .setTitle('🤝 Parceria Comercial & Atacado • PotePlutão')
      .setDescription(
        '**Leve a PotePlutão para o seu restaurante, lanchonete, padaria ou cafeteria em São Luís!**\n\n' +
        'Sobremesa de giro altíssimo no balcão de almoço e lanches da tarde.\n\n' +
        '✨ **Vantagens para Parceiros:**\n' +
        '• 🏷️ **Preço especial de atacado** (a partir de 20 potes);\n' +
        '• 🛵 **Entrega e reposição ágil** 2x por semana;\n' +
        '• 🥄 **Amostra grátis** de degustação para o estabelecimento;\n' +
        '• 📦 Potes individuais de 120ml transparentes com selo colorido e confeitos;\n' +
        '• 🤝 Opção de consignação sob avaliação.\n\n' +
        '📞 **Fale direto com a produção:** `(98) 99193-9476`'
      )
      .setColor(0x1B2A4A)
      .setFooter({ text: 'PotePlutão B2B • Jardim São Cristóvão e Região' })
      .setTimestamp();
  }

  // --- RENDERIZADORES DE IMAGEM DINÂMICA (SHARP) ---

  // --- RENDERIZADORES DE IMAGEM DINÂMICA (SHARP) ---
  // Estilo minimalista e fiel ao feed oficial do Instagram da PotePlutão

  async renderizarPostSabor(sabor, tagCustom = null, tituloCustom = null) {
    const fotoPotPath = path.join(FOTOS_DIR, sabor.foto);
    let potDataUri = '';
    if (fs.existsSync(fotoPotPath)) {
      const potBase64 = fs.readFileSync(fotoPotPath).toString('base64');
      potDataUri = 'data:image/jpeg;base64,' + potBase64;
    }

    const tag = escapeXml(tagCustom || sabor.badge || 'EDIÇÃO LIMITADA').toUpperCase();
    const titulo = escapeXml(tituloCustom || sabor.nomeCurto || sabor.nome);

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="potCircle">
      <circle cx="540" cy="510" r="230" />
    </clipPath>
    <filter id="potGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="30" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <!-- Tag Top -->
  <text x="540" y="160" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="#A8E6CF" letter-spacing="4" text-anchor="middle">${tag}</text>

  <!-- Title -->
  <text x="540" y="240" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" text-anchor="middle">${titulo}</text>

  <!-- Product Image Container -->
  <circle cx="540" cy="510" r="235" fill="none" stroke="#A8E6CF" stroke-width="4" stroke-opacity="0.6" filter="url(#potGlow)" />
  ${potDataUri ? `<image href="${potDataUri}" x="310" y="280" width="460" height="460" preserveAspectRatio="xMidYMid slice" clip-path="url(#potCircle)" />` : ''}
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_${sabor.id}_${Date.now()}.png`);
    await sharp(BG_WAVES)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostDiferenciais(dados = {}) {
    const tituloPrincipal = escapeXml(dados.titulo || 'Cremes gelados');
    const subtituloPrincipal = escapeXml(dados.subtitulo || 'ultragelados:');
    const itens = dados.itens || [
      { titulo: 'Cremosidade Única', desc: 'Textura aerada e leve como uma nuvem no céu' },
      { titulo: 'Feito pra Revenda', desc: 'Fornecimento para lanchonetes e restaurantes' },
      { titulo: 'Zero Gravidade', desc: 'Ponto de revenda no Jardim São Cristóvão' }
    ];

    const itensSvg = itens.slice(0, 3).map((item, idx) => `
    <g transform="translate(540, ${400 + idx * 130})">
      <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#A8E6CF" text-anchor="middle">${escapeXml(item.titulo)}</text>
      <text x="0" y="38" font-family="Arial, Helvetica, sans-serif" font-size="21" fill="rgba(255,255,255,0.75)" text-anchor="middle">${escapeXml(item.desc)}</text>
    </g>`).join('');

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <!-- Main Headlines -->
  <text x="540" y="210" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="900" fill="#FFFFFF" text-anchor="middle">${tituloPrincipal}</text>
  <text x="540" y="275" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="900" fill="#FFFFFF" text-anchor="middle">${subtituloPrincipal}</text>

  <!-- Items -->
  ${itensSvg}
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_diferenciais_${Date.now()}.png`);
    await sharp(BG_WAVES)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostDepoimento(depoimento = {}) {
    const texto = escapeXml(depoimento.texto || 'Melhor sobremesa gelada de São Luís! Os clientes adoraram a textura de gravidade zero e trincando de gelado pro calor.');
    
    // Procura foto do avatar
    const avatarPath = path.join(FOTOS_DIR, 'avatar_cliente.jpg');
    let avatarUri = '';
    if (fs.existsSync(avatarPath)) {
      const avatarB64 = fs.readFileSync(avatarPath).toString('base64');
      avatarUri = 'data:image/jpeg;base64,' + avatarB64;
    }

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="540" cy="270" r="56" />
    </clipPath>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="rgba(0,0,0,0.5)" />
    </filter>
  </defs>

  <!-- Speech bubble card -->
  <rect x="150" y="270" width="780" height="450" rx="36" fill="#0D2E42" stroke="#A8E6CF" stroke-width="1.5" stroke-opacity="0.25" filter="url(#cardShadow)" />

  <!-- Avatar Circle -->
  <circle cx="540" cy="270" r="58" fill="#A8E6CF" />
  ${avatarUri ? `<image href="${avatarUri}" x="484" y="214" width="112" height="112" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)" />` : ''}

  <!-- Quote -->
  <text x="540" y="420" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="normal" fill="#FFFFFF" text-anchor="middle" width="660">
    <tspan x="540" dy="0">“${texto}”</tspan>
  </text>

  <!-- 5 Gold Stars -->
  <text x="540" y="620" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#FFD166" letter-spacing="8" text-anchor="middle">★★★★★</text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_depoimento_${Date.now()}.png`);
    await sharp(BG_TEAL)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostB2B() {
    const fotoB2BPath = path.join(FOTOS_DIR, 'parceiro-real.jpg');
    const svgOverlay = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#062338" stop-opacity="0" />
      <stop offset="65%" stop-color="#062338" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#062338" stop-opacity="0.95" />
    </linearGradient>
  </defs>

  <rect x="0" y="780" width="1080" height="300" fill="url(#bottomFade)" />
  <text x="540" y="930" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="3">PONTO DE REVENDA</text>
  <text x="540" y="990" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle">Pote<tspan fill="#A8E6CF">Plutão</tspan></text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_b2b_${Date.now()}.png`);
    await sharp(fotoB2BPath)
      .resize(1080, 1080, { fit: 'cover' })
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostTrio() {
    const trioPath = path.join(FOTOS_DIR, 'potes-trio-real.jpg');
    const svgOverlay = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#062338" stop-opacity="0" />
      <stop offset="65%" stop-color="#062338" stop-opacity="0.65" />
      <stop offset="100%" stop-color="#062338" stop-opacity="0.95" />
    </linearGradient>
  </defs>

  <rect x="0" y="780" width="1080" height="300" fill="url(#bottomFade)" />
  <text x="540" y="930" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="3">SABORES ARTESANAIS</text>
  <text x="540" y="990" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#FFFFFF" text-anchor="middle">Pote<tspan fill="#A8E6CF">Plutão</tspan></text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_trio_${Date.now()}.png`);
    await sharp(trioPath)
      .resize(1080, 1080, { fit: 'cover' })
      .composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  // --- GERADOR PRINCIPAL DE POSTS ---

  async gerarPost(termo = null, usarIA = true) {
    let tipo = 'sabor';
    let saborEscolhido = null;
    let legenda = '';
    let imagemGeradaPath = null;
    let tituloPost = 'Post Oficial PotePlutão';

    const t = removerAcentos(termo);

    if (t.includes('diferencia') || t.includes('beneficio') || t.includes('sobre') || t.includes('cremosidade')) {
      tipo = 'diferenciais';
    } else if (t.includes('depoimento') || t.includes('avaliacao') || t.includes('review') || t.includes('feedback')) {
      tipo = 'depoimento';
    } else if (t.includes('parceria') || t.includes('atacado') || t.includes('revenda') || t.includes('comercio') || t.includes('lojista')) {
      tipo = 'b2b';
    } else if (t) {
      saborEscolhido = this.buscarSabor(t);
      if (saborEscolhido) {
        tipo = 'sabor';
      } else {
        tipo = 'ia_dinamico';
      }
    } else {
      const escolhas = ['maracuja', 'limao', 'morango', 'chocolate', 'combo', 'diferenciais', 'b2b', 'depoimento'];
      const sorteado = escolhas[Math.floor(Math.random() * escolhas.length)];
      if (['diferenciais', 'b2b', 'depoimento'].includes(sorteado)) {
        tipo = sorteado;
      } else {
        tipo = 'sabor';
        saborEscolhido = this.buscarSabor(sorteado);
      }
    }

    // Se for sabor conhecido
    if (tipo === 'sabor') {
      if (!saborEscolhido) saborEscolhido = SABORES[0];
      tituloPost = `Creme Gelado de ${saborEscolhido.nomeCurto}`;
      legenda = saborEscolhido.legendaPadrao;
      imagemGeradaPath = await this.renderizarPostSabor(saborEscolhido);
    } else if (tipo === 'diferenciais') {
      tituloPost = 'Diferenciais & Gravidade Zero';
      legenda = `🪐 O que faz a PotePlutão ser a sobremesa mais gelada da galáxia? ✨

Não é um doce comum e NUNCA é mousse. É uma receita própria, artesanal e ultragelada:
❄️ Servido trincando a -18°C
☁️ Textura aerada de gravidade zero (leveza surreal)
🥄 Feito artesanalmente com ingredientes selecionados
📦 Potes individuais de 120ml por apenas R$ 5,00

Qual o seu sabor favorito para hoje? Maracujá, Limão, Morango ou Chocolate? 😋

👉 Peça pelo link na bio ou chame no WhatsApp: (98) 99193-9476!

#PotePlutao #CremeGelado #SobremesaArtesanal #SaoLuis #ZeroGravidade #Maranhao`;
      imagemGeradaPath = await this.renderizarPostDiferenciais();
    } else if (tipo === 'depoimento') {
      tituloPost = 'Avaliação de Cliente Parceiro';
      legenda = `⭐⭐⭐⭐⭐ “Melhor sobremesa gelada de São Luís! A textura aerada é surreal e no meu estabelecimento vende tudo em poucas horas.” — Carlos Ribeiro • Café & Bistrô

Esse é o padrão de qualidade da PotePlutão! Cremes ultragelados com textura de gravidade zero que conquistam na primeira colherada.

📍 Disponível para pronta-entrega individual ou revenda em comércios parceiros!

📲 Peça o seu no WhatsApp: (98) 99193-9476!

#PotePlutao #Depoimento #ClientesSatisfeitos #SobremesaSLZ #SaoLuis #RestaurantesSLZ`;
      imagemGeradaPath = await this.renderizarPostDepoimento();
    } else if (tipo === 'b2b') {
      tituloPost = 'Parceria & Revenda para Restaurantes';
      legenda = `🏪 Leve o PotePlutão para o seu comércio e encante seus clientes! 🤝✨

Se você tem restaurante de PF, padaria, lanchonete ou cafeteria em São Luís, a PotePlutão é a sobremesa perfeita para o seu balcão pós-almoço:
✅ Preço especial de atacado (a partir de 20 potes)
✅ Potes de 120ml com excelente margem e giro rápido
✅ Entrega pontual e reposição 2x por semana
✅ Amostra grátis para você e sua equipe degustarem!

📲 Quer ser um ponto parceiro? Mande uma mensagem agora no nosso WhatsApp: (98) 99193-9476!

#PotePlutao #RevendaSLZ #ComercioSLZ #EmpreendedorismoSLZ #RestaurantesSLZ #SaoLuis`;
      imagemGeradaPath = await this.renderizarPostB2B();
    } else if (tipo === 'ia_dinamico') {
      // Criação 100% DINÂMICA por IA baseada no tema fornecido
      tituloPost = `Especial: ${termo}`;
      let dadosIa = {
        titulo: termo,
        subtitulo: 'Cremes artesanais ultragelados a -18°C',
        itens: [
          { icone: '❄️', titulo: 'Trincando de Gelado', desc: 'Perfeito para refrescar o dia em São Luís' },
          { icone: '☁️', titulo: 'Gravidade Zero', desc: 'Textura leve e cremosa que não pesa' },
          { icone: '🥄', titulo: 'Pote 120ml por R$ 5,00', desc: 'Artesanal e acessível' }
        ]
      };

      if (this.model) {
        try {
          const promptIa = `
Você é a Aime, copywriter da PotePlutão (cremes gelados artesanais de São Luís - MA).
O usuário quer um post no Instagram sobre o tema: "${termo}".

REGRAS:
- NUNCA use a palavra "mousse".
- Destaque que é "creme gelado artesanal", ultragelado a -18°C, textura de gravidade zero.
- Potes de 120ml por R$ 5,00.
- Retorne em formato JSON:
{
  "titulo": "Título curto e impactante para a arte (máximo 4 palavras)",
  "subtitulo": "Subtítulo curto (máximo 6 palavras)",
  "itens": [
    { "icone": "❄️", "titulo": "Título tópico 1", "desc": "Frase curta 1" },
    { "icone": "☁️", "titulo": "Título tópico 2", "desc": "Frase curta 2" },
    { "icone": "🥄", "titulo": "Título tópico 3", "desc": "Frase curta 3" }
  ],
  "legenda": "Legenda completa do post com quebras de linha, emojis e hashtags no final"
}`;
          const res = await this.model.generateContent(promptIa);
          const rawJson = res.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(rawJson);
          if (parsed && parsed.titulo) {
            dadosIa = parsed;
            legenda = parsed.legenda;
            tituloPost = parsed.titulo;
          }
        } catch (e) {
          console.error('[PotePlutao IA] Erro ao gerar post dinâmico:', e.message);
        }
      }

      if (!legenda) {
        legenda = `🪐 ${dadosIa.titulo} com a PotePlutão! ✨\n\nNossos cremes gelados artesanais são ultragelados a -18°C e têm aquela textura inconfundível de gravidade zero!\n\n📦 Peça já pelo WhatsApp: (98) 99193-9476!\n\n#PotePlutao #SaoLuis #CremeGelado #Artesanal`;
      }

      imagemGeradaPath = await this.renderizarPostDiferenciais(dadosIa);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚀 Post Instagram • ${tituloPost}`)
      .setDescription(
        `🎨 **Arte Gerada em Alta Definição (1080x1080):** Anexada abaixo!\n\n` +
        `📝 **LEGENDA PRONTA PARA O INSTAGRAM:**\n` +
        `\`\`\`text\n${legenda}\n\`\`\``
      )
      .setColor(0x2D8B7A)
      .setFooter({ text: 'Aimê Marketing • PotePlutão • Imagem gerada dinamicamente!' })
      .setTimestamp();

    if (imagemGeradaPath && fs.existsSync(imagemGeradaPath)) {
      embed.setImage(`attachment://${path.basename(imagemGeradaPath)}`);
    }

    return {
      titulo: tituloPost,
      legenda,
      fotoPath: imagemGeradaPath,
      fotoNome: imagemGeradaPath ? path.basename(imagemGeradaPath) : null,
      embed
    };
  }
}

module.exports = SistemaPotePlutao;
