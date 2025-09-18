// Test registration untuk mencoba bot dan AI analysis - Updated for production
const VERCEL_URL = 'https://cash-gram-web-app.vercel.app'

async function createTestUser() {
  console.log('🧪 Creating test user...')
  
  const testUser = {
    phone: '085717797065',
    password: 'testpass123', 
    name: 'Andreas Test'
  }
  
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Test user created successfully!')
      console.log('📱 Phone:', data.user.phone)
      console.log('🔑 User ID:', data.user.id)
      console.log('🎫 Token:', data.token.substring(0, 20) + '...')
      
      // Test adding some expenses
      await addTestExpenses(data.token)
      
    } else {
      const error = await response.json()
      if (error.error?.includes('already exists')) {
        console.log('ℹ️ User already exists, trying login...')
        await loginTestUser()
      } else {
        console.error('❌ Registration failed:', error)
      }
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  }
}

async function loginTestUser() {
  const testLogin = {
    phone: '085717797065',
    password: 'testpass123'
  }
  
  try {
    const response = await fetch(`${VERCEL_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testLogin)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Login successful!')
      console.log('📱 Phone:', data.user.phone)
      console.log('👤 Name:', data.user.name)
      
      await addTestExpenses(data.token)
      
    } else {
      console.error('❌ Login failed')
    }
  } catch (error) {
    console.error('❌ Login error:', error)
  }
}

async function addTestExpenses(token) {
  console.log('\n💰 Adding test expenses...')
  
  const testExpenses = [
    { amount: 25000, description: 'Nasi goreng spesial', categoryName: 'Makanan' },
    { amount: 15000, description: 'Ojek online ke mall', categoryName: 'Transportasi' },
    { amount: 50000, description: 'Pulsa smartphone', categoryName: 'Lainnya' },
    { amount: 12000, description: 'Es teh manis', categoryName: 'Makanan' },
    { amount: 30000, description: 'Bensin motor', categoryName: 'Transportasi' }
  ]
  
  try {
    // Get categories first
    const categoriesRes = await fetch(`${VERCEL_URL}/api/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!categoriesRes.ok) {
      console.error('❌ Failed to get categories')
      return
    }
    
    const categories = await categoriesRes.json()
    console.log('📂 Available categories:', categories.length)
    
    // Add expenses
    for (const expense of testExpenses) {
      const category = categories.find(c => c.name === expense.categoryName)
      if (!category) {
        console.warn(`⚠️ Category '${expense.categoryName}' not found`)
        continue
      }
      
      const response = await fetch(`${VERCEL_URL}/api/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: expense.amount,
          description: expense.description,
          categoryId: category.id
        })
      })
      
      if (response.ok) {
        console.log(`✅ Added: ${expense.description} - Rp ${expense.amount.toLocaleString('id-ID')}`)
      } else {
        console.error(`❌ Failed to add: ${expense.description}`)
      }
    }
    
    console.log('\n🎯 Test data ready! Now you can:')
    console.log('1. 🤖 Test Telegram Bot at https://t.me/cuentabot_bot')
    console.log('2. 🌐 Login to website and test AI Analysis')
    console.log('3. 📱 Login credentials: 085717797065 / testpass123')
    
  } catch (error) {
    console.error('❌ Error adding test expenses:', error)
  }
}

// Run the test
createTestUser()