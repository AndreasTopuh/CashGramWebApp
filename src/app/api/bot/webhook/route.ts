import { NextRequest, NextResponse } from 'next/server'
import { GeminiService } from '@/lib/gemini'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { formatPhoneNumber } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const chatId = message.chat.id
    const text = message.text
    const userId = message.from.id

    // Handle /start command
    if (text === '/start') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎉 Selamat datang di CashGram Bot!

Untuk memulai, silakan login dengan nomor HP yang terdaftar:
Ketik: /login [nomor_hp] [password]
Contoh: /login 085717797065 password123

Setelah login, Anda bisa:
💰 Input pengeluaran: "makan siang 25rb"
📊 Analisis: /analisis minggu atau /analisis bulan
📈 Info saldo: /saldo

Selamat menggunakan CashGram! 🚀`
      })
    }

    // Handle login command
    if (text.startsWith('/login')) {
      const parts = text.split(' ')
      if (parts.length < 3) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Format salah. Gunakan: /login [nomor_hp] [password]'
        })
      }

      const phone = parts[1]
      const password = parts[2]

      // Format phone number properly
      const formattedPhone = formatPhoneNumber(phone)

      try {
        // Authenticate user using standard login (fallback from edge)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cash-gram-web-app.vercel.app'
        const response = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone, password })
        })

        if (response.ok) {
          const { token, user } = await response.json()
          
          // Store telegram user mapping
          await prisma.telegramUser.upsert({
            where: { telegramId: userId.toString() },
            update: { 
              userId: user.id,
              token: token,
              isActive: true 
            },
            create: {
              telegramId: userId.toString(),
              userId: user.id,
              token: token,
              isActive: true
            }
          })

          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `✅ Login berhasil! Selamat datang ${user.name}!

Sekarang Anda bisa:
💰 Input pengeluaran: "nasi goreng 20rb"
📊 Lihat analisis: /analisis minggu
📈 Cek saldo hari ini: /saldo`
          })
        } else {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: '❌ Login gagal. Periksa nomor HP dan password Anda.'
          })
        }
      } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Terjadi kesalahan saat login. Coba lagi nanti.'
        })
      }
    }

    // Get user session
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: userId.toString() }
    })

    if (!telegramUser || !telegramUser.isActive) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '❌ Anda belum login. Ketik /start untuk memulai.'
      })
    }

    // Handle analysis commands
    if (text.startsWith('/analisis')) {
      const period = text.includes('minggu') ? 'week' : 'month'
      
      try {
        // Get user expenses
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        const expenses = await prisma.expense.findMany({
          where: { 
            userId: decoded.userId,
            date: {
              gte: new Date(Date.now() - (period === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000)
            }
          },
          include: { category: true }
        })

        const analysis = await GeminiService.generatePeriodAnalysis(expenses, period)
        
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: analysis,
          parse_mode: 'Markdown'
        })
      } catch (error) {
        console.error('Analysis error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Gagal menganalisis data. Coba lagi nanti.'
        })
      }
    }

    // Handle balance check
    if (text === '/saldo') {
      try {
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const todayExpenses = await prisma.expense.findMany({
          where: { 
            userId: decoded.userId,
            date: { gte: today }
          }
        })

        const total = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `📈 *Pengeluaran Hari Ini*
💰 Total: Rp ${total.toLocaleString('id-ID')}
📊 Transaksi: ${todayExpenses.length}

${todayExpenses.map(exp => `• ${exp.description}: Rp ${exp.amount.toLocaleString('id-ID')}`).join('\n')}`,
          parse_mode: 'Markdown'
        })
      } catch (error) {
        console.error('Balance error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Gagal mengambil data saldo. Coba lagi nanti.'
        })
      }
    }

    // Handle expense input
    try {
      const parsed = await GeminiService.parseExpenseText(text)
      
      if (!parsed || parsed.confidence < 60) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `❓ Maaf, saya tidak bisa memahami input "${text}".

Contoh format yang benar:
• "nasi goreng 20rb"
• "ojek ke mall 15k"
• "beli pulsa 50 ribu"

Atau gunakan command:
/analisis minggu - Analisis minggu ini
/saldo - Cek pengeluaran hari ini`
        })
      }

      // Get or create category
      const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
      let category = await prisma.category.findFirst({
        where: { 
          name: parsed.category || 'Lainnya',
          userId: decoded.userId 
        }
      })

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: parsed.category || 'Lainnya',
            userId: decoded.userId
          }
        })
      }

      // Create expense
      const expense = await prisma.expense.create({
        data: {
          amount: parsed.amount,
          description: parsed.description,
          userId: decoded.userId,
          categoryId: category.id,
          date: new Date()
        }
      })

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `✅ *Pengeluaran berhasil dicatat!*

💰 ${parsed.category} - ${parsed.description}
💵 Rp ${parsed.amount.toLocaleString('id-ID')}
📅 ${new Date().toLocaleDateString('id-ID', { 
          timeZone: 'Asia/Makassar',
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        })}

Ketik /saldo untuk cek total hari ini 📊`,
        parse_mode: 'Markdown'
      })

    } catch (error) {
      console.error('Expense creation error:', error)
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '❌ Gagal menyimpan pengeluaran. Coba lagi nanti.'
      })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}