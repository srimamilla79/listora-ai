// src/app/(dashboard)/pricing/page.tsx - ENHANCED MODERN DESIGN
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Rocket,
  TrendingUp,
  AlertCircle,
  Star,
  ArrowRight,
  Shield,
  Clock,
  Users,
  BarChart3,
  Mic,
  Upload,
  Camera,
  ShoppingCart,
  Award,
  CheckCircle,
} from 'lucide-react'

interface UserPlan {
  plan_type: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export default function EnhancedPricingPage() {
  const [loading, setLoading] = useState(false)
  const [processingPlan, setProcessingPlan] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('starter')
  const [currentUsage, setCurrentUsage] = useState(0)
  const [currentLimit, setCurrentLimit] = useState(10)
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const PLAN_LIMITS = {
    starter: { generations: 10, bulkProducts: 0 },
    business: { generations: 250, bulkProducts: 50 },
    premium: { generations: 1000, bulkProducts: 200 },
    enterprise: { generations: 999999, bulkProducts: 1000 },
  }

  const getPlanLimit = (planName: string) => {
    return (
      PLAN_LIMITS[planName as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter
    )
  }

  const getDisplayPlanName = (planName: string): string => {
    const displayNames = {
      starter: 'Starter',
      business: 'Business',
      premium: 'Premium',
      enterprise: 'Enterprise',
    }
    return displayNames[planName as keyof typeof displayNames] || 'Starter'
  }

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let mounted = true

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            await fetchUserPlanAndUsage(session.user.id)
          } else {
            setUser(null)
          }
          setAuthChecked(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (mounted) setAuthChecked(true)
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (mounted) {
        setUser(session?.user || null)
        setAuthChecked(true)
        if (session?.user) {
          fetchUserPlanAndUsage(session.user.id)
        } else {
          setUserPlan(null)
          setCurrentPlan('starter')
          setCurrentUsage(0)
          setCurrentLimit(PLAN_LIMITS.starter.generations)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  const fetchUserPlanAndUsage = async (userId: string) => {
    if (!supabase) return

    try {
      // Get current plan
      const { data: planData, error: planError } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let planName = 'starter'
      let planLimits = PLAN_LIMITS.starter

      if (planData && !planError) {
        planName = planData.plan_type || 'starter'
        planLimits = getPlanLimit(planName)
        setUserPlan(planData)
      } else {
        setUserPlan(null)
      }

      setCurrentPlan(planName)
      setCurrentLimit(planLimits.generations)

      // Get usage from usage_tracking table first
      const currentMonth = new Date().toISOString().slice(0, 7)

      const { data: usageData, error: usageError } = await supabase
        .from('user_usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

      if (usageData && !usageError) {
        setCurrentUsage(usageData.usage_count || 0)
      } else {
        // Fallback to counting records
        const { count: contentCount } = await supabase
          .from('product_contents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', `${currentMonth}-01`)

        setCurrentUsage(contentCount || 0)
      }
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setCurrentPlan('starter')
      setUserPlan(null)
      setCurrentUsage(0)
      setCurrentLimit(PLAN_LIMITS.starter.generations)
    }
  }

  const handleLogin = () => {
    window.location.href = '/login'
  }

  const handleUpgrade = async (planType: string) => {
    if (!user) {
      alert('Please log in first')
      return
    }

    setLoading(true)
    setProcessingPlan(planType)

    try {
      console.log('🚀 Starting upgrade to:', planType)

      // Map your planType to the correct plan names that your API expects
      const planMapping = {
        business: 'pro', // Your API expects 'pro' for business plan
        premium: 'premium', // This should match
        enterprise: 'enterprise', // This should match
      }

      const apiPlanName =
        planMapping[planType as keyof typeof planMapping] || planType

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: apiPlanName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        console.log('✅ Redirecting to Stripe checkout:', data.url)
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('❌ Upgrade error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
      setProcessingPlan(null)
    }
  }

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'from-red-500 to-red-600'
    if (percentage >= 70) return 'from-yellow-500 to-orange-500'
    return 'from-green-500 to-emerald-500'
  }

  if (!authChecked || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 mt-4">Loading pricing...</p>
        </div>
      </div>
    )
  }

  const plans = [
    {
      name: 'Starter',
      price: 0,
      period: 'forever',
      description: 'Perfect for testing our platform',
      badge: 'Free Forever',
      features: [
        '10 content generations per month',
        'AI content generation from text',
        'Single image upload and processing',
        'Platform-specific content formats',
        'Email support',
        'Access to all content templates',
      ],
      highlights: [
        'Voice to content',
        'OpenAI Vision',
        'Platform optimization',
      ],
      icon: Sparkles,
      planType: 'starter',
      popular: false,
      color: 'from-gray-50 to-slate-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-600',
    },
    {
      name: 'Business',
      price: 29,
      period: 'month',
      description: 'For growing entrepreneurs',
      badge: 'Most Popular',
      features: [
        '250 content generations per month',
        'Everything in Starter',
        'Voice-to-content generation',
        'Bulk CSV upload (up to 50 products)',
        'Advanced image optimization',
        'Multiple platform formats',
        'Priority email support',
      ],
      highlights: ['Background processing', 'Bulk uploads', 'Priority support'],
      icon: Zap,
      planType: 'business',
      popular: true,
      color: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-600',
    },
    {
      name: 'Premium',
      price: 79,
      period: 'month',
      description: 'For scaling businesses',
      badge: 'Best Value',
      features: [
        '1,000 content generations per month',
        'Everything in Business',
        'Bulk CSV upload (up to 200 products)',
        'Bulk content generation',
        'Advanced content customization',
        'Enhanced voice processing',
        'Batch export capabilities',
      ],
      highlights: ['Advanced AI', 'Mass processing', 'Custom templates'],
      icon: Crown,
      planType: 'premium',
      popular: false,
      color: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-600',
    },
    {
      name: 'Enterprise',
      price: 199,
      period: 'month',
      description: 'For large organizations',
      badge: 'Enterprise',
      features: [
        'Unlimited content generations',
        'Everything in Premium',
        'Bulk CSV upload (up to 1,000 products)',
        'Mass content generation',
        'Priority phone support',
        'Custom content templates',
        'Advanced batch processing',
      ],
      highlights: ['Unlimited usage', 'Phone support', 'Custom solutions'],
      icon: Rocket,
      planType: 'enterprise',
      popular: false,
      color: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-600',
    },
  ]

  const remainingGenerations = currentLimit - currentUsage
  const usagePercentage =
    currentLimit > 0 ? (currentUsage / currentLimit) * 100 : 0

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-16">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-6 py-3 mb-8">
            <Star className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">
              Transparent pricing • No hidden fees • Cancel anytime
            </span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>

          {user ? (
            <>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Manage Your
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Subscription
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                Upgrade or downgrade your plan anytime. Changes take effect
                immediately with pro-rated billing.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Simple, Transparent
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Pricing
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                Start with 10 free generations forever. Scale as you grow with
                powerful AI content creation tools.
              </p>
            </>
          )}
        </div>

        {/* Enhanced Current Usage Card */}
        {user && (
          <div className="max-w-2xl mx-auto mb-16">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/50 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-20 transform translate-x-16 -translate-y-16" />

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                        remainingGenerations > 50
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : remainingGenerations > 10
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                            : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                    >
                      {remainingGenerations > 50 ? (
                        <TrendingUp className="h-8 w-8 text-white" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {getDisplayPlanName(currentPlan)} Plan
                      </h3>
                      <p className="text-gray-600">
                        {currentUsage}/
                        {currentLimit === 999999 ? '∞' : currentLimit}{' '}
                        generations this month
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                        remainingGenerations > 50
                          ? 'bg-green-100 text-green-800'
                          : remainingGenerations > 10
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {remainingGenerations > 0
                        ? `${remainingGenerations} left`
                        : 'Limit reached'}
                    </div>
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                {currentLimit !== 999999 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Usage Progress</span>
                      <span>{Math.min(usagePercentage, 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${getUsageColor(currentUsage, currentLimit)}`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Plan Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        Monthly Reset
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Resets{' '}
                      {new Date(
                        new Date().getFullYear(),
                        new Date().getMonth() + 1,
                        1
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Upload className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">
                        Bulk Upload
                      </span>
                    </div>
                    <p className="text-sm text-green-700">
                      {getPlanLimit(currentPlan).bulkProducts === 0
                        ? 'Not Available'
                        : `Up to ${getPlanLimit(currentPlan).bulkProducts} products`}
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-semibold text-purple-900">
                        AI Features
                      </span>
                    </div>
                    <p className="text-sm text-purple-700">
                      All platforms supported
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Everything you need to scale content creation
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Mic,
                label: 'Voice to Content',
                desc: '30 seconds to professional copy',
              },
              {
                icon: Camera,
                label: 'AI Vision Analysis',
                desc: 'OpenAI sees your products',
              },
              {
                icon: ShoppingCart,
                label: 'Direct Publishing',
                desc: 'One-click to Amazon',
              },
              {
                icon: Upload,
                label: 'Bulk Processing',
                desc: 'Background job handling',
              },
            ].map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/50 hover:shadow-xl transition-all"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {feature.label}
                  </h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Enhanced Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = user && currentPlan === plan.planType

            return (
              <div
                key={plan.name}
                className={`relative bg-white/80 backdrop-blur-xl rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl border-2 ${
                  plan.popular
                    ? plan.borderColor + ' shadow-xl scale-105'
                    : isCurrentPlan
                      ? 'border-green-500 shadow-xl'
                      : 'border-white/50 hover:border-gray-300'
                } ${isCurrentPlan ? 'bg-gradient-to-br from-green-50 to-emerald-50' : ''}`}
              >
                {/* Badge */}
                {(plan.popular || isCurrentPlan) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                        isCurrentPlan
                          ? 'bg-green-600 text-white'
                          : plan.popular
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-gray-600 text-white'
                      }`}
                    >
                      {isCurrentPlan ? 'Current Plan' : plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
                      isCurrentPlan
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                        : plan.popular
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600'
                    }`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="mb-4">
                    <span className="text-5xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  {/* Plan Highlights */}
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {plan.highlights.map((highlight, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => {
                    if (!user && plan.planType !== 'starter') {
                      handleLogin()
                    } else if (plan.planType && !isCurrentPlan) {
                      handleUpgrade(plan.planType)
                    }
                  }}
                  disabled={isCurrentPlan || loading}
                  className={`group w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    isCurrentPlan
                      ? 'bg-green-100 text-green-800 cursor-default'
                      : plan.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-900 hover:bg-gray-800 text-white shadow-lg hover:shadow-xl'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {loading && processingPlan === plan.planType ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : !user && plan.planType !== 'starter' ? (
                    <>
                      Sign In to Upgrade
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Award className="mr-2 h-4 w-4" />
                      Current Plan
                    </>
                  ) : user ? (
                    <>
                      {currentPlan === 'enterprise'
                        ? 'Downgrade'
                        : getPlanLimit(plan.planType).generations >
                            getPlanLimit(currentPlan).generations
                          ? 'Upgrade'
                          : 'Switch'}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      Get {plan.name}
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Value indicator for free plan */}
                {plan.planType === 'starter' && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-green-600 font-medium flex items-center justify-center">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Worth $97/month • Yours free forever
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Enhanced Bottom CTA */}
        {!user && (
          <div className="text-center">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 max-w-4xl mx-auto border border-white/50 shadow-xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-20 transform translate-x-32 -translate-y-32" />

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Ready to Transform Your Content Creation?
                </h3>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Join thousands of entrepreneurs who've discovered the power of
                  voice-driven AI content creation. Start with 10 free
                  generations - no credit card required.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
                  <button
                    onClick={handleLogin}
                    className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center cursor-pointer"
                  >
                    <Sparkles className="mr-2 h-5 w-5 group-hover:animate-spin" />
                    Start Creating Content
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>10 free generations monthly</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No credit card required</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Setup in 60 seconds</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Footer */}
        <div className="text-center mt-16">
          <div className="bg-white/60 backdrop-blur-lg rounded-xl p-6 max-w-2xl mx-auto border border-white/50">
            <p className="text-gray-600 mb-4">
              All plans include AI content generation, platform optimization,
              and enterprise-grade security.
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              {[
                { label: 'Terms', icon: Shield },
                { label: 'Privacy', icon: Shield },
                { label: 'Support', icon: Users },
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={index}
                    className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
