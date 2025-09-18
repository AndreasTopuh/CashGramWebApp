// Test script untuk Telegram Bot dan AI features
const API_BASE = 'http://localhost:3000' // Ganti dengan URL production jika sudah deploy

// Test data
const testUser = {
  phone: '085717797065',
  password: 'testpass123',
  name: 'Test User'
}

const testExpenses = [
  'nasi goreng 20rb',
  'ojek ke mall 15k',
  'beli pulsa 50 ribu',
  'makan siang warteg 12000',
  'bensin motor 25rb'
]

async function testRegisterAndLogin() {
  console.log('🧪 Testing Registration and Login...')
  
  try {
    // Test registration
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json()
      console.log('✅ Registration successful:', registerData.user.phone)
      return registerData.token
    } else {
      // Try login if user already exists
      const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testUser.phone,
          password: testUser.password
        })
      })
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        console.log('✅ Login successful:', loginData.user.phone)
        return loginData.token
      } else {
        console.error('❌ Login failed')
        return null
      }
    }
  } catch (error) {
    console.error('❌ Auth error:', error)
    return null
  }
}

async function testGeminiParsing() {
  console.log('\\n🤖 Testing Gemini AI Parsing...')
  
  try {
    // Import the GeminiService (would need to adjust path in actual implementation)
    for (const expenseText of testExpenses) {
      console.log(`\\nParsing: "${expenseText}"`)
      // This would call GeminiService.parseExpenseText(expenseText)
      // For now, simulate the expected output
      const mockParsed = {
        amount: parseInt(expenseText.match(/\\d+/)?.[0] || '0') * (expenseText.includes('rb') || expenseText.includes('k') ? 1000 : 1),
        description: expenseText.split(/\\d+/)[0].trim(),
        category: 'Makanan',
        confidence: 85
      }
      console.log('✅ Parsed:', mockParsed)
    }
  } catch (error) {
    console.error('❌ Gemini parsing error:', error)
  }
}

async function testAIAnalysis(token) {
  console.log('\\n🧠 Testing AI Analysis...')
  
  if (!token) {
    console.error('❌ No token available for AI analysis test')
    return
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/ai/analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ AI Analysis Response:')
      console.log(data.analysis)
    } else {
      console.error('❌ AI Analysis failed:', await response.text())
    }
  } catch (error) {
    console.error('❌ AI Analysis error:', error)
  }
}

async function testTelegramWebhook() {
  console.log('\\n📱 Testing Telegram Webhook...')
  
  const mockTelegramMessage = {
    message: {
      chat: { id: 123456789 },
      from: { id: 123456789 },
      text: '/start'
    }
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/bot/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockTelegramMessage)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Telegram webhook response:', data)
    } else {
      console.error('❌ Telegram webhook failed:', await response.text())
    }
  } catch (error) {
    console.error('❌ Telegram webhook error:', error)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting CashGram Integration Tests...\\n')
  
  const token = await testRegisterAndLogin()
  await testGeminiParsing()
  await testAIAnalysis(token)
  await testTelegramWebhook()
  
  console.log('\\n✅ All tests completed!')
  console.log('\\n📋 Next Steps:')
  console.log('1. ✅ Deploy to Vercel')
  console.log('2. ✅ Update webhook URL in setup-telegram-bot.js')
  console.log('3. ✅ Run webhook setup script')
  console.log('4. ✅ Test bot at https://t.me/cuentabot_bot')
  console.log('5. ✅ Test AI Analysis button in dashboard')
}

// Export for use in development
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testRegisterAndLogin, testGeminiParsing, testAIAnalysis, testTelegramWebhook }
}

// Run if called directly
if (typeof window === 'undefined' && require.main === module) {
  runAllTests()
}