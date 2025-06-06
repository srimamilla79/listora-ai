'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  Star,
  Rocket,
  Target,
  BarChart3,
  Check,
  Home,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)

    // Clear any existing session data first
    const clearSession = async () => {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.log('No existing session to clear')
      }
    }

    clearSession()

    // Check if user is already logged in after clearing
    const checkUser = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (session && !error) {
          router.push('/generate')
        }
      } catch (error) {
        console.log('Session check error:', error)
      }
    }

    checkUser()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/generate')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setMessage('Please fill in all fields.')
      return false
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.')
      return false
    }
    return true
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!validateForm()) return

    setLoading(true)

    try {
      // Sign up with minimal user data to avoid trigger issues
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/generate`,
          data: {
            email: formData.email, // Only include essential data
          },
        },
      })

      if (error) {
        console.error('Signup error:', error)

        // Handle specific error types
        if (error.message.includes('Database error saving new user')) {
          setMessage(
            'Account creation temporarily unavailable. Please try again in a few minutes or contact support.'
          )
        } else if (error.message.includes('User already registered')) {
          setMessage(
            'An account with this email already exists. Please sign in instead.'
          )
        } else {
          setMessage(
            error.message || 'Error creating account. Please try again.'
          )
        }
      } else {
        setUserEmail(formData.email)
        setShowSuccessScreen(true)
      }
    } catch (error: any) {
      console.error('Unexpected signup error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/generate`,
        },
      })

      if (error) {
        console.error('Google auth error:', error)
        setMessage('Error signing up with Google. Please try again.')
      }
    } catch (error: any) {
      console.error('Google signup error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const benefits = [
    {
      icon: Rocket,
      title: 'Get Started in Seconds',
      description:
        'No credit card required. Start generating content immediately with our free plan.',
    },
    {
      icon: Target,
      title: 'Platform-Specific Content',
      description:
        "Content optimized for each platform's unique requirements and best practices.",
    },
    {
      icon: BarChart3,
      title: 'Boost Your Sales',
      description:
        'Join businesses seeing significant increases in conversion rates with our AI content.',
    },
  ]

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
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

  // Success Screen Component
  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo with Home Navigation */}
          <div className="flex items-center justify-center mb-8">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Sparkles className="h-12 w-12 text-gray-600" />
              <span className="ml-3 text-3xl font-bold text-gray-900">
                Listora AI
              </span>
            </Link>
          </div>

          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>

          {/* Success Message */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">
              Account Created Successfully!
            </h2>
            <p className="text-lg text-gray-600">
              We've sent a verification email to:
            </p>
            <p className="text-xl font-semibold text-gray-900 bg-gray-100 py-2 px-4 rounded-lg">
              {userEmail}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-blue-900">Next Steps:</h3>
            <ol className="text-left text-blue-800 space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  1
                </span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  2
                </span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  3
                </span>
                <span>Start generating amazing content with AI!</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => window.open('mailto:', '_blank')}
              className="w-full flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium cursor-pointer"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Open Email App
            </button>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowSuccessScreen(false)
                  setFormData({ email: '', password: '', confirmPassword: '' })
                  setMessage('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium cursor-pointer"
              >
                Create Another Account
              </button>
              <Link
                href="/login"
                className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium text-center cursor-pointer"
              >
                Sign In Instead
              </Link>
            </div>

            <Link
              href="/"
              className="w-full flex items-center justify-center px-4 py-2 text-gray-600 hover:text-gray-700 font-medium cursor-pointer"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-sm text-gray-500">
            <p>Didn't receive the email? Check your spam folder or</p>
            <button
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.resend({
                    type: 'signup',
                    email: userEmail,
                  })
                  if (error) {
                    alert('Error resending email. Please try again.')
                  } else {
                    alert('Verification email sent! Check your inbox.')
                  }
                } catch (error) {
                  alert('Error resending email. Please try again.')
                }
              }}
              className="text-gray-600 hover:text-gray-500 font-medium underline cursor-pointer"
            >
              click here to resend
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact our{' '}
              <a
                href="#"
                className="text-gray-600 hover:text-gray-500 cursor-pointer"
              >
                support team
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 lg:py-12 bg-gradient-to-br from-gray-700 via-gray-800 to-slate-800">
        <div className="max-w-md mx-auto text-white">
          <div className="mb-8">
            <div className="flex items-center space-x-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 text-yellow-400 fill-current"
                />
              ))}
              <span className="ml-2 text-sm font-medium">
                4.9/5 from 2,500+ reviews
              </span>
            </div>
          </div>

          <h3 className="text-3xl font-bold mb-6">
            Start creating amazing content today
          </h3>
          <p className="text-gray-300 mb-12 text-lg leading-relaxed">
            Join the growing community of successful e-commerce businesses using
            AI to scale their content creation.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-6 mb-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">10,000+</div>
              <div className="text-gray-400 text-sm">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">500K+</div>
              <div className="text-gray-400 text-sm">Content Generated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">40%</div>
              <div className="text-gray-400 text-sm">Avg. Sales Increase</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-gray-400 text-sm">Uptime</div>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">
                      {benefit.title}
                    </h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Testimonial */}
          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-white font-bold text-sm">MK</span>
              </div>
              <div>
                <div className="text-sm font-medium">Mike Chen</div>
                <div className="text-gray-400 text-xs">Shopify Store Owner</div>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              "Listora AI cut my content creation time from hours to minutes.
              The quality is incredible!"
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo with Home Navigation */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Sparkles className="h-10 w-10 text-gray-600" />
              <span className="ml-3 text-3xl font-bold text-gray-900">
                Listora AI
              </span>
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h2>
            <p className="text-gray-600">
              Start generating professional content with AI
            </p>
          </div>

          {/* Free Plan Highlight */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-semibold text-sm">
                Free Plan Includes:
              </span>
            </div>
            <ul className="text-green-700 text-sm space-y-1 ml-7">
              <li>• 10 AI content generations per month</li>
              <li>• All platforms (Amazon, Shopify, Etsy, ebay)</li>
              <li>• Professional templates</li>
              <li>• No credit card required</li>
            </ul>
          </div>

          {/* Error Message */}
          {message && (
            <div
              className={`mb-4 text-center text-sm py-3 px-4 rounded-lg ${
                message.includes('Successfully') || message.includes('created')
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 pr-10"
                  placeholder="Create a password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${getPasswordStrengthColor(
                          strength
                        )}`}
                        style={{ width: `${(strength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
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
                Confirm password
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 pr-10"
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {formData.confirmPassword &&
                formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">
                    Passwords do not match
                  </p>
                )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          {/* Google Sign Up */}
          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-6"
          >
            {googleLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
                Signing up...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign up with Google
              </>
            )}
          </button>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-500 font-medium cursor-pointer"
              >
                Sign in here
              </Link>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By creating an account, you agree to our{' '}
              <a
                href="#"
                className="text-gray-600 hover:text-gray-500 cursor-pointer"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="text-gray-600 hover:text-gray-500 cursor-pointer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
