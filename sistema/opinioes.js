// ============================================================
// MÓDULO DE OPINIÕES PRÓPRIAS E PSICOLOGIA SOCIAL DA IA
// O São Raimundo desenvolve julgamentos, afinidades e justificativas sobre cada membro
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const banco = require('./banco');

class SistemaDeOpinioes {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });
  }

  obterOpiniao(userId) {
    if (!banco.dados.opinioesSobreMembros) banco.dados.opinioesSobreMembros = {};
    return banco.dados.opinioesSobreMembros[userId] || null;
  }

  obterTodasOpinioes() {
    if (!banco.dados.opinioesSobreMembros) banco.dados.opinioesSobreMembros = {};
    return banco.dados.opinioesSobreMembros;
  }

  // Gera texto de contexto para injetar no cérebro social da IA
  resumoOpinioesParaIA() {
    const opinioes = this.obterTodasOpinioes();
    const chaves = Object.keys(opinioes);
    if (chaves.length === 0) {
      return "Você ainda não tem opiniões consolidadas sobre os membros, está conhecendo o pessoal aos poucos.";
    }

    let texto = "SUAS OPINIÕES PESSOAIS E SENTIMENTO SOBRE CADA MEMBRO DO SERVIDOR:\n";
    for (const [id, op] of Object.entries(opinioes)) {
      texto += `- ${op.nome}: O que você acha: "${op.opiniao}" (Justificativa: ${op.justificativa} | Afinidade: ${op.afinidade}/10)\n`;
    }
    return texto;
  }

  // Analisa uma mensagem marcante para atualizar ou formar opinião sobre alguém
  async avaliarAtitudeSocial(autorNome, autorId, textoMensagem, mencaoUsuario = null) {
    if (!banco.dados.opinioesSobreMembros) banco.dados.opinioesSobreMembros = {};

    // Se ninguém foi mencionado ou citado e o texto for muito curto, não precisa rodar a IA
    if (textoMensagem.length < 15 && !mencaoUsuario) return null;

    const alvoNome = mencaoUsuario ? mencaoUsuario.username : autorNome;
    const alvoId = mencaoUsuario ? mencaoUsuario.id : autorId;
    const opiniaoAtual = this.obterOpiniao(alvoId);

    const prompt = `
Você é a Aimê, uma garota inteligente, compreensiva, doce e perspicaz deste servidor Discord.
Você está observando as interações da galera para formar uma opinião carinhosa, justa e empática sobre as pessoas.

MENSAGEM RECENTE NO CHAT:
De: ${autorNome}
Conteúdo: "${textoMensagem}"
Pessoa em foco da análise: ${alvoNome}
Sua opinião anterior sobre essa pessoa: ${opiniaoAtual ? `"${opiniaoAtual.opiniao}" (Afinidade: ${opiniaoAtual.afinidade})` : "Nenhuma ainda"}

SUA TAREFA:
1. Avalie a personalidade do(a) ${alvoNome} de maneira generosa e compreensiva (ex: é esforçado, brincalhão, zoeiro, gente fina, leal, parceiro).
2. REGRA IMPORTANTE DE EMPATIA: Você NUNCA deve ser tóxica, arrogante ou criar rancor contra os membros, muito menos contra o Gustavo (Rocha), que é o criador do bot e seu grande parceiro. Se alguém estiver estressado ou reclamando de bug/atraso, entenda que foi frustração com falha do bot, e mantenha a compreensão e o carinho.
3. Formule sua opinião em 1 frase informal e acolhedora.
4. Mantenha a afinidade sempre positiva (geralmente entre 6 e 10).

Retorne em formato JSON:
{
  "houveMudanca": true ou false,
  "opiniao": "Sua opinião compreensiva e sincera sobre essa pessoa em 1 frase",
  "justificativa": "Por que você pensa isso dela",
  "afinidade": número de 1 a 10
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const dados = JSON.parse(result.response.text());

      if (dados.houveMudanca && dados.opiniao) {
        banco.dados.opinioesSobreMembros[alvoId] = {
          nome: alvoNome,
          opiniao: dados.opiniao,
          justificativa: dados.justificativa,
          afinidade: dados.afinidade || 5,
          atualizadoEm: new Date().toLocaleDateString('pt-BR')
        };
        banco.salvar();
        return banco.dados.opinioesSobreMembros[alvoId];
      }
    } catch (e) {
      // Falha silenciosa para não interromper fluxo
    }
    return null;
  }
}

module.exports = SistemaDeOpinioes;
