require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkTelegramUsers() {
  try {
    console.log('🔍 Checking Telegram users in database...\n')
    
    const telegramUsers = await prisma.telegramUser.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (telegramUsers.length === 0) {
      console.log('❌ No Telegram users found in database')
      console.log('\n💡 You need to register first:')
      console.log('1. Go to http://localhost:3000/register')
      console.log('2. Register with your details')
      console.log('3. The system will create a Telegram user entry')
    } else {
      console.log(`✅ Found ${telegramUsers.length} Telegram user(s):`)
      telegramUsers.forEach(tUser => {
        console.log(`- Telegram ID: ${tUser.telegramId}`)
        console.log(`  User: ${tUser.user.name} (${tUser.user.email})`)
        console.log(`  Created: ${tUser.createdAt}`)
        console.log('---')
      })
    }

    // Also check regular users
    console.log('\n👥 All users in database:')
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    if (allUsers.length === 0) {
      console.log('❌ No users found in database')
    } else {
      allUsers.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - Phone: ${user.phone}`)
      })
    }

  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTelegramUsers()