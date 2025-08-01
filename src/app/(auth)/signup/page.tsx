'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  Check,
  Home,
  ArrowRight,
  Rocket,
  Award,
  CheckCircle,
  Mic,
  Camera,
  ShoppingCart,
  BarChart3,
  Languages,
  Upload,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'

export default function OptimizedSignupPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [message, setMessage] = useState('')
  const [mounted, setMounted] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  })

  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
    if (!formData.agreeToTerms) {
      setMessage('Please agree to the Terms of Service and Privacy Policy.')
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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: null, // Disable Supabase's default confirmation email
          data: {
            email: formData.email,
          },
        },
      })

      if (error) {
        if (error.message.includes('User already registered')) {
          setMessage(
            'An account with this email already exists. Please sign in instead.'
          )
        } else {
          setMessage(
            error.message || 'Error creating account. Please try again.'
          )
        }
      } else {
        // ✅ Send your custom confirmation email (LOCAL or PROD)
        const confirmationUrl = `${window.location.origin}/confirm?email=${encodeURIComponent(formData.email)}`

        await fetch('/api/auth/send-confirmation-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            name: formData.email.split('@')[0], // use actual name if available
            confirmationUrl,
          }),
        })

        setUserEmail(formData.email)
        setShowSuccessScreen(true)
      }
    } catch (error: any) {
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  } // This closing brace was missing!

  const handleGoogleSignUp = async () => {
    if (!formData.agreeToTerms) {
      setMessage(
        'Please agree to the Terms of Service and Privacy Policy before signing up.'
      )
      return
    }

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
        setMessage('Error signing up with Google. Please try again.')
      }
    } catch (error: any) {
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const passwordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength++
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
    if (password.match(/\d/)) strength++
    if (password.match(/[^a-zA-Z\d]/)) strength++
    return strength
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

  // Enhanced Success Screen
  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              🎉 Welcome to Listora AI!
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Your account has been created successfully!
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-bold text-blue-900 mb-3">
                📧 Check Your Email
              </h3>
              <p className="text-blue-800 mb-4">
                We've sent a verification link to:
              </p>
              <div className="bg-white rounded-lg p-3 mb-4">
                <p className="font-semibold text-gray-900">{userEmail}</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                    1
                  </div>
                  <p className="text-blue-800">Check inbox & spam</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                    2
                  </div>
                  <p className="text-blue-800">Click verification link</p>
                </div>
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
                    3
                  </div>
                  <p className="text-blue-800">Start creating content!</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => window.open('mailto:', '_blank')}
                className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-colors font-semibold"
              >
                📬 Open Email App
              </button>
              <Link
                href="/login"
                className="flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Sign In Instead
              </Link>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2">Didn't receive the email?</p>
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.resend({
                      type: 'signup',
                      email: userEmail,
                    })
                    if (!error) {
                      alert('✅ Verification email sent! Check your inbox.')
                    }
                  } catch (error) {
                    alert('Error resending email. Please contact support.')
                  }
                }}
                className="text-indigo-600 hover:text-indigo-500 underline font-medium"
              >
                Click here to resend verification email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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

      {/* Header - matching homepage */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component */}
              <MobileNav currentPage="signup" />

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
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
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
                className="text-form-label bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg transition-all shadow-md"
              >
                Start Free Trial
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Left Side - Rich Content & Social Proof */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:px-8 lg:py-12">
          <div className="max-w-lg relative z-10">
            {/* Hero Content */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
                <Award className="h-4 w-4 text-green-400" />
                <span className="text-sm font-bold text-white">
                  #1 AI Content Platform for E-commerce
                </span>
              </div>

              <h2 className="text-4xl font-bold text-white mb-4">
                Transform Your Voice into Global Sales
              </h2>
              <p className="text-white/90 text-lg leading-relaxed">
                Join thousands of entrepreneurs who create professional content
                in 99+ languages. From voice to Amazon optimization, Shopify
                publishing, and eBay listings—all in under 2 minutes.
              </p>
            </div>

            {/* Key Features with Icons */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-3">
                  <Languages className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">
                  99+ Languages
                </h4>
                <p className="text-white/70 text-xs">
                  Speak any language, sell anywhere
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">
                  AI Vision Analysis
                </h4>
                <p className="text-white/70 text-xs">
                  OpenAI analyzes product images
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-3">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">
                  Multi-Platform Ready
                </h4>
                <p className="text-white/70 text-xs">
                  Amazon optimization, Shopify & eBay
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">
                  Bulk Processing
                </h4>
                <p className="text-white/70 text-xs">
                  500+ products in background
                </p>
              </div>
            </div>

            {/* Why Choose Listora */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="font-bold text-white mb-4 text-center">
                Why Entrepreneurs Choose Listora AI
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">
                      Voice-First Design
                    </p>
                    <p className="text-white/70 text-xs">
                      Speak naturally in any language, get professional content
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">
                      AI-Powered Intelligence
                    </p>
                    <p className="text-white/70 text-xs">
                      OpenAI Vision + advanced language models
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5"></div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">
                      Built for Growth
                    </p>
                    <p className="text-white/70 text-xs">
                      From single products to bulk catalog processing
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-8">
          <div className="w-full max-w-lg">
            {/* Value Proposition */}
            <div className="text-center mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Start Your Free Trial
              </h1>
              <p className="text-white/90 text-lg mb-4">
                Join the AI content revolution—no credit card required
              </p>

              {/* Trust Badge */}
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-4">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-white">
                  10 free AI generations every month • Forever
                </span>
              </div>
            </div>

            {/* Free Plan Benefits */}
            <div className="mb-4 p-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
              <h3 className="font-bold text-white mb-4 flex items-center">
                <Zap className="h-5 w-5 text-yellow-400 mr-2" />
                Your Free Forever Plan Includes:
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/90 text-sm">
                    10 AI generations/month
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/90 text-sm">
                    99+ language support
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/90 text-sm">
                    Voice-to-content AI
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/90 text-sm">
                    Platform optimization
                  </span>
                </div>
              </div>
            </div>

            {/* Signup Form */}
            <div className="bg-white rounded-xl shadow-2xl p-6">
              {message && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 py-3 px-4 rounded-lg border border-red-200">
                  {message}
                </div>
              )}

              <form onSubmit={handleEmailSignUp} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
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
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Create Password
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
                      placeholder="Choose a strong password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${getPasswordStrengthColor(strength)}`}
                            style={{ width: `${(strength / 4) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {strength < 2
                            ? 'Weak'
                            : strength < 4
                              ? 'Good'
                              : 'Strong'}
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
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10 transition-colors"
                      placeholder="Confirm your password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600">
                        Passwords do not match
                      </p>
                    )}
                  {formData.confirmPassword &&
                    formData.password === formData.confirmPassword &&
                    formData.password.length > 0 && (
                      <p className="mt-1 text-xs text-green-600 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Passwords match
                      </p>
                    )}
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    id="agreeToTerms"
                    type="checkbox"
                    required
                    checked={formData.agreeToTerms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        agreeToTerms: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="text-sm text-gray-700 leading-relaxed"
                  >
                    I agree to the{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="text-indigo-600 hover:text-indigo-500 underline font-medium"
                    >
                      Privacy Policy
                    </Link>
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.agreeToTerms}
                  className={`w-full flex justify-center items-center py-4 px-6 rounded-lg shadow-sm text-lg font-bold text-white transition-all transform ${
                    loading || !formData.agreeToTerms
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Creating your account...
                    </>
                  ) : (
                    <>
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Google Signup */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      Or continue with
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading || loading || !formData.agreeToTerms}
                  className={`mt-4 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 transition-all transform ${
                    googleLoading || loading || !formData.agreeToTerms
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50 hover:scale-105'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {googleLoading ? (
                    'Setting up your account...'
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

                {!formData.agreeToTerms && (
                  <p className="mt-2 text-xs text-red-600 text-center">
                    Please agree to the Terms and Privacy Policy above
                  </p>
                )}
              </div>

              {/* Already have account */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-indigo-600 hover:text-indigo-500 font-medium"
                  >
                    Sign in here →
                  </Link>
                </p>
              </div>
            </div>

            {/* Quick Links - for dark background */}
            <div className="mt-8 text-center">
              <div className="text-sm text-white/70">
                <Link href="/terms" className="text-white/90 hover:text-white">
                  Terms
                </Link>
                {' • '}
                <Link
                  href="/privacy"
                  className="text-white/90 hover:text-white"
                >
                  Privacy
                </Link>
                {' • '}
                <Link
                  href="/contact"
                  className="text-white/90 hover:text-white"
                >
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
