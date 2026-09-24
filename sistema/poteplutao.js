// ============================================================
// MÓDULO POTEPLUTÃO — MARKETING, POSTS INSTAGRAM & B2B
// Gerenciamento dos 4 sabores reais, legendas e pedidos
// ============================================================

const path = require('path');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const FOTOS_DIR = path.join(__dirname, '..', 'fotos', 'poteplutao');

function removerAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const SABORES = [
  {
    id: 'maracuja',
    nome: 'Maracujá',
    badge: '⭐ Mais Pedido',
    cor: 0xF9B732,
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-maracuja-real.jpg',
    descricao: 'Creme artesanal aerado com polpa natural de maracujá e sementes selecionadas. Refrescante, levemente azedinho e servido a -18°C.',
    hashtags: '#PotePlutao #CremeGelado #SobremesaArtesanal #SaoLuis #Maracuja #GravidadeZero #GeladoDeVerdade',
    legendaPadrao: `💛 O mais pedido da galáxia: Creme Gelado de Maracujá! 🪐✨

Feito artesanalmente com a polpa natural da fruta e sementes selecionadas. Trincando de gelado (-18°C) e com uma textura aerada tão leve que parece gravidade zero!

Perfeito para refrescar o calor de São Luís! ☀️🥄

📦 Pote individual de 120ml por apenas R$ 5,00.
🛵 Entregamos no Jardim São Cristóvão e região!

👉 Peça pelo link na bio ou chame no WhatsApp: (98) 99193-9476!

#PotePlutao #CremeGelado #SobremesaArtesanal #SaoLuis #Maranhao #Maracuja #GravidadeZero #GeladoDeVerdade`
  },
  {
    id: 'limao',
    nome: 'Limão',
    badge: '🌿 Refrescante',
    cor: 0x4CAF50,
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-limao-real.jpg',
    descricao: 'Cítrico, aveludado e trincando de gelado. Equilíbrio exato entre o azedinho da fruta e a textura que flutua na boca, finalizado com confeitos artesanais.',
    hashtags: '#PotePlutao #LimaoArtesanal #CremeGelado #SobremesaSLZ #SaoLuisMA #SlzMa #CalorDeSLZ',
    legendaPadrao: `💚 Cítrico, aveludado e trincando de gelado! 🍋❄️

Nosso Creme Gelado de Limão traz o equilíbrio exato entre o azedinho da fruta e a cremosidade de outro planeta. Finalizado com raspas frescas e confeitos artesanais! 😋

Quer provar a verdadeira textura de gravidade zero?

🛵 Peça agora no WhatsApp pelo link da bio!
📍 Disponível também para pronta-entrega e revenda no comércio parceiro.

#PotePlutao #LimaoArtesanal #CremeGelado #SobremesaSLZ #SaoLuisMA #SlzMa #CalorDeSLZ`
  },
  {
    id: 'morango',
    nome: 'Morango',
    badge: '❤️ Clássico',
    cor: 0xE53935,
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-morango-real.jpg',
    descricao: 'Doce, aveludado e irresistível. Calda artesanal de morangos com confeitos especiais e textura tão leve quanto uma nuvem.',
    hashtags: '#PotePlutao #Morango #SobremesaGourmet #Artesanal #SaoLuis #ZeroGravidade',
    legendaPadrao: `🍓 Um clássico irresistível: Creme Gelado de Morango! 💖🪐

Textura aerada como uma nuvem, doce na medida certa e com aquela cremosidade que derrete na boca sem ser enjoativa.

🍨 Pote de 120ml: a pausa doce que o seu dia merece.
📲 Peça já no WhatsApp (98) 99193-9476 ou confira no link da bio!

#PotePlutao #Morango #SobremesaGourmet #Artesanal #SaoLuis #ZeroGravidade`
  },
  {
    id: 'chocolate',
    nome: 'Chocolate',
    badge: '🍫 Intenso',
    cor: 0x4E2A1E,
    preco: 'R$ 5,00',
    tamanho: '120ml',
    foto: 'sabor-chocolate-real.jpg',
    descricao: 'Creme artesanal denso e aveludado produzido com cacau nobre 50% e granulado crocante nobre. Sabor profundo e consistência marcante.',
    hashtags: '#PotePlutao #ChocolateArtesanal #Cacau50 #SobremesaArtesanal #SaoLuisMa #SlzOnline',
    legendaPadrao: `🍫 Para os apaixonados por intensidade: Creme Gelado de Chocolate! 🪐✨

Produzido com cacau nobre 50% e granulado crocante especial. Consistência aveludada, sabor marcante e temperatura ultragelada! ❄️🥄

Disponível para entrega individual ou em quantidade especial para o seu comércio/restaurante.

👉 Chame a gente no WhatsApp pelo link da bio!

#PotePlutao #ChocolateArtesanal #Cacau50 #SobremesaArtesanal #SaoLuisMa #SlzOnline`
  }
];

const TEMPLATES_ESPECIAIS = [
  {
    id: 'combo',
    nome: 'Combo da Galáxia (4 Sabores)',
    badge: '🛸 Todos os Sabores',
    cor: 0x2D8B7A,
    foto: 'potes-trio-real.jpg',
    legendaPadrao: `🪐 Na dúvida de qual escolher? Experimente todos os 4 sabores! 💛💚💖🤎

Maracujá, Limão, Morango e Chocolate artesanal. Todos ultragelados a -18°C e com textura de gravidade zero! 🛸✨

Qual é o seu preferido de hoje?
Comente aqui embaixo! 👇

📦 Peça seu combo no WhatsApp (link na bio): (98) 99193-9476.

#PotePlutao #ComboDaGalaxia #CremesGelados #SaoLuis #Maranhao #SobremesaCaseira #ZeroGravidade`
  },
  {
    id: 'parceria',
    nome: 'B2B / Revenda para Comércios',
    badge: '🤝 Para Restaurantes & Padarias',
    cor: 0x1B2A4A,
    foto: 'parceiro-real.jpg',
    legendaPadrao: `🏪 Leve o PotePlutão para o seu comércio e encante seus clientes! 🤝✨

Se você tem restaurante de PF, padaria, lanchonete ou cafeteria em São Luís, a PotePlutão é a sobremesa perfeita para o seu balcão pós-almoço:
✅ Preço especial de atacado
✅ Potes de 120ml com excelente margem e giro rápido
✅ Entrega pontual e reposição 2x por semana
✅ Amostra grátis para você e sua equipe degustarem!

📲 Quer ser um ponto parceiro? Mande uma mensagem agora no nosso WhatsApp: (98) 99193-9476!

#PotePlutao #RevendaSLZ #ComercioSLZ #EmpreendedorismoSLZ #RestaurantesSLZ #SaoLuis`
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
    const t = removerAcentos(termo.trim());
    return SABORES.find(s => removerAcentos(s.id).includes(t) || removerAcentos(s.nome).includes(t)) || null;
  }

  obterTodosSabores() {
    return SABORES;
  }

  obterCardapioEmbed() {
    const embed = new EmbedBuilder()
      .setTitle('🪐 Cardápio Oficial • PotePlutão')
      .setDescription(
        '**A sobremesa mais gelada da galáxia!** 🚀\n' +
        'Cremes artesanais ultragelados a **-18°C**, aerados e cremosos. ' +
        'Tão leves que parecem flutuar em *gravidade zero*.\n\n' +
        '*(Lembrete oficial: Nunca chame de mousse! É creme gelado artesanal.)*'
      )
      .setColor(0x2D8B7A)
      .setFooter({ text: 'PotePlutão • Direto de São Luís - MA • Potes de 120ml por R$ 5,00' })
      .setTimestamp();

    SABORES.forEach(s => {
      embed.addFields({
        name: `${s.badge} ${s.nome} — ${s.preco}`,
        value: `${s.descricao}\n*Pote lacrado de ${s.tamanho}*`,
        inline: false
      });
    });

    embed.addFields({
      name: '📲 Como pedir ou revender?',
      value: 'Chame no WhatsApp oficial: **(98) 99193-9476**\nOu use `!postar [sabor]` para gerar posts do Instagram!',
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
        '• 📦 Potes individuais de 120ml transparentes com selo adesivo colorido e lacre de segurança;\n' +
        '• 🤝 Opção de consignação sob avaliação.\n\n' +
        '📞 **Fale direto com a produção:** `(98) 99193-9476`'
      )
      .setColor(0x1B2A4A)
      .setFooter({ text: 'PotePlutão B2B • Jardim São Cristóvão e Região' })
      .setTimestamp();
  }

  async gerarPost(termo = null, usarIA = false) {
    let item = null;

    if (termo) {
      const t = removerAcentos(termo.trim());
      item = SABORES.find(s => removerAcentos(s.id).includes(t) || removerAcentos(s.nome).includes(t));
      if (!item) {
        item = TEMPLATES_ESPECIAIS.find(tp => removerAcentos(tp.id).includes(t) || removerAcentos(tp.nome).includes(t));
      }
    }

    if (!item) {
      const todos = [...SABORES, ...TEMPLATES_ESPECIAIS];
      item = todos[Math.floor(Math.random() * todos.length)];
    }

    let legenda = item.legendaPadrao;

    // Se solicitado gerar com IA do Gemini e o modelo estiver ativo
    if (usarIA && this.model) {
      try {
        const prompt = `
Você é a Aime, copywriter especialista em redes sociais da PotePlutão (marca de cremes gelados artesanais ultragelados de São Luís - MA).
Crie uma legenda INÉDITA, persuasiva, divertida e magnética para um post no Instagram sobre: "${item.nome}".

DIRETRIZES OBRIGATÓRIAS DA MARCA:
- NUNCA USE A PALAVRA "MOUSSE" SOB NENHUMA HIPÓTESE. (A marca é CREME GELADO ARTESANAL).
- Destaque que é servido trincando de gelado (-18°C).
- Enfatize a textura aerada de "gravidade zero".
- O preço é R$ 5,00 por pote de 120ml.
- Região de entrega: Jardim São Cristóvão e região em São Luís - MA.
- CTA chamando pro WhatsApp: (98) 99193-9476 ou link na bio.
- Adicione emojis de forma harmoniosa e hashtags estratégicas de São Luís no final.
Responda APENAS com o texto da legenda formatado pronto para copiar e colar.`;

        const res = await this.model.generateContent(prompt);
        const textoGerado = res.response.text();
        if (textoGerado && textoGerado.length > 50) {
          legenda = textoGerado.trim();
        }
      } catch (err) {
        console.error('[PotePlutao] Erro ao gerar com IA, usando template padrão:', err.message);
      }
    }

    const fotoPath = path.join(FOTOS_DIR, item.foto);
    const fotoExiste = fs.existsSync(fotoPath);

    const embed = new EmbedBuilder()
      .setTitle(`🚀 Post Instagram • ${item.nome}`)
      .setDescription(
        `📁 **Foto do Post:** \`${item.foto}\`\n\n` +
        `📝 **LEGENDA PRONTA PARA O INSTAGRAM:**\n` +
        `\`\`\`text\n${legenda}\n\`\`\``
      )
      .setColor(item.cor || 0x2D8B7A)
      .setFooter({ text: 'Aimê Marketing • PotePlutão • Prontinho para copiar e postar!' })
      .setTimestamp();

    if (fotoExiste) {
      embed.setImage(`attachment://${item.foto}`);
    }

    return {
      item,
      legenda,
      fotoPath: fotoExiste ? fotoPath : null,
      fotoNome: item.foto,
      embed
    };
  }
}

module.exports = SistemaPotePlutao;
