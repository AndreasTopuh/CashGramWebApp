import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  try {
    // Check environment variables (without exposing sensitive data)
    const envCheck = {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
    }

    // Test database connection
    const prisma = new PrismaClient()
    
    try {
      await prisma.$connect()
      await prisma.user.count()
      await prisma.$disconnect()
      
      return NextResponse.json({
        status: 'ok',
        environment: envCheck,
        database: 'connected',
        message: 'All systems operational'
      })
    } catch (dbError) {
      return NextResponse.json({
        status: 'error',
        environment: envCheck,
        database: 'failed',
        error: dbError instanceof Error ? dbError.message : 'Unknown database error'
      })
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}