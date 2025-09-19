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
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-yellow-300 bg-opacity-20 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-blue-300 bg-opacity-20 rounded-full"></div>
      </div>
      
      <div className="max-w-md w-full bg-white bg-opacity-95 backdrop-blur-md rounded-3xl shadow-2xl p-8 relative z-10 border border-white border-opacity-20">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl blur-lg opacity-60"></div>
              <div className="relative bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-2xl">
                <Image
                  src="/cashgram-logo.svg"
                  alt="CashGram Logo"
                  width={48}
                  height={48}
                  className="w-12 h-12"
                />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            CashGram
          </h1>
          <p className="text-gray-600 mt-3 text-lg">Kelola keuangan dengan mudah</p>
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
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
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
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
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
                  className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-200 placeholder-gray-400"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 focus:ring-4 focus:ring-green-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Masuk...</span>
                </div>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </NoSSR>

        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500 bg-white">atau</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
          
          <p className="text-gray-600">
            Belum punya akun?{' '}
            <Link href="/register" className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200">
              Daftar sekarang
            </Link>
          </p>
          
          <div className="pt-4 border-t border-gray-100">
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