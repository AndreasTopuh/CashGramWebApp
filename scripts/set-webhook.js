require('dotenv').config()
const https = require('https')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = `http://localhost:3001/api/bot/webhook-improved`

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in .env.local')
  process.exit(1)
}

if (!process.env.NEXTAUTH_URL) {
  console.error('❌ NEXTAUTH_URL not found in .env.local')
  process.exit(1)
}

// Set webhook
const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`
const data = JSON.stringify({
  url: WEBHOOK_URL
})

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}

console.log(`🔄 Setting webhook to: ${WEBHOOK_URL}`)

const req = https.request(setWebhookUrl, options, (res) => {
  let responseData = ''
  
  res.on('data', (chunk) => {
    responseData += chunk
  })
  
  res.on('end', () => {
    const result = JSON.parse(responseData)
    if (result.ok) {
      console.log('✅ Webhook set successfully!')
      console.log('📱 Your bot is ready to use')
    } else {
      console.error('❌ Failed to set webhook:', result)
    }
  })
})

req.on('error', (error) => {
  console.error('❌ Error setting webhook:', error)
})

req.write(data)
req.end()