'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  Lock,
  ArrowLeft,
  Home,
  RefreshCw,
  Key,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function EnhancedResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [sessionValid, setSessionValid] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)

    const handleAuthCallback = async () => {
      try {
        // Wait for potential auth state changes
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Check current session
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession()

        if (session && session.user) {
          setSessionValid(true)
          setIsReady(true)
          setMessage('')

          // Clean URL
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('code')) {
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            )
          }
        } else {
          setSessionValid(false)
          setIsReady(false)
          setMessage(
            'Invalid or expired reset link. Please request a new password reset.'
          )
        }
      } catch (err) {
        console.error('Reset password error:', err)
        setMessage('Error loading reset page. Please try again.')
        setIsReady(false)
      }
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(
      async (event: string, session: any) => {
        if (
          event === 'PASSWORD_RECOVERY' ||
          (event === 'SIGNED_IN' && session)
        ) {
          setSessionValid(true)
          setIsReady(true)
          setMessage('')
        } else if (event === 'SIGNED_OUT') {
          setSessionValid(false)
          setIsReady(false)
          setMessage('Session expired. Please request a new password reset.')
        }
      }
    )

    handleAuthCallback()

    return () => subscription?.unsubscribe()
  }, [])

  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const validateForm = () => {
    if (!formData.password || !formData.confirmPassword) {
      setMessage('Please fill in all fields.')
      return false
    }
    if (formData.password.length < 8) {
      setMessage('Password must be at least 8 characters long.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.')
      return false
    }
    return true
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
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
        setMessage(error.message)
      } else {
        setSuccess(true)
        setMessage(
          'Password updated successfully! You can now sign in with your new password.'
        )

        // Redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/login?message=Password updated successfully'
        }, 3000)
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
    if (password.match(/\d/)) strength++
    if (password.match(/[^a-zA-Z\d]/)) strength++
    return strength
  }

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
        return 'Very Weak'
      case 1:
        return 'Weak'
      case 2:
        return 'Fair'
      case 3:
        return 'Good'
      case 4:
        return 'Strong'
      default:
        return 'Very Weak'
    }
  }

  const getPasswordStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
        return 'bg-red-500'
      case 1:
        return 'bg-orange-500'
      case 2:
        return 'bg-yellow-500'
      case 3:
        return 'bg-green-500'
      case 4:
        return 'bg-green-600'
      default:
        return 'bg-gray-300'
    }
  }

  const strength = passwordStrength(formData.password)

  // Loading state while checking auth
  if (!isReady && !message) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Link href="/" className="inline-block mb-8">
              <ListoraAILogo size="lg" showText={true} />
            </Link>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Validating Reset Link
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your session...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state for invalid session
  if (!sessionValid && message) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Link href="/" className="inline-block mb-8">
              <ListoraAILogo size="lg" showText={true} />
            </Link>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Invalid Reset Link
              </h2>
              <p className="text-gray-600 mb-8">{message}</p>

              <div className="space-y-4">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
                <button
                  onClick={() => (window.location.href = '/login')}
                  className="w-full flex items-center justify-center px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Request New Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <Link href="/" className="inline-block mb-8">
              <ListoraAILogo size="lg" showText={true} />
            </Link>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="relative mb-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border-4 border-green-200 rounded-full animate-ping opacity-30"></div>
                </div>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                🎉 Password Updated!
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Your password has been successfully updated. You can now sign in
                with your new password.
              </p>

              <div className="space-y-4">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Continue to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/"
                  className="w-full flex items-center justify-center px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Homepage
                </Link>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">
                <p>
                  Redirecting to login page in{' '}
                  <span className="font-medium">3 seconds</span>...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main reset password form
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block mb-8">
            <ListoraAILogo size="lg" showText={true} />
          </Link>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Key className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Reset Your Password
              </h2>
              <p className="text-gray-600">
                Choose a strong new password for your account
              </p>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Security Notice
                  </h3>
                  <p className="text-sm text-blue-800 mt-1">
                    After updating your password, you'll be signed out of all
                    devices for security.
                  </p>
                </div>
              </div>
            </div>

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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 transition-colors"
                    placeholder="Enter your new password"
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-3">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(strength)}`}
                          style={{ width: `${(strength / 4) * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          strength >= 3
                            ? 'text-green-600'
                            : strength >= 2
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {getPasswordStrengthText(strength)}
                      </span>
                    </div>
                  </div>
                )}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 transition-colors"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2">
                    {formData.password === formData.confirmPassword ? (
                      <p className="text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Passwords match
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Passwords do not match
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Password Requirements:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <span className="mr-2">
                      {formData.password.length >= 8 ? '✓' : '○'}
                    </span>
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <span className="mr-2">
                      {/[A-Z]/.test(formData.password) ? '✓' : '○'}
                    </span>
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <span className="mr-2">
                      {/[a-z]/.test(formData.password) ? '✓' : '○'}
                    </span>
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center ${/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}
                  >
                    <span className="mr-2">
                      {/\d/.test(formData.password) ? '✓' : '○'}
                    </span>
                    One number
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Update Password
                  </>
                )}
              </button>
            </form>

            {message && (
              <div
                className={`mt-6 text-center text-sm p-4 rounded-lg ${
                  success
                    ? 'text-green-700 bg-green-50 border border-green-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {message}
              </div>
            )}

            <div className="mt-8 text-center">
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
      </div>
    </div>
  )
}
