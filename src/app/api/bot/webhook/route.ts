import { NextRequest, NextResponse } from 'next/server'
import { GeminiService } from '@/lib/gemini'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { formatPhoneNumber } from '@/lib/auth'

// Helper function to strip markdown formatting for Telegram
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '') // Remove headers ###
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
    .replace(/`(.*?)`/g, '$1') // Remove code `text`
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links [text](url)
    .replace(/^[\s]*[-*+]\s/gm, '• ') // Convert bullet points
    .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
    .trim()
}

// Helper function to get category icon based on name
function getCategoryIcon(category: string): string {
  const iconMap: { [key: string]: string } = {
    'Makanan': '🍔',
    'Transportasi': '🚗',
    'Belanja': '🛒',
    'Hiburan': '🎮',
    'Kesehatan': '🏥',
    'Komunikasi': '📱',
    'Pendidikan': '📚',
    'Lainnya': '💰'
  }
  return iconMap[category] || '💰'
}

function getCategoryColor(category: string): string {
  const colorMap: { [key: string]: string } = {
    'Makanan': '#EF4444',
    'Transportasi': '#3B82F6',
    'Belanja': '#10B981',
    'Hiburan': '#8B5CF6',
    'Kesehatan': '#F59E0B',
    'Komunikasi': '#06B6D4',
    'Pendidikan': '#6B7280',
    'Lainnya': '#64748B'
  }
  return colorMap[category] || '#64748B'
}

export async function POST(request: NextRequest) {
  // Use direct connection (not pooled) to avoid prepared statement conflicts in serverless
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })
  
  try {
    const body = await request.json()
    console.log('Telegram webhook received:', JSON.stringify(body, null, 2))
    
    const { message } = body

    if (!message) {
      console.log('No message in webhook payload')
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const chatId = message.chat.id
    const text = message.text
    const userId = message.from.id

    console.log('Processing message:', { chatId, text, userId })

    // Handle /start command
    if (text === '/start') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎉 Selamat datang di CashGram Bot!, Bot pencatatan dengan integrasi AI menggunakan GEMIN.

🔐 CARA LOGIN:
Ketik: /login [nomor_hp] [password]
Contoh: /login 085717797*** password***

💻 DASHBOARD WEBSITE:
Untuk melihat dashboard lengkap, silakan login ke:
🌐 https://cash-gram-web-app.vercel.app/
Gunakan nomor HP dan password yang sama seperti di bot.

🤖 FUNGSI BOT YANG TERSEDIA:
• 💰 Input pengeluaran: "makan siang 25rb"
• 📊 Analisis pengeluaran: /analisis minggu atau /analisis bulan
• 📈 Cek saldo harian: /saldo
• 👋 Logout dari bot: /logout

📱 KEUNGGULAN:
✅ Pencatatan otomatis dengan AI
✅ Analisis keuangan real-time
✅ Sinkronisasi dengan dashboard web
✅ Kategorisasi otomatis pengeluaran
✅ Laporan periode (minggu/bulan)

Mulai dengan /login untuk menggunakan semua fitur! 🚀`
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
          
          // Store telegram user mapping with better error handling
          try {
            // First check if there's already a mapping for this user
            const existingMapping = await prisma.telegramUser.findUnique({
              where: { userId: user.id }
            })
            
            if (existingMapping) {
              // Update existing mapping
              await prisma.telegramUser.update({
                where: { id: existingMapping.id },
                data: {
                  telegramId: userId.toString(),
                  token: token,
                  isActive: true,
                  updatedAt: new Date()
                }
              })
              console.log('Updated existing TelegramUser mapping')
            } else {
              // Check if this telegramId already exists with a different user
              const existingTelegramMapping = await prisma.telegramUser.findUnique({
                where: { telegramId: userId.toString() }
              })
              
              if (existingTelegramMapping) {
                // Update the telegram mapping to new user
                await prisma.telegramUser.update({
                  where: { telegramId: userId.toString() },
                  data: {
                    userId: user.id,
                    token: token,
                    isActive: true,
                    updatedAt: new Date()
                  }
                })
                console.log('Updated TelegramUser mapping to new user')
              } else {
                // Create new mapping
                await prisma.telegramUser.create({
                  data: {
                    telegramId: userId.toString(),
                    userId: user.id,
                    token: token,
                    isActive: true
                  }
                })
                console.log('Created new TelegramUser mapping')
              }
            }
          } catch (dbError) {
            console.error('Database error with TelegramUser:', dbError)
            // Continue anyway since login was successful
          }

          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `✅ Login berhasil! Selamat datang ${user.name}!

Sekarang Anda bisa:
💰 Input pengeluaran: "nasi goreng 20rb"
📊 Lihat analisis: /analisis minggu
📈 Cek pengeluaran hari ini: /saldo`
          })
        } else {
          console.log('Login failed, response status:', response.status)
          const errorText = await response.text()
          console.log('Login error response:', errorText)
          
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: '❌ Login gagal. Periksa nomor HP dan password Anda.'
          })
        }
      } catch (error) {
        console.error('Login request error:', error)
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

    if (!telegramUser || !telegramUser.isActive || !telegramUser.token) {
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
          text: stripMarkdown(analysis)
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

    // Handle logout command
    if (text === '/logout') {
      try {
        // Deactivate user session
        await prisma.telegramUser.update({
          where: { telegramId: userId.toString() },
          data: {
            isActive: false,
            token: null,
            updatedAt: new Date()
          }
        })

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `👋 Anda telah logout dari CashGram Bot.

Terima kasih telah menggunakan layanan kami!
Ketik /start untuk login kembali.`
        })
      } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Terjadi kesalahan saat logout. Coba lagi nanti.'
        })
      }
    }

    // Handle expense input
    try {
      // First try single expense parsing
      const parsed = await GeminiService.parseExpenseText(text)
      
      // If single parsing fails or low confidence, try multiple parsing
      if (!parsed || parsed.confidence < 70) {
        const multipleResult = await GeminiService.parseMultipleExpenses(text)
        
        if (multipleResult && multipleResult.expenses.length > 0) {
          // Process multiple expenses
          const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
          const savedExpenses = []
          
          for (const expense of multipleResult.expenses) {
            if (expense.confidence > 60) {
              // Find or create category
              let category = await prisma.category.findFirst({
                where: {
                  userId: decoded.userId,
                  name: expense.category || 'Lainnya'
                }
              })
              
              if (!category) {
                category = await prisma.category.create({
                  data: {
                    name: expense.category || 'Lainnya',
                    icon: getCategoryIcon(expense.category || 'Lainnya'),
                    color: getCategoryColor(expense.category || 'Lainnya'),
                    userId: decoded.userId
                  }
                })
              }
              
              // Save expense
              const savedExpense = await prisma.expense.create({
                data: {
                  amount: expense.amount,
                  description: expense.description,
                  categoryId: category.id,
                  userId: decoded.userId,
                  date: new Date()
                },
                include: {
                  category: true
                }
              })
              
              savedExpenses.push(savedExpense)
            }
          }
          
          if (savedExpenses.length > 0) {
            const total = savedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
            const expenseList = savedExpenses.map(exp => 
              `${exp.category.icon} ${exp.description}: Rp ${exp.amount.toLocaleString('id-ID')}`
            ).join('\n')
            
            return NextResponse.json({
              method: 'sendMessage',
              chat_id: chatId,
              text: `✅ *Berhasil mencatat ${savedExpenses.length} pengeluaran:*

${expenseList}

💰 *Total: Rp ${total.toLocaleString('id-ID')}*
📅 ${new Date().toLocaleDateString('id-ID', { 
                timeZone: 'Asia/Makassar',
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}

Ketik /saldo untuk cek total hari ini 📊`,
              parse_mode: 'Markdown'
            })
          }
        }
      }
      
      // Continue with single expense processing if multiple parsing also failed
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
  } finally {
    // Clean up Prisma connection to avoid prepared statement conflicts
    await prisma.$disconnect()
  }
}