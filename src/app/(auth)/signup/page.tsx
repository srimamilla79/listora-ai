'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Eye,
  EyeOff,
  Check,
  Home,
  ArrowRight,
  Star,
  Rocket,
  Target,
  Zap,
  Shield,
  Clock,
  Users,
  TrendingUp,
  Mic,
  Camera,
  ShoppingCart,
  BarChart3,
  PlayCircle,
  CheckCircle,
  Award,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

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
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })

  const router = useRouter()

  // Testimonials with strong results
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'E-commerce Store Owner',
      company: 'TechGadgets Pro',
      content:
        'Listora AI increased my product listing speed by 500%. I went from 2 hours per product to 2 minutes. My conversion rate jumped 47% in the first month.',
      rating: 5,
      result: '+$15,000 monthly revenue',
      time: '2 months ago',
      avatar: 'SC',
      color: 'from-blue-500 to-cyan-500',
      verified: true,
    },
    {
      name: 'Mike Rodriguez',
      role: 'Amazon FBA Seller',
      company: '7-Figure Seller',
      content:
        'I process 200+ products monthly now. The voice feature lets me create descriptions while doing other tasks. ROI was 2,400% in first quarter.',
      rating: 5,
      result: '+240% sales increase',
      time: '1 month ago',
      avatar: 'MR',
      color: 'from-green-500 to-emerald-500',
      verified: true,
    },
    {
      name: 'Emma Thompson',
      role: 'Digital Marketing Agency',
      company: 'Growth Marketing Co',
      content:
        'We scaled from 10 clients to 45 clients using Listora AI. Client satisfaction up 89% because we deliver faster, better content. Game changer.',
      rating: 5,
      result: '+350% client capacity',
      time: '3 weeks ago',
      avatar: 'ET',
      color: 'from-purple-500 to-pink-500',
      verified: true,
    },
  ]

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)

    // Auto-rotate testimonials
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [testimonials.length])

  if (!mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/generate`,
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
        setUserEmail(formData.email)
        setShowSuccessScreen(true)
      }
    } catch (error: any) {
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
                className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
                className="text-blue-600 hover:text-blue-500 underline font-medium"
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Rich Content & Social Proof */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:py-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        <div className="max-w-lg mx-auto relative z-10">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-green-100 border border-green-200 rounded-full px-4 py-2 mb-6">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-sm font-bold text-green-800">
                #1 AI Content Tool for E-commerce
              </span>
            </div>

            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Join 10,000+ Entrepreneurs
              <span className="block text-blue-600">
                Making $1M+ More Revenue
              </span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Transform your voice into professional product content that
              converts. No writing skills needed. Average user sees 40% sales
              increase in 30 days.
            </p>
          </div>

          {/* Key Features with Icons */}
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-3">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">
                Voice to Content
              </h4>
              <p className="text-gray-600 text-xs">
                30 seconds → professional copy
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-3">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">
                AI Vision
              </h4>
              <p className="text-gray-600 text-xs">
                OpenAI analyzes your images
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-3">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">
                Direct Publishing
              </h4>
              <p className="text-gray-600 text-xs">
                Publish to Amazon instantly
              </p>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-sm">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-3">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm mb-1">
                Bulk Processing
              </h4>
              <p className="text-gray-600 text-xs">
                500+ products in background
              </p>
            </div>
          </div>

          {/* Results Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-lg mb-8">
            <h3 className="font-bold text-gray-900 mb-4 text-center">
              Average Results in 30 Days:
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600 mb-1">
                  +40%
                </div>
                <div className="text-xs text-gray-600">Sales Increase</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  500%
                </div>
                <div className="text-xs text-gray-600">Faster Content</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  +65%
                </div>
                <div className="text-xs text-gray-600">Conversion Rate</div>
              </div>
            </div>
          </div>

          {/* Dynamic Testimonial */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-lg">
            <div className="flex items-center space-x-3 mb-4">
              <div
                className={`w-12 h-12 bg-gradient-to-r ${testimonials[currentTestimonial].color} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
              >
                {testimonials[currentTestimonial].avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">
                    {testimonials[currentTestimonial].name}
                  </h4>
                  {testimonials[currentTestimonial].verified && (
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  {testimonials[currentTestimonial].role} •{' '}
                  {testimonials[currentTestimonial].company}
                </p>
                <p className="text-xs text-gray-500">
                  {testimonials[currentTestimonial].time}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-3 w-3 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
                <div className="text-xs font-bold text-green-600">
                  {testimonials[currentTestimonial].result}
                </div>
              </div>
            </div>
            <blockquote className="text-gray-700 text-sm leading-relaxed italic">
              "{testimonials[currentTestimonial].content}"
            </blockquote>

            {/* Testimonial Navigation */}
            <div className="flex justify-center space-x-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentTestimonial === index
                      ? 'bg-blue-600 w-6'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex justify-center space-x-4 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-green-500" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3 text-blue-500" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-1">
              <Award className="h-3 w-3 text-purple-500" />
              <span>SOC 2 Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <ListoraAILogo size="header" showText={true} />
            </Link>
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
          </div>

          {/* Value Proposition */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Start Your Free Trial Today
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              Join thousands of entrepreneurs scaling their content creation
              with AI
            </p>

            {/* Trust Badge */}
            <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                ✨ Free forever plan • No credit card required
              </span>
            </div>
          </div>

          {/* Free Plan Benefits */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Rocket className="h-5 w-5 text-blue-600 mr-2" />
              🎉 Your Free Plan Includes:
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  10 AI content generations
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  Voice-to-content conversion
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  All 5+ platforms supported
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  Professional templates
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm font-medium text-blue-800">
                💰 Worth $97/month • Yours free forever
              </span>
            </div>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
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
                  Work Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="your@business.com"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 transition-colors"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 transition-colors"
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      ⚠️ Passwords do not match
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform hover:scale-105"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creating your account...
                  </>
                ) : (
                  <>
                    🚀 Start Free Trial - No Credit Card
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
                disabled={googleLoading || loading}
                className="mt-4 w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all transform hover:scale-105"
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
            </div>

            {/* Already have account */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign in here →
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 mb-4">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-500"
              >
                Privacy Policy
              </Link>
            </p>

            <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Shield className="h-3 w-3 text-green-500" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-blue-500" />
                <span>30-second setup</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3 text-purple-500" />
                <span>10,000+ entrepreneurs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
