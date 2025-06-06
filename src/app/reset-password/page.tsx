'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Sparkles, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 RESET: Page loaded, current URL:', window.location.href)

        // Check if we're in a browser environment
        if (typeof window === 'undefined') return

        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        )

        const code = urlParams.get('code')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        console.log('🔑 RESET: URL contains:', {
          hasCode: !!code,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          codeValue: code,
        })

        // Wait a moment for Supabase to process any auth changes
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Check current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log('🔍 RESET: Current session:', {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          error: error?.message,
        })

        if (session && session.user) {
          console.log('✅ RESET: Valid session found, user can reset password')
          setIsReady(true)

          // Clean URL
          if (code) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            )
          }
        } else {
          console.log('❌ RESET: No valid session')
          setMessage(
            'Invalid or expired reset link. Please request a new password reset.'
          )
          setIsReady(false)
        }
      } catch (err) {
        console.error('💥 RESET: Error:', err)
        setMessage('Error loading reset page. Please try again.')
        setIsReady(false)
      }
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔄 RESET: Auth state changed:', event, !!session)

        if (
          event === 'PASSWORD_RECOVERY' ||
          (event === 'SIGNED_IN' && session)
        ) {
          console.log('✅ RESET: Password recovery session detected')
          setIsReady(true)
          setMessage('')
        } else if (event === 'SIGNED_OUT') {
          console.log('❌ RESET: User signed out')
          setIsReady(false)
          setMessage('Session expired. Please request a new password reset.')
        }
      }
    )

    handleAuthCallback()

    return () => subscription?.unsubscribe()
  }, [supabase.auth])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setMessage('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      console.log('🔄 RESET: Attempting to update password...')

      // Double-check session before updating
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        setMessage('Session expired. Please request a new password reset.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) {
        console.error('❌ RESET: Password update error:', error)
        setMessage(error.message)
      } else {
        console.log('✅ RESET: Password updated successfully')
        setSuccess(true)
        setMessage('Password updated successfully! Redirecting to login...')

        setTimeout(() => {
          window.location.href = '/login?message=Password updated successfully'
        }, 3000)
      }
    } catch (error) {
      console.error('💥 RESET: Unexpected error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth state
  if (!isReady && !message) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/" className="flex items-center justify-center mb-8">
            <Sparkles className="h-10 w-10 text-slate-600" />
            <span className="ml-3 text-3xl font-bold text-gray-900">
              Listora AI
            </span>
          </Link>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Validating Reset Link
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your session...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show error if session is invalid
  if (!isReady && message) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/" className="flex items-center justify-center mb-8">
            <Sparkles className="h-10 w-10 text-slate-600" />
            <span className="ml-3 text-3xl font-bold text-gray-900">
              Listora AI
            </span>
          </Link>
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer text-center"
              >
                Back to Login
              </Link>
              <Link
                href="/login"
                className="block w-full px-4 py-2 border border-slate-600 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Request New Reset
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show password reset form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center mb-8">
          <Sparkles className="h-10 w-10 text-slate-600" />
          <span className="ml-3 text-3xl font-bold text-gray-900">
            Listora AI
          </span>
        </Link>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {success ? 'Password Updated!' : 'Reset Your Password'}
          </h2>
          <p className="text-gray-600">
            {success
              ? 'Your password has been successfully updated.'
              : 'Enter your new password below.'}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow rounded-xl sm:px-10">
          {!success ? (
            <form onSubmit={handlePasswordReset} className="space-y-6">
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
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Password Requirements:
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li
                    className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}
                  >
                    <span className="mr-2">
                      {formData.password.length >= 8 ? '✓' : '•'}
                    </span>
                    At least 8 characters
                  </li>
                  <li
                    className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}
                  >
                    <span className="mr-2">
                      {/[A-Z]/.test(formData.password) ? '✓' : '•'}
                    </span>
                    One uppercase letter
                  </li>
                  <li
                    className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}
                  >
                    <span className="mr-2">
                      {/[a-z]/.test(formData.password) ? '✓' : '•'}
                    </span>
                    One lowercase letter
                  </li>
                  <li
                    className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : ''}`}
                  >
                    <span className="mr-2">
                      {/\d/.test(formData.password) ? '✓' : '•'}
                    </span>
                    One number
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Updating Password...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-gray-600">Redirecting to login page...</p>
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Go to Login
              </Link>
            </div>
          )}

          {message && (
            <div
              className={`mt-4 text-center text-sm p-3 rounded-lg ${
                success
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-slate-500 cursor-pointer"
            >
              ← Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
