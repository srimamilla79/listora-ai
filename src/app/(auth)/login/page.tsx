// SIMPLE LOGIN - Uses only Supabase's built-in reset (no custom emails)
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle, Zap, Crown, Home } from 'lucide-react'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    setMounted(true)

    // Initialize Supabase client after component mounts
    const supabaseClient = createClient()
    setSupabase(supabaseClient)

    // Check if user is already logged in
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (session) {
        window.location.href = '/generate'
      }
    }
    checkUser()
  }, [])

  // Don't render until mounted and supabase is initialized
  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setMessage(
          error.message || 'Error signing in. Please check your credentials.'
        )
      } else {
        window.location.href = '/generate'
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.')
      console.error('Sign in error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
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
        setMessage('Error signing in with Google. Please try again.')
        console.error('Google auth error:', error)
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.')
      console.error('Google sign in error:', error)
    } finally {
      setGoogleLoading(false)
    }
  }

  // SIMPLE: Just use Supabase's built-in reset (no custom emails)
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setForgotPasswordMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (error) {
        setForgotPasswordMessage(error.message)
      } else {
        setForgotPasswordMessage(
          '✅ Reset email sent! Check your inbox for the password reset link.'
        )

        // Reset form after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false)
          setForgotPasswordEmail('')
          setForgotPasswordMessage('')
        }, 3000)
      }
    } catch (error) {
      setForgotPasswordMessage('Failed to send reset email. Please try again.')
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Content',
      description:
        'Generate compelling product descriptions and marketing copy in seconds',
    },
    {
      icon: CheckCircle,
      title: 'Multi-Platform Support',
      description: 'Optimized for Amazon, Shopify, Etsy, Instagram, and more',
    },
    {
      icon: Crown,
      title: 'Professional Results',
      description: 'High-converting content that drives sales and engagement',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo with Home Navigation - UPDATED */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <ListoraAILogo size="md" showText={true} />
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-slate-600 transition-colors font-medium px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {showForgotPassword ? 'Reset Password' : 'Welcome back'}
            </h2>
            <p className="text-gray-600">
              {showForgotPassword
                ? 'Enter your email to receive a password reset link'
                : 'Sign in to continue generating amazing content'}
            </p>
          </div>

          {/* Forgot Password Form */}
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email address
                </label>
                <input
                  id="forgot-email"
                  name="forgot-email"
                  type="email"
                  required
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                disabled={forgotPasswordLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {forgotPasswordLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Sending reset email...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </button>

              {forgotPasswordMessage && (
                <div
                  className={`text-center text-sm p-3 rounded-lg ${
                    forgotPasswordMessage.includes('✅') ||
                    forgotPasswordMessage.includes('sent')
                      ? 'text-green-600 bg-green-50'
                      : 'text-red-600 bg-red-50'
                  }`}
                >
                  {forgotPasswordMessage}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotPasswordEmail('')
                  setForgotPasswordMessage('')
                }}
                className="w-full text-slate-600 hover:text-slate-500 font-medium cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignIn} className="space-y-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    placeholder="Enter your email"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 pr-10"
                      placeholder="Enter your password"
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="remember-me"
                      className="ml-2 block text-sm text-gray-700 cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-slate-600 hover:text-slate-500 cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
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

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-6"
              >
                {googleLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-3"></div>
                    Signing in...
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
                    Continue with Google
                  </>
                )}
              </button>
            </>
          )}

          {message && !showForgotPassword && (
            <div className="mb-4 text-center text-sm text-red-600 bg-red-50 py-2 px-4 rounded-lg">
              {message}
            </div>
          )}

          {/* Sign Up Link */}
          {!showForgotPassword && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/signup"
                  className="text-slate-600 hover:text-slate-500 font-medium cursor-pointer"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <a
                href="#"
                className="text-slate-600 hover:text-slate-500 cursor-pointer"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="#"
                className="text-slate-600 hover:text-slate-500 cursor-pointer"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-12 lg:py-12 bg-gradient-to-br from-slate-600 via-slate-700 to-gray-800">
        <div className="max-w-md mx-auto text-white">
          <h3 className="text-3xl font-bold mb-6">
            Generate content that converts
          </h3>
          <p className="text-slate-300 mb-12 text-lg leading-relaxed">
            Join thousands of businesses using AI to create compelling
            e-commerce content that drives results.
          </p>

          <div className="space-y-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 backdrop-blur-sm">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full border-2 border-white"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white"></div>
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="text-sm font-medium">Join 10,000+ creators</div>
            </div>
            <p className="text-slate-300 text-sm">
              "Listora AI transformed our product listings. Sales increased by
              40% in the first month!"
            </p>
            <p className="text-slate-400 text-xs mt-2">
              - Sarah K., E-commerce Store Owner
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
