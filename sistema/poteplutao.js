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

  async renderizarPostSabor(sabor, tituloCustom = null, subtituloCustom = null) {
    const fotoPotPath = path.join(FOTOS_DIR, sabor.foto);
    let potDataUri = '';
    if (fs.existsSync(fotoPotPath)) {
      const potBase64 = fs.readFileSync(fotoPotPath).toString('base64');
      potDataUri = `data:image/jpeg;base64,${potBase64}`;
    }

    const titulo = escapeXml(tituloCustom || sabor.nome);
    const subtitulo = escapeXml(subtituloCustom || `${sabor.badge} • Cremosidade Única`);
    const descricao = escapeXml(sabor.descricao);
    const detalhes = escapeXml(sabor.detalhes);

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="potClip">
      <circle cx="540" cy="495" r="230" />
    </clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <!-- Top Badge -->
  <rect x="365" y="85" width="350" height="42" rx="21" fill="#A8E6CF" fill-opacity="0.15" stroke="#A8E6CF" stroke-width="1.5" />
  <text x="540" y="112" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="2">🪐 CREME GELADO ARTESANAL</text>

  <!-- Main Headline -->
  <text x="540" y="190" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle">${titulo}</text>
  <text x="540" y="230" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#A8E6CF" text-anchor="middle">${subtitulo}</text>

  <!-- Product Ring Frame -->
  <circle cx="540" cy="495" r="248" fill="none" stroke="${sabor.cor || '#A8E6CF'}" stroke-width="5" stroke-opacity="0.95" filter="url(#shadow)" />
  <circle cx="540" cy="495" r="240" fill="#1B2A4A" />

  ${potDataUri ? `<image href="${potDataUri}" x="310" y="265" width="460" height="460" preserveAspectRatio="xMidYMid slice" clip-path="url(#potClip)" />` : ''}

  <!-- Floating Tags -->
  <g transform="translate(180, 480)">
    <rect x="0" y="0" width="160" height="46" rx="23" fill="#1B2A4A" stroke="#A8E6CF" stroke-width="1.5" />
    <text x="80" y="29" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#FFFFFF" text-anchor="middle">❄️ -18°C</text>
  </g>

  <g transform="translate(740, 480)">
    <rect x="0" y="0" width="160" height="46" rx="23" fill="#1B2A4A" stroke="${sabor.cor || '#A8E6CF'}" stroke-width="1.5" />
    <text x="80" y="29" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="${sabor.cor || '#A8E6CF'}" text-anchor="middle">🪙 ${escapeXml(sabor.preco)}</text>
  </g>

  <!-- Description Text -->
  <text x="540" y="780" font-family="Arial, Helvetica, sans-serif" font-size="23" fill="#FFFFFF" text-anchor="middle" font-weight="bold">${descricao}</text>
  <text x="540" y="814" font-family="Arial, Helvetica, sans-serif" font-size="19" fill="rgba(255,255,255,0.7)" text-anchor="middle">${detalhes}</text>

  <!-- CTA Button -->
  <rect x="240" y="855" width="600" height="66" rx="33" fill="#A8E6CF" filter="url(#shadow)" />
  <text x="540" y="897" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="#062338" text-anchor="middle">PEÇA NO WHATSAPP: (98) 99193-9476</text>

  <!-- Footer Tagline (Positioned above background brand stamp) -->
  <text x="540" y="948" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="rgba(255,255,255,0.7)" text-anchor="middle">Jardim São Cristóvão • São Luís - MA</text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_${sabor.id}_${Date.now()}.png`);
    await sharp(BG_TEAL)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostDiferenciais(dados = {}) {
    const titulo = escapeXml(dados.titulo || 'Cremosidade Única');
    const subtitulo = escapeXml(dados.subtitulo || 'Receita própria e autoral • Servido trincando a -18°C');
    const itens = dados.itens || [
      { icone: '❄️', titulo: 'Trincando de Gelado', desc: 'Servido a -18°C, perfeito pro calor intenso de São Luís' },
      { icone: '☁️', titulo: 'Textura Aerada (Gravidade Zero)', desc: 'Leveza inacreditável que derrete suave na boca' },
      { icone: '🤝', titulo: 'Feito pra Revenda & Varejo', desc: 'Potes de 120ml por R$ 5,00 com alta margem para comércios' }
    ];

    const itensSvg = itens.map((item, idx) => `
    <g transform="translate(0, ${idx * 105})">
      <circle cx="30" cy="30" r="20" fill="#A8E6CF" fill-opacity="0.2" />
      <text x="30" y="38" font-family="Arial, Helvetica, sans-serif" font-size="22" text-anchor="middle">${escapeXml(item.icone)}</text>
      <text x="70" y="27" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF">${escapeXml(item.titulo)}</text>
      <text x="70" y="55" font-family="Arial, Helvetica, sans-serif" font-size="19" fill="rgba(255,255,255,0.72)">${escapeXml(item.desc)}</text>
    </g>`).join('');

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B2A4A" stop-opacity="0.84" />
      <stop offset="100%" stop-color="#0E1B33" stop-opacity="0.94" />
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <!-- Card container -->
  <rect x="90" y="90" width="900" height="880" rx="36" fill="url(#cardGrad)" stroke="#A8E6CF" stroke-width="2" stroke-opacity="0.3" filter="url(#cardShadow)" />

  <!-- Badge Top -->
  <rect x="365" y="140" width="350" height="44" rx="22" fill="#A8E6CF" fill-opacity="0.15" stroke="#A8E6CF" stroke-width="1.5" />
  <text x="540" y="169" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="2">CREMES ARTESANAIS ULTRAGELADOS</text>

  <!-- Headline -->
  <text x="540" y="260" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="#FFFFFF" text-anchor="middle">${titulo}</text>
  <text x="540" y="305" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#A8E6CF" text-anchor="middle">${subtitulo}</text>

  <!-- Items list -->
  <g transform="translate(160, 365)">
    ${itensSvg}
  </g>

  <!-- CTA Box Bottom -->
  <rect x="220" y="740" width="640" height="70" rx="35" fill="#A8E6CF" />
  <text x="540" y="784" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="900" fill="#062338" text-anchor="middle">PEÇA NO WHATSAPP: (98) 99193-9476</text>

  <!-- Footer Tagline -->
  <text x="540" y="855" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Pote<tspan fill="#A8E6CF">Plutão</tspan> • Sobremesas de São Luís - MA</text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_diferenciais_${Date.now()}.png`);
    await sharp(BG_TEAL)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostDepoimento(depoimento = {}) {
    const texto = escapeXml(depoimento.texto || 'Melhor sobremesa gelada de São Luís! A textura aerada é surreal e no meu estabelecimento vende tudo em poucas horas.');
    const autor = escapeXml(depoimento.autor || 'Carlos Ribeiro • Café & Bistrô');

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="rgba(0,0,0,0.5)" />
    </filter>
  </defs>

  <!-- Badge Top -->
  <rect x="365" y="110" width="350" height="44" rx="22" fill="#A8E6CF" fill-opacity="0.15" stroke="#A8E6CF" stroke-width="1.5" />
  <text x="540" y="139" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="2">AVALIAÇÕES &amp; CLIENTES</text>

  <text x="540" y="235" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle">O que dizem sobre nós</text>

  <!-- Speech Bubble Container -->
  <g transform="translate(140, 290)" filter="url(#bubbleShadow)">
    <rect x="0" y="0" width="800" height="420" rx="36" fill="#1B2A4A" stroke="#A8E6CF" stroke-width="2" stroke-opacity="0.4" />
    
    <!-- Speech bubble triangle tail -->
    <polygon points="400,420 370,460 430,420" fill="#1B2A4A" />

    <!-- 5 Gold Stars -->
    <text x="400" y="90" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#FFD166" text-anchor="middle">★★★★★</text>

    <!-- Quote -->
    <text x="400" y="180" font-family="Arial, Helvetica, sans-serif" font-size="28" font-style="italic" fill="#FFFFFF" text-anchor="middle" width="700">
      <tspan x="400" dy="0">“${texto}”</tspan>
    </text>

    <!-- Author Line -->
    <text x="400" y="320" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#A8E6CF" text-anchor="middle">${autor}</text>
  </g>

  <!-- CTA Box Bottom -->
  <rect x="240" y="820" width="600" height="66" rx="33" fill="#A8E6CF" />
  <text x="540" y="862" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="#062338" text-anchor="middle">PROVE HOJE: (98) 99193-9476</text>

  <text x="540" y="940" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="rgba(255,255,255,0.7)" text-anchor="middle">Pote<tspan fill="#A8E6CF">Plutão</tspan> • São Luís - MA</text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_depoimento_${Date.now()}.png`);
    await sharp(BG_WAVES)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);

    return outPath;
  }

  async renderizarPostB2B(dados = {}) {
    const fotoB2BPath = path.join(FOTOS_DIR, 'parceiro-real.jpg');
    let b2bDataUri = '';
    if (fs.existsSync(fotoB2BPath)) {
      const b2bBase64 = fs.readFileSync(fotoB2BPath).toString('base64');
      b2bDataUri = `data:image/jpeg;base64,${b2bBase64}`;
    }

    const svg = `
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="rectClip">
      <rect x="180" y="270" width="720" height="340" rx="24" />
    </clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="rgba(0,0,0,0.6)" />
    </filter>
  </defs>

  <!-- Badge Top -->
  <rect x="365" y="85" width="350" height="42" rx="21" fill="#A8E6CF" fill-opacity="0.15" stroke="#A8E6CF" stroke-width="1.5" />
  <text x="540" y="112" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#A8E6CF" text-anchor="middle" letter-spacing="2">PARA RESTAURANTES &amp; PADARIAS</text>

  <!-- Title -->
  <text x="540" y="185" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="900" fill="#FFFFFF" text-anchor="middle">Leve PotePlutão pro seu Comércio!</text>
  <text x="540" y="225" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#A8E6CF" text-anchor="middle">A sobremesa que vende sozinha no balcão pós-almoço</text>

  <!-- Photo Box -->
  <rect x="180" y="270" width="720" height="340" rx="24" fill="#1B2A4A" stroke="#A8E6CF" stroke-width="2" stroke-opacity="0.4" filter="url(#shadow)" />
  ${b2bDataUri ? `<image href="${b2bDataUri}" x="180" y="270" width="720" height="340" preserveAspectRatio="xMidYMid slice" clip-path="url(#rectClip)" />` : ''}

  <!-- Benefits Row -->
  <g transform="translate(140, 650)">
    <g transform="translate(0, 0)">
      <circle cx="20" cy="20" r="16" fill="#A8E6CF" fill-opacity="0.2" />
      <text x="20" y="27" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#A8E6CF" text-anchor="middle">✓</text>
      <text x="50" y="26" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">Preço Especial Atacado</text>
    </g>

    <g transform="translate(420, 0)">
      <circle cx="20" cy="20" r="16" fill="#A8E6CF" fill-opacity="0.2" />
      <text x="20" y="27" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#A8E6CF" text-anchor="middle">✓</text>
      <text x="50" y="26" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">Reposição 2x por Semana</text>
    </g>

    <g transform="translate(200, 60)">
      <circle cx="20" cy="20" r="16" fill="#A8E6CF" fill-opacity="0.2" />
      <text x="20" y="27" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#A8E6CF" text-anchor="middle">✓</text>
      <text x="50" y="26" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">Amostra Grátis de Degustação</text>
    </g>
  </g>

  <!-- CTA Box Bottom -->
  <rect x="240" y="780" width="600" height="66" rx="33" fill="#A8E6CF" />
  <text x="540" y="822" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="#062338" text-anchor="middle">SEJA UM PARCEIRO: (98) 99193-9476</text>

  <text x="540" y="890" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold" fill="rgba(255,255,255,0.7)" text-anchor="middle">Pote<tspan fill="#A8E6CF">Plutão</tspan> B2B • Jardim São Cristóvão e Região</text>
</svg>`;

    const outPath = path.join(FOTOS_DIR, `post_b2b_${Date.now()}.png`);
    await sharp(BG_TEAL)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
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
