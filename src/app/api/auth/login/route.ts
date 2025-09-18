import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, formatPhoneNumber, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    console.log('Login attempt started')
    const { phone, password } = await request.json()
    console.log('Login data:', { phone: phone?.substring(0, 5) + '***', hasPassword: !!password })

    // Validate input
    if (!phone || !password) {
      console.log('Missing phone or password')
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)
    console.log('Formatted phone:', formattedPhone)

    // Test database connection
    try {
      await prisma.$connect()
      console.log('Database connected successfully')
    } catch (dbError) {
      console.error('Database connection failed:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      )
    }

    // Find user
    console.log('Finding user with phone:', formattedPhone)
    const user = await prisma.user.findUnique({
      where: { phone: formattedPhone }
    })

    if (!user) {
      console.log('User not found for phone:', formattedPhone)
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    console.log('User found:', user.id)

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      console.log('Invalid password for user:', user.id)
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      )
    }

    console.log('Login successful for user:', user.id)

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