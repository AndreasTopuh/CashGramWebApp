require('dotenv').config({ path: '.env.local' })
const https = require('https')

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

// Get current webhook info
const getWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`

console.log('🔍 Checking current webhook...')

const req = https.request(getWebhookUrl, { method: 'GET' }, (res) => {
  let responseData = ''
  
  res.on('data', (chunk) => {
    responseData += chunk
  })
  
  res.on('end', () => {
    const result = JSON.parse(responseData)
    if (result.ok) {
      console.log('📱 Current webhook info:')
      console.log('URL:', result.result.url)
      console.log('Has custom certificate:', result.result.has_custom_certificate)
      console.log('Pending updates:', result.result.pending_update_count)
      console.log('Last error date:', result.result.last_error_date ? new Date(result.result.last_error_date * 1000) : 'None')
      console.log('Last error message:', result.result.last_error_message || 'None')
      console.log('Max connections:', result.result.max_connections)
      console.log('Allowed updates:', result.result.allowed_updates)
    } else {
      console.error('❌ Failed to get webhook info:', result)
    }
  })
})

req.on('error', (error) => {
  console.error('❌ Error getting webhook info:', error)
})

req.end()