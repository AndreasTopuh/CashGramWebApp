import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Endpoint to select category by number and create expense
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ number: string }> }
) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const params = await context.params
    const categoryNumber = parseInt(params.number)
    const body = await request.json()
    
    const { telegramId, amount, description } = body

    if (!telegramId || !amount || !description) {
      return NextResponse.json({ 
        error: 'Telegram ID, amount, and description are required' 
      }, { status: 400 })
    }

    // Get user from telegram ID
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: telegramId.toString() },
      include: { user: true }
    })

    if (!telegramUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get categories for this user (ordered by name)
    const categories = await prisma.category.findMany({
      where: { userId: telegramUser.userId },
      orderBy: { name: 'asc' }
    })

    // Check if category number is valid
    if (categoryNumber < 1 || categoryNumber > categories.length) {
      return NextResponse.json({ 
        error: `Nomor kategori tidak valid. Pilih antara 1-${categories.length}` 
      }, { status: 400 })
    }

    // Get selected category
    const selectedCategory = categories[categoryNumber - 1]

    // Check budget before creating expense
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: { 
        userId: telegramUser.userId,
        isActive: true 
      },
      include: {
        budgetAllocations: {
          where: { categoryId: selectedCategory.id },
          include: { category: true }
        }
      }
    })

    let budgetWarning = null
    let willOverBudget = false

    if (activePeriod && activePeriod.budgetAllocations.length > 0) {
      const allocation = activePeriod.budgetAllocations[0]
      const remaining = allocation.allocatedAmount - allocation.spentAmount
      
      if (amount > remaining) {
        willOverBudget = true
        budgetWarning = {
          categoryName: selectedCategory.name,
          allocated: allocation.allocatedAmount,
          spent: allocation.spentAmount,
          remaining: remaining,
          overrun: amount - remaining,
          message: `⚠️ *PERINGATAN BUDGET OVERRUN*\n\n💰 *Kategori:* ${selectedCategory.icon} ${selectedCategory.name}\n💳 *Pengeluaran:* Rp ${amount.toLocaleString('id-ID')}\n\n📊 *Status Budget:*\n• Alokasi: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}\n• Terpakai: Rp ${allocation.spentAmount.toLocaleString('id-ID')}\n• Sisa: Rp ${remaining.toLocaleString('id-ID')}\n• Overrun: Rp ${(amount - remaining).toLocaleString('id-ID')}\n\n❓ *Pilihan:*\n1. Lanjutkan (OVERLOAD BUDGET)\n2. Pilih kategori lain\n3. Kurangi jumlah pengeluaran\n\n⚠️ *Jika tetap dilanjutkan, pengeluaran akan ditandai sebagai "OVERLOAD BUDGET".*`
        }
      }
    }

    // If budget warning exists, return warning instead of creating expense
    if (budgetWarning && !body.forceOverride) {
      return NextResponse.json({
        success: false,
        budgetWarning,
        categoryInfo: {
          number: categoryNumber,
          name: selectedCategory.name,
          icon: selectedCategory.icon
        }
      })
    }

    // Create the expense
    const expenseDescription = willOverBudget ? `[OVERLOAD BUDGET] ${description}` : description

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount.toString()),
        description: expenseDescription,
        userId: telegramUser.userId,
        categoryId: selectedCategory.id
      },
      include: {
        category: true
      }
    })

    // Update budget allocation if exists
    if (activePeriod && activePeriod.budgetAllocations.length > 0) {
      await prisma.budgetAllocation.update({
        where: { id: activePeriod.budgetAllocations[0].id },
        data: {
          spentAmount: {
            increment: parseFloat(amount.toString())
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      expense,
      message: `✅ *Pengeluaran berhasil dicatat!*\n\n💰 *Jumlah:* Rp ${amount.toLocaleString('id-ID')}\n📝 *Deskripsi:* ${description}\n🏷️ *Kategori:* ${selectedCategory.icon} ${selectedCategory.name}\n📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}\n\n${willOverBudget ? '⚠️ *Status:* OVERLOAD BUDGET' : '✅ *Status:* Budget aman'}`,
      budgetOverload: willOverBudget
    })

  } catch (error) {
    console.error('Category selection error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}