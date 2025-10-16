'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, LogOut, Trash2, TrendingUp, Calendar, BarChart3, PieChart, Brain, MessageCircle, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import ReactMarkdown from 'react-markdown'

interface User {
  id: string
  phone: string
  name: string | null
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
}

interface Expense {
  id: string
  amount: number
  description: string | null
  date: string
  category: Category
}

interface BudgetPeriod {
  id: string
  name: string
  totalBudget: number
  startDate: string
  endDate: string
  isActive: boolean
  budgetAllocations: BudgetAllocation[]
}

interface BudgetAllocation {
  id: string
  categoryId: string
  allocatedAmount: number
  spentAmount: number
  category: Category
}

interface BudgetStatus {
  period: {
    id: string
    name: string
    startDate: string
    endDate: string
    totalBudget: number
  }
  summary: {
    totalBudget: number
    totalAllocated: number
    totalSpent: number
    totalRemaining: number
    unallocatedBudget: number
    percentageUsed: number
  }
  categories: Array<{
    id: string
    category: Category
    allocatedAmount: number
    spentAmount: number
    remainingAmount: number
    percentageUsed: number
    isOverBudget: boolean
  }>
}

interface Savings {
  savings: Array<{
    id: string
    amount: number
    description: string
    createdAt: string
  }>
  totalAmount: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const router = useRouter()

  // Form states
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  
  // AI Analysis states
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  
  // Budget states
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [showEditBudgetForm, setShowEditBudgetForm] = useState(false)
  const [budgetName, setBudgetName] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [budgetStartDate, setBudgetStartDate] = useState('')
  const [budgetEndDate, setBudgetEndDate] = useState('')
  const [budgetAllocations, setBudgetAllocations] = useState<{[categoryId: string]: string}>({})
  const [savingsBudget, setSavingsBudget] = useState(false)
  const [savings, setSavings] = useState<Savings | null>(null)
  const [showBudgetTab, setShowBudgetTab] = useState(false)
  const [editingBudgetId, setEditingBudgetId] = useState<string>('')

  // Category management states
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('')
  const [categoryColor, setCategoryColor] = useState('#3B82F6')
  const [savingCategory, setSavingCategory] = useState(false)

  const loadData = useCallback(async (token: string) => {
    try {
      // Load categories
      const categoriesRes = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      }

      // Load expenses
      const expensesRes = await fetch(`/api/expenses${filterCategory ? `?categoryId=${filterCategory}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (expensesRes.ok) {
        const expensesData = await expensesRes.json()
        setExpenses(Array.isArray(expensesData) ? expensesData : [])
      } else {
        console.error('Failed to load expenses:', expensesRes.status)
        const errorText = await expensesRes.text().catch(() => 'Unknown error')
        console.error('Error details:', errorText)
        setExpenses([])
      }

      // Load budget status
      try {
        const budgetRes = await fetch('/api/budget/status', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (budgetRes.ok) {
          const budgetData = await budgetRes.json()
          setBudgetStatus(budgetData)
        } else if (budgetRes.status !== 404) {
          console.error('Failed to load budget status:', budgetRes.status)
          const errorText = await budgetRes.text().catch(() => 'Unknown error')
          console.error('Budget error details:', errorText)
        }
      } catch (budgetError) {
        console.error('Budget status fetch error:', budgetError)
      }

      // Load savings
      try {
        const savingsRes = await fetch('/api/budget/savings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (savingsRes.ok) {
          const savingsData = await savingsRes.json()
          setSavings(savingsData)
        } else {
          console.error('Failed to load savings:', savingsRes.status)
        }
      } catch (savingsError) {
        console.error('Savings fetch error:', savingsError)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setExpenses([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [filterCategory])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    loadData(token)
  }, [router, loadData])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Format number with commas
  const formatNumber = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '')
    // Add commas
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // Parse formatted number back to float
  const parseFormattedNumber = (value: string) => {
    return parseFloat(value.replace(/,/g, ''))
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumber(e.target.value)
    setAmount(formatted)
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    
    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFormattedNumber(amount),
          description,
          categoryId
        })
      })

      if (response.ok) {
        setAmount('')
        setDescription('')
        setCategoryId('')
        setShowAddForm(false)
        loadData(token!)
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        loadData(token!)
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Yakin ingin menghapus kategori "${categoryName}"?\n\nKategori yang memiliki pengeluaran atau alokasi budget tidak dapat dihapus.`)) return

    const token = localStorage.getItem('token')

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('Kategori berhasil dihapus!')
        // Refresh data to update categories list
        loadData(token!)
      } else {
        // Show specific error message in Indonesian
        alert(`Gagal menghapus kategori: ${result.error}`)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Terjadi kesalahan saat menghapus kategori')
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return

    const token = localStorage.getItem('token')

    try {
      setSaving(true)
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: categoryName,
          icon: categoryIcon,
          color: categoryColor
        })
      })

      if (response.ok) {
        setCategoryName('')
        setCategoryIcon('📊')
        setCategoryColor('#3B82F6')
        setSavingCategory(false)
        setShowCategoryForm(false)
        loadData(token!)
      } else {
        const error = await response.json()
        alert(error.error || 'Gagal membuat kategori')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Gagal membuat kategori')
    } finally {
      setSaving(false)
    }
  }

  const handleAIAnalysis = async () => {
    setLoadingAnalysis(true)
    setShowAIAnalysis(true)
    
    const token = localStorage.getItem('token')
    
    try {
      const response = await fetch('/api/ai/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAiAnalysis(data.analysis)
      } else {
        setAiAnalysis('❌ Gagal menganalisis data. Coba lagi nanti.')
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error)
      setAiAnalysis('❌ Terjadi kesalahan saat menganalisis data.')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const handleExportToExcel = async () => {
    const token = localStorage.getItem('token')
    
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Get filename from response headers
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `CashGram-Export-${new Date().toISOString().split('T')[0]}.xlsx`
        
        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        // Show success message
        alert('✅ Data berhasil diekspor ke Excel!')
      } else {
        const error = await response.json()
        alert(`❌ ${error.error || 'Gagal mengekspor data'}`)
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('❌ Terjadi kesalahan saat mengekspor data')
    }
  }

  const resetBudgetForm = () => {
    setBudgetName('')
    setTotalBudget('')
    setBudgetStartDate('')
    setBudgetEndDate('')
    setBudgetAllocations({})
    setSavingsBudget(false)
    setShowBudgetForm(false)
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetName || !totalBudget || !budgetStartDate || !budgetEndDate) {
      alert('Mohon lengkapi semua field yang wajib')
      return
    }
    
    setSavingsBudget(true)
    const token = localStorage.getItem('token')

    try {
      const allocations = Object.entries(budgetAllocations)
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([categoryId, amount]) => ({
          categoryId,
          amount: parseFormattedNumber(amount)
        }))

      const response = await fetch('/api/budget/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: budgetName,
          totalBudget: parseFormattedNumber(totalBudget),
          startDate: budgetStartDate,
          endDate: budgetEndDate,
          allocations
        })
      })

      if (response.ok) {
        resetBudgetForm()
        loadData(token!)
        alert('✅ Budget periode berhasil dibuat!')
      } else {
        const error = await response.json()
        alert(`❌ ${error.error || 'Gagal membuat budget'}`)
      }
    } catch (error) {
      console.error('Error creating budget:', error)
      alert('❌ Terjadi kesalahan saat membuat budget')
    } finally {
      setSavingsBudget(false)
    }
  }

  const handleEditBudget = () => {
    if (!budgetStatus?.period) return
    
    // Populate form with current budget data
    setBudgetName(budgetStatus.period.name)
    setTotalBudget(formatNumber(budgetStatus.period.totalBudget.toString()))
    setBudgetStartDate(new Date(budgetStatus.period.startDate).toISOString().split('T')[0])
    setBudgetEndDate(new Date(budgetStatus.period.endDate).toISOString().split('T')[0])
    setEditingBudgetId(budgetStatus.period.id)
    
    // Populate current allocations
    const currentAllocations: {[categoryId: string]: string} = {}
    budgetStatus.categories.forEach(cat => {
      if (cat.allocatedAmount > 0) {
        currentAllocations[cat.category.id] = formatNumber(cat.allocatedAmount.toString())
      }
    })
    setBudgetAllocations(currentAllocations)
    
    setShowEditBudgetForm(true)
  }

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetName || !totalBudget || !budgetStartDate || !budgetEndDate) {
      alert('Mohon lengkapi semua field yang wajib')
      return
    }
    
    setSavingsBudget(true)
    const token = localStorage.getItem('token')

    try {
      const allocations = Object.entries(budgetAllocations)
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([categoryId, amount]) => ({
          categoryId,
          amount: parseFormattedNumber(amount)
        }))

      const response = await fetch(`/api/budget/periods/${editingBudgetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: budgetName,
          totalBudget: parseFormattedNumber(totalBudget),
          startDate: budgetStartDate,
          endDate: budgetEndDate,
          allocations
        })
      })

      if (response.ok) {
        setBudgetName('')
        setTotalBudget('')
        setBudgetStartDate('')
        setBudgetEndDate('')
        setBudgetAllocations({})
        setShowEditBudgetForm(false)
        setEditingBudgetId('')
        loadData(token!)
        alert('✅ Budget periode berhasil diperbarui!')
      } else {
        const error = await response.json()
        alert(`❌ ${error.error || 'Gagal memperbarui budget'}`)
      }
    } catch (error) {
      console.error('Error updating budget:', error)
      alert('❌ Terjadi kesalahan saat memperbarui budget')
    } finally {
      setSavingsBudget(false)
    }
  }

  const handleBudgetAllocationChange = (categoryId: string, value: string) => {
    const formatted = formatNumber(value)
    setBudgetAllocations(prev => ({
      ...prev,
      [categoryId]: formatted
    }))
  }

  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0
  const totalTransactions = Array.isArray(expenses) ? expenses.length : 0
  const dailyAverage = totalTransactions > 0 ? totalExpenses / 30 : 0 // Assuming 30 days
  const activeCategories = Array.isArray(expenses) ? new Set(expenses.map(e => e.category.id)).size : 0

  // Prepare chart data
  const prepareTrendData = () => {
    if (!Array.isArray(expenses)) return []
    
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      // Convert to Asia/Makassar timezone for proper date comparison
      const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' }) // en-CA gives YYYY-MM-DD format
      
      const dayExpenses = expenses.filter(expense => 
        expense.date.split('T')[0] === dateStr
      )
      
      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      
      last7Days.push({
        date: date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
        amount: totalAmount
      })
    }
    return last7Days
  }

  const prepareCategoryData = () => {
    if (!Array.isArray(expenses)) return []
    
    const categoryTotals = expenses.reduce((acc, expense) => {
      const categoryName = expense.category.name
      const categoryColor = expense.category.color
      const categoryIcon = expense.category.icon
      
      if (!acc[categoryName]) {
        acc[categoryName] = { 
          name: categoryName, 
          value: 0, 
          color: categoryColor,
          icon: categoryIcon 
        }
      }
      acc[categoryName].value += expense.amount
      return acc
    }, {} as Record<string, { name: string; value: number; color: string; icon: string }>)
    
    return Object.values(categoryTotals).sort((a, b) => b.value - a.value)
  }

  const trendData = prepareTrendData()
  const categoryData = prepareCategoryData()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalBudgetValue = totalBudget ? parseFormattedNumber(totalBudget) || 0 : 0
  const allocatedBudgetTotal = Object.values(budgetAllocations).reduce((sum, value) => {
    if (!value) return sum
    const parsed = parseFormattedNumber(value)
    if (Number.isNaN(parsed)) {
      return sum
    }
    return sum + parsed
  }, 0)
  const remainingBudgetValue = totalBudgetValue - allocatedBudgetTotal
  const allocationProgress = totalBudgetValue > 0
    ? Math.min((allocatedBudgetTotal / totalBudgetValue) * 100, 999)
    : 0
  const isOverAllocated = remainingBudgetValue < 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/cashgram-logo.svg"
              alt="CashGram Logo"
              width={48}
              height={48}
              className="w-12 h-12"
            />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="mr-3">
                <Image
                  src="/cashgram-logo.svg"
                  alt="CashGram Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CashGram</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500">{user?.phone}</p>
              </div>
              
              <a
                href="https://t.me/cuentabot_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition p-2 rounded-lg hover:bg-blue-50"
                title="Chat dengan CashGram Bot"
              >
                <MessageCircle size={20} />
                <span className="hidden md:inline text-sm font-medium">Bot Telegram</span>
              </a>
              
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-red-600 transition p-2 rounded-lg hover:bg-red-50"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {/* Total Pengeluaran */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Pengeluaran</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1 truncate">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-green-600">Total pengeluaran</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Transaksi */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Transaksi</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">{totalTransactions}</p>
                <p className="text-xs text-green-600">Transaksi tercatat</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Rata-rata Harian */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Rata-rata Harian</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1 truncate">{formatCurrency(dailyAverage)}</p>
                <p className="text-xs text-gray-500">Per hari (30 hari)</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Budget Status */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Budget Bulan Ini</p>
                {budgetStatus ? (
                  <>
                    <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1 truncate">
                      {formatCurrency(budgetStatus.summary.totalRemaining)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {budgetStatus.summary.percentageUsed.toFixed(0)}% terpakai
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-500 mb-1">-</p>
                    <p className="text-xs text-gray-500">Belum ada budget</p>
                  </>
                )}
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <PieChart className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Tabungan */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Tabungan</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1 truncate">
                  {formatCurrency(savings?.totalAmount || 0)}
                </p>
                <p className="text-xs text-green-600">Dari sisa budget</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Trend Pengeluaran */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">📈 Tren Pengeluaran Harian</h3>
            </div>
            <div className="h-40 sm:h-48 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Pengeluaran']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#gradient)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pengeluaran per Kategori */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">🍪 Pengeluaran per Kategori</h3>
            </div>
            <div className="h-40 sm:h-48 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius="25%"
                    outerRadius="65%"
                    dataKey="value"
                    label={({ name, percent }) => 
                      categoryData.length <= 5 ? 
                      `${name} ${((percent as number) * 100).toFixed(0)}%` : 
                      `${((percent as number) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={9}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend for mobile when many categories */}
            {categoryData.length > 5 && (
              <div className="mt-3 grid grid-cols-2 gap-1 text-xs">
                {categoryData.slice(0, 6).map((entry, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-2 h-2 rounded-full mr-1 flex-shrink-0" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate text-xs">{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Comparison Bar Chart */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">📊 Perbandingan Kategori</h3>
          </div>
          <div className="h-40 sm:h-48 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#6b7280' }}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center bg-blue-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition font-medium text-xs sm:text-sm"
          >
            <Plus size={16} className="mr-1.5" />
            Tambah Pengeluaran
          </button>
          
          <button
            onClick={() => setShowBudgetTab(!showBudgetTab)}
            className={`flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition font-medium text-xs sm:text-sm ${
              budgetStatus ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            <PieChart size={16} className="mr-1.5" />
            {budgetStatus ? 'Budget' : 'Setup Budget'}
          </button>

          <button
            onClick={() => setShowBudgetForm(true)}
            className="flex items-center justify-center bg-orange-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-orange-700 transition font-medium text-xs sm:text-sm"
          >
            <Plus size={16} className="mr-1.5" />
            Periode Baru
          </button>
          
          <button
            onClick={handleAIAnalysis}
            className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium text-xs sm:text-sm"
          >
            <Brain size={16} className="mr-1.5" />
            Analysis with AI
          </button>
          
          <button
            onClick={handleExportToExcel}
            className="flex items-center justify-center bg-green-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-green-700 transition font-medium text-xs sm:text-sm"
          >
            <Download size={16} className="mr-1.5" />
            Export Excel
          </button>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm bg-white"
          >
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Budget Management Section */}
        {showBudgetTab && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">💳 Budget Management</h3>
              {budgetStatus && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-600">
                    {budgetStatus.period.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(budgetStatus.period.startDate).toLocaleDateString('id-ID')} - {new Date(budgetStatus.period.endDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
              )}
            </div>

            {budgetStatus ? (
              <div className="space-y-6">
                {/* Budget Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">Total Budget</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {formatCurrency(budgetStatus.summary.totalBudget)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-orange-600">Terpakai</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency(budgetStatus.summary.totalSpent)}
                    </p>
                    <p className="text-sm text-orange-600">
                      {budgetStatus.summary.percentageUsed.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Sisa</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(budgetStatus.summary.totalRemaining)}
                    </p>
                  </div>
                </div>

                {/* Budget Categories */}
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-900">Alokasi per Kategori</h4>
                  {budgetStatus.categories.map((categoryBudget) => {
                    const percentage = categoryBudget.allocatedAmount > 0 ? 
                      (categoryBudget.spentAmount / categoryBudget.allocatedAmount) * 100 : 0
                    const isNearLimit = percentage >= 80
                    const isOverBudget = categoryBudget.isOverBudget

                    return (
                      <div key={categoryBudget.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{categoryBudget.category.icon}</span>
                            <span className="font-medium text-gray-900">
                              {categoryBudget.category.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(categoryBudget.spentAmount)} / {formatCurrency(categoryBudget.allocatedAmount)}
                            </p>
                            <p className={`text-xs ${
                              isOverBudget ? 'text-red-600' : 
                              isNearLimit ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              Sisa: {formatCurrency(categoryBudget.remainingAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isOverBudget ? 'bg-red-500' :
                              isNearLimit ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {percentage.toFixed(1)}% digunakan
                          {isOverBudget && ' - OVER BUDGET!'}
                          {isNearLimit && !isOverBudget && ' - Hampir habis'}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowBudgetForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Periode Budget Baru
                  </button>
                  <button
                    onClick={handleEditBudget}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                  >
                    Edit Budget
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Belum ada budget periode aktif. Buat budget bulanan Anda untuk tracking pengeluaran yang lebih baik!
                </p>
                <button
                  onClick={() => setShowBudgetForm(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Buat Budget Periode Pertama
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Expense Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full mx-3">
              <h3 className="text-lg sm:text-xl font-bold mb-4">Tambah Pengeluaran</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jumlah
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
                    required
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Catatan pengeluaran"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading Modal */}
        {saving && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-xs sm:max-w-sm mx-4 text-center">
              <div className="mb-4">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Menyimpan Data</h3>
              <p className="text-sm text-gray-600">Sedang menyimpan pengeluaran ke database...</p>
            </div>
          </div>
        )}

        {/* AI Analysis Modal */}
        {showAIAnalysis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div className="flex items-center">
                  <Brain className="text-purple-600 mr-2 sm:mr-3" size={20} />
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">AI Analysis Report</h3>
                </div>
                <button
                  onClick={() => setShowAIAnalysis(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl sm:text-2xl font-bold p-1"
                >
                  ×
                </button>
              </div>
              
              {loadingAnalysis ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-sm sm:text-base text-gray-600">AI sedang menganalisis data pengeluaran Anda...</p>
                </div>
              ) : (
                <div className="prose prose-sm sm:prose-lg max-w-none">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 sm:p-6 text-gray-800">
                    <ReactMarkdown 
                      components={{
                        h2: ({children}) => <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 mt-3 sm:mt-4 first:mt-0">{children}</h2>,
                        h3: ({children}) => <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 mt-2 sm:mt-3">{children}</h3>,
                        p: ({children}) => <p className="text-sm sm:text-base text-gray-700 mb-2 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700 text-sm sm:text-base">{children}</ul>,
                        li: ({children}) => <li className="ml-2">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        code: ({children}) => <code className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded text-xs sm:text-sm">{children}</code>
                      }}
                    >
                      {aiAnalysis}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Budget Form Modal */}
        {showBudgetForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-auto max-h-[92vh] overflow-hidden flex flex-col">
              <div className="flex items-start justify-between gap-4 px-5 sm:px-8 pt-6 pb-4 border-b border-gray-100">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-500 mb-1">Budget Planner</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Buat Periode Budget Baru</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Isi detail periode di sebelah kiri dan atur alokasi setiap kategori di panel kanan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetBudgetForm}
                  className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none"
                  aria-label="Tutup form budget"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateBudget} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <section className="space-y-6">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-gray-700 tracking-wide uppercase mb-3">Detail Periode</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nama Periode <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={budgetName}
                              onChange={(e) => setBudgetName(e.target.value)}
                              placeholder="contoh: November 2024"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Total Budget <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={totalBudget}
                              onChange={(e) => setTotalBudget(formatNumber(e.target.value))}
                              placeholder="5,600,000"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right font-medium text-black text-sm"
                              required
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Total dana untuk periode ini. Kamu bisa membaginya ke kategori atau membiarkannya fleksibel.
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rentang Tanggal <span className="text-red-500">*</span>
                            </label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                type="date"
                                value={budgetStartDate}
                                onChange={(e) => setBudgetStartDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                                required
                              />
                              <input
                                type="date"
                                value={budgetEndDate}
                                onChange={(e) => setBudgetEndDate(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                                required
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Pastikan periode tidak saling bertumpuk dengan budget yang sudah ada.</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-transparent to-white p-4 sm:p-5">
                        <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3">Ringkasan Alokasi</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Budget</p>
                              <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalBudgetValue || 0)}</p>
                            </div>
                            <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Dialokasikan</p>
                              <p className="text-lg font-semibold text-gray-900">{formatCurrency(allocatedBudgetTotal)}</p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide mb-2">
                              <span className={isOverAllocated ? 'text-red-500' : 'text-green-600'}>
                                {isOverAllocated ? 'Kelebihan Alokasi' : 'Sisa Budget'}
                              </span>
                              <span className={`text-sm font-semibold ${isOverAllocated ? 'text-red-500' : 'text-gray-900'}`}>
                                {formatCurrency(Math.abs(remainingBudgetValue))}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-purple-100 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${isOverAllocated ? 'bg-red-400' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(Math.max(allocationProgress, 0), 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <p className="text-xs text-gray-500 leading-relaxed">
                            Tips: Tidak harus mengalokasikan semua kategori. Kategori kosong otomatis menggunakan budget fleksibel.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4 lg:space-y-5 rounded-2xl border border-gray-200 bg-white/90 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Alokasi per Kategori</h4>
                          <p className="text-xs text-gray-500 mt-1">Atur nominal untuk kategori yang ingin kamu kontrol lebih ketat.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCategoryForm(true)}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700"
                        >
                          + Kategori Baru
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[40vh] lg:max-h-[46vh] overflow-y-auto pr-1">
                        {categories.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
                            Belum ada kategori. Tambahkan kategori baru terlebih dahulu.
                          </div>
                        ) : (
                          categories.map((category) => {
                            const allocationValue = budgetAllocations[category.id]
                            const parsedAllocation = allocationValue ? parseFormattedNumber(allocationValue) : 0
                            const percentOfTotal = totalBudgetValue > 0 && parsedAllocation > 0
                              ? Math.min((parsedAllocation / totalBudgetValue) * 100, 999)
                              : 0

                            return (
                              <div
                                key={category.id}
                                className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xl">{category.icon}</span>
                                  <div className="min-w-[160px] flex-1">
                                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                      {category.name}
                                      {percentOfTotal > 0 && (
                                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                          {percentOfTotal.toFixed(0)}%
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-400">Opsional • isi jika ingin dibatasi</p>
                                    {percentOfTotal > 0 && (
                                      <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div
                                          className="h-1.5 rounded-full bg-purple-500 transition-all"
                                          style={{ width: `${Math.min(percentOfTotal, 100)}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={allocationValue || ''}
                                      onChange={(e) => handleBudgetAllocationChange(category.id, e.target.value)}
                                      placeholder="0"
                                      className="w-28 sm:w-32 lg:w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right font-medium text-sm text-black"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(category.id, category.name)}
                                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                      title="Hapus kategori"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      <p className="text-xs text-gray-500">
                        Kategori yang tidak diisi akan otomatis menggunakan alokasi fleksibel dari total budget.
                      </p>
                    </section>
                  </div>
                </div>

                <div className="px-5 sm:px-8 pb-6 border-t border-gray-100 pt-5 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={resetBudgetForm}
                    className="sm:flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingsBudget}
                    className="sm:flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                  >
                    {savingsBudget ? 'Membuat...' : 'Buat Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Budget Form Modal */}
        {showEditBudgetForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-lg w-full mx-3 my-4">
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-black">Edit Budget Periode</h3>
              <form onSubmit={handleUpdateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Budget <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                    placeholder="Budget Bulanan Januari 2025"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Budget <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(formatNumber(e.target.value))}
                    placeholder="5,600,000"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total uang bulanan yang diberikan orang tua
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={budgetStartDate}
                      onChange={(e) => setBudgetStartDate(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Berakhir <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={budgetEndDate}
                      onChange={(e) => setBudgetEndDate(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Alokasi Budget per Kategori
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Atur berapa budget untuk setiap kategori pengeluaran (opsional)
                  </p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-lg">{category.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{category.name}</p>
                        </div>
                        <input
                          type="text"
                          value={budgetAllocations[category.id] || ''}
                          onChange={(e) => handleBudgetAllocationChange(category.id, e.target.value)}
                          placeholder="0"
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Hapus kategori"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-xs text-gray-500">
                      Kategori yang tidak diisi akan menggunakan alokasi fleksibel
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(true)}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      + Buat Kategori Baru
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditBudgetForm(false)
                      setBudgetName('')
                      setTotalBudget('')
                      setBudgetStartDate('')
                      setBudgetEndDate('')
                      setBudgetAllocations({})
                      setEditingBudgetId('')
                    }}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingsBudget}
                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {savingsBudget ? 'Memperbarui...' : 'Perbarui Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Creation Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buat Kategori Baru</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Kategori <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Masukkan nama kategori"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['📊', '🍽️', '🚗', '🏠', '🛍️', '💊', '📚', '🎮', '✈️', '💰', '⚡', '📱'].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setCategoryIcon(icon)}
                        className={`p-2 text-lg rounded-lg border-2 transition ${
                          categoryIcon === icon 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warna
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280', '#F97316', '#06B6D4', '#84CC16', '#F43F5E', '#8B5A2B'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition ${
                          categoryColor === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false)
                      setCategoryName('')
                      setCategoryIcon('📊')
                      setCategoryColor('#3B82F6')
                      setSavingCategory(false)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={saving || !categoryName.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Membuat...' : 'Buat Kategori'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border">
          <div className="p-3 sm:p-4 lg:p-6 border-b">
            <h3 className="text-sm sm:text-base lg:text-lg text-black font-semibold">Pengeluaran Terbaru</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Riwayat transaksi pengeluaran Anda</p>
          </div>

          
          {!Array.isArray(expenses) || expenses.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📝</div>
              <p className="text-base sm:text-lg font-medium">Belum ada pengeluaran</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Mulai catat pengeluaran Anda dengan klik tombol &quot;Tambah Pengeluaran&quot;</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage
                  const endIndex = startIndex + itemsPerPage
                  const paginatedExpenses = expenses.slice(startIndex, endIndex)
                  
                  return paginatedExpenses.map((expense) => (
                    <div key={expense.id} className="p-3 sm:p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        {/* Icon */}
                        <div 
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-base font-medium shadow-sm flex-shrink-0 mt-1"
                          style={{ backgroundColor: expense.category.color + '20', color: expense.category.color }}
                        >
                          <span className="text-xs sm:text-sm">{expense.category.icon}</span>
                        </div>
                        
                        {/* Content - takes remaining space */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            {/* Left content */}
                            <div className="flex-1 min-w-0 pr-2 sm:pr-4">
                              <h4 className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight mb-1 truncate">
                                {expense.description || expense.category.name}
                              </h4>
                              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
                                <span 
                                  className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full text-white w-fit"
                                  style={{ backgroundColor: expense.category.color }}
                                >
                                  <span className="truncate max-w-[80px] sm:max-w-none">{expense.category.name}</span>
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {new Date(expense.date).toLocaleDateString('id-ID', {
                                    timeZone: 'Asia/Makassar',
                                    day: '2-digit',
                                    month: 'short',
                                    year: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            
                            {/* Right content - always stays on the right */}
                            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-xs sm:text-sm font-bold text-red-600">
                                  -Rp {expense.amount.toLocaleString('id-ID')}
                                </div>
                                <div className="text-xs text-gray-500 hidden sm:block">
                                  Pengeluaran
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="text-gray-400 hover:text-red-600 transition p-1 sm:p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
                                title="Hapus pengeluaran"
                              >
                                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              
              {/* Pagination */}
              {expenses.length > itemsPerPage && (
                <div className="p-3 sm:p-4 lg:p-6 border-t bg-gray-50">
                  <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                    <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                      Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, expenses.length)} - {Math.min(currentPage * itemsPerPage, expenses.length)} dari {expenses.length} transaksi
                    </p>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition"
                      >
                        <ChevronLeft size={12} className="sm:w-4 sm:h-4 mr-1" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                        <span className="sm:hidden">Prev</span>
                      </button>
                      
                      <div className="flex items-center space-x-0.5 sm:space-x-1">
                        {(() => {
                          const totalPages = Math.ceil(expenses.length / itemsPerPage)
                          const pages = []
                          
                          // Show first page
                          if (currentPage > 2) {
                            pages.push(1)
                            if (currentPage > 3) pages.push('...')
                          }
                          
                          // Show current page and adjacent pages
                          for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                            pages.push(i)
                          }
                          
                          // Show last page
                          if (currentPage < totalPages - 1) {
                            if (currentPage < totalPages - 2) pages.push('...')
                            pages.push(totalPages)
                          }
                          
                          return pages.map((page, index) => (
                            page === '...' ? (
                              <span key={`ellipsis-${index}`} className="px-1 py-1 text-xs text-gray-500">...</span>
                            ) : (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page as number)}
                                className={`px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          ))
                        })()}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(expenses.length / itemsPerPage)))}
                        disabled={currentPage >= Math.ceil(expenses.length / itemsPerPage)}
                        className="flex items-center px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition"
                      >
                        <span className="hidden sm:inline">Selanjutnya</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight size={12} className="sm:w-4 sm:h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t mt-8 sm:mt-12 rounded-xl sm:rounded-2xl">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
            <div className="text-center text-xs sm:text-sm text-gray-500">
              <p>© 2025 CashGram. Powered by Next.js & Vercel</p>
              <p className="mt-1">Track your expenses with Telegram Bot</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}