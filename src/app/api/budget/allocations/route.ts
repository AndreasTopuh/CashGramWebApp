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

    return NextResponse.json(activePeriod.budgetAllocations)
  } catch (error) {
    console.error('Error fetching budget allocations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { categoryId, allocatedAmount, budgetPeriodId } = body

    if (!categoryId || !allocatedAmount || !budgetPeriodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the budget period belongs to the user
    const budgetPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        id: budgetPeriodId,
        userId: user.userId
      }
    })

    if (!budgetPeriod) {
      return NextResponse.json({ error: 'Budget period not found' }, { status: 404 })
    }

    // Create or update budget allocation
    const allocation = await prisma.budgetAllocation.upsert({
      where: {
        budgetPeriodId_categoryId: {
          budgetPeriodId,
          categoryId
        }
      },
      update: {
        allocatedAmount: parseFloat(allocatedAmount)
      },
      create: {
        budgetPeriodId,
        categoryId,
        allocatedAmount: parseFloat(allocatedAmount)
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(allocation)
  } catch (error) {
    console.error('Error creating/updating budget allocation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}