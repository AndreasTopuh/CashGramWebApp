require('dotenv').config({ path: '.env.local' })

// Test direct API call to webhook-improved
const http = require('http')

const testMessages = [
  {
    message: {
      chat: { id: 1590851873 },
      text: '50000 makan siang'
    }
  },
  {
    message: {
      chat: { id: 1590851873 },
      text: '7'
    }
  },
  {
    message: {
      chat: { id: 1590851873 },
      text: 'lanjut'
    }
  }
]

async function testWebhook(payload, testName) {
  console.log(`\n🧪 Testing: ${testName}`)
  console.log('Payload:', JSON.stringify(payload, null, 2))
  
  const data = JSON.stringify(payload)
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/bot/webhook-improved',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = ''
      
      res.on('data', (chunk) => {
        responseData += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          console.log('✅ Response:', JSON.stringify(result, null, 2))
          resolve(result)
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

async function runTests() {
  console.log('🚀 Starting webhook tests...')
  
  // Test expense input
  await testWebhook(testMessages[0], 'Expense Input (50000 makan siang)')
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Test category selection
  await testWebhook(testMessages[1], 'Category Selection (7)')
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Test confirmation
  await testWebhook(testMessages[2], 'Confirmation (lanjut)')
}

runTests().catch(console.error)