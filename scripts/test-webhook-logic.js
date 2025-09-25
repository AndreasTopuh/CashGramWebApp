require('dotenv').config({ path: '.env.local' })

// Test webhook-improved parsing logic
function testParsing() {
  console.log('🧪 Testing webhook-improved parsing logic...\n')

  const testCases = [
    '7',              // Category selection
    '50000 makan siang',  // Expense input
    'lanjut',         // Confirmation
    'batal',          // Cancellation
    'hello'           // Default help
  ]

  testCases.forEach(input => {
    console.log(`Input: "${input}"`)
    
    // Test category selection regex
    if (/^\d+$/.test(input)) {
      console.log('✅ Matches category selection pattern')
    }
    
    // Test expense format
    const expenseMatch = input.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
    if (expenseMatch) {
      console.log('✅ Matches expense format:', {
        amount: expenseMatch[1],
        description: expenseMatch[2]
      })
    }
    
    // Test confirmation
    if (input.toLowerCase() === 'lanjut' || input.toLowerCase() === 'batal') {
      console.log('✅ Matches confirmation pattern')
    }
    
    console.log('---')
  })
}

// Test category display logic
function testCategoryDisplay() {
  console.log('\n🎯 Testing category display format...\n')
  
  const mockCategories = [
    { id: 'cat1', name: 'Transportasi', icon: '🚗' },
    { id: 'cat2', name: 'Listrik', icon: '💡' },
    { id: 'cat3', name: 'Laundry', icon: '👕' },
    { id: 'cat4', name: 'Kuota ac', icon: '❄️' },
    { id: 'cat5', name: 'Makanan sabtu & minggu', icon: '🍔' },
    { id: 'cat6', name: 'Kebersihan', icon: '🧽' },
    { id: 'cat7', name: 'Beras dll', icon: '🌾' },
    { id: 'cat8', name: 'Uang Candlely', icon: '💰' },
    { id: 'cat9', name: 'Uang Andreas', icon: '💰' },
    { id: 'cat10', name: 'Makanan senin-jumat', icon: '🍽️' }
  ]

  let categoryText = '🎯 Anda menggunakan uang dari kategori mana?\n'
  
  mockCategories.forEach((category, index) => {
    const status = '✅' // Mock budget sufficient status
    categoryText += `${index + 1}. ${status} ${category.icon} ${category.name} (Sisa: Rp 1.500.000)\n`
  })

  categoryText += '\n💡 Keterangan:\n'
  categoryText += '✅ Budget mencukupi\n'
  categoryText += '⚠️ Akan over budget\n'
  categoryText += '❌ Budget habis\n'
  categoryText += '📋 Belum ada budget\n\n'
  categoryText += '💡 Tips: Pilih kategori yang sesuai untuk tracking budget yang akurat!'

  console.log(categoryText)
}

testParsing()
testCategoryDisplay()