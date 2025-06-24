// src/app/(dashboard)/pricing/page.tsx - UPDATED WITH PROPER BILLING CYCLE LOGIC
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
  Eye,
  Cloud,
  FileText,
  Volume2,
  Timer,
  Building2,
  Store,
  Calendar,
} from 'lucide-react'

interface UserPlan {
  plan_type: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

// Helper function for billing cycle calculation
const getBillingCycleInfo = (subscriptionStartDate: string | Date) => {
  const startDate = new Date(subscriptionStartDate)
  const today = new Date()
  const nextCycle = new Date(startDate)

  // Start with same day next month
  nextCycle.setMonth(nextCycle.getMonth() + 1)

  // If we're already past this month's billing date, move to next month
  while (nextCycle <= today) {
    nextCycle.setMonth(nextCycle.getMonth() + 1)
  }

  const diffTime = nextCycle.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return {
    nextResetDate: nextCycle,
    daysUntilReset: Math.max(0, diffDays),
    formattedDate: nextCycle.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    isNearReset: diffDays <= 3,
  }
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
      starter: 'Starter (Free)',
      business: 'Business',
      premium: 'Premium',
      enterprise: 'Enterprise',
    }
    return (
      displayNames[planName as keyof typeof displayNames] || 'Starter (Free)'
    )
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
      // ADD THIS: Handle downgrade to free plan (cancel subscription)
      if (planType === 'starter') {
        const response = await fetch('/api/stripe/cancel-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to cancel subscription')
        }

        // Enhanced success message with billing context
        const preservedUsage = data.preserved_usage || 0
        const message =
          preservedUsage > 0
            ? `✅ Successfully downgraded to free plan!\n💾 Your ${preservedUsage} generations this month have been preserved.\n💳 ${data.billing_note}`
            : `✅ Successfully downgraded to free plan!\n💳 ${data.billing_note}`

        alert(message)
        window.location.reload()
        return
      }

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

  const remainingGenerations = currentLimit - currentUsage
  const usagePercentage =
    currentLimit > 0 ? (currentUsage / currentLimit) * 100 : 0

  // Get billing cycle info
  const billingInfo = userPlan?.created_at
    ? getBillingCycleInfo(userPlan.created_at)
    : null

  const plans = [
    {
      name: 'Starter (Free)',
      price: 0,
      period: 'forever',
      description: 'Perfect for testing our AI platform',
      badge: 'Free Forever',
      features: [
        '10 content generations per month',
        'Manual content generation (text input)',
        'Voice-to-content generation (up to 1 minute)',
        'AI Vision analysis (brands, colors, features)',
        'Amazon & Shopify optimized content format',
        'Content library access',
        'Email support',
      ],
      limitations: [
        'No bulk CSV upload',
        'No background processing',
        'No direct marketplace publishing',
      ],
      highlights: ['Voice input', 'AI Vision', 'Free forever'],
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
      description: 'Scale your content creation with bulk processing',
      badge: 'Most Popular',
      features: [
        '250 content generations per month',
        'Everything in Starter plan',
        'Bulk CSV upload (up to 50 products)',
        'Amazon optimization & Direct Shopify publishing integration',
        'Background job processing',
        'Content library with organization',
        'Priority email support',
      ],
      newCapabilities: [
        'Bulk workflow automation',
        'Background processing',
        'Higher generation limits',
      ],
      highlights: ['Background jobs', 'Bulk uploads', 'Priority support'],
      icon: Zap,
      planType: 'business',
      popular: true,
      color: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-600',
    },
    {
      name: 'Premium',
      price: 59,
      period: 'month',
      description: 'Professional scale with Amazon & Shopify integration',
      badge: 'Best Value',
      features: [
        '1,000 content generations per month',
        'Everything in Business plan',
        'Large bulk CSV upload (up to 200 products)',
        'Amazon optimization & Direct Shopify publishing integration',
        'Enhanced voice processing (full 1-minute)',
        'Advanced AI Vision analysis',
        'Bulk export options (CSV, Excel)',
      ],
      differentiators: [
        'Amazon optimization & Shopify Publish integration',
        'Higher bulk limits',
        'Enhanced AI features',
      ],
      newCapabilities: [
        'Direct marketplace integration',
        'Advanced AI processing',
        'Large-scale bulk processing',
      ],
      highlights: ['Marketplace publishing', 'Advanced AI', 'Export options'],
      icon: Crown,
      planType: 'premium',
      popular: false,
      color: 'from-yellow-50 to-orange-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-600',
    },
    {
      name: 'Enterprise',
      price: 99,
      period: 'month',
      description: 'Unlimited scale for enterprise needs',
      badge: 'Maximum Scale',
      features: [
        'Unlimited content generations',
        'Everything in Premium plan',
        'Enterprise bulk processing (up to 1,000 products)',
        'Amazon optimization & Direct Shopify publishing (unlimited)',
        'Priority support (faster response)',
        'Large-scale background processing',
      ],
      benefits: [
        'No usage limits',
        'Maximum bulk capacity',
        'Priority support',
      ],
      futureFeatures: [
        'Custom integrations (contact us)',
        'White-label solutions (contact us)',
        'Additional platform integrations',
      ],
      highlights: ['Unlimited usage', 'Priority support', 'Enterprise scale'],
      icon: Rocket,
      planType: 'enterprise',
      popular: false,
      color: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-500',
      textColor: 'text-purple-600',
    },
  ]

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
          {/* Badge - Conditional based on user plan */}
          {!user || currentPlan === 'starter' ? (
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-full px-6 py-3 mb-8">
              <Star className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                🎉 10 Free Generations Monthly • No Credit Card Required •
                Honest Pricing
              </span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-6 py-3 mb-8">
              <Crown className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                {getDisplayPlanName(currentPlan)} Plan • Transparent Pricing •
                Change Anytime
              </span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          )}

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
                <span className="font-semibold text-gray-800 block mt-2">
                  Only pay for features you actually use.
                </span>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Honest, Transparent
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  Pricing
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
                Start with 10 free generations forever. Scale as you grow with
                Voice + AI Vision + Bulk Processing + Amazon & Shopify
                Integration.
                <span className="font-semibold text-gray-800 block mt-2">
                  Only pay for features you actually use.
                </span>
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
                  {/* UPDATED: Monthly Reset with Billing Cycle Logic */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">
                        Billing Cycle
                      </span>
                    </div>
                    <p className="text-sm text-blue-700">
                      {billingInfo ? (
                        <>
                          Resets {billingInfo.formattedDate}
                          {billingInfo.isNearReset && (
                            <span className="text-orange-600 font-medium ml-1">
                              ({billingInfo.daysUntilReset} days)
                            </span>
                          )}
                        </>
                      ) : (
                        // Fallback for starter plan (no subscription date)
                        <>
                          Resets{' '}
                          {new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                            1
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </>
                      )}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-4 border ${getPlanLimit(currentPlan).bulkProducts === 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Upload
                        className={`h-5 w-5 ${getPlanLimit(currentPlan).bulkProducts === 0 ? 'text-red-600' : 'text-green-600'}`}
                      />
                      <span
                        className={`text-sm font-semibold ${getPlanLimit(currentPlan).bulkProducts === 0 ? 'text-red-900' : 'text-green-900'}`}
                      >
                        Bulk Upload
                      </span>
                    </div>
                    <p
                      className={`text-sm ${getPlanLimit(currentPlan).bulkProducts === 0 ? 'text-red-700' : 'text-green-700'}`}
                    >
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
                      Voice + Vision + Marketplaces
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
            What makes Listora AI different
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Volume2,
                label: 'Voice to Content',
                desc: '1-minute voice → professional copy',
              },
              {
                icon: Eye,
                label: 'AI Vision Analysis',
                desc: 'Reads brands, colors from images',
              },
              {
                icon: Cloud,
                label: 'Background Processing',
                desc: 'Bulk jobs run while you work',
              },
              {
                icon: Store,
                label: 'Marketplace Publishing',
                desc: 'Amazon optimization & Shopify integration',
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

        {/* Enhanced Pricing Cards - REDESIGNED TO MATCH HOMEPAGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = user && currentPlan === plan.planType

            // Add top border colors for each plan
            const topBorderColors = {
              starter: 'bg-gray-300',
              business: 'bg-gradient-to-r from-indigo-400 to-purple-500',
              premium: 'bg-gradient-to-r from-green-400 to-emerald-500',
              enterprise: 'bg-gradient-to-r from-gray-600 to-gray-800',
            }

            return (
              <div
                key={plan.name}
                className={`border-2 ${
                  plan.popular
                    ? 'border-indigo-500'
                    : isCurrentPlan
                      ? 'border-green-500'
                      : 'border-gray-300'
                } bg-white relative overflow-hidden ${
                  plan.popular ? 'transform scale-105' : ''
                } h-full flex flex-col`}
              >
                {/* Top colored border */}
                <div
                  className={`h-2 ${topBorderColors[plan.planType as keyof typeof topBorderColors]}`}
                ></div>

                {/* Most Popular Badge */}
                {plan.badge && !isCurrentPlan && (
                  <div className="px-4 py-2 text-center text-white text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600">
                    {plan.badge}
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="px-4 py-2 text-center text-white text-sm font-medium bg-green-600">
                    Current Plan
                  </div>
                )}

                {/* Main content container */}
                <div className="flex flex-col h-full">
                  {/* Fixed height section 1: Plan name and description - EXACTLY ALIGNED */}
                  <div className="text-center h-24 flex flex-col justify-center px-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>

                  {/* Fixed height section 2: Price - EXACTLY ALIGNED */}
                  <div className="text-center h-32 flex flex-col justify-center px-4">
                    <div className="mb-1">
                      <span className="text-3xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-600 ml-1">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {plan.price > 0 ? 'billed annually' : 'forever free'}
                    </p>
                    <p className="text-sm font-medium text-gray-800">
                      {plan.planType === 'starter'
                        ? '10 generations/month'
                        : plan.planType === 'business'
                          ? '250 generations/month'
                          : plan.planType === 'premium'
                            ? '1,000 generations/month'
                            : 'Unlimited generations'}
                    </p>
                  </div>

                  {/* Fixed height section 3: CTA Button - EXACTLY ALIGNED */}
                  <div className="h-16 flex items-center px-6">
                    {user && (
                      <>
                        {plan.planType === currentPlan ? (
                          <div className="w-full py-3 px-4 rounded-lg text-sm font-semibold bg-green-100 text-green-800 flex items-center justify-center">
                            <Award className="mr-2 h-4 w-4" />
                            Current Plan
                          </div>
                        ) : (
                          (() => {
                            const isUpgrade =
                              getPlanLimit(plan.planType).generations >
                              getPlanLimit(currentPlan).generations
                            const isDowngrade =
                              getPlanLimit(plan.planType).generations <
                              getPlanLimit(currentPlan).generations

                            return (
                              <button
                                onClick={() => handleUpgrade(plan.planType)}
                                disabled={loading}
                                className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center ${
                                  isUpgrade
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                    : isDowngrade
                                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {loading && processingPlan === plan.planType ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    {isUpgrade ? (
                                      <ArrowRight className="h-4 w-4 mr-1 rotate-45" />
                                    ) : isDowngrade ? (
                                      <ArrowRight className="h-4 w-4 mr-1 rotate-[-135deg]" />
                                    ) : null}
                                    {isUpgrade
                                      ? 'Upgrade'
                                      : isDowngrade
                                        ? 'Downgrade'
                                        : 'Switch'}
                                  </>
                                )}
                              </button>
                            )
                          })()
                        )}
                      </>
                    )}

                    {/* Sign in button for non-logged users on paid plans */}
                    {!user && plan.planType !== 'starter' && (
                      <button
                        onClick={handleLogin}
                        className="w-full py-3 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Sign In to View Plan
                      </button>
                    )}

                    {/* Start free button for non-logged users on starter plan */}
                    {!user && plan.planType === 'starter' && (
                      <button
                        onClick={handleLogin}
                        className="w-full py-3 px-4 rounded-lg font-medium text-sm transition-all cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                      >
                        🚀 Start Free
                      </button>
                    )}
                  </div>

                  {/* Flexible section 4: Features */}
                  <div className="flex-1 px-6 pb-6">
                    <div className="space-y-4">
                      <div>
                        <ul className="space-y-2">
                          {plan.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="flex items-start space-x-2"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-700">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {plan.limitations && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            ⚠️ Limitations:
                          </h4>
                          <ul className="space-y-2">
                            {plan.limitations.map((limitation, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <span className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                                  ❌
                                </span>
                                <span className="text-sm text-gray-600">
                                  {limitation}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {plan.newCapabilities && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            🚀 New Capabilities:
                          </h4>
                          <ul className="space-y-2">
                            {plan.newCapabilities.map((capability, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <Star className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-blue-700 font-medium">
                                  {capability}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {plan.futureFeatures && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            🔮 Future Features:
                          </h4>
                          <ul className="space-y-2">
                            {plan.futureFeatures.map((feature, idx) => (
                              <li
                                key={idx}
                                className="flex items-start space-x-2"
                              >
                                <Building2 className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-purple-700">
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Money back guarantee - At bottom */}
                    <div className="mt-6 text-center text-xs text-gray-500">
                      {plan.planType === 'starter'
                        ? '✓ No credit card required • ✓ Forever free'
                        : '30-Day Money Back Guarantee'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Explanation Section */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 mb-16 border border-white/50 shadow-xl">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            What Our Features Actually Do
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    AI Vision Analysis
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Our system automatically reads your product images and
                    identifies brands, colors, materials, and features using
                    OpenAI Vision technology. Uses this visual data to generate
                    more accurate descriptions.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Cloud className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Background Job Processing
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Upload CSV with hundreds of products and jobs continue
                    running even if you close your browser. Navigate freely
                    while content is being generated. Get email notification
                    when complete.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Volume2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Voice-to-Content
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Record up to 1-minute voice recordings. AI converts natural
                    speech to professional product content. Works in natural
                    conversation style - just talk about your product normally.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Direct Marketplace Publishing
                  </h4>
                  <p className="text-gray-600 text-sm">
                    One-click publish generated content directly to Shopify &
                    Amazon optimization. No copy-paste required. Integrates
                    directly with your seller accounts for seamless workflow.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Content Library
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Available to all users (including free tier). Store and
                    organize all generated content. Search and filter previous
                    generations. Download content in various formats.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Bulk CSV Upload
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Upload CSV files with multiple products at once. System
                    processes all products automatically. Available from
                    Business plan (50 products) up to Enterprise (1,000
                    products).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-16 border border-indigo-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What We're Building Next
          </h3>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-indigo-900 mb-4 flex items-center">
                <Timer className="h-5 w-5 mr-2" />
                Coming Soon
              </h4>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">
                    Enhanced Shopify integration with inventory sync
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">
                    Advanced analytics and performance tracking
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">
                    API access for enterprise customers
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700">
                    Custom brand voice settings
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Enterprise Inquiries
              </h4>
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-700">
                    White-label solutions (contact for pricing)
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-700">
                    Dedicated account management
                  </span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-700">
                    Custom integrations tailored to your workflow
                  </span>
                </li>
              </ul>
              <div className="mt-4">
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center"
                >
                  Contact us for enterprise features
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
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
                  Ready to Start Creating Amazing Content?
                </h3>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  Start with 10 free generations forever. No credit card
                  required. Experience the power of Voice + AI Vision +
                  Background Processing + Amazon & Shopify Integration.
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
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Honest pricing, real features</span>
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
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                <span>Terms</span>
              </a>
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <Shield className="h-4 w-4" />
                <span>Privacy</span>
              </a>
              <a
                href="/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span>Support</span>
              </a>
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
