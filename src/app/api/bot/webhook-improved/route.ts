// Enhanced Telegram Bot Webhook - User-Friendly Category Selection

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Store temporary expense data (in production, use Redis)
const tempExpenseData = new Map()

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

    // Get or create telegram user
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { telegramId: chatId.toString() },
      include: { user: true }
    })

    if (!telegramUser) {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: '❌ User tidak ditemukan. Silakan daftar terlebih dahulu di web app.'
      })
    }

    // Handle /start command
    if (messageText === '/start') {
      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: `🎉 Selamat datang di CashGram Bot!

💻 DASHBOARD WEBSITE:
🌐 https://cash-gram-web-app.vercel.app

🤖 FUNGSI BOT YANG TERSEDIA:
• 💰 Input pengeluaran: "beli nasi 25000" atau "25000 makan siang"

📊 /analisis - Analisis AI pengeluaran bulanan
📊 /analisis minggu - Analisis mingguan
💰 /saldo - Total pengeluaran hari ini
🏦 /budget - Status budget saat ini
💰 /tabungan - Total tabungan dari sisa budget
📤 /export - Export data ke Excel
🔓 /logout - Keluar dari bot
🔄 /reset - Reset dan login ulang
ℹ️ /info - Tampilkan panduan ini

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

    // Handle /logout command
    if (messageText === '/logout') {
      return await handleLogoutCommand(prisma, chatId, telegramUser)
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

    // Check if user is selecting a category number
    if (/^\d+$/.test(messageText)) {
      return await handleCategorySelection(prisma, chatId, parseInt(messageText), telegramUser)
    }

    // Parse expense format: supports both "amount description" and "description amount"
    let expenseMatch = messageText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/) // format: 50000 makan siang
    if (expenseMatch) {
      return await handleExpenseInput(prisma, chatId, expenseMatch, telegramUser)
    }
    
    // Try alternative format: description amount
    expenseMatch = messageText.match(/^(.+)\s+(\d+(?:\.\d+)?)$/) // format: beli beras 150000
    if (expenseMatch) {
      // Create new match array with swapped order [full_match, amount, description]
      const swappedMatch = Object.assign([expenseMatch[0], expenseMatch[2], expenseMatch[1]], {
        index: expenseMatch.index,
        input: expenseMatch.input,
        groups: expenseMatch.groups
      }) as RegExpMatchArray
      return await handleExpenseInput(prisma, chatId, swappedMatch, telegramUser)
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
  // Find the most recent expense data for this user
  let expenseData = null
  for (const [key, data] of tempExpenseData.entries()) {
    if (key.startsWith(chatId.toString())) {
      expenseData = data
      tempExpenseData.delete(key) // Clean up
      break
    }
  }

  if (!expenseData) {
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Data pengeluaran tidak ditemukan. Silakan input ulang dengan format: [jumlah] [deskripsi]'
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
      text: `❌ Nomor kategori tidak valid. Pilih antara 1-${categories.length}`
    })
  }

  const selectedCategory = categories[categoryNumber - 1]

  // Check budget
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId: telegramUser.userId, isActive: true },
    include: {
      budgetAllocations: {
        where: { categoryId: selectedCategory.id },
        include: { category: true }
      }
    }
  })

  let willOverBudget = false
  let budgetWarning = ''

  if (activePeriod && activePeriod.budgetAllocations.length > 0) {
    const allocation = activePeriod.budgetAllocations[0]
    const remaining = allocation.allocatedAmount - allocation.spentAmount
    
    if (expenseData.amount > remaining) {
      willOverBudget = true
      budgetWarning = `⚠️ *PERINGATAN OVERRUN BUDGET*

💰 *Kategori:* ${selectedCategory.icon} ${selectedCategory.name}
💳 *Pengeluaran:* Rp ${expenseData.amount.toLocaleString('id-ID')}

📊 *Status Budget:*
• Alokasi: Rp ${allocation.allocatedAmount.toLocaleString('id-ID')}
• Terpakai: Rp ${allocation.spentAmount.toLocaleString('id-ID')}
• Sisa: Rp ${remaining.toLocaleString('id-ID')}
• Kelebihan: Rp ${(expenseData.amount - remaining).toLocaleString('id-ID')}

Ketik "lanjut" untuk tetap catat dengan status OVERLOAD BUDGET
Ketik "batal" untuk membatalkan`

      // Store for continuation
      tempExpenseData.set(`${chatId}_confirm`, { 
        ...expenseData, 
        categoryId: selectedCategory.id,
        willOverBudget: true 
      })

      return NextResponse.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: budgetWarning,
        parse_mode: 'Markdown'
      })
    }
  }

  // Create expense
  return await createExpense(prisma, expenseData, selectedCategory, telegramUser.userId, willOverBudget, chatId)
}

async function createExpense(prisma: PrismaClient, expenseData: any, category: any, userId: string, willOverBudget: boolean, chatId: number) {
  const expenseDescription = willOverBudget ? `[OVERLOAD BUDGET] ${expenseData.description}` : expenseData.description

  const expense = await prisma.expense.create({
    data: {
      amount: parseFloat(expenseData.amount.toString()),
      description: expenseDescription,
      userId: userId,
      categoryId: category.id
    }
  })

  // Update budget allocation
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId: userId, isActive: true },
    include: {
      budgetAllocations: {
        where: { categoryId: category.id }
      }
    }
  })

  if (activePeriod && activePeriod.budgetAllocations.length > 0) {
    await prisma.budgetAllocation.update({
      where: { id: activePeriod.budgetAllocations[0].id },
      data: {
        spentAmount: {
          increment: parseFloat(expenseData.amount.toString())
        }
      }
    })
  }

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `✅ *Pengeluaran berhasil dicatat!*

💰 *Jumlah:* Rp ${expenseData.amount.toLocaleString('id-ID')}
📝 *Deskripsi:* ${expenseData.description}
🏷️ *Kategori:* ${category.icon} ${category.name}
📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}

${willOverBudget ? '⚠️ *Status:* OVERLOAD BUDGET' : '✅ *Status:* Budget aman'}`,
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

    return await createExpense(prisma, confirmData, category, telegramUser.userId, true, chatId)
  } else if (message.toLowerCase() === 'batal') {
    tempExpenseData.delete(`${chatId}_confirm`)
    
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Pencatatan pengeluaran dibatalkan.'
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
        text: '📊 *SALDO HARI INI*\n\n💰 Total pengeluaran: Rp 0\n\n📝 Belum ada pengeluaran hari ini.',
        parse_mode: 'Markdown'
      })
    }

    const totalToday = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    let expenseList = '📝 *Detail Pengeluaran:*\n'
    todayExpenses.forEach((expense, index) => {
      expenseList += `${index + 1}. ${expense.category.icon} ${expense.description} - Rp ${expense.amount.toLocaleString('id-ID')}\n`
    })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: `📊 *SALDO HARI INI*\n\n💰 *Total pengeluaran:* Rp ${totalToday.toLocaleString('id-ID')}\n\n${expenseList}`,
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
        text: `📊 *ANALISIS ${period === 'week' ? 'MINGGU' : 'BULAN'} INI*\n\n❌ Belum ada pengeluaran untuk dianalisis.\n\n💡 Mulai catat pengeluaran dengan format:\n"beli nasi 25000"`,
        parse_mode: 'Markdown'
      })
    }

    // Simple analysis without AI
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const avgDaily = totalAmount / days
    const categoryGroups = expenses.reduce((acc, exp) => {
      if (!acc[exp.category.name]) {
        acc[exp.category.name] = { total: 0, count: 0, icon: exp.category.icon }
      }
      acc[exp.category.name].total += exp.amount
      acc[exp.category.name].count += 1
      return acc
    }, {} as any)

    let analysisText = `📊 *ANALISIS ${period === 'week' ? 'MINGGU' : 'BULAN'} INI*\n\n`
    analysisText += `💰 *Total Pengeluaran:* Rp ${totalAmount.toLocaleString('id-ID')}\n`
    analysisText += `📅 *Rata-rata Harian:* Rp ${avgDaily.toLocaleString('id-ID')}\n`
    analysisText += `📊 *Total Transaksi:* ${expenses.length}\n\n`
    analysisText += `🏷️ *Per Kategori:*\n`

    Object.entries(categoryGroups)
      .sort(([,a], [,b]) => (b as any).total - (a as any).total)
      .forEach(([name, data], index) => {
        const percentage = ((data as any).total / totalAmount * 100).toFixed(1)
        analysisText += `${index + 1}. ${(data as any).icon} ${name}: Rp ${(data as any).total.toLocaleString('id-ID')} (${percentage}%)\n`
      })

    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: analysisText,
      parse_mode: 'Markdown'
    })
  } catch (error) {
    console.error('Analisis command error:', error)
    return NextResponse.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: '❌ Gagal menganalisis data pengeluaran.'
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

// Handle /reset command
async function handleResetCommand(prisma: PrismaClient, chatId: number, telegramUser: any) {
  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `🔄 *RESET ACCOUNT*\n\n💡 Untuk reset akun, silakan:\n\n1. Logout: /logout\n2. Login ulang: /start\n3. Atau gunakan dashboard web:\n🌐 https://cash-gram-web-app.vercel.app\n\n🆘 Masih bermasalah? Hubungi support.`,
    parse_mode: 'Markdown'
  })
}