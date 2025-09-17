'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">���</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">CashGram</h1>
        <p className="text-gray-600">Expense Tracker Dashboard</p>
        <div className="mt-8 text-sm text-gray-500">
          Loading...
        </div>
      </div>
    </div>
  )
}
