require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function registerTelegramUser() {
  try {
    // First, create a regular user
    const user = await prisma.user.create({
      data: {
        name: 'deas',
        email: 'deas@telegram.local',
        phone: '+6285438958945',
        password: 'hashedpassword123'
      }
    })

    console.log('✅ User created:', user.id)

    // Then create telegram user
    const telegramUser = await prisma.telegramUser.create({
      data: {
        telegramId: '5438958945',
        userId: user.id,
        token: 'dummy-token',
        isActive: true
      }
    })

    console.log('✅ Telegram user created:', telegramUser.id)

    // Create some sample categories
    const categories = [
      { name: 'Transportasi', userId: user.id },
      { name: 'Listrik', userId: user.id },
      { name: 'Laundry', userId: user.id },
      { name: 'Kuota ac', userId: user.id },
      { name: 'Makanan sabtu & minggu', userId: user.id },
      { name: 'Kebersihan', userId: user.id },
      { name: 'Beras dll', userId: user.id },
      { name: 'Uang Candlely', userId: user.id },
      { name: 'Uang Andreas', userId: user.id },
      { name: 'Makanan senin-jumat', userId: user.id }
    ]

    for (const cat of categories) {
      await prisma.category.create({ data: cat })
    }

    console.log('✅ Categories created')

    // Create budget period
    const budgetPeriod = await prisma.budgetPeriod.create({
      data: {
        userId: user.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        totalBudget: 5000000,
        isActive: true
      }
    })

    console.log('✅ Budget period created')

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ User already exists, skipping...')
    } else {
      console.error('❌ Error:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

registerTelegramUser()