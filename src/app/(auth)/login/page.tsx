'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  Home,
  ArrowRight,
  Star,
  Clock,
  Shield,
  CheckCircle,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'

export default function OptimizedLoginPage() {
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
    const supabaseClient = createClient()
    setSupabase(supabaseClient)

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

  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      }
    } catch (error) {
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

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
        setForgotPasswordMessage('✅ Reset email sent! Check your inbox.')
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

  return (
    <div className="min-h-screen">
      {/* Stripe-style dark gradient background - same as homepage */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(180deg, 
              #0a2540 0%, 
              #0a2540 20%, 
              #0e2a47 40%, 
              #1a3a5c 60%, 
              #ffffff 100%
            )
          `,
        }}
      >
        {/* Colored accent overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 40%, rgba(122, 90, 248, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 50% 60%, rgba(255, 94, 91, 0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Enhanced Header - matching homepage */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component */}
              <MobileNav currentPage="login" />

              {/* Logo */}
              <Link
                href="/"
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <ListoraAILogo size="header" showText={true} />
              </Link>
            </div>

            {/* Right Side: Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/#features-section"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#pricing-section"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Blog
              </Link>

              {/* Separator */}
              <div className="h-4 w-px bg-gray-300"></div>

              <Link
                href="/login"
                className="text-form-label text-indigo-600 border-b-2 border-indigo-600 px-1 pb-1"
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="text-form-label border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-sm"
              >
                Book Demo
              </Link>
              <Link
                href="/signup"
                className="text-form-label bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                Start Free Trial
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Trust Indicators - Updated for dark background */}
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
              {showForgotPassword ? 'Reset Your Password' : 'Welcome Back!'}
            </h2>
            <p className="text-xl text-white/90 mb-6">
              {showForgotPassword
                ? 'Enter your email to receive a secure reset link'
                : 'Continue creating amazing content'}
            </p>

            {!showForgotPassword && (
              <div className="flex items-center justify-center space-x-6 text-sm text-white/80 mb-4">
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span>Secure Login</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span>Quick Access</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span>Always Available</span>
                </div>
              </div>
            )}
          </div>

          {/* Streamlined Form - Better contrast and styling */}
          <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-form-label font-medium text-gray-700 mb-2"
                  >
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="w-full flex justify-center py-3 px-4 rounded-lg shadow-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:scale-105"
                >
                  {forgotPasswordLoading
                    ? 'Sending Reset Link...'
                    : 'Send Reset Link'}
                </button>

                {forgotPasswordMessage && (
                  <div
                    className={`text-body-sm p-3 rounded-lg ${
                      forgotPasswordMessage.includes('✅')
                        ? 'text-green-700 bg-green-50 border border-green-200'
                        : 'text-red-700 bg-red-50 border border-red-200'
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
                  className="w-full text-center text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleEmailSignIn} className="space-y-6">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-form-label font-medium text-gray-700 mb-2"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-form-label font-medium text-gray-700 mb-2"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10 transition-colors"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block text-body-sm text-gray-700"
                      >
                        Keep me signed in
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-body-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Google Option */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-body-sm">
                      <span className="px-2 bg-white text-gray-500">Or</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="mt-6 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                  >
                    {googleLoading ? (
                      'Signing in...'
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
                </div>
              </>
            )}

            {message && !showForgotPassword && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 py-3 px-4 rounded-lg border border-red-200">
                {message}
              </div>
            )}

            {/* New User Redirect */}
            {!showForgotPassword && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  New to Listora AI?{' '}
                  <Link
                    href="/signup"
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    Create your free account →
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Quick Links - Updated for dark background */}
          <div className="mt-8 text-center space-y-4">
            <Link
              href="/"
              className="inline-flex items-center text-white hover:text-white/90 text-sm bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 transition-all hover:bg-white/20"
            >
              <Home className="h-4 w-4 mr-1" />
              Back to homepage
            </Link>

            <div className="text-sm text-white/70">
              <Link href="/terms" className="text-white/90 hover:text-white">
                Terms
              </Link>
              {' • '}
              <Link href="/privacy" className="text-white/90 hover:text-white">
                Privacy
              </Link>
              {' • '}
              <Link href="/contact" className="text-white/90 hover:text-white">
                Support
              </Link>
            </div>
          </div>

          {/* Quick Status for Confidence */}
          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-white/70">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
