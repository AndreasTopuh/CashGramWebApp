import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyToken } from '@/lib/auth'

function getUserFromToken(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.substring(7)
  return verifyToken(token)
}

export async function GET(request: NextRequest) {
  // Use fresh Prisma client to avoid prepared statement conflicts
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: {
      userId: string;
      categoryId?: string;
      date?: {
        gte: Date;
        lte: Date;
      };
    } = {
      userId: user.userId
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  // Use fresh Prisma client to avoid prepared statement conflicts
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const user = getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { amount, description, categoryId, date, forceOverride } = await request.json()

    if (!amount || !categoryId) {
      return NextResponse.json(
        { error: 'Amount and category are required' },
        { status: 400 }
      )
    }

    const expenseAmount = parseFloat(amount)

    // Check if there's an active budget period
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: {
        userId: user.userId,
        isActive: true
      },
      include: {
        budgetAllocations: {
          where: { categoryId },
          include: { category: true }
        }
      }
    })

    let budgetCheckResult = null
    let budgetWarning = null

    if (activePeriod && activePeriod.budgetAllocations.length > 0) {
      const allocation = activePeriod.budgetAllocations[0]
      const remainingBudget = allocation.allocatedAmount - allocation.spentAmount
      const willExceedBudget = expenseAmount > remainingBudget
      const overrunAmount = expenseAmount - remainingBudget
      const overrunPercentage = willExceedBudget ? ((overrunAmount / remainingBudget) * 100) : 0
      
      budgetCheckResult = {
        categoryName: allocation.category.name,
        allocatedAmount: allocation.allocatedAmount,
        spentAmount: allocation.spentAmount,
        remainingBudget,
        willExceedBudget,
        overrunAmount: willExceedBudget ? overrunAmount : 0,
        overrunPercentage: willExceedBudget ? overrunPercentage : 0,
        remainingAfterExpense: remainingBudget - expenseAmount
      }

      // Check for budget overrun and handle accordingly
      if (willExceedBudget && !forceOverride) {
        budgetWarning = {
          type: 'BUDGET_OVERRUN',
          message: `⚠️ PERINGATAN ANGGARAN!\n\nPengeluaran "${description}" sebesar Rp ${expenseAmount.toLocaleString('id-ID')} akan melebihi anggaran kategori "${allocation.category.name}".\n\n📊 Detail Anggaran:\n• Anggaran: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}\n• Terpakai: Rp ${allocation.spentAmount.toLocaleString('id-ID')}\n• Sisa: Rp ${remainingBudget.toLocaleString('id-ID')}\n• Kelebihan: Rp ${overrunAmount.toLocaleString('id-ID')} (${overrunPercentage.toFixed(1)}%)\n\n💡 Saran:\n1. Kurangi jumlah pengeluaran\n2. Pilih kategori lain yang masih ada budgetnya\n3. Atau tetap lanjutkan dengan risiko melebihi anggaran\n\n⚠️ Pengeluaran ini akan tercatat sebagai "OVERLOAD BUDGET" jika tetap dilanjutkan.`,
          categoryName: allocation.category.name,
          budgetInfo: budgetCheckResult,
          requiresConfirmation: true
        }

        // Return warning without creating expense
        return NextResponse.json({
          warning: budgetWarning,
          budgetInfo: budgetCheckResult,
          requiresConfirmation: true
        }, { status: 409 }) // 409 Conflict - requires user decision
      }

      // Update the spent amount in budget allocation
      await prisma.budgetAllocation.update({
        where: { id: allocation.id },
        data: {
          spentAmount: allocation.spentAmount + expenseAmount
        }
      })
    }

    // Create the expense
    const expenseData: any = {
      amount: expenseAmount,
      description,
      categoryId,
      userId: user.userId,
      date: date ? new Date(date) : new Date()
    }

    // Mark as overrun if it exceeds budget
    if (budgetCheckResult?.willExceedBudget) {
      expenseData.description = `${description} [OVERLOAD BUDGET]`
    }

    const expense = await prisma.expense.create({
      data: expenseData,
      include: {
        category: true
      }
    })

    // Prepare response
    const response: any = {
      expense,
      budgetInfo: budgetCheckResult
    }

    // Add overrun warning to response if applicable
    if (budgetCheckResult?.willExceedBudget) {
      response.overrunWarning = {
        type: 'BUDGET_EXCEEDED',
        message: `🚨 ANGGARAN TERLAMPAUI!\n\nPengeluaran "${description}" telah melebihi anggaran kategori "${budgetCheckResult.categoryName}".\n\n📊 Dampak:\n• Kelebihan: Rp ${budgetCheckResult.overrunAmount.toLocaleString('id-ID')}\n• Persentase kelebihan: ${budgetCheckResult.overrunPercentage.toFixed(1)}%\n\n💰 Saran untuk kedepan:\n1. Evaluasi anggaran bulanan\n2. Pertimbangkan menaikkan limit kategori ini\n3. Lebih hati-hati dalam pengeluaran\n4. Gunakan fitur pelacakan anggaran secara aktif\n\n⚠️ Pengeluaran ini ditandai sebagai "OVERLOAD BUDGET" untuk pelacakan yang lebih baik.`
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}