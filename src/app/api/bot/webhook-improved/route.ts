// Enhanced Telegram Bot Webhook - User-Friendly Category Selection

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { GeminiService } from '@/lib/gemini'

// Store temporary expense data (in production, use Redis)
const tempExpenseData = new Map()

// Store AI conversation state
const aiConversationState = new Map()

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

export async function POST(request: NextRequest) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  })

  try {
    const body = await request.json()
    const { message } = body
    
    if (!message) {
      return NextResponse.json({ ok: true })
    }

    const chatId = message.chat.id
    const messageText = message.text?.trim() || ''

    // Get or create telegram user - allow new users to login
    let telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: chatId.toString() },
      include: { user: true }
    })

    // If telegramUser doesn't exist, create a temporary one for new user login
    if (!telegramUser) {
      // For new users, only allow /start and /login commands initially
      if (messageText !== '/start' && !messageText.startsWith('/login') && !messageText.startsWith('/checkdb') && messageText !== '/mystatus') {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: '👋 *SELAMAT DATANG!*\n\nAnda belum terdaftar di sistem Telegram.\n\n📱 *LOGIN:*\nKetik: `/login nomorhp password`\nContoh: `/login 085717797065 11111`\n\n🆕 *ATAU DAFTAR BARU:*\nKetik: `/start` untuk panduan\n\n� *DEBUG:*\nKetik: `/checkdb nomorhp` - cek data user',
          parse_mode: 'Markdown'
        })
      }
      
      // Create temporary telegramUser for login process
      telegramUser = {
        id: 'temp',
        telegramId: chatId.toString(),
        userId: 'temp',
        isActive: false,
        user: null
      } as any
    }

    // Check if user is logged out (inactive) - allow only specific commands
    const allowedCommandsWhenLoggedOut = ['/start', '/login', '/checkdb', '/mystatus'];
    const isCommandAllowed = allowedCommandsWhenLoggedOut.some(cmd => 
      messageText === cmd || messageText.startsWith(cmd + ' ')
    );
    
    if (telegramUser && !telegramUser.isActive && !isCommandAllowed) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '🔐 *SILAKAN LOGIN TERLEBIH DAHULU*\n\nAnda sudah logout dari CashGram Bot.\n\n📱 *LOGIN:*\nKetik: `/login nomorhp password`\nContoh: `/login 081234567890 mypass`\n\n🔍 *DEBUG:*\nKetik: `/checkdb nomorhp` - cek data user\nKetik: `/mystatus` - cek status auth\n\n🆕 *ATAU DAFTAR BARU:*\nKetik: `/start` untuk panduan',
        parse_mode: 'Markdown'
      })
    }

    // Handle /start command
    if (messageText === '/start') {
      // Check if user is logged out (exists but inactive)
      const existingTelegramUser = await prisma.telegramUser.findUnique({
        where: { telegramId: chatId.toString() }
      })

      if (existingTelegramUser && !existingTelegramUser.isActive) {
        // User exists but is logged out - ask for login
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: `👋 *SELAMAT DATANG KEMBALI!*

🔐 Anda sudah logout sebelumnya. Pilih cara masuk:

📱 *LOGIN DENGAN AKUN:*
Ketik: \`/login nomorhp password\`
Contoh: \`/login 081234567890 mypass\`

🆕 *ATAU DAFTAR BARU:*
💻 Buka dashboard: https://cash-gram-web-app.vercel.app
📝 Daftar akun baru, lalu login di atas

ℹ️ Ketik /info untuk bantuan`,
          parse_mode: 'Markdown'
        })
      }

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎉 *Selamat datang di CashGram Bot!*

💻 *DASHBOARD WEBSITE:*
🌐 https://cash-gram-web-app.vercel.app

📝 *Format pencatatan pengeluaran:*
[jumlah] [deskripsi] atau [deskripsi] [jumlah]

📖 *Contoh:*
• 50000 makan siang
• beli nasi 25000  
• beli makanan 20rb dan bensin 30rb (multiple)
• saya beli kopi 15k

🎯 *Setelah input, pilih kategori dengan mengetik nomor (1-10)*

🤖 *COMMAND TERSEDIA:*
📊 /analisis - AI analisis + Q&A pengeluaran
💰 /saldo - Total pengeluaran hari ini
🏦 /budget - Status budget saat ini
💰 /tabungan - Total tabungan
� /login [nohp] [password] - Login ke akun
🔓 /logout - Keluar dari bot
🔄 /reset - Hapus semua data user
📤 /export - Export data
ℹ️ /info - Panduan lengkap

Mulai catat pengeluaran sekarang! 🚀`,
        parse_mode: 'Markdown'
      })
    }

    // Handle /info command
    if (messageText === '/info') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `ℹ️ *PANDUAN CASHGRAM BOT*

📝 *Format pencatatan pengeluaran:*
[jumlah] [deskripsi] atau [deskripsi] [jumlah]

📖 *Contoh:*
• 50000 makan siang
• beli nasi 25000  
• 100000 belanja bulanan
• laundry baju 50000

🎯 *Setelah input, pilih kategori dengan mengetik nomor (1-10)*

🤖 *COMMAND TERSEDIA:*
📊 /analisis - Analisis AI pengeluaran bulanan
📊 /analisis minggu - Analisis mingguan  
💰 /saldo - Total pengeluaran hari ini
🏦 /budget - Status budget saat ini
💰 /tabungan - Total tabungan dari sisa budget
📤 /export - Export data ke Excel
🔄 /reset - Reset dan login ulang
ℹ️ /info - Tampilkan panduan ini

💡 Tips: Gunakan format yang benar untuk pencatatan otomatis!`,
        parse_mode: 'Markdown'
      })
    }

    // Handle /saldo command  
    if (messageText === '/saldo') {
      return await handleSaldoCommand(prisma, chatId, telegramUser)
    }

    // Handle /budget command
    if (messageText === '/budget') {
      return await handleBudgetCommand(prisma, chatId, telegramUser)
    }

    // Handle /tabungan command
    if (messageText === '/tabungan') {
      return await handleTabunganCommand(prisma, chatId, telegramUser)
    }

    // Handle /analisis command
    if (messageText.startsWith('/analisis')) {
      return await handleAnalisisCommand(prisma, chatId, messageText, telegramUser)
    }

    // Handle /export command
    if (messageText === '/export') {
      return await handleExportCommand(prisma, chatId, telegramUser)
    }

    // Handle /login command
    if (messageText.startsWith('/login')) {
      return await handleLoginCommand(prisma, chatId, messageText, telegramUser)
    }

    // Handle /logout command
    if (messageText === '/logout') {
      return await handleLogoutCommand(prisma, chatId, telegramUser)
    }

    // Handle /mystatus command - for debugging authentication
    if (messageText === '/mystatus') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🔍 *STATUS DEBUG*\n\n• ChatID: \`${chatId}\`\n• TelegramID: \`${telegramUser?.telegramId || 'N/A'}\`\n• UserID: \`${telegramUser?.userId || 'N/A'}\`\n• IsActive: \`${telegramUser?.isActive || false}\`\n• User Name: \`${telegramUser?.user?.name || 'N/A'}\`\n• User Phone: \`${telegramUser?.user?.phone || 'N/A'}\``,
        parse_mode: 'Markdown'
      })
    }

    // Handle /checkdb command - check if user data exists
    if (messageText.startsWith('/checkdb')) {
      const parts = messageText.trim().split(' ')
      if (parts.length === 2) {
        const phoneToCheck = parts[1]
        try {
          const userExists = await prisma.user.findFirst({
            where: { phone: phoneToCheck },
            select: { phone: true, password: true, name: true, id: true }
          })
          
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: userExists 
              ? `✅ *USER DITEMUKAN*\n\n• Phone: \`${userExists.phone}\`\n• Password: \`${userExists.password}\`\n• Name: \`${userExists.name}\`\n• ID: \`${userExists.id}\``
              : `❌ *USER TIDAK DITEMUKAN*\n\nPhone \`${phoneToCheck}\` tidak ada di database`,
            parse_mode: 'Markdown'
          })
        } catch (error) {
          return NextResponse.json({
            method: 'sendMessage',
            chat_id: chatId,
            text: `❌ Error checking database: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      } else {
        return NextResponse.json({
          method: 'sendMessage',
          chat_id: chatId,
          text: 'Format: `/checkdb nomorhp`\nContoh: `/checkdb 085717797065`'
        })
      }
    }

    // Handle /reset command
    if (messageText === '/reset') {
      return await handleResetCommand(prisma, chatId, telegramUser)
    }

    // Handle confirmation messages (lanjut/batal)
    if (messageText.toLowerCase() === 'lanjut' || messageText.toLowerCase() === 'batal') {
      const confirmResult = await handleConfirmation(prisma, chatId, messageText, telegramUser)
      if (confirmResult) {
        return confirmResult
      }
    }

    // Check if user is in AI conversation mode
    if (aiConversationState.has(chatId)) {
      return await handleAIQuestionResponse(prisma, chatId, messageText, telegramUser)
    }

    // Check if user is selecting a category number
    if (/^\d+$/.test(messageText)) {
      return await handleCategorySelection(prisma, chatId, parseInt(messageText), telegramUser)
    }

    // Try AI-powered expense parsing (handles multiple expenses and flexible formats)
    try {
      const aiParseResult = await parseExpenseWithAI(messageText)
      if (aiParseResult && aiParseResult.expenses && aiParseResult.expenses.length > 0) {
        return await handleMultipleExpenses(prisma, chatId, aiParseResult.expenses, telegramUser)
      }
    } catch (error) {
      console.log('AI parsing failed, trying simple parsing:', error)
    }

    // Fallback: Simple regex parsing for basic formats
    let expenseMatch = messageText.match(/^(\d+(?:k|rb|ribu)?)\s+(.+)$/i) // format: 50000 makan siang
    if (expenseMatch) {
      const amount = parseAmount(expenseMatch[1])
      if (amount > 0) {
        return await handleSingleExpense(prisma, chatId, amount, expenseMatch[2], telegramUser)
      }
    }
    
    // Try alternative format: description amount
    expenseMatch = messageText.match(/^(.+)\s+(\d+(?:k|rb|ribu)?)$/i) // format: beli beras 150000
    if (expenseMatch) {
      const amount = parseAmount(expenseMatch[2])
      if (amount > 0) {
        return await handleSingleExpense(prisma, chatId, amount, expenseMatch[1], telegramUser)
      }
    }

    // Default help message
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `👋 Halo! Cara menggunakan CashGram Bot:

📝 *Format pencatatan pengeluaran:*
[jumlah] [deskripsi] atau [deskripsi] [jumlah]

📖 *Contoh:*
• 50000 makan siang
• beli nasi 25000
• 100000 belanja bulanan
• laundry baju 50000

🎯 *Setelah input, pilih kategori dengan mengetik nomor*

🤖 *COMMAND TERSEDIA:*
📊 /analisis - AI analisis pengeluaran
💰 /saldo - Total pengeluaran hari ini
🏦 /budget - Status budget saat ini
💰 /tabungan - Total tabungan
📤 /export - Export data
ℹ️ /info - Panduan lengkap

💡 Tips: Gunakan format yang benar untuk pencatatan otomatis!`,
      parse_mode: 'Markdown'
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

async function handleExpenseInput(prisma: PrismaClient, chatId: number, expenseMatch: RegExpMatchArray, telegramUser: any) {
  const amount = parseFloat(expenseMatch[1])
  const description = expenseMatch[2]

  // Store expense data temporarily
  const expenseKey = `${chatId}_${Date.now()}`
  tempExpenseData.set(expenseKey, { amount, description, telegramId: chatId.toString() })

  // Get categories
  const categories = await prisma.category.findMany({
    where: { userId: telegramUser.userId },
    orderBy: { name: 'asc' }
  })

  if (categories.length === 0) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Belum ada kategori. Silakan buat kategori terlebih dahulu di web app.'
    })
  }

  // Get active budget period
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId: telegramUser.userId, isActive: true },
    include: {
      budgetAllocations: {
        include: { category: true }
      }
    }
  })

  // Create category list with numbers
  const categoryList = categories.map((category, index) => {
    let budgetInfo = ''
    let status = '📂'
    
    if (activePeriod) {
      const allocation = activePeriod.budgetAllocations.find(a => a.categoryId === category.id)
      if (allocation) {
        const remaining = allocation.allocatedAmount - allocation.spentAmount
        if (remaining >= amount) {
          status = '✅'
          budgetInfo = ` (Sisa: Rp ${remaining.toLocaleString('id-ID')})`
        } else if (remaining > 0) {
          status = '⚠️'
          budgetInfo = ` (Sisa: Rp ${remaining.toLocaleString('id-ID')} - OVER!)`
        } else {
          status = '❌'
          budgetInfo = ` (Budget habis)`
        }
      } else {
        budgetInfo = ' (Belum ada budget)'
      }
    }
    
    return `${index + 1}. ${status} ${category.icon} ${category.name}${budgetInfo}`
  }).join('\n')

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `💰 *Pengeluaran: Rp ${amount.toLocaleString('id-ID')}*
📝 *Deskripsi:* ${description}

🎯 *Pilih kategori dengan mengetik nomor (1-${categories.length}):*

${categoryList}

💡 *Keterangan:*
✅ Budget aman
⚠️ Akan over budget  
❌ Budget habis
📂 Belum ada budget

💬 *Cara pilih:* Ketik angka kategori, contoh: "1"`,
    parse_mode: 'Markdown'
  })
}

async function handleCategorySelection(prisma: PrismaClient, chatId: number, categoryNumber: number, telegramUser: any) {
  // Find expense data
  let expenseData = null
  let expenseKey = ''
  for (const [key, data] of tempExpenseData.entries()) {
    if (key.startsWith(chatId.toString()) && !key.includes('_confirm') && !key.includes('_multi')) {
      expenseData = data
      expenseKey = key
      break
    }
  }

  if (!expenseData) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Data pengeluaran tidak ditemukan.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }

  // Get categories
  const categories = await prisma.category.findMany({
    where: { userId: telegramUser.userId },
    orderBy: { name: 'asc' }
  })

  if (categoryNumber < 1 || categoryNumber > categories.length) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `❌ Nomor tidak valid. Pilih 1-${categories.length}\n\nℹ️ Ketik /info untuk bantuan`
    })
  }

  const selectedCategory = categories[categoryNumber - 1]

  // Clean up current expense data
  tempExpenseData.delete(expenseKey)

  // Check budget and create expense
  const result = await createExpenseWithBudgetCheck(prisma, expenseData, selectedCategory, telegramUser.userId, chatId)

  // Handle multiple expense flow
  if (expenseData.isMulti && expenseData.multiKey) {
    const multiData = tempExpenseData.get(expenseData.multiKey)
    if (multiData) {
      // Store result
      multiData.results.push({
        amount: expenseData.amount,
        description: expenseData.description,
        category: selectedCategory
      })
      multiData.currentIndex += 1

      // Continue to next expense
      return await processNextExpense(prisma, chatId, expenseData.multiKey, telegramUser)
    }
  }

  return result
}

async function createExpenseWithBudgetCheck(prisma: PrismaClient, expenseData: any, category: any, userId: string, chatId: number) {
  // Check budget first
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId, isActive: true },
    include: {
      budgetAllocations: {
        where: { categoryId: category.id }
      }
    }
  })

  let willOverBudget = false
  let budgetStatus = 'Budget aman'
  
  if (activePeriod && activePeriod.budgetAllocations.length > 0) {
    const allocation = activePeriod.budgetAllocations[0]
    const remaining = allocation.allocatedAmount - allocation.spentAmount
    
    if (expenseData.amount > remaining) {
      willOverBudget = true
      budgetStatus = 'OVER BUDGET!'
      
      // Store for confirmation
      tempExpenseData.set(`${chatId}_confirm`, { 
        ...expenseData, 
        categoryId: category.id
      })

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `⚠️ *PERINGATAN BUDGET*\n\n💰 ${category.icon || '💰'} ${category.name}\n💳 Pengeluaran: Rp ${expenseData.amount.toLocaleString('id-ID')}\n📊 Sisa budget: Rp ${remaining.toLocaleString('id-ID')}\n\nKetik "lanjut" untuk tetap catat\nKetik "batal" untuk batalkan\n\nℹ️ Ketik /info untuk bantuan`,
        parse_mode: 'Markdown'
      })
    }
  }

  // Create expense
  const expenseDescription = willOverBudget ? `[OVERLOAD] ${expenseData.description}` : expenseData.description
  
  await prisma.expense.create({
    data: {
      amount: expenseData.amount,
      description: expenseDescription,
      userId,
      categoryId: category.id
    }
  })

  // Update budget allocation
  if (activePeriod && activePeriod.budgetAllocations.length > 0) {
    await prisma.budgetAllocation.update({
      where: { id: activePeriod.budgetAllocations[0].id },
      data: { 
        spentAmount: { increment: expenseData.amount }
      }
    })
  }

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `✅ *BERHASIL DICATAT!*\n\n💰 Rp ${expenseData.amount.toLocaleString('id-ID')}\n📝 ${expenseData.description}\n🏷️ ${category.icon || '💰'} ${category.name}\n📅 ${new Date().toLocaleDateString('id-ID')}\n\n✅ Status: ${budgetStatus}\n\nℹ️ Ketik /info untuk bantuan`,
    parse_mode: 'Markdown'
  })
}

// Handle confirmation for budget overrun
async function handleConfirmation(prisma: PrismaClient, chatId: number, message: string, telegramUser: any) {
  const confirmData = tempExpenseData.get(`${chatId}_confirm`)
  
  if (!confirmData) {
    return null
  }

  if (message.toLowerCase() === 'lanjut') {
    tempExpenseData.delete(`${chatId}_confirm`)
    
    const category = await prisma.category.findUnique({
      where: { id: confirmData.categoryId }
    })

    return await createExpenseWithBudgetCheck(prisma, confirmData, category, telegramUser.userId, chatId)
  } else if (message.toLowerCase() === 'batal') {
    tempExpenseData.delete(`${chatId}_confirm`)
    
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Pencatatan pengeluaran dibatalkan.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }
  
  return null
}

// Handle /saldo command
async function handleSaldoCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayExpenses = await prisma.expense.findMany({
      where: {
        userId: telegramUser.userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: { category: true }
    })

    if (todayExpenses.length === 0) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `📊 *SALDO HARI INI*\n📅 ${today.toLocaleDateString('id-ID')}\n\n💰 Total pengeluaran: Rp 0\n\n📝 Belum ada pengeluaran hari ini.\n\nℹ️ Ketik /info untuk bantuan`,
        parse_mode: 'Markdown'
      })
    }

    const totalToday = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    let expenseList = '📝 *Detail:*\n'
    todayExpenses.slice(0, 5).forEach((expense, index) => { // Max 5 items untuk telegram
      expenseList += `${index + 1}. ${expense.category.icon || '💰'} ${expense.description} - Rp ${expense.amount.toLocaleString('id-ID')}\n`
    })

    if (todayExpenses.length > 5) {
      expenseList += `... dan ${todayExpenses.length - 5} lainnya\n`
    }

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `📊 *SALDO HARI INI*\n📅 ${today.toLocaleDateString('id-ID')}\n\n💰 *Total:* Rp ${totalToday.toLocaleString('id-ID')}\n📊 *Transaksi:* ${todayExpenses.length}\n\n${expenseList}\nℹ️ Ketik /info untuk bantuan`,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Saldo command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal mengambil data saldo.'
    })
  }
}

// Handle /budget command
async function handleBudgetCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  try {
    const activePeriod = await prisma.budgetPeriod.findFirst({
      where: { userId: telegramUser.userId, isActive: true },
      include: {
        budgetAllocations: {
          include: { category: true }
        }
      }
    })

    if (!activePeriod) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '🏦 *STATUS BUDGET*\n\n❌ Belum ada budget yang aktif.\n\n💡 Silakan buat budget di dashboard web:\n🌐 https://cash-gram-web-app.vercel.app',
        parse_mode: 'Markdown'
      })
    }

    const totalAllocated = activePeriod.budgetAllocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0)
    const totalSpent = activePeriod.budgetAllocations.reduce((sum, alloc) => sum + alloc.spentAmount, 0)
    const totalRemaining = totalAllocated - totalSpent

    let budgetText = `🏦 *STATUS BUDGET*\n\n`
    budgetText += `💰 *Total Budget:* Rp ${totalAllocated.toLocaleString('id-ID')}\n`
    budgetText += `💸 *Terpakai:* Rp ${totalSpent.toLocaleString('id-ID')}\n`
    budgetText += `💳 *Sisa:* Rp ${totalRemaining.toLocaleString('id-ID')}\n\n`
    budgetText += `📊 *Detail per Kategori:*\n`

    activePeriod.budgetAllocations.forEach((alloc, index) => {
      const remaining = alloc.allocatedAmount - alloc.spentAmount
      const percentage = (alloc.spentAmount / alloc.allocatedAmount) * 100
      const status = remaining <= 0 ? '❌' : remaining < alloc.allocatedAmount * 0.2 ? '⚠️' : '✅'
      
      budgetText += `${index + 1}. ${status} ${alloc.category.icon} ${alloc.category.name}\n`
      budgetText += `   Rp ${alloc.spentAmount.toLocaleString('id-ID')} / Rp ${alloc.allocatedAmount.toLocaleString('id-ID')} (${percentage.toFixed(1)}%)\n`
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: budgetText,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Budget command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal mengambil data budget.'
    })
  }
}

// Handle /tabungan command
async function handleTabunganCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  try {
    const savings = await prisma.savings.findMany({
      where: { userId: telegramUser.userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    if (savings.length === 0) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '💰 *TABUNGAN*\n\n📊 Belum ada tabungan dari sisa budget.\n\n💡 Tabungan otomatis terbentuk dari sisa budget bulanan.',
        parse_mode: 'Markdown'
      })
    }

    const totalSavings = savings.reduce((sum, saving) => sum + saving.amount, 0)
    let savingsText = `💰 *TOTAL TABUNGAN:* Rp ${totalSavings.toLocaleString('id-ID')}\n\n`
    savingsText += `📊 *Riwayat 5 Terakhir:*\n`

    savings.forEach((saving, index) => {
      const date = saving.createdAt.toLocaleDateString('id-ID')
      savingsText += `${index + 1}. ${date} - Rp ${saving.amount.toLocaleString('id-ID')}\n`
      if (saving.description) {
        savingsText += `   ${saving.description}\n`
      }
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: savingsText,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Tabungan command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal mengambil data tabungan.'
    })
  }
}

// Handle /analisis command
// Handle /analisis command with AI integration
async function handleAnalisisCommand(prisma: PrismaClient, chatId: number, message: string, telegramUser: any) {
  try {
    const period = message.includes('minggu') ? 'week' : 'month'
    const days = period === 'week' ? 7 : 30
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const expenses = await prisma.expense.findMany({
      where: {
        userId: telegramUser.userId,
        date: { gte: startDate }
      },
      include: { category: true }
    })

    if (expenses.length === 0) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `📊 *ANALISIS ${period === 'week' ? 'MINGGU' : 'BULAN'} INI*\n\n❌ Belum ada pengeluaran untuk dianalisis.\n\n💡 Mulai catat pengeluaran:\n"beli nasi 25000"\n\nℹ️ Ketik /info untuk bantuan`,
        parse_mode: 'Markdown'
      })
    }

    // Generate AI analysis
    const aiAnalysis = await GeminiService.generatePeriodAnalysis(expenses, period)
    const cleanAnalysis = stripMarkdown(aiAnalysis)
    
    // Store conversation state for Q&A
    aiConversationState.set(chatId, {
      expenses,
      period,
      timestamp: Date.now()
    })

    const shortAnalysis = cleanAnalysis.substring(0, 800) + (cleanAnalysis.length > 800 ? '...' : '')
    
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `${shortAnalysis}\n\n🤔 *Ada pertanyaan tentang keuangan Anda?*\n\nContoh: "Pengeluaran mana yang harus dikurangi?" atau "Berapa target tabungan per bulan?"\n\n💡 Ketik "tidak" jika tidak ada pertanyaan.\n\nℹ️ Ketik /info untuk bantuan`,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Analisis command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal menganalisis data pengeluaran.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }
}

// Handle /export command
async function handleExportCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `📤 *EXPORT DATA*\n\n🌐 Untuk export data ke Excel, silakan gunakan dashboard web:\n\nhttps://cash-gram-web-app.vercel.app/dashboard\n\n💡 Fitur export akan tersedia di bot pada update selanjutnya.`,
    parse_mode: 'Markdown'
  })
}

// Handle /logout command  
async function handleLogoutCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  try {
    await prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { isActive: false }
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '🔓 *LOGOUT BERHASIL*\n\n👋 Anda telah keluar dari CashGram Bot.\n\n💡 Untuk masuk kembali, ketik /start',
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Logout command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal logout.'
    })
  }
}

// Handle /login command with phone and password
async function handleLoginCommand(prisma: PrismaClient, chatId: number, messageText: string, telegramUser: any) {
  try {
    // Parse /login command - expect format: /login phone password
    const parts = messageText.trim().split(' ')
    
    if (parts.length !== 3) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '� *FORMAT LOGIN*\n\nGunakan format:\n`/login nomorhp password`\n\nContoh:\n`/login 081234567890 mypassword`\n\nℹ️ Ketik /info untuk bantuan',
        parse_mode: 'Markdown'
      })
    }

    const [_, phone, password] = parts
    
    // Find user by phone and password
    const user = await prisma.user.findFirst({
      where: {
        phone: phone,
        password: password // In production, this should be hashed
      }
    })

    if (!user) {
      // Add more detailed error logging
      console.log('Login failed for:', { phone, chatId })
      
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '❌ *LOGIN GAGAL*\n\nNomor HP atau password salah.\n\n� *CEK KEMBALI:*\n• Nomor HP: `' + phone + '`\n• Password: (tersembunyi)\n\n💡 Daftar di: https://cash-gram-web-app.vercel.app',
        parse_mode: 'Markdown'
      })
    }

    // Add success logging
    console.log('Login successful for:', { phone, userId: user.id, chatId })

    // Update telegram user to link with the found user and activate
    await prisma.telegramUser.upsert({
      where: { telegramId: chatId.toString() },
      update: { 
        userId: user.id,
        isActive: true
      },
      create: {
        telegramId: chatId.toString(),
        userId: user.id,
        isActive: true
      }
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `✅ *LOGIN BERHASIL*\n\n👋 Selamat datang kembali, *${user.name || 'User'}*!\n\n💰 Bot siap mencatat pengeluaran Anda.\n🎯 Mulai dengan mengetik nominal dan deskripsi\n\nContoh: \`50000 makan siang\``,
      parse_mode: 'Markdown'
    })

  } catch (error) {
    console.error('Login command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal login. Coba lagi.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }
}

// Handle /reset command - delete all user data
async function handleResetCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: telegramUser.userId }
    })

    if (!user) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '❌ User tidak ditemukan.\n\nℹ️ Ketik /info untuk bantuan'
      })
    }

    // Delete all user data in order (foreign key constraints)
    await prisma.expense.deleteMany({
      where: { userId: telegramUser.userId }
    })
    
    await prisma.category.deleteMany({
      where: { userId: telegramUser.userId }
    })
    
    await prisma.budgetAllocation.deleteMany({
      where: { 
        budgetPeriod: {
          userId: telegramUser.userId
        }
      }
    })

    await prisma.budgetPeriod.deleteMany({
      where: { userId: telegramUser.userId }
    })

    await prisma.savings.deleteMany({
      where: { userId: telegramUser.userId }
    })

    // Deactivate telegram user but keep the link
    await prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: { isActive: false }
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '🗑️ *RESET BERHASIL*\n\n✅ Semua data berhasil dihapus:\n• Expenses\n• Categories\n• Budget\n\n💡 Untuk mulai lagi, ketik /start\n\nℹ️ Ketik /info untuk bantuan',
      parse_mode: 'Markdown'
    })

  } catch (error) {
    console.error('Reset command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal reset data.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }
}

// Helper function to parse amount from text (handles k, rb, ribu)
function parseAmount(amountText: string): number {
  const cleanText = amountText.toLowerCase().replace(/[^\d]/g, '')
  const baseAmount = parseInt(cleanText) || 0
  
  if (amountText.toLowerCase().includes('k') || 
      amountText.toLowerCase().includes('ribu')) {
    return baseAmount * 1000
  }
  
  return baseAmount
}

// AI-powered expense parsing
async function parseExpenseWithAI(text: string) {
  try {
    const result = await GeminiService.parseMultipleExpenses(text)
    return result
  } catch (error) {
    console.error('AI parsing error:', error)
    return null
  }
}

// Handle multiple expenses iteration
async function handleMultipleExpenses(prisma: PrismaClient, chatId: number, expenses: any[], telegramUser: any) {
  // Store all expenses in temp data for processing one by one
  const multiExpenseKey = `${chatId}_multi_${Date.now()}`
  tempExpenseData.set(multiExpenseKey, {
    expenses,
    currentIndex: 0,
    results: []
  })

  // Start with first expense
  return await processNextExpense(prisma, chatId, multiExpenseKey, telegramUser)
}

// Process next expense in multi-expense flow
async function processNextExpense(prisma: PrismaClient, chatId: number, multiKey: string, telegramUser: any) {
  const multiData = tempExpenseData.get(multiKey)
  if (!multiData) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Data pengeluaran tidak ditemukan.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }

  const currentExpense = multiData.expenses[multiData.currentIndex]
  if (!currentExpense) {
    // All expenses processed, show summary
    return await showMultiExpenseSummary(prisma, chatId, multiData.results, telegramUser)
  }

  // Store current expense for category selection
  const expenseKey = `${chatId}_${Date.now()}`
  tempExpenseData.set(expenseKey, {
    amount: currentExpense.amount,
    description: currentExpense.description,
    telegramId: chatId.toString(),
    multiKey, // Reference to multi-expense data
    isMulti: true
  })

  // Show category selection
  return await showCategorySelection(prisma, chatId, currentExpense.amount, currentExpense.description, telegramUser)
}

// Handle single expense
async function handleSingleExpense(prisma: PrismaClient, chatId: number, amount: number, description: string, telegramUser: any) {
  const expenseKey = `${chatId}_${Date.now()}`
  tempExpenseData.set(expenseKey, {
    amount,
    description: description.trim(),
    telegramId: chatId.toString(),
    isMulti: false
  })

  return await showCategorySelection(prisma, chatId, amount, description, telegramUser)
}

// Show category selection with budget status
async function showCategorySelection(prisma: PrismaClient, chatId: number, amount: number, description: string, telegramUser: any) {
  const categories = await prisma.category.findMany({
    where: { userId: telegramUser.userId },
    orderBy: { name: 'asc' }
  })

  if (categories.length === 0) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Belum ada kategori. Silakan buat kategori terlebih dahulu di web app.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }

  // Get active budget period for status checking
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId: telegramUser.userId, isActive: true },
    include: {
      budgetAllocations: {
        include: { category: true }
      }
    }
  })

  let categoryText = `💰 *Pengeluaran:* Rp ${amount.toLocaleString('id-ID')}\n📝 *Deskripsi:* ${description}\n\n🎯 *Pilih kategori (ketik nomor):*\n\n`

  categories.forEach((category, index) => {
    let status = '📂'
    let budgetInfo = 'Belum ada budget'

    if (activePeriod) {
      const allocation = activePeriod.budgetAllocations.find(a => a.categoryId === category.id)
      if (allocation) {
        const remaining = allocation.allocatedAmount - allocation.spentAmount
        if (remaining <= 0) {
          status = '❌'
          budgetInfo = 'Budget habis'
        } else if (amount > remaining) {
          status = '⚠️'
          budgetInfo = `Sisa: Rp ${remaining.toLocaleString('id-ID')} - OVER!`
        } else {
          status = '✅'
          budgetInfo = `Sisa: Rp ${remaining.toLocaleString('id-ID')}`
        }
      }
    }

    categoryText += `${index + 1}. ${status} ${category.icon || '💰'} ${category.name} (${budgetInfo})\n`
  })

  categoryText += `\n💡 *Keterangan:*\n✅ Budget aman\n⚠️ Akan over budget\n❌ Budget habis\n📂 Belum ada budget\n\nℹ️ Ketik /info untuk bantuan`

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: categoryText,
    parse_mode: 'Markdown'
  })
}

// Show multi-expense summary
async function showMultiExpenseSummary(prisma: PrismaClient, chatId: number, results: any[], telegramUser: any) {
  tempExpenseData.delete(`${chatId}_multi_*`) // Clean up

  const totalAmount = results.reduce((sum, result) => sum + result.amount, 0)
  let summaryText = `✅ *SEMUA PENGELUARAN BERHASIL DICATAT!*\n\n`
  summaryText += `💰 *Total:* Rp ${totalAmount.toLocaleString('id-ID')}\n`
  summaryText += `📊 *Jumlah item:* ${results.length}\n\n`
  summaryText += `📝 *Detail:*\n`

  results.forEach((result, index) => {
    summaryText += `${index + 1}. ${result.category.icon} ${result.description} - Rp ${result.amount.toLocaleString('id-ID')} (${result.category.name})\n`
  })

  summaryText += `\n📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}\n\nℹ️ Ketik /info untuk bantuan`

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: summaryText,
    parse_mode: 'Markdown'
  })
}

// Handle AI question response for /analisis
async function handleAIQuestionResponse(prisma: PrismaClient, chatId: number, question: string, telegramUser: any) {
  const conversationData = aiConversationState.get(chatId)
  if (!conversationData) {
    aiConversationState.delete(chatId)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Sesi analisis sudah berakhir.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }

  // Check if user wants to skip
  if (question.toLowerCase().includes('tidak') || question.toLowerCase().includes('no')) {
    aiConversationState.delete(chatId)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '👍 Baik, analisis selesai.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }

  try {
    // Get user's expense data for context
    const expenses = await prisma.expense.findMany({
      where: {
        userId: telegramUser.userId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      include: { category: true }
    })

    const expenseContext = expenses.map(exp => 
      `Rp ${exp.amount.toLocaleString('id-ID')} - ${exp.description} (${exp.category.name}) - ${exp.date.toLocaleDateString('id-ID')}`
    ).join('\n')

    const prompt = `Berdasarkan data pengeluaran user berikut:

${expenseContext}

User bertanya: "${question}"

Berikan jawaban yang helpful, specific, dan actionable dalam bahasa Indonesia. Jawaban maksimal 200 kata. Fokus pada analisis finansial yang praktis.`

    const aiResponse = await GeminiService.generateResponse(prompt)
    
    aiConversationState.delete(chatId)
    
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `🤖 ${stripMarkdown(aiResponse)}\n\n✨ Semoga bisa membantu!\n\nℹ️ Ketik /info untuk bantuan`,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('AI response error:', error)
    aiConversationState.delete(chatId)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Maaf, AI sedang bermasalah. Coba lagi nanti.\n\nℹ️ Ketik /info untuk bantuan'
    })
  }
}