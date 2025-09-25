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
        setExpenses([])
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
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

          {/* Kategori Aktif */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm border">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Kategori Aktif</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-gray-900 mb-1">{activeCategories}</p>
                <p className="text-xs text-gray-500">Kategori digunakan</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                <PieChart className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-purple-600" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center bg-blue-600 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition font-medium text-xs sm:text-sm"
          >
            <Plus size={16} className="mr-1.5" />
            Tambah Pengeluaran
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