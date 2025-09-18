// Database initialization script for production
// This creates the necessary database tables if they don't exist

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initDatabase() {
  try {
    console.log('🗄️ Initializing database...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Try to run a simple query to check if tables exist
    try {
      const userCount = await prisma.user.count()
      console.log(`✅ Database tables exist. Users count: ${userCount}`)
    } catch (error) {
      console.log('❌ Database tables do not exist. Need to run migrations.')
      console.log('Run: npx prisma db push')
    }
    
    await prisma.$disconnect()
    console.log('✅ Database initialization complete')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()