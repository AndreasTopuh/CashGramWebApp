import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Handle connection lifecycle properly for serverless
let isConnected = false

export async function connectDB() {
  try {
    if (!isConnected) {
      await prisma.$connect()
      isConnected = true
    }
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    isConnected = false
    return false
  }
}

export async function disconnectDB() {
  try {
    if (isConnected) {
      await prisma.$disconnect()
      isConnected = false
    }
  } catch (error) {
    console.error('Database disconnection failed:', error)
  }
}