'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Lock, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function SimpleWorkingResetPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    setMounted(true)

    const checkSession = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      console.log('Session check:', session?.user?.id || 'No session')

      if (session?.user) {
        setHasValidSession(true)
        console.log('✅ Valid session found for password reset')
      } else {
        console.log('❌ No valid session found')
        setMessage(
          'Invalid reset link or session expired. Please request a new password reset.'
        )
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      console.log('Updating password...')
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error('Password update failed:', error)
        setMessage(`Failed to update password: ${error.message}`)
      } else {
        console.log('✅ Password updated successfully')
        setSuccess(true)
        setMessage('✅ Password updated successfully!')
        setTimeout(
          () =>
            (window.location.href =
              '/login?message=Password updated successfully'),
          2000
        )
      }
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setMessage('An unexpected error occurred. Please try again.')
    }

    setLoading(false)
  }

  if (!mounted) {
    return <div>Loading...</div>
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Reset Link
          </h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/login"
            className="w-full block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Password Updated!
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been successfully updated.
          </p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <ListoraAILogo size="lg" showText={true} />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Set Your New Password
          </h2>
          <p className="text-gray-600">
            Choose a secure password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password (min 8 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
            />
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg text-sm ${
                success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Update Password
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium flex items-center justify-center"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
