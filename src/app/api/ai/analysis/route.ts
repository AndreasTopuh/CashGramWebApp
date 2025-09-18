import { NextRequest, NextResponse } from 'next/server'
import { GeminiService } from '@/lib/gemini'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authorization.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Get user expenses for analysis
    const expenses = await prisma.expense.findMany({
      where: { userId: decoded.userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100 // Analyze last 100 transactions
    })

    if (expenses.length === 0) {
      return NextResponse.json({ 
        analysis: '📊 *Belum Ada Data Pengeluaran*\n\nTambahkan beberapa pengeluaran terlebih dahulu untuk mendapatkan analisis AI yang mendalam!' 
      })
    }

    // Prepare data for AI analysis
    const expenseData = expenses.map(exp => ({
      amount: exp.amount,
      description: exp.description,
      category: exp.category.name,
      date: exp.date.toISOString()
    }))

    const analysis = await GeminiService.generateSpendingAnalysis(expenseData)

    return NextResponse.json({ analysis })

  } catch (error) {
    console.error('AI Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI analysis' }, 
      { status: 500 }
    )
  }
}