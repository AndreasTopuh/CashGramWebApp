import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Use fresh Prisma client to avoid connection issues
function getPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })
}

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Token diperlukan')
  }

  const token = authHeader.substring(7)
  const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
  
  const prisma = getPrismaClient()
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      throw new Error('User tidak ditemukan')
    }

    return { user, prisma }
  } catch (error) {
    await prisma.$disconnect()
    throw error
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let prisma: PrismaClient | null = null
  
  try {
    const params = await context.params
    const { user, prisma: prismaInstance } = await verifyUser(request)
    prisma = prismaInstance
    
    const { name, totalBudget, startDate, endDate, allocations } = await request.json()
    const periodId = params.id

    if (!name || !totalBudget || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Nama, total budget, tanggal mulai dan tanggal berakhir wajib diisi' },
        { status: 400 }
      )
    }

    // Verify the budget period belongs to the user
    const existingPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        id: periodId,
        userId: user.id
      }
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Budget period tidak ditemukan' },
        { status: 404 }
      )
    }

    const startDateTime = new Date(startDate)
    const endDateTime = new Date(endDate)

    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { error: 'Tanggal berakhir harus setelah tanggal mulai' },
        { status: 400 }
      )
    }

    // Check for overlapping periods (excluding current period)
    const overlappingPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        userId: user.id,
        id: { not: periodId },
        OR: [
          {
            AND: [
              { startDate: { lte: startDateTime } },
              { endDate: { gte: startDateTime } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDateTime } },
              { endDate: { gte: endDateTime } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDateTime } },
              { endDate: { lte: endDateTime } }
            ]
          }
        ]
      }
    })

    if (overlappingPeriod) {
      return NextResponse.json(
        { error: 'Periode budget tidak boleh bertumpang tindih dengan periode lain' },
        { status: 400 }
      )
    }

    // Use transaction to update budget period and allocations
    const result = await prisma.$transaction(async (tx: any) => {
      // Update budget period
      const updatedPeriod = await tx.budgetPeriod.update({
        where: { id: periodId },
        data: {
          name,
          totalBudget,
          startDate: startDateTime,
          endDate: endDateTime
        }
      })

      // Delete existing allocations
      await tx.budgetAllocation.deleteMany({
        where: { budgetPeriodId: periodId }
      })

      // Create new allocations
      if (allocations && allocations.length > 0) {
        await tx.budgetAllocation.createMany({
          data: allocations.map((allocation: any) => ({
            budgetPeriodId: periodId,
            categoryId: allocation.categoryId,
            allocatedAmount: allocation.amount
          }))
        })
      }

      return updatedPeriod
    })

    return NextResponse.json({
      message: 'Budget periode berhasil diperbarui',
      budgetPeriod: result
    })

  } catch (error: any) {
    console.error('Error updating budget period:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui budget periode' },
      { status: 500 }
    )
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let prisma: PrismaClient | null = null
  
  try {
    const params = await context.params
    const { user, prisma: prismaInstance } = await verifyUser(request)
    prisma = prismaInstance
    
    const periodId = params.id

    // Verify the budget period belongs to the user
    const existingPeriod = await prisma.budgetPeriod.findFirst({
      where: {
        id: periodId,
        userId: user.id
      }
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Budget period tidak ditemukan' },
        { status: 404 }
      )
    }

    // Delete budget period (cascade will handle allocations)
    await prisma.budgetPeriod.delete({
      where: { id: periodId }
    })

    return NextResponse.json({
      message: 'Budget periode berhasil dihapus'
    })

  } catch (error: any) {
    console.error('Error deleting budget period:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus budget periode' },
      { status: 500 }
    )
  } finally {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}