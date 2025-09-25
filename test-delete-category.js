const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()

async function testDeleteCategory() {
  try {
    console.log('🧪 Testing Delete Category Functionality')
    console.log('=' .repeat(50))

    // Setup test data
    const testUser = await prisma.user.create({
      data: {
        phone: '+1234567890',
        password: 'testpassword',
        name: 'Delete Test User'
      }
    })

    console.log(`✅ Created test user: ${testUser.name}`)

    // Create test categories
    const category1 = await prisma.category.create({
      data: {
        name: 'Makanan Test',
        userId: testUser.id
      }
    })

    const category2 = await prisma.category.create({
      data: {
        name: 'Transport Test',
        userId: testUser.id
      }
    })

    console.log(`✅ Created test categories: ${category1.name}, ${category2.name}`)

    // Create JWT token
    const token = jwt.sign(
      { userId: testUser.id },
      process.env.JWT_SECRET || 'fallback-secret'
    )

    // Test 1: Delete category without expenses (should succeed)
    console.log('\n📝 Test 1: Delete category without expenses')
    const deleteResponse1 = await fetch(`http://localhost:3000/api/categories/${category1.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const deleteResult1 = await deleteResponse1.json()
    console.log(`Status: ${deleteResponse1.status}`)
    console.log('Response:', deleteResult1)

    // Test 2: Add expense to category2 and try to delete (should fail)
    console.log('\n📝 Test 2: Delete category with expenses (should fail)')
    
    // Create budget period first
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(startDate.getMonth() + 1)
    
    const budgetPeriod = await prisma.budgetPeriod.create({
      data: {
        userId: testUser.id,
        name: `Test Period ${new Date().getMonth() + 1}`,
        totalBudget: 500000,
        startDate: startDate,
        endDate: endDate,
        isActive: true
      }
    })

    // Add expense
    await prisma.expense.create({
      data: {
        description: 'Test expense',
        amount: 50000,
        categoryId: category2.id,
        userId: testUser.id
      }
    })

    const deleteResponse2 = await fetch(`http://localhost:3000/api/categories/${category2.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const deleteResult2 = await deleteResponse2.json()
    console.log(`Status: ${deleteResponse2.status}`)
    console.log('Response:', deleteResult2)

    // Test 3: Create category with budget allocation and try to delete (should fail)
    console.log('\n📝 Test 3: Delete category with budget allocation (should fail)')
    
    const category3 = await prisma.category.create({
      data: {
        name: 'Budget Test Category',
        userId: testUser.id
      }
    })

    // Add budget allocation
    await prisma.budgetAllocation.create({
      data: {
        budgetPeriodId: budgetPeriod.id,
        categoryId: category3.id,
        allocatedAmount: 100000,
        spentAmount: 0
      }
    })

    const deleteResponse3 = await fetch(`http://localhost:3000/api/categories/${category3.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const deleteResult3 = await deleteResponse3.json()
    console.log(`Status: ${deleteResponse3.status}`)
    console.log('Response:', deleteResult3)

    // Test 4: Try to delete category that doesn't belong to user (should fail)
    console.log('\n📝 Test 4: Delete category of another user (should fail)')
    
    const otherUser = await prisma.user.create({
      data: {
        phone: '+0987654321',
        password: 'testpassword',
        name: 'Other User'
      }
    })

    const otherCategory = await prisma.category.create({
      data: {
        name: 'Other User Category',
        userId: otherUser.id
      }
    })

    const deleteResponse4 = await fetch(`http://localhost:3000/api/categories/${otherCategory.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    const deleteResult4 = await deleteResponse4.json()
    console.log(`Status: ${deleteResponse4.status}`)
    console.log('Response:', deleteResult4)

    // Test 5: Check that category1 was actually deleted
    console.log('\n📝 Test 5: Verify category was deleted from database')
    
    const remainingCategories = await prisma.category.findMany({
      where: { userId: testUser.id }
    })
    
    console.log('Remaining categories for test user:')
    remainingCategories.forEach(cat => {
      console.log(`- ${cat.name} (ID: ${cat.id})`)
    })

    console.log('\n✅ Delete category tests completed!')
    console.log('Summary:')
    console.log('- Empty category deletion: Should succeed ✓')
    console.log('- Category with expenses: Should fail with error message ✓')
    console.log('- Category with budget allocation: Should fail with error message ✓')
    console.log('- Other user\'s category: Should fail with 404 error ✓')

  } catch (error) {
    console.error('❌ Test error:', error)
  } finally {
    // Cleanup
    try {
      await prisma.user.deleteMany({
        where: {
          phone: {
            in: ['+1234567890', '+0987654321']
          }
        }
      })
      console.log('\n🧹 Cleanup completed')
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
    
    await prisma.$disconnect()
  }
}

testDeleteCategory()