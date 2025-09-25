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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current active budget period
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: {
        userId: user.userId,
        isActive: true
      },
      include: {
        budgetAllocations: {
          include: {
            category: true
          }
        }
      }
    })

    if (!activePeriod) {
      return NextResponse.json({ error: 'No active budget period found' }, { status: 404 })
    }

    // Calculate budget summary
    const budgetSummary = activePeriod.budgetAllocations.map(allocation => ({
      id: allocation.id,
      category: allocation.category,
      allocatedAmount: allocation.allocatedAmount,
      spentAmount: allocation.spentAmount,
      remainingAmount: allocation.allocatedAmount - allocation.spentAmount,
      percentageUsed: allocation.allocatedAmount > 0 ? 
        (allocation.spentAmount / allocation.allocatedAmount) * 100 : 0,
      isOverBudget: allocation.spentAmount > allocation.allocatedAmount
    }))

    const totalAllocated = activePeriod.budgetAllocations.reduce(
      (sum, allocation) => sum + allocation.allocatedAmount, 0
    )
    
    const totalSpent = activePeriod.budgetAllocations.reduce(
      (sum, allocation) => sum + allocation.spentAmount, 0
    )

    const unallocatedBudget = activePeriod.totalBudget - totalAllocated

    return NextResponse.json({
      period: {
        id: activePeriod.id,
        name: activePeriod.name,
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate,
        totalBudget: activePeriod.totalBudget
      },
      summary: {
        totalBudget: activePeriod.totalBudget,
        totalAllocated,
        totalSpent,
        totalRemaining: activePeriod.totalBudget - totalSpent,
        unallocatedBudget,
        percentageUsed: activePeriod.totalBudget > 0 ? 
          (totalSpent / activePeriod.totalBudget) * 100 : 0
      },
      categories: budgetSummary
    })
  } catch (error) {
    console.error('Error fetching budget status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}