import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, formatPhoneNumber, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json()

    // Validate input
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)

    // Find user
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    })

  } catch (error) {
    console.error('Login error:', error)
    
    // Check if it's a Prisma error
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      // Handle specific Prisma errors
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection failed' },
          { status: 503 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}