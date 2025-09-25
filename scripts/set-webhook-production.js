require('dotenv').config({ path: '.env.local' })
const https = require('https')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WEBHOOK_URL = 'https://cash-gram-web-app.vercel.app/api/bot/webhook-improved'

console.log(`🔄 Setting webhook to: ${WEBHOOK_URL}`)

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

const req = https.request(setWebhookUrl, options, (res) => {
  let responseData = ''
  
  res.on('data', (chunk) => {
    responseData += chunk
  })
  
  res.on('end', () => {
    const result = JSON.parse(responseData)
    if (result.ok) {
      console.log('✅ Webhook set successfully!')
      console.log('📱 Bot now uses webhook-improved endpoint')
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