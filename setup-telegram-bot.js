// Telegram Bot Setup Script
// Run this script after deploying to Vercel to setup webhook

const TELEGRAM_BOT_TOKEN = '8480487065:AAGBykabL6AmnS3XN3-ZFism6tHBx7qf-QQ'
const WEBHOOK_URL = 'https://your-vercel-app.vercel.app/api/bot/webhook' // Replace with your Vercel URL

async function setupTelegramWebhook() {
  try {
    // Set webhook
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message']
      })
    })

    const result = await response.json()
    console.log('Webhook setup result:', result)

    if (result.ok) {
      console.log('✅ Telegram webhook berhasil disetup!')
      console.log(`📱 Bot URL: https://t.me/cuentabot_bot`)
      console.log(`🔗 Webhook: ${WEBHOOK_URL}`)
    } else {
      console.error('❌ Gagal setup webhook:', result.description)
    }

  } catch (error) {
    console.error('Error setting up webhook:', error)
  }
}

async function getBotInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
    const result = await response.json()
    console.log('Bot info:', result)
  } catch (error) {
    console.error('Error getting bot info:', error)
  }
}

// Run setup
console.log('🤖 Setting up CashGram Telegram Bot...')
getBotInfo()
// setupTelegramWebhook() // Uncomment this when ready to setup webhook

console.log(`
📋 Next Steps:
1. Deploy aplikasi ke Vercel
2. Update WEBHOOK_URL dengan URL Vercel yang benar
3. Uncomment setupTelegramWebhook() dan jalankan script
4. Test bot di @cuentabot_bot

🎯 Bot Commands:
/start - Mulai menggunakan bot
/login [phone] [password] - Login ke akun CashGram
/analisis minggu - Analisis pengeluaran mingguan
/analisis bulan - Analisis pengeluaran bulanan
/saldo - Cek pengeluaran hari ini

💰 Input Pengeluaran:
"nasi goreng 20rb"
"ojek ke mall 15k"
"beli pulsa 50 ribu"
`)