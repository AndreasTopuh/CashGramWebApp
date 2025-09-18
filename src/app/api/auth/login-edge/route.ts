import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, formatPhoneNumber, generateToken } from '@/lib/auth'

// Use Edge Runtime for better performance
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    console.log('Login attempt started (Edge Runtime)')
    const { phone, password } = await request.json()
    console.log('Login data:', { phone: phone?.substring(0, 5) + '***', hasPassword: !!password })

    // Validate input
    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone)
    console.log('Formatted phone:', formattedPhone)

    // For now, use direct database query instead of Prisma to avoid connection issues
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      )
    }

    // Import postgres client dynamically for edge runtime
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: dbUrl })

    try {
      // Find user
      const userResult = await pool.query(
        'SELECT id, phone, password, name, created_at FROM users WHERE phone = $1',
        [formattedPhone]
      )

      if (userResult.rows.length === 0) {
        console.log('User not found for phone:', formattedPhone)
        return NextResponse.json(
          { error: 'Invalid phone number or password' },
          { status: 401 }
        )
      }

      const user = userResult.rows[0]
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
          createdAt: user.created_at
        },
        token
      })

    } finally {
      await pool.end()
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}