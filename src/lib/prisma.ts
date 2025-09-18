import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Add connection handling for serverless
export async function connectDB() {
  try {
    await prisma.$connect()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

export async function disconnectDB() {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Database disconnect failed:', error)
  }
}