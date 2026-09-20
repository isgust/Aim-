# 👑 Bot Supremo do Discord (Administrador + RPG Multiplayer + IA Auto-Evolutiva)

Bot tudo-em-um para o seu servidor do Discord com **Mestre de RPG com IA (Gemini)**, imagens cinematográficas, barras de vida verdes dinâmicas, **sistema anti-trapaça por ID** (ninguém responde pelo outro) e um **sistema de auto-aprendizado pelo canal `#melhorias`**!

---

## 🌟 Funcionalidades Principais

### 1. ⚔️ RPG Multiplayer com Anti-Trapaça por ID
- Cada amigo usa o comando `!criar <Classe> <Nome>` (ex: `!criar Mago Lucas`).
- O bot vincula a ficha **permanentemente ao ID da conta do Discord dele**.
- **Ninguém consegue jogar pelo outro**: quando alguém usa `!agir`, o bot sabe exatamente quem agiu e atualiza apenas os atributos daquele jogador.
- **Possibilidades Infinitas**: Não há limite de ações. Os jogadores podem tentar qualquer coisa criativa.
- **Barras de Vida Visuais**: `[🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜] 80/100 HP`.
- **Imagens em Tempo Real**: Cada cena e monstro gera uma arte cinematográfica inédita direto no chat.

### 2. 🧠 Canal `#melhorias` (A IA Fica Mais Inteligente)
- Crie um canal chamado `#melhorias` (ou `#sugestoes`) no seu servidor.
- Sempre que você ou seus amigos mandarem uma sugestão (ex: *"armas de fogo dão dano crítico em monstros de gelo"*, *"goblins têm medo de música alta"*, *"o guarda da cidade é corrupto"*):
  1. O bot reage com 🧠.
  2. A IA analisa a sugestão e extrai a regra.
  3. Salva na **memória permanente da IA**.
  4. Em todas as próximas sessões de RPG e respostas, **o bot passa a seguir essa regra aprendida**!
- Use `!cerebro` para ver tudo o que a IA já aprendeu com o grupo!

### 3. 🛡️ Administração do Servidor
- `!limpar <1-99>`: Moderação rápida para apagar mensagens.
- `!ajuda`: Menu interativo com todos os comandos.

---

## 🚀 Como Ligar o Bot:

1. Pegue o seu Token no [Discord Developer Portal](https://discord.com/developers/applications) (veja o passo a passo abaixo se precisar).
2. Cole o token no arquivo `.env` dentro de `bot-discord-supremo`:
   ```env
   DISCORD_BOT_TOKEN=SEU_TOKEN_AQUI
   ```
3. Inicie o bot no terminal:
   ```bash
   cd bot-discord-supremo
   node bot.js
   ```

---

## 📜 Lista de Comandos:

| Comando | Descrição |
|---|---|
| `!criar <Classe> <Nome>` | Cria o seu herói vinculado à sua conta do Discord |
| `!agir <sua ação>` | Realiza qualquer ação livre no RPG no seu turno |
| `!party` | Mostra todos os jogadores do servidor com as barras de vida lado a lado |
| `!status` | Mostra sua ficha individual, moedas e inventário |
| `!descansar` | Recupera HP e Mana na fogueira |
| `!cerebro` | Exibe todas as regras que a IA aprendeu com os players |
| `!limpar <1-99>` | Apaga mensagens do canal (apenas moderadores) |
| `!ajuda` | Mostra este menu de comandos |
