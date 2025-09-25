require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugTelegramUser() {
  try {
    console.log('🔍 Debugging Telegram Users...\n')
    
    // Get all telegram users
    const telegramUsers = await prisma.telegramUser.findMany({
      include: {
        user: {
          include: {
            categories: true,
            budgetPeriods: {
              where: { isActive: true },
              include: {
                budgetAllocations: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }
      }
    })

    console.log(`Found ${telegramUsers.length} Telegram users:`)
    
    telegramUsers.forEach((tgUser, index) => {
      console.log(`\n${index + 1}. Telegram User:`)
      console.log(`   ID: ${tgUser.id}`)
      console.log(`   Telegram ID: ${tgUser.telegramId}`)
      console.log(`   User ID: ${tgUser.userId}`)
      console.log(`   Active: ${tgUser.isActive}`)
      console.log(`   Categories: ${tgUser.user.categories.length}`)
      console.log(`   Budget Periods: ${tgUser.user.budgetPeriods.length}`)
      
      if (tgUser.user.categories.length > 0) {
        console.log(`   Category Names: ${tgUser.user.categories.map(c => c.name).join(', ')}`)
      }
    })

    // Check if we need to register the user from screenshot (ID: 1758787398)
    const screenshotUserId = '1758787398'
    const existingUser = await prisma.telegramUser.findUnique({
      where: { telegramId: screenshotUserId }
    })

    console.log(`\n🔍 Checking user from screenshot (ID: ${screenshotUserId}):`)
    if (existingUser) {
      console.log('✅ User found in database')
    } else {
      console.log('❌ User NOT found in database')
      console.log('💡 This user needs to be registered first!')
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugTelegramUser()