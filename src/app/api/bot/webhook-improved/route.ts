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
[jumlah] [deskripsi]

📖 *Contoh:*
• 50000 makan siang
• 25000 bensin motor
• 100000 belanja bulanan

🎯 *Setelah input, pilih kategori dengan mengetik nomor*

💡 Tips: Gunakan format yang benar untuk pencatatan otomatis!`
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