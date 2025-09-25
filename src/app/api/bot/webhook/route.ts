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

// Helper function to check budget before creating expense
async function checkBudgetOverrun(prisma: PrismaClient, userId: string, categoryId: string, amount: number) {
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: {
      userId,
      isActive: true
    },
    include: {
      budgetAllocations: {
        where: { categoryId },
        include: { category: true }
      }
    }
  })

  if (!activePeriod || activePeriod.budgetAllocations.length === 0) {
    return null // No budget set, allow expense
  }

  const allocation = activePeriod.budgetAllocations[0]
  const remainingBudget = allocation.allocatedAmount - allocation.spentAmount
  const willExceedBudget = amount > remainingBudget
  const overrunAmount = amount - remainingBudget

  if (willExceedBudget) {
    const overrunPercentage = (overrunAmount / remainingBudget) * 100
    return {
      categoryName: allocation.category.name,
      categoryIcon: allocation.category.icon,
      allocatedAmount: allocation.allocatedAmount,
      spentAmount: allocation.spentAmount,
      remainingBudget,
      overrunAmount,
      overrunPercentage,
      willExceedBudget: true,
      warningMessage: `🚨 *PERINGATAN ANGGARAN MELEBIHI BATAS!*

💰 *Kategori:* ${allocation.category.icon} ${allocation.category.name}
📊 *Detail Anggaran:*
• Anggaran: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}
• Terpakai: Rp ${allocation.spentAmount.toLocaleString('id-ID')}
• Sisa: Rp ${remainingBudget.toLocaleString('id-ID')}

⚠️ *Pengeluaran ini akan melebihi anggaran sebesar:*
• Kelebihan: Rp ${overrunAmount.toLocaleString('id-ID')}
• Persentase kelebihan: ${overrunPercentage.toFixed(1)}%

💡 *Saran:*
1. Kurangi jumlah pengeluaran
2. Pilih kategori lain
3. Atau lanjutkan dengan risiko melebihi anggaran

⚠️ *Jika tetap dilanjutkan, pengeluaran akan ditandai sebagai "OVERLOAD BUDGET".*

Ketik "ya" untuk tetap lanjutkan atau "tidak" untuk batalkan.`
    }
  }

  return null // Budget is fine
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

    // Handle non-text messages (voice, photo, video, etc.)
    if (!text) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '📝 Maaf, saya hanya bisa memproses pesan teks.\n\nSilakan ketik pesan pengeluaran Anda, contoh:\n• "nasi goreng 20rb"\n• "ojek 15k atau Gunakan kalimat panjang yang terdiri dari bebrapa pengeluaran"\n\nAtau gunakan command /start untuk mulai.'
      })
    }

    console.log('Processing message:', { chatId, text, userId })

    // Handle /start command
    if (text === '/start') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎉 Selamat datang di CashGram Bot!, Bot pencatatan dengan integrasi AI menggunakan GEMINI.

💻 DASHBOARD WEBSITE:
Untuk melihat dashboard lengkap, silakan buat akun ke:
🌐 https://cash-gram-web-app.vercel.app
Gunakan nomor HP dan password yang valid setelah Registerasi, untuk login ke dashboard web/Bot Telegram.

🔐 CARA LOGIN:
Ketik: /login [nomor_hp] [password]
Contoh: /login 085717799999 passwordanda

� MASALAH LOGIN?
Ketik: /reset
(Gunakan jika ada masalah re-login)

🤖 FUNGSI BOT YANG TERSEDIA:
• 💰 Input pengeluaran: "makan siang 25rb" atau "hari ini saya makan ayam 25 rb dan saya beli aqua 10 rb"

📊 /analisis - Analisis AI pengeluaran bulanan
📊 /analisis minggu - Analisis mingguan
💰 /saldo - Total pengeluaran hari ini
� /budget - Status budget saat ini
💰 /tabungan - Total tabungan dari sisa budget
�📤 /export - Export data ke Excel (segera)
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang
ℹ️ /info - Tampilkan panduan ini

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
• 💰 Input pengeluaran: "makan siang 25rb" atau "hari ini saya makan ayam 25 rb dan saya beli aqua 10 rb"

📊 /analisis - Analisis AI pengeluaran bulanan
📊 /analisis minggu - Analisis mingguan
💰 /saldo - Total pengeluaran hari ini
� /budget - Status budget saat ini
💰 /tabungan - Total tabungan dari sisa budget
�📤 /export - Export data ke Excel (segera)
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang
ℹ️ /info - Tampilkan panduan ini`
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

    // Handle reset command (untuk clear telegram user mapping)
    if (text === '/reset') {
      try {
        // Delete any existing telegram user mapping for this telegram ID
        await prisma.telegramUser.deleteMany({
          where: { telegramId: userId.toString() }
        })
        
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `🔄 Reset berhasil! Data Telegram Anda sudah dihapus.

Sekarang Anda bisa login ulang dengan:
/login [nomor_hp] [password]

Contoh: /login 085717797*** password***`
        })
      } catch (error) {
        console.error('Reset error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Terjadi kesalahan saat reset. Coba lagi nanti.'
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

        if (expenses.length === 0) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `📊 Analisis ${period === 'week' ? 'Minggu' : 'Bulan'} Ini\n\n❌ Belum ada pengeluaran untuk dianalisis.\n\nMulai catat pengeluaran dengan format:\n"nasi goreng 20rb"`
          })
        }

        const analysis = await GeminiService.generatePeriodAnalysis(expenses, period)
        
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: stripMarkdown(analysis)
        })
      } catch (error: any) {
        console.error('Analysis error:', error)
        
        // Handle specific Gemini API errors
        if (error.status === 503) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `🤖 AI sedang sibuk saat ini.\n\n💡 Coba gunakan /saldo untuk melihat pengeluaran hari ini, atau tunggu beberapa menit dan coba /analisis lagi.`
          })
        }
        
        if (error.status === 429 || error.message?.includes('quota')) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `🤖 AI sudah mencapai batas harian (50 requests).\n\n📊 Analisis masih tersedia dengan data dasar.\n💡 Gunakan /saldo untuk melihat pengeluaran hari ini.\n🌐 Dashboard lengkap: https://cash-gram-web-app.vercel.app/\n\n⏰ AI akan reset besok pagi.`
          })
        }
        
        if (error.status === 429) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `⏳ Terlalu banyak permintaan.\n\nTunggu sebentar dan coba lagi dalam 1-2 menit.`
          })
        }
        
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `❌ Gagal menganalisis data.\n\n💡 Alternatif: Gunakan /saldo untuk cek pengeluaran hari ini.`
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

    // Handle budget status command with AI insights
    if (text === '/budget') {
      try {
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        
        // Get active budget period
        const activePeriod = await prisma.budgetPeriod.findFirst({
          where: {
            userId: decoded.userId,
            isActive: true
          },
          include: {
            budgetAllocations: {
              include: {
                category: true
              }
            }
          }
        })

        if (!activePeriod) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `💳 *Budget Status*

❌ Belum ada periode budget aktif.

📋 Untuk mengatur budget bulanan, silakan kunjungi dashboard:
🌐 https://cash-gram-web-app.vercel.app/dashboard

💡 Di dashboard Anda bisa:
• Set budget bulanan (misal 5.6jt)
• Alokasi per kategori (listrik 300rb, laundry 200rb, dll)
• Track sisa budget real-time

💰 Tips: Budget yang baik membantu kontrol pengeluaran dan menambah tabungan otomatis dari sisa budget!`,
            parse_mode: 'Markdown'
          })
        }

        const totalAllocated = activePeriod.budgetAllocations.reduce(
          (sum, allocation) => sum + allocation.allocatedAmount, 0
        )
        
        const totalSpent = activePeriod.budgetAllocations.reduce(
          (sum, allocation) => sum + allocation.spentAmount, 0
        )

        const budgetSummary = activePeriod.budgetAllocations.map(allocation => {
          const remaining = allocation.allocatedAmount - allocation.spentAmount
          const percentage = allocation.allocatedAmount > 0 ? 
            (allocation.spentAmount / allocation.allocatedAmount) * 100 : 0
          
          let icon = '✅'
          let statusText = 'Aman'
          if (remaining < 0) {
            icon = '❌'
            statusText = 'OVER BUDGET'
          } else if (percentage >= 80) {
            icon = '⚠️' 
            statusText = 'Hampir habis'
          } else if (percentage >= 50) {
            icon = '🟡'
            statusText = 'Setengah terpakai'
          }
          
          return `${icon} ${getCategoryIcon(allocation.category.name)} *${allocation.category.name}* (${statusText})
   💰 Rp ${allocation.spentAmount.toLocaleString('id-ID')} / Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}
   💵 Sisa: Rp ${remaining.toLocaleString('id-ID')} (${Math.max(0, 100-percentage).toFixed(0)}%)`
        }).join('\n\n')

        // Calculate days remaining in period
        const endDate = new Date(activePeriod.endDate)
        const today = new Date()
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        // Generate AI recommendation (simple logic for now, can be enhanced with Gemini later)
        let recommendation = ''
        const remainingTotal = activePeriod.totalBudget - totalSpent
        const dailyBudgetLeft = daysRemaining > 0 ? remainingTotal / daysRemaining : 0
        
        if (remainingTotal < 0) {
          recommendation = `\n🤖 *AI Saran:*\n⚠️ Anda sudah over budget Rp ${Math.abs(remainingTotal).toLocaleString('id-ID')}. Pertimbangkan untuk mengurangi pengeluaran atau gunakan tabungan.`
        } else if (daysRemaining > 0 && dailyBudgetLeft < 100000) {
          recommendation = `\n🤖 *AI Saran:*\n💡 Sisa budget harian: Rp ${dailyBudgetLeft.toLocaleString('id-ID')}. Fokus pada kebutuhan pokok dan hindari impulse buying.`
        } else if (remainingTotal > activePeriod.totalBudget * 0.5) {
          recommendation = `\n🤖 *AI Saran:*\n✅ Budget masih aman! Pertimbangkan untuk menabung sebagian atau investasi untuk masa depan.`
        }

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `💳 *Budget ${activePeriod.name}*
📅 ${new Date(activePeriod.startDate).toLocaleDateString('id-ID')} - ${new Date(activePeriod.endDate).toLocaleDateString('id-ID')} (${daysRemaining} hari lagi)

📊 *RINGKASAN BUDGET*
💰 Total Budget: Rp ${activePeriod.totalBudget.toLocaleString('id-ID')}
� Terpakai: Rp ${totalSpent.toLocaleString('id-ID')} (${((totalSpent/activePeriod.totalBudget)*100).toFixed(1)}%)
� Sisa: Rp ${(activePeriod.totalBudget - totalSpent).toLocaleString('id-ID')}

📋 *DETAIL PER KATEGORI*
${budgetSummary}${recommendation}

💡 Gunakan format "beli listrik 300rb" untuk expense dengan budget tracking otomatis!`,
          parse_mode: 'Markdown'
        })
      } catch (error) {
        console.error('Budget status error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Gagal mengambil status budget. Coba lagi nanti.'
        })
      }
    }

    // Handle savings command
    if (text === '/tabungan') {
      try {
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        
        const savings = await prisma.savings.findMany({
          where: { userId: decoded.userId },
          orderBy: { createdAt: 'desc' },
          take: 10
        })

        const totalSavings = await prisma.savings.aggregate({
          where: { userId: decoded.userId },
          _sum: { amount: true }
        })

        if (savings.length === 0) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `💰 *Tabungan Saya*

🏦 Total Tabungan: Rp 0

❌ Belum ada tabungan dari sisa budget.

💡 *Cara kerja tabungan:*
• Setiap akhir periode budget, sisa budget otomatis masuk ke tabungan
• Misal budget 5.6jt, terpakai 5.2jt → Tabungan +400rb
• Tabungan terakumulasi setiap bulan

📋 Atur budget bulanan di:
🌐 https://cash-gram-web-app.vercel.app/dashboard`
          })
        }

        const savingsDetail = savings.map(saving => 
          `💰 Rp ${saving.amount.toLocaleString('id-ID')}
📅 ${new Date(saving.createdAt).toLocaleDateString('id-ID')}
📝 ${saving.description}`
        ).join('\n\n')

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `💰 *Tabungan Saya*

🏦 Total Tabungan: Rp ${(totalSavings._sum.amount || 0).toLocaleString('id-ID')}

📋 *Riwayat Tabungan:*
${savingsDetail}

💡 Tabungan akan bertambah otomatis setiap akhir periode budget dari sisa budget yang tidak terpakai!`,
          parse_mode: 'Markdown'
        })
      } catch (error) {
        console.error('Savings error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Gagal mengambil data tabungan. Coba lagi nanti.'
        })
      }
    }

    // Handle category selection for expense confirmation
    if (text.match(/^\/[✅⚠️📂]_/)) {
      try {
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        const parts = text.split('_')
        
        if (parts.length < 5) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: '❌ Data tidak lengkap. Silakan ulangi input pengeluaran.'
          })
        }

        const categoryId = parts[1]
        const amount = parseInt(parts[2])
        const description = decodeURIComponent(parts[3])
        
        // Get category info
        const category = await prisma.category.findUnique({
          where: { id: categoryId }
        })

        if (!category) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: '❌ Kategori tidak ditemukan.'
          })
        }

        // Check current budget status
        const activePeriod = await prisma.budgetPeriod.findFirst({
          where: {
            userId: decoded.userId,
            isActive: true
          },
          include: {
            budgetAllocations: {
              where: { categoryId: categoryId },
              include: { category: true }
            }
          }
        })

        let budgetMessage = ''
        let budgetWarning = ''

        if (activePeriod && activePeriod.budgetAllocations.length > 0) {
          const allocation = activePeriod.budgetAllocations[0]
          const remainingBefore = allocation.allocatedAmount - allocation.spentAmount
          const remainingAfter = remainingBefore - amount
          
          if (remainingAfter < 0) {
            budgetWarning = `⚠️ *PERINGATAN BUDGET!*\nBudget ${category.name} tersisa: Rp ${remainingBefore.toLocaleString('id-ID')}\nPengeluaran ini: Rp ${amount.toLocaleString('id-ID')}\n\nAnda akan *OVER BUDGET* sebesar Rp ${Math.abs(remainingAfter).toLocaleString('id-ID')}!\n\n`
            budgetMessage = `\n💳 *Budget Update:*\n❌ ${category.name}: OVER BUDGET!\n💰 Budget: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}\n💸 Total terpakai: Rp ${(allocation.spentAmount + amount).toLocaleString('id-ID')}\n⚠️ Kelebihan: Rp ${Math.abs(remainingAfter).toLocaleString('id-ID')}`
          } else {
            budgetMessage = `\n💳 *Budget Update:*\n✅ Budget ${category.name} masih mencukupi\n💰 Budget: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}\n💸 Terpakai: Rp ${(allocation.spentAmount + amount).toLocaleString('id-ID')}\n💵 Sisa: Rp ${remainingAfter.toLocaleString('id-ID')}`
          }

          // Update budget allocation spent amount
          await prisma.budgetAllocation.update({
            where: { id: allocation.id },
            data: {
              spentAmount: allocation.spentAmount + amount
            }
          })
        } else {
          budgetMessage = `\n💡 *Catatan:* Kategori ${category.name} belum memiliki alokasi budget.`
        }

        // Create the expense
        const expense = await prisma.expense.create({
          data: {
            amount: amount,
            description: description,
            categoryId: categoryId,
            userId: decoded.userId,
            date: new Date()
          },
          include: { category: true }
        })

        const successMessage = `${budgetWarning}✅ *Pengeluaran Berhasil Dicatat!*

💰 Jumlah: Rp ${expense.amount.toLocaleString('id-ID')}
📝 Deskripsi: ${expense.description}
📂 Kategori: ${getCategoryIcon(expense.category.name)} ${expense.category.name}
📅 ${expense.date.toLocaleDateString('id-ID')}${budgetMessage}

💡 *Fitur lainnya:*
💳 /budget - Cek sisa budget
💰 /saldo - Total hari ini
📊 /analisis - AI analisis pengeluaran`

        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: successMessage,
          parse_mode: 'Markdown'
        })

      } catch (error) {
        console.error('Confirm expense error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Gagal menyimpan pengeluaran. Silakan coba lagi.'
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

    // Handle info command
    if (text === '/info') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `ℹ️ *CashGram Bot - Budget Smart Assistant*

📝 *CATAT PENGELUARAN (NEW UX!):*
• Format: "[item] [jumlah]"  
• Contoh: "beli listrik 300rb", "laundry baju 50rb"

🎯 *SMART BUDGET FLOW:*
1️⃣ Anda: "beli listrik 300rb"
2️⃣ Bot: "Anda pakai uang dari kategori mana?" + tampilkan pilihan dengan info budget
3️⃣ Anda: Pilih kategori (contoh: klik ✅ Listrik (Sisa: Rp 200,000))
4️⃣ Bot: Simpan expense + cek budget + beri insight & saran AI

🤖 *PERINTAH BOT:*
💳 /budget - Status budget real-time + AI insights & rekomendasi
� /tabungan - Total tabungan dari sisa budget periode lalu
💰 /saldo - Pengeluaran hari ini
📊 /analisis - AI analisis pengeluaran bulanan  
📊 /analisis minggu - Analisis mingguan
📤 /export - Export data ke Excel
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang

💡 *FITUR BUDGET SMART:*
✅ Real-time budget checking sebelum expense
⚠️ Smart warning jika akan over budget
🤖 AI insights & saran berdasarkan spending pattern
💰 Auto-save sisa budget ke tabungan setiap akhir periode
📈 Visual progress tracking per kategori
🎯 Intelligent categorization dengan AI

🌐 *DASHBOARD WEB:*
${process.env.NEXT_PUBLIC_APP_URL || 'https://cash-gram-web-app.vercel.app'}
• Setup & manage budget bulanan (5.6jt → alokasi per kategori)
• Visual analytics & charts
• Historical data & trends
• Export laporan detail

� *MENGAPA CASHGRAM?*
• 📊 Budget control yang intelligent
• 🤖 AI-powered expense categorization
• 💡 Financial insights & recommendations  
• 💰 Automatic savings from leftover budget
• 📱 Seamless sync antara bot & web dashboard
• 📈 Real-time spending tracking & alerts

Mulai dengan: "beli [item] [jumlah]rb" untuk experience budget smart! 💪`,
        parse_mode: 'Markdown'
      })
    }

    // Handle export command
    if (text === '/export') {
      try {
        const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
        
        // Get user expenses for export
        const expenses = await prisma.expense.findMany({
          where: { userId: decoded.userId },
          include: { category: true },
          orderBy: { date: 'desc' }
        })

        if (expenses.length === 0) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `📤 *Export Excel*

❌ Tidak ada data pengeluaran untuk diekspor.

💡 *Mulai catat pengeluaran:*
• Format: "nasi goreng 20rb"
• Gunakan /saldo untuk melihat pengeluaran hari ini`
          })
        }

        // For now, send user to dashboard for export
        // In the future, we could generate and send Excel file directly
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `📤 *Export Excel*

📊 Ditemukan ${expenses.length} transaksi pengeluaran!

💡 *Cara Export:*
1. Buka dashboard: cash-gram-web-app.vercel.app
2. Login dengan nomor HP dan password Anda
3. Klik tombol "Export Excel" hijau

📱 Atau tunggu fitur export langsung di bot (coming soon)

🌐 Dashboard: cash-gram-web-app.vercel.app`,
          parse_mode: 'Markdown'
        })

      } catch (error) {
        console.error('Export command error:', error)
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Terjadi kesalahan saat mengakses data export. Coba lagi nanti.'
        })
      }
    }

    // Handle expense input
    try {
      // Check if text contains multiple indicators (prioritize multiple parsing for complex input)
      const hasMultipleIndicators = /\b(dan|trus|terus|lalu|kemudian|setelah itu|sambil|juga|serta|selain|kong|abis itu)\b/i.test(text)
      const wordCount = text.split(/\s+/).length
      
      const shouldTryMultiple = hasMultipleIndicators || wordCount > 8
      
      if (shouldTryMultiple) {
        // Try multiple parsing first for complex input
        const multipleResult = await GeminiService.parseMultipleExpenses(text)
        
        if (multipleResult && multipleResult.expenses.length > 1) {
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

💡 *Fitur lainnya:*
📊 /analisis - AI analisis pengeluaran
💰 /saldo - Total pengeluaran hari ini
📤 /export - Export data ke Excel (segera)
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang
🌐 Dashboard: cash-gram-web-app.vercel.app`,
              parse_mode: 'Markdown'
            })
          }
        }
      }
      
      // Try single expense parsing (fallback or for simple input)
      const parsed = await GeminiService.parseExpenseText(text)
      
      // If single parsing fails, try multiple parsing as last resort
      if (!parsed || parsed.confidence < 60) {
        if (!shouldTryMultiple) {
          const multipleResult = await GeminiService.parseMultipleExpenses(text)
          
          if (multipleResult && multipleResult.expenses.length > 0) {
            // Process multiple expenses (same code as above)
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

💡 *Fitur lainnya:*
📊 /analisis - AI analisis pengeluaran
💰 /saldo - Total pengeluaran hari ini  
📤 /export - Export data ke Excel (segera)
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang

🌐 Dashboard: cash-gram-web-app.vercel.app`,
                parse_mode: 'Markdown'
              })
            }
          }
        }
        
        // If all parsing failed, show error message with better guidance
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `❓ Tidak dapat memahami format pengeluaran.\n\n💡 Contoh format yang benar:\n• "beli listrik 300rb"\n• "laundry baju 50rb"\n• "makan siang 25rb"\n\nAtau gunakan /info untuk panduan lengkap.`
        })
      }

      // NEW UX FLOW: Show category selection instead of direct save
      const decoded = jwt.verify(telegramUser.token, process.env.JWT_SECRET!) as any
      
      // Get user categories
      const categories = await prisma.category.findMany({
        where: { userId: decoded.userId }
      })

      if (categories.length === 0) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Anda belum memiliki kategori.\n\n📱 Silakan login ke dashboard terlebih dahulu untuk membuat kategori:\nhttps://cash-gram-web-app.vercel.app/dashboard'
        })
      }

      // Check if the amount seems reasonable
      if (parsed.amount > 50000000) {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '❌ Jumlah terlalu besar. Silakan periksa kembali nominal yang Anda masukkan.'
        })
      }

      // Get current budget period for showing remaining budget per category
      const activePeriod = await prisma.budgetPeriod.findFirst({
        where: {
          userId: decoded.userId,
          isActive: true
        },
        include: {
          budgetAllocations: {
            include: { category: true }
          }
        }
      })

      // Create category buttons with simple numbering instead of complex IDs
      const categoryButtons = categories.map((category, index) => {
        let budgetInfo = ''
        let status = '📂'
        
        if (activePeriod) {
          const allocation = activePeriod.budgetAllocations.find(a => a.categoryId === category.id)
          if (allocation) {
            const remaining = allocation.allocatedAmount - allocation.spentAmount
            if (remaining >= parsed.amount) {
              status = '✅'
              budgetInfo = ` (Sisa: Rp ${remaining.toLocaleString('id-ID')})`
            } else if (remaining > 0) {
              status = '⚠️'
              budgetInfo = ` (Sisa: Rp ${remaining.toLocaleString('id-ID')} - OVER BUDGET!)`
            } else {
              status = '❌'
              budgetInfo = ` (Budget habis - OVER BUDGET!)`
            }
          } else {
            budgetInfo = ' (Belum ada budget)'
          }
        }
        
        return `${index + 1}. ${status} ${getCategoryIcon(category.name)} ${category.name}${budgetInfo}`
      }).join('\n')

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `💰 *Pengeluaran: Rp ${parsed.amount.toLocaleString('id-ID')}*
� *Deskripsi:* ${parsed.description}

🎯 *Anda menggunakan uang dari kategori mana?*
${categoryButtons}

💡 *Keterangan:*
✅ Budget mencukupi
⚠️ Akan over budget
❌ Budget habis
📂 Belum ada budget

� *Tips:* Pilih kategori yang sesuai untuk tracking budget yang akurat!`,
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