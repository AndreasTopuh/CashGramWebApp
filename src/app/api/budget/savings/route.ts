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

    const savings = await prisma.savings.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' }
    })

    const totalSavings = await prisma.savings.aggregate({
      where: { userId: user.userId },
      _sum: { amount: true }
    })

    return NextResponse.json({
      savings,
      totalAmount: totalSavings._sum.amount || 0
    })
  } catch (error) {
    console.error('Error fetching savings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}