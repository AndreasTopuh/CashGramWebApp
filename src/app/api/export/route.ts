import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const prisma = new PrismaClient({
      datasourceUrl: process.env.DIRECT_URL
    })

    // Get user expenses with categories
    const expenses = await prisma.expense.findMany({
      where: { userId: decoded.userId },
      include: { category: true },
      orderBy: { date: 'desc' }
    })

    if (expenses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data pengeluaran untuk diekspor' }, { status: 400 })
    }

    // Prepare data for Excel
    const excelData = expenses.map(expense => ({
      'Tanggal': new Date(expense.date).toLocaleDateString('id-ID', {
        timeZone: 'Asia/Makassar',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      'Kategori': expense.category.name,
      'Deskripsi': expense.description || '-',
      'Jumlah': expense.amount,
      'Jumlah (Formatted)': `Rp ${expense.amount.toLocaleString('id-ID')}`
    }))

    // Calculate summary
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const categoryStats = expenses.reduce((acc: any, exp) => {
      const category = exp.category.name
      acc[category] = (acc[category] || 0) + exp.amount
      return acc
    }, {})

    // Add summary sheet data
    const summaryData = [
      { 'Ringkasan': 'Total Pengeluaran', 'Nilai': `Rp ${total.toLocaleString('id-ID')}` },
      { 'Ringkasan': 'Jumlah Transaksi', 'Nilai': expenses.length },
      { 'Ringkasan': 'Periode', 'Nilai': `${new Date(expenses[expenses.length - 1].date).toLocaleDateString('id-ID')} - ${new Date(expenses[0].date).toLocaleDateString('id-ID')}` },
      { 'Ringkasan': '', 'Nilai': '' },
      { 'Ringkasan': 'KATEGORI:', 'Nilai': 'JUMLAH:' },
      ...Object.entries(categoryStats).map(([category, amount]) => ({
        'Ringkasan': category,
        'Nilai': `Rp ${(amount as number).toLocaleString('id-ID')}`
      }))
    ]

    // Create workbook
    const workbook = XLSX.utils.book_new()
    
    // Add expenses sheet
    const expensesSheet = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Pengeluaran')
    
    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan')

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    
    // Generate filename with current date
    const filename = `CashGram-Export-${new Date().toISOString().split('T')[0]}.xlsx`
    
    await prisma.$disconnect()

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Gagal mengekspor data' }, { status: 500 })
  }
}