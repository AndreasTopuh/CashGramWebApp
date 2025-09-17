import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultCategories = [
  { name: 'Makanan', icon: '🍔', color: '#EF4444' },
  { name: 'Transport', icon: '🚗', color: '#3B82F6' },
  { name: 'Belanja', icon: '🛒', color: '#10B981' },
  { name: 'Hiburan', icon: '🎮', color: '#8B5CF6' },
  { name: 'Kesehatan', icon: '🏥', color: '#F59E0B' },
  { name: 'Pendidikan', icon: '📚', color: '#6B7280' },
  { name: 'Utilitas', icon: '💡', color: '#F97316' },
  { name: 'Lainnya', icon: '💰', color: '#64748B' }
]

export async function POST() {
  try {
    // Check if categories already exist
    const existingCategories = await prisma.category.count()
    
    if (existingCategories > 0) {
      return NextResponse.json({ message: 'Categories already exist' })
    }

    // Create default categories
    await prisma.category.createMany({
      data: defaultCategories
    })

    const categories = await prisma.category.findMany()

    return NextResponse.json({
      message: 'Default categories created successfully',
      categories
    })
  } catch (error) {
    console.error('Seed categories error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}