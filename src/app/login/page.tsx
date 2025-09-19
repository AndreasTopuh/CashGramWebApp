'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import NoSSR from '@/components/NoSSR'

export default function LoginPage() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token in localStorage
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 sm:w-80 sm:h-80 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute -bottom-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute top-16 left-16 w-24 h-24 sm:w-32 sm:h-32 bg-yellow-300 bg-opacity-20 rounded-full"></div>
        <div className="absolute bottom-16 right-16 w-20 h-20 sm:w-24 sm:h-24 bg-blue-300 bg-opacity-20 rounded-full"></div>
      </div>
      
      <div className="max-w-sm w-full bg-white bg-opacity-95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 border border-white border-opacity-20">
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl sm:rounded-2xl blur-lg opacity-60"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                <Image
                  src="/cashgram-logo.svg"
                  alt="CashGram Logo"
                  width={40}
                  height={40}
                  className="w-10 h-10 sm:w-12 sm:h-12"
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            CashGram
          </h1>
          <p className="text-gray-600 mt-2 sm:mt-3 text-base sm:text-lg">Kelola keuangan dengan mudah</p>
        </div>

        <NoSSR fallback={
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        }>
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-xl backdrop-blur-sm text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                Nomor Telepon
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-3 sm:px-4 sm:py-4 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-3 sm:px-4 sm:py-4 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 placeholder-gray-400 text-sm sm:text-base"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 sm:py-4 px-4 rounded-lg sm:rounded-xl hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Masuk...</span>
                </div>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </NoSSR>

        <div className="mt-6 sm:mt-8 text-center space-y-3 sm:space-y-4">
          <div className="flex items-center my-4 sm:my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 sm:px-4 text-xs sm:text-sm text-gray-500 bg-white">atau</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
          
          <p className="text-gray-600 text-sm sm:text-base">
            Belum punya akun?{' '}
            <Link href="/register" className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200">
              Daftar sekarang
            </Link>
          </p>
          
          <div className="pt-3 sm:pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Dengan masuk, Anda menyetujui{' '}
              <span className="text-green-600 hover:text-green-700 cursor-pointer">Syarat & Ketentuan</span>
              {' '}dan{' '}
              <span className="text-green-600 hover:text-green-700 cursor-pointer">Kebijakan Privasi</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}