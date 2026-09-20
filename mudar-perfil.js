// ============================================================
// SCRIPT: Atualizar Nome e Avatar do Bot no Discord
// ============================================================

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');
const fs = require('fs');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const NOVO_NOME = process.argv[2] || 'Morgana';
const AVATAR_PATH = path.join(__dirname, 'avatar.jpg');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`[Bot Conectado] Nome atual: ${client.user.tag}`);

  // 1. Atualizar Avatar
  if (fs.existsSync(AVATAR_PATH)) {
    try {
      console.log('🖼️ Enviando novo avatar para o Discord...');
      await client.user.setAvatar(AVATAR_PATH);
      console.log('✅ Avatar atualizado com sucesso no Discord!');
    } catch (err) {
      console.error('⚠️ Erro ao atualizar avatar:', err.message);
    }
  }

  // 2. Atualizar Nome
  try {
    console.log(`🏷️ Tentando alterar nome para: "${NOVO_NOME}"...`);
    await client.user.setUsername(NOVO_NOME);
    console.log(`✅ Nome alterado com sucesso para: "${NOVO_NOME}"!`);
  } catch (err) {
    console.log('⚠️ Aviso ao alterar username global:', err.message);
    console.log('💡 Dica: O Discord pode pedir para alterar o nome diretamente no Developer Portal se houver rate-limit.');
  }

  // 3. Atualizar apelido nos servidores onde está
  for (const guild of client.guilds.cache.values()) {
    try {
      const me = await guild.members.fetchMe();
      await me.setNickname(NOVO_NOME);
      console.log(`✅ Apelido no servidor "${guild.name}" definido como "${NOVO_NOME}"!`);
    } catch (e) {
      console.log(`ℹ️ Não foi possível alterar apelido em "${guild.name}":`, e.message);
    }
  }

  console.log('\n🎉 Processo concluído!');
  client.destroy();
  process.exit(0);
});

client.login(TOKEN).catch(e => {
  console.error('❌ Erro de login:', e.message);
  process.exit(1);
});
