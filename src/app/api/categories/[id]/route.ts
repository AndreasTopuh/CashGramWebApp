import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Use fresh Prisma client to avoid prepared statement conflicts
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const { name, color, icon } = await request.json()
    const categoryId = params.id

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: decoded.userId
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      )
    }

    // Check if another category with same name exists (except current one)
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name,
        userId: decoded.userId,
        id: { not: categoryId }
      }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'Kategori dengan nama ini sudah ada' },
        { status: 400 }
      )
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name,
        color: color || existingCategory.color,
        icon: icon || existingCategory.icon
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Use fresh Prisma client to avoid prepared statement conflicts
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const categoryId = params.id

    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: decoded.userId
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      )
    }

    // Check if category has expenses
    const expenseCount = await prisma.expense.count({
      where: { categoryId }
    })

    if (expenseCount > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus kategori yang memiliki ${expenseCount} pengeluaran. Hapus atau pindahkan pengeluaran terlebih dahulu.` },
        { status: 400 }
      )
    }

    // Check if category has budget allocations
    const allocationCount = await prisma.budgetAllocation.count({
      where: { categoryId }
    })

    if (allocationCount > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus kategori yang memiliki alokasi budget. Hapus alokasi budget terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId }
    })

    return NextResponse.json({ message: 'Kategori berhasil dihapus' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}