// Enhanced Telegram Bot with CLICKABLE INLINE BUTTONS

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

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
    const { message, callback_query } = body
    
    // Handle inline button clicks
    if (callback_query) {
      return await handleInlineButtonClick(prisma, callback_query)
    }
    
    // Handle regular messages
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

    // Parse expense format: amount description
    const expenseMatch = messageText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)
    if (expenseMatch) {
      return await handleExpenseInput(prisma, chatId, expenseMatch, telegramUser)
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

🎯 *Setelah input, pilih kategori dengan KLIK tombol*

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

  // Create inline keyboard buttons (maximum 2 per row for better UI)
  const inlineKeyboard = []
  const buttonsPerRow = 2

  for (let i = 0; i < categories.length; i += buttonsPerRow) {
    const row = []
    
    for (let j = i; j < Math.min(i + buttonsPerRow, categories.length); j++) {
      const category = categories[j]
      let status = '📂'
      let budgetText = ''
      
      if (activePeriod) {
        const allocation = activePeriod.budgetAllocations.find(a => a.categoryId === category.id)
        if (allocation) {
          const remaining = allocation.allocatedAmount - allocation.spentAmount
          if (remaining >= amount) {
            status = '✅'
            budgetText = ` (${remaining.toLocaleString('id-ID')})`
          } else if (remaining > 0) {
            status = '⚠️'
            budgetText = ` (${remaining.toLocaleString('id-ID')})`
          } else {
            status = '❌'
            budgetText = ` (Habis)`
          }
        }
      }
      
      // Create callback data with expense info
      const callbackData = `select_${category.id}_${amount}_${encodeURIComponent(description.substring(0, 30))}_${Date.now()}`
      
      row.push({
        text: `${status} ${category.icon} ${category.name}${budgetText}`,
        callback_data: callbackData
      })
    }
    
    inlineKeyboard.push(row)
  }

  // Add cancel button
  inlineKeyboard.push([{
    text: '❌ Batal',
    callback_data: 'cancel_expense'
  }])

  return NextResponse.json({
    method: 'sendMessage',
    chat_id: chatId,
    text: `💰 *Pengeluaran: Rp ${amount.toLocaleString('id-ID')}*
📝 *Deskripsi:* ${description}

🎯 *Pilih kategori dengan KLIK tombol di bawah:*

💡 *Keterangan:*
✅ Budget aman
⚠️ Akan over budget  
❌ Budget habis
📂 Belum ada budget

👆 *Tinggal KLIK langsung, tidak perlu ketik!*`,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  })
}

async function handleInlineButtonClick(prisma: PrismaClient, callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id
  const callbackData = callbackQuery.callback_data
  const queryId = callbackQuery.id

  // Handle cancel
  if (callbackData === 'cancel_expense') {
    return NextResponse.json({
      method: 'answerCallbackQuery',
      callback_query_id: queryId,
      text: 'Pencatatan pengeluaran dibatalkan',
      show_alert: false
    })
  }

  // Parse callback data: select_categoryId_amount_description_timestamp
  const match = callbackData.match(/^select_(.+)_(\d+(?:\.\d+)?)_(.+)_(\d+)$/)
  if (!match) {
    return NextResponse.json({
      method: 'answerCallbackQuery',
      callback_query_id: queryId,
      text: 'Data tidak valid',
      show_alert: true
    })
  }

  const [, categoryId, amount, encodedDescription] = match
  const description = decodeURIComponent(encodedDescription)
  const expenseAmount = parseFloat(amount)

  // Get telegram user
  const telegramUser = await prisma.telegramUser.findUnique({
    where: { telegramId: chatId.toString() },
    include: { user: true }
  })

  if (!telegramUser) {
    return NextResponse.json({
      method: 'answerCallbackQuery',
      callback_query_id: queryId,
      text: 'User tidak ditemukan',
      show_alert: true
    })
  }

  // Get selected category
  const category = await prisma.category.findFirst({
    where: { 
      id: categoryId,
      userId: telegramUser.userId 
    }
  })

  if (!category) {
    return NextResponse.json({
      method: 'answerCallbackQuery',
      callback_query_id: queryId,
      text: 'Kategori tidak ditemukan',
      show_alert: true
    })
  }

  // Check budget
  const activePeriod = await prisma.budgetPeriod.findFirst({
    where: { userId: telegramUser.userId, isActive: true },
    include: {
      budgetAllocations: {
        where: { categoryId: categoryId },
        include: { category: true }
      }
    }
  })

  let willOverBudget = false
  let budgetWarning = null

  if (activePeriod && activePeriod.budgetAllocations.length > 0) {
    const allocation = activePeriod.budgetAllocations[0]
    const remaining = allocation.allocatedAmount - allocation.spentAmount
    
    if (expenseAmount > remaining) {
      willOverBudget = true
      budgetWarning = {
        category: category.name,
        amount: expenseAmount,
        remaining: remaining,
        overrun: expenseAmount - remaining
      }
      
      // Create confirmation inline keyboard for budget overrun
      const confirmKeyboard = [
        [
          {
            text: '✅ Lanjutkan (OVERLOAD)',
            callback_data: `confirm_${categoryId}_${amount}_${encodedDescription}_${Date.now()}`
          },
          {
            text: '❌ Batal',
            callback_data: 'cancel_expense'
          }
        ]
      ]

      return NextResponse.json({
        method: 'editMessageText',
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        text: `⚠️ *PERINGATAN OVERRUN BUDGET*

💰 *Kategori:* ${category.icon} ${category.name}
💳 *Pengeluaran:* Rp ${expenseAmount.toLocaleString('id-ID')}
📊 *Sisa Budget:* Rp ${remaining.toLocaleString('id-ID')}
🔴 *Kelebihan:* Rp ${(expenseAmount - remaining).toLocaleString('id-ID')}

❓ *Tetap lanjutkan?*
Pengeluaran akan ditandai sebagai "OVERLOAD BUDGET"`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: confirmKeyboard
        }
      })
    }
  }

  // Create expense
  return await createExpenseFromCallback(prisma, telegramUser.userId, category, expenseAmount, description, willOverBudget, queryId, callbackQuery.message, chatId)
}

async function createExpenseFromCallback(prisma: PrismaClient, userId: string, category: any, amount: number, description: string, willOverBudget: boolean, queryId: string, originalMessage: any, chatId: number) {
  
  const expenseDescription = willOverBudget ? `[OVERLOAD BUDGET] ${description}` : description

  const expense = await prisma.expense.create({
    data: {
      amount: amount,
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
          increment: amount
        }
      }
    })
  }

  // Send success message and edit original message
  await NextResponse.json({
    method: 'editMessageText',
    chat_id: chatId,
    message_id: originalMessage.message_id,
    text: `✅ *Pengeluaran berhasil dicatat!*

💰 *Jumlah:* Rp ${amount.toLocaleString('id-ID')}
📝 *Deskripsi:* ${description}
🏷️ *Kategori:* ${category.icon} ${category.name}
📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}

${willOverBudget ? '⚠️ *Status:* OVERLOAD BUDGET' : '✅ *Status:* Budget aman'}`,
    parse_mode: 'Markdown'
  })

  return NextResponse.json({
    method: 'answerCallbackQuery',
    callback_query_id: queryId,
    text: `✅ Pengeluaran Rp ${amount.toLocaleString('id-ID')} berhasil dicatat!`,
    show_alert: false
  })
}