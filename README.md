# 👑 Bot Supremo do Discord (Administrador + RPG Multiplayer + DJ + PotePlutão Marketing)

Bot tudo-em-um para o seu servidor do Discord com **Mestre de RPG com IA (Gemini)**, DJ de voz, sistema de psicologia social de membros, **módulo de marketing e cardápio da PotePlutão** e auto-aprendizado pelo canal `#melhorias`!

---

## 🌟 Funcionalidades Principais

### 1. ⚔️ RPG Multiplayer com Anti-Trapaça por ID
- Cada amigo usa o comando `!criar <Classe> <Nome>` (ex: `!criar Mago Lucas`).
- O bot vincula a ficha **permanentemente ao ID da conta do Discord dele**.
- **Ninguém consegue jogar pelo outro**: quando alguém usa `!agir`, o bot sabe exatamente quem agiu e atualiza apenas os atributos daquele jogador.
- **Possibilidades Infinitas**: Não há limite de ações. Os jogadores podem tentar qualquer coisa criativa.
- **Barras de Vida Visuais**: `[🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜] 80/100 HP`.
- **Imagens em Tempo Real**: Cada cena e monstro gera uma arte cinematográfica inédita direto no chat.

### 2. 🪐 PotePlutão (Marketing, Instagram & Cardápio)
- `!pote`: Apresentação oficial da PotePlutão, sobremesas artesanais e links.
- `!sabores` (ou `!cardapio`): Lista detalhada dos 4 sabores reais de 120ml (Maracujá, Limão, Morango, Chocolate) por R$ 5,00.
- `!postar <sabor>`: Aime gera e publica no chat uma postagem oficial com a foto real anexada e legenda formatada pronta para o Instagram.
- `!parceria` (ou `!atacado`): Tabela e condições comerciais de revenda para restaurantes, lanchonetes e padarias em São Luís.

### 3. 🧠 Canal `#melhorias` (A IA Fica Mais Inteligente)
- Crie um canal chamado `#melhorias` (ou `#sugestoes`) no seu servidor.
- Sempre que você ou seus amigos mandarem uma sugestão (ex: *"armas de fogo dão dano crítico em monstros de gelo"*, *"goblins têm medo de música alta"*, *"o guarda da cidade é corrupto"*):
  1. O bot reage com 🧠.
  2. A IA analisa a sugestão e extrai a regra.
  3. Salva na **memória permanente da IA**.
  4. Em todas as próximas sessões de RPG e respostas, **o bot passa a seguir essa regra aprendida**!
- Use `!cerebro` para ver tudo o que a IA já aprendeu com o grupo!

### 4. 🎶 DJ de Voz com IA (Gemini DJ)
- `!music <nome ou link>` (ou `!play`): Toca músicas com comentários do DJ na call de voz.
- `!pausar`, `!continuar`, `!pular`, `!fila`, `!parar`.

### 5. 🛡️ Administração do Servidor
- `!limpar <1-99>`: Moderação rápida para apagar mensagens.
- `!ajuda`: Menu interativo com todos os comandos.

---

## 🚀 Como Ligar o Bot:

1. Pegue o seu Token no [Discord Developer Portal](https://discord.com/developers/applications).
2. Cole o token no arquivo `.env`:
   ```env
   DISCORD_BOT_TOKEN=SEU_TOKEN_AQUI
   GEMINI_API_KEY=SUA_CHAVE_GEMINI
   ```
3. Inicie o bot no terminal:
   ```bash
   npm start
   ```

---

## 📜 Lista de Comandos:

| Comando | Descrição |
|---|---|
| `!pote` | Apresentação oficial da PotePlutão e links |
| `!sabores` | Cardápio oficial com os 4 sabores de 120ml |
| `!postar [sabor]` | Gera post oficial do Instagram com foto real e legenda |
| `!parceria` | Informações de atacado e B2B para comércios |
| `!criar <Classe> <Nome>` | Cria o seu herói vinculado à sua conta do Discord |
| `!agir <sua ação>` | Realiza qualquer ação livre no RPG no seu turno |
| `!party` | Mostra todos os jogadores do servidor com as barras de vida |
| `!status` | Mostra sua ficha individual, moedas e inventário |
| `!descansar` | Recupera HP e Mana na fogueira |
| `!music <busca>` | Toca música na call de voz |
| `!cerebro` | Exibe todas as regras que a IA aprendeu com os players |
| `!limpar <1-99>` | Apaga mensagens do canal (apenas moderadores) |
| `!ajuda` | Mostra este menu de comandos |
