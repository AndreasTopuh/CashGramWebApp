import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Endpoint to get categories with simple numbering for Telegram bot
export async function GET(request: NextRequest) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const url = new URL(request.url)
    const telegramId = url.searchParams.get('telegram_id')
    
    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    // Get user from telegram ID
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId },
      include: { user: true }
    })

    if (!telegramUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get categories for this user
    const categories = await prisma.category.findMany({
      where: { userId: telegramUser.userId },
      orderBy: { name: 'asc' }
    })

    // Get active budget period with allocations
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: { 
        userId: telegramUser.userId,
        isActive: true 
      },
      include: {
        budgetAllocations: {
          include: { category: true }
        }
      }
    })

    // Format categories with simple numbering and budget info
    const formattedCategories = categories.map((category, index) => {
      let budgetInfo = ''
      let status = '📂'
      
      if (activePeriod) {
        const allocation = activePeriod.budgetAllocations.find(a => a.categoryId === category.id)
        if (allocation) {
          const remaining = allocation.allocatedAmount - allocation.spentAmount
          if (remaining > 0) {
            status = '✅'
            budgetInfo = ` (Sisa: Rp ${remaining.toLocaleString('id-ID')})`
          } else {
            status = '❌'
            budgetInfo = ` (Budget habis)`
          }
        } else {
          budgetInfo = ' (Belum ada budget)'
        }
      }
      
      return {
        number: index + 1,
        id: category.id,
        name: category.name,
        icon: category.icon,
        status,
        budgetInfo,
        displayText: `${index + 1}. ${status} ${category.icon} ${category.name}${budgetInfo}`
      }
    })

    return NextResponse.json({
      success: true,
      categories: formattedCategories,
      total: categories.length,
      activeBudgetPeriod: activePeriod?.name || null
    })

  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}