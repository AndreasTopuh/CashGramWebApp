// Manual registration for Telegram user ID 5438958945
const https = require('https')

const userData = {
  name: 'deas',
  email: 'deas.telegram@cashgram.app',
  phone: '+6285438958945',
  password: 'temppassword123',
  telegramId: '5438958945'
}

async function registerUser() {
  console.log('🔄 Registering user via API...')
  
  const data = JSON.stringify(userData)
  
  const options = {
    hostname: 'cash-gram-web-app.vercel.app',
    port: 443,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ User registered successfully!')
            console.log('User ID:', result.user?.id)
            console.log('Telegram ID:', result.telegramUser?.telegramId)
            resolve(result)
          } else {
            console.log('⚠️ Registration response:', result)
            resolve(result)
          }
        } catch (e) {
          console.log('📄 Raw response:', responseData)
          resolve({ raw: responseData })
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Request error:', error)
      reject(error)
    })

    req.write(data)
    req.end()
  })
}

registerUser().catch(console.error)