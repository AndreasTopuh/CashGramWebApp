import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, formatPhoneNumber, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { phone, password, name } = await request.json()

    // Validate input
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        phone: formattedPhone,
        password: hashedPassword,
        name: name || null
      },
      select: {
        id: true,
        phone: true,
        name: true,
        createdAt: true
      }
    })

    // Create default categories for new user
    const defaultCategories = [
      { name: 'Makanan', icon: '🍽️', color: '#EF4444' },
      { name: 'Transportasi', icon: '🚗', color: '#3B82F6' },
      { name: 'Belanja', icon: '🛒', color: '#10B981' },
      { name: 'Hiburan', icon: '🎭', color: '#8B5CF6' },
      { name: 'Kesehatan', icon: '🏥', color: '#F59E0B' },
      { name: 'Pendidikan', icon: '📚', color: '#6366F1' },
      { name: 'Lainnya', icon: '💰', color: '#6B7280' }
    ]

    await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        ...cat,
        userId: user.id
      }))
    })

    // Generate token
    const token = generateToken(user.id)

    return NextResponse.json({
      user,
      token
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}