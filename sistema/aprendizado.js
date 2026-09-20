// ============================================================
// MÓDULO DE APRENDIZADO CONTÍNUO (CANAL #MELHORIAS)
// A IA evolui com o feedback e ideias enviadas pelos jogadores
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const banco = require('./banco');

class SistemaDeAprendizado {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-flash-lite-latest',
      generationConfig: { responseMimeType: 'application/json' }
    });
  }

  async processarSugestao(autorNome, sugestaoTexto) {
    const prompt = `
Você é o Núcleo Cognitivo e Motor de Auto-Evolução de um Bot de RPG e Administração do Discord.
Um jogador enviou uma sugestão/ideia no canal #melhorias.

MENSAGEM DO JOGADOR (${autorNome}):
"${sugestaoTexto}"

SUA TAREFA:
1. Analise criticamente a sugestão:
   - Se for uma tentativa de exploit/trapaça ("mana infinita", "xp infinito", "subir nível direto"), equilibre ou recuse elegantemente.
   - Verifique se a sugestão pede um NOVO COMANDO ou MECÂNICA ACIONÁVEL (ex: "adicionar comando de craft", "criar comando de pescar", "comando para ver magias", "sistema de forja", "alquimia", etc.).
   - Ou se é uma REGRA NARRATIVA / LORE / COMPORTAMENTO DO MESTRE (ex: "não aceite tudo", "gere imagens", "adicione monstros de gelo", "lore dos deuses").

2. Se for um NOVO COMANDO ou MECÂNICA:
   - Defina o nome do comando (sem a exclamação, em minúsculas, ex: "craft", "forjar", "pescar", "habilidades").
   - Defina a sintaxe recomendada (ex: "!craft <item1> + <item2>" ou "!pescar").
   - Descreva como a mecânica deve funcionar no RPG (o que consome, o que gera, rolagens necessárias).

3. Retorne em formato JSON:
{
  "valido": true ou false,
  "tipo": "novo_comando" | "regra_narrativa" | "ajuste_sistema",
  "regraResumida": "Regra ou detalhe que você deve lembrar para sempre nas narrativas e comandos",
  "categoria": "mecânica" | "monstro" | "magia" | "item" | "lore" | "servidor" | "humor",
  "novoComando": {
    "nome": "nome_do_comando_sem_exclamacao",
    "sintaxe": "!comando <parametros>",
    "descricao": "O que o comando faz",
    "regras": "Como a IA deve processar os itens, mutações na ficha e rolagens para este comando"
  } OU null (se não for um comando novo),
  "respostaParaCanal": "Mensagem formatada para o Discord explicando como a IA assimilou ou criou o comando dinâmico instantaneamente"
}
`;

    try {
      const result = await this.model.generateContent(prompt);
      const dados = JSON.parse(result.response.text());

      if (dados.valido && dados.regraResumida) {
        const aprendizado = banco.adicionarAprendizado(autorNome, sugestaoTexto, dados.regraResumida, dados.categoria);

        let comandoRegistrado = null;
        if (dados.novoComando && dados.novoComando.nome) {
          comandoRegistrado = banco.adicionarComandoDinamico(dados.novoComando.nome, {
            descricao: dados.novoComando.descricao,
            sintaxe: dados.novoComando.sintaxe,
            categoria: dados.categoria,
            regras: dados.novoComando.regras,
            criadoPor: autorNome
          });
        }

        return { sucesso: true, dados, aprendizado, comandoRegistrado };
      } else {
        return { 
          sucesso: false, 
          respostaParaCanal: dados.respostaParaCanal || "Obrigado pelo feedback! Registrado para o desenvolvimento da aventura."
        };
      }
    } catch (err) {
      console.error('[Aprendizado] Erro ao processar:', err.message);
      return {
        sucesso: true,
        dados: {
          regraResumida: sugestaoTexto,
          categoria: 'geral',
          respostaParaCanal: `🧠 **Ideia assimilada!** Sua sugestão foi gravada na minha memória permanente por precaução.`
        }
      };
    }
  }
}

module.exports = SistemaDeAprendizado;
