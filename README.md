# Bot VIP Medusa - Telegram

Bot do Telegram para vendas de conteúdo VIP com pagamento PIX via GerenciaNet.

## 🚀 Funcionalidades

- ✅ Menu de boas-vindas personalizado
- ✅ Sistema de pagamento PIX integrado
- ✅ Confirmação automática de pagamentos
- ✅ Adição automática no grupo VIP
- ✅ Banco de dados SQLite para usuários e pagamentos
- ✅ Webhook para notificações em tempo real
- ✅ Sistema de expiração de VIP (30 dias)

## 📋 Pré-requisitos

- Node.js 16+
- Conta no GerenciaNet/Afibank
- Bot do Telegram configurado
- Grupo VIP criado no Telegram

## 🔧 Configuração

### 1. Variáveis de Ambiente

Configure estas variáveis no Railway:

```env
BOT_TOKEN=7763201890:AAFVZRm5N6nFd9rxMArXGohk4eu907U77rk
GERENCIANET_CLIENT_ID=0bbbe9dd5aed43f50719d32c692dd2eb939732c7
GERENCIANET_CLIENT_SECRET=b12bbc8bf765ffb982b5734f4e4e1cf1a7f773a1
PIX_KEY=medusacontatoboot@gmail.com
VIP_GROUP_ID=-1001234567890
```

### 2. Como obter o ID do Grupo VIP

1. Adicione o bot como administrador do grupo VIP
2. Envie uma mensagem no grupo
3. Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. Procure por `"chat":{"id":-1001234567890}` (o número negativo é o ID)

### 3. Configurar Webhook no GerenciaNet

1. Acesse o painel do GerenciaNet
2. Vá em "Desenvolvedores" → "Webhooks"
3. Configure a URL: `https://seu-app.railway.app/webhook`

## 🚀 Deploy no Railway

1. Conecte este repositório no Railway
2. Configure as variáveis de ambiente
3. Deploy automático

## 📱 Como usar

1. Usuário acessa o bot: `@Viphotmedusabot`
2. Clica em "💎 COMPRAR ACESSO VIP - R$ 30,00"
3. Recebe o código PIX
4. Faz o pagamento
5. É adicionado automaticamente ao grupo VIP

## 🛠️ Estrutura do Projeto

```
├── index.js          # Código principal do bot
├── package.json      # Dependências
├── bot_vip.db       # Banco de dados SQLite
└── README.md        # Documentação
```

## 📊 Banco de Dados

### Tabela `users`
- `id`: ID único
- `telegram_id`: ID do usuário no Telegram
- `username`: Username do Telegram
- `first_name`: Nome do usuário
- `last_name`: Sobrenome
- `vip_expires`: Data de expiração do VIP
- `created_at`: Data de criação

### Tabela `payments`
- `id`: ID único
- `telegram_id`: ID do usuário
- `pix_id`: ID da cobrança PIX
- `amount`: Valor pago
- `status`: Status do pagamento
- `created_at`: Data de criação

## 🔒 Segurança

- Todas as credenciais em variáveis de ambiente
- Validação de pagamentos via webhook
- Verificação de status antes de adicionar ao grupo
- Sistema de expiração automática

## 📞 Suporte

- **Contato**: @medusacontatoboot
- **Email**: medusacontatoboot@gmail.com

## 🎯 Próximas Funcionalidades

- [ ] Sistema de renovação automática
- [ ] Múltiplos planos de assinatura
- [ ] Dashboard administrativo
- [ ] Relatórios de vendas
- [ ] Sistema de cupons de desconto

---

**Desenvolvido com ❤️ para o VIP da Medusa** 