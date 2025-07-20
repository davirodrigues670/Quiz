const { Telegraf } = require('telegraf');
const express = require('express');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment');
const crypto = require('crypto');

// Configurações
const BOT_TOKEN = process.env.BOT_TOKEN;
const GERENCIANET_CLIENT_ID = process.env.GERENCIANET_CLIENT_ID;
const GERENCIANET_CLIENT_SECRET = process.env.GERENCIANET_CLIENT_SECRET;
const PIX_KEY = process.env.PIX_KEY;
const VIP_GROUP_ID = process.env.VIP_GROUP_ID;

// Inicializar bot e servidor
const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// Banco de dados
const db = new sqlite3.Database('bot_vip.db');

// Criar tabelas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    vip_expires TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    telegram_id INTEGER,
    pix_id TEXT UNIQUE,
    amount REAL,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Autenticação GerenciaNet
async function getGerenciaNetToken() {
  try {
    const response = await axios.post('https://api-pix.gerencianet.com.br/oauth/token', {
      grant_type: 'client_credentials'
    }, {
      auth: {
        username: GERENCIANET_CLIENT_ID,
        password: GERENCIANET_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Erro ao obter token GerenciaNet:', error);
    return null;
  }
}

// Criar cobrança PIX
async function createPixCharge(amount, description) {
  try {
    const token = await getGerenciaNetToken();
    if (!token) return null;

    const response = await axios.post('https://api-pix.gerencianet.com.br/v2/charge', {
      calendario: {
        expiracao: 3600
      },
      devedor: {
        nome: "Cliente"
      },
      valor: {
        original: amount.toFixed(2)
      },
      chave: PIX_KEY,
      solicitacaoPagador: description
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao criar cobrança PIX:', error);
    return null;
  }
}

// Verificar pagamento PIX
async function checkPixPayment(pixId) {
  try {
    const token = await getGerenciaNetToken();
    if (!token) return null;

    const response = await axios.get(`https://api-pix.gerencianet.com.br/v2/charge/${pixId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return null;
  }
}

// Adicionar usuário ao grupo VIP
async function addUserToVipGroup(telegramId) {
  try {
    await bot.telegram.promoteChatMember(VIP_GROUP_ID, telegramId, {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false
    });
    return true;
  } catch (error) {
    console.error('Erro ao adicionar usuário ao grupo VIP:', error);
    return false;
  }
}

// Comando /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;

  // Salvar usuário no banco
  db.run(`INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name) 
          VALUES (?, ?, ?, ?)`, [userId, username, firstName, lastName]);

  const welcomeMessage = `
🎉 *Bem-vindo ao VIP da Medusa!* 🎉

Aqui você encontra conteúdo exclusivo e premium!

💎 *O que você ganha com o VIP:*
• Acesso ao grupo exclusivo
• Conteúdo premium
• Suporte prioritário
• Novidades em primeira mão

💰 *Preço:* R$ 30,00 por 30 dias

Clique no botão abaixo para adquirir seu acesso VIP!
  `;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💎 COMPRAR ACESSO VIP - R$ 30,00', callback_data: 'buy_vip' }],
      [{ text: 'ℹ️ Informações', callback_data: 'info' }],
      [{ text: '📞 Suporte', callback_data: 'support' }]
    ]
  };

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

// Callback para comprar VIP
bot.action('buy_vip', async (ctx) => {
  const userId = ctx.from.id;
  
  // Verificar se já é VIP
  db.get('SELECT vip_expires FROM users WHERE telegram_id = ?', [userId], async (err, row) => {
    if (err) {
      console.error('Erro ao verificar VIP:', err);
      return;
    }

    if (row && row.vip_expires && moment(row.vip_expires).isAfter(moment())) {
      await ctx.reply('✅ Você já possui acesso VIP ativo!');
      return;
    }

    // Criar cobrança PIX
    const charge = await createPixCharge(30.00, `VIP Medusa - ${ctx.from.first_name}`);
    
    if (!charge) {
      await ctx.reply('❌ Erro ao gerar pagamento. Tente novamente.');
      return;
    }

    // Salvar pagamento no banco
    db.run('INSERT INTO payments (telegram_id, pix_id, amount, status) VALUES (?, ?, ?, ?)', 
           [userId, charge.loc.id, 30.00, 'pending']);

    const pixMessage = `
💳 *Pagamento PIX Gerado*

💰 *Valor:* R$ 30,00
⏰ *Expira em:* 1 hora
📱 *PIX ID:* ${charge.loc.id}

📋 *Copie o código PIX abaixo:*
\`\`\`
${charge.pixCopyCola}
\`\`\`

📱 *Como pagar:*
1. Abra seu app do banco
2. Escolha PIX
3. Cole o código acima
4. Confirme o pagamento

✅ *Após o pagamento, você será adicionado automaticamente ao grupo VIP!*

⏳ *Aguardando pagamento...*
    `;

    await ctx.reply(pixMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Verificar Pagamento', callback_data: `check_${charge.loc.id}` }],
          [{ text: '❌ Cancelar', callback_data: 'cancel' }]
        ]
      }
    });
  });
});

// Callback para verificar pagamento
bot.action(/check_(.+)/, async (ctx) => {
  const pixId = ctx.match[1];
  const userId = ctx.from.id;

  const payment = await checkPixPayment(pixId);
  
  if (payment && payment.status === 'CONCLUIDA') {
    // Atualizar status do pagamento
    db.run('UPDATE payments SET status = ? WHERE pix_id = ?', ['completed', pixId]);

    // Adicionar VIP ao usuário
    const vipExpires = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss');
    db.run('UPDATE users SET vip_expires = ? WHERE telegram_id = ?', [vipExpires, userId]);

    // Adicionar ao grupo VIP
    const addedToGroup = await addUserToVipGroup(userId);

    const successMessage = `
✅ *Pagamento Confirmado!*

🎉 Parabéns! Você agora tem acesso VIP por 30 dias!

${addedToGroup ? '👥 Você foi adicionado ao grupo VIP!' : '⚠️ Erro ao adicionar ao grupo. Entre em contato com o suporte.'}

📅 *Expira em:* ${moment(vipExpires).format('DD/MM/YYYY HH:mm')}

Bem-vindo ao VIP da Medusa! 🎊
    `;

    await ctx.reply(successMessage, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply('⏳ Pagamento ainda não foi confirmado. Tente novamente em alguns minutos.');
  }
});

// Callback para informações
bot.action('info', async (ctx) => {
  const infoMessage = `
ℹ️ *Informações do VIP*

💎 *O que inclui:*
• Acesso ao grupo exclusivo VIP
• Conteúdo premium e exclusivo
• Suporte prioritário
• Novidades em primeira mão

💰 *Preço:* R$ 30,00
⏰ *Duração:* 30 dias
🔄 *Renovação:* Manual

📱 *Forma de pagamento:* PIX

❓ *Dúvidas?* Entre em contato com o suporte!
  `;

  await ctx.reply(infoMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💎 Comprar VIP', callback_data: 'buy_vip' }],
        [{ text: '📞 Suporte', callback_data: 'support' }]
      ]
    }
  });
});

// Callback para suporte
bot.action('support', async (ctx) => {
  const supportMessage = `
📞 *Suporte*

Precisa de ajuda? Entre em contato conosco:

👤 *Contato:* @medusacontatoboot
📧 *Email:* medusacontatoboot@gmail.com

⏰ *Horário de atendimento:* 24/7

❓ *Perguntas frequentes:*
• Como funciona o pagamento?
• Quando recebo o acesso?
• Como renovar o VIP?
• Problemas com o grupo?

Estamos aqui para ajudar! 😊
  `;

  await ctx.reply(supportMessage, { parse_mode: 'Markdown' });
});

// Callback para cancelar
bot.action('cancel', async (ctx) => {
  await ctx.reply('❌ Operação cancelada. Use /start para começar novamente.');
});

// Webhook para confirmação automática de pagamentos
app.post('/webhook', async (req, res) => {
  try {
    const { pix } = req.body;
    
    if (pix && pix.length > 0) {
      for (const payment of pix) {
        if (payment.status === 'CONCLUIDA') {
          // Buscar usuário pelo PIX ID
          db.get('SELECT telegram_id FROM payments WHERE pix_id = ? AND status = ?', 
                 [payment.txid, 'pending'], async (err, row) => {
            if (row) {
              const userId = row.telegram_id;
              
              // Atualizar status
              db.run('UPDATE payments SET status = ? WHERE pix_id = ?', ['completed', payment.txid]);
              
              // Adicionar VIP
              const vipExpires = moment().add(30, 'days').format('YYYY-MM-DD HH:mm:ss');
              db.run('UPDATE users SET vip_expires = ? WHERE telegram_id = ?', [vipExpires, userId]);
              
              // Adicionar ao grupo
              await addUserToVipGroup(userId);
              
              // Notificar usuário
              await bot.telegram.sendMessage(userId, 
                '✅ *Pagamento confirmado automaticamente!*\n\n🎉 Você foi adicionado ao grupo VIP!\n\nBem-vindo ao VIP da Medusa! 🎊', 
                { parse_mode: 'Markdown' });
            }
          });
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});

// Iniciar bot
bot.launch().then(() => {
  console.log('Bot iniciado com sucesso!');
}).catch((error) => {
  console.error('Erro ao iniciar bot:', error);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 