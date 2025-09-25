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

    const periods = await prisma.budgetPeriod.findMany({
      where: { userId: user.userId },
      include: {
        budgetAllocations: {
          include: {
            category: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error('Error fetching budget periods:', error)
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

    console.log('User from token:', user) // Debug log

    const body = await request.json()
    const { name, totalBudget, startDate, endDate, allocations } = body

    // Validate required fields
    if (!name || !totalBudget || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: user.userId }
    })
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      )
    }

    console.log('Existing user found:', existingUser.id) // Debug log

    // Check if there's already an active period
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: {
        userId: user.userId,
        isActive: true
      }
    })

    // If there's an active period, calculate savings and deactivate it
    if (activePeriod) {
      const totalAllocated = await prisma.budgetAllocation.aggregate({
        where: { budgetPeriodId: activePeriod.id },
        _sum: { spentAmount: true }
      })

      const totalSpent = totalAllocated._sum.spentAmount || 0
      const savings = activePeriod.totalBudget - totalSpent

      if (savings > 0) {
        // Create savings record
        await prisma.savings.create({
          data: {
            userId: user.userId,
            amount: savings,
            fromPeriodId: activePeriod.id,
            description: `Sisa budget ${activePeriod.name}`
          }
        })
      }

      // Deactivate the previous period
      await prisma.budgetPeriod.update({
        where: { id: activePeriod.id },
        data: { isActive: false }
      })
    }

    // Create new budget period
    const newPeriod = await prisma.budgetPeriod.create({
      data: {
        userId: user.userId,
        name,
        totalBudget: parseFloat(totalBudget),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true
      }
    })

    // Create budget allocations if provided
    if (allocations && Array.isArray(allocations)) {
      await prisma.budgetAllocation.createMany({
        data: allocations.map((allocation: any) => ({
          budgetPeriodId: newPeriod.id,
          categoryId: allocation.categoryId,
          allocatedAmount: parseFloat(allocation.amount)
        }))
      })
    }

    // Return the created period with allocations
    const createdPeriod = await prisma.budgetPeriod.findUnique({
      where: { id: newPeriod.id },
      include: {
        budgetAllocations: {
          include: {
            category: true
          }
        }
      }
    })

    return NextResponse.json(createdPeriod)
  } catch (error) {
    console.error('Error creating budget period:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}