// src/app/(dashboard)/pricing/page.tsx - MODERN CLEAN DESIGN
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
} from 'lucide-react'

interface UserPlan {
  plan_type: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
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
    }
  }

  if (!authChecked || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
      features: [
        '10 content generations per month',
        'AI content generation from text',
        'Single image upload and processing',
        'Platform-specific content formats',
        'Email support',
        'Access to all content templates',
      ],
      icon: Sparkles,
      planType: 'starter',
      popular: false,
    },
    {
      name: 'Business',
      price: 29,
      period: 'month',
      description: 'For growing entrepreneurs',
      features: [
        '250 content generations per month',
        'Everything in Starter',
        'Voice-to-content generation',
        'Bulk CSV upload (up to 50 products)',
        'Advanced image optimization',
        'Multiple platform formats',
        'Priority email support',
      ],
      icon: Zap,
      planType: 'business',
      popular: true,
    },
    {
      name: 'Premium',
      price: 79,
      period: 'month',
      description: 'For scaling businesses',
      features: [
        '1,000 content generations per month',
        'Everything in Business',
        'Bulk CSV upload (up to 200 products)',
        'Bulk content generation',
        'Advanced content customization',
        'Enhanced voice processing',
        'Batch export capabilities',
      ],
      icon: Crown,
      planType: 'premium',
      popular: false,
    },
    {
      name: 'Enterprise',
      price: 199,
      period: 'month',
      description: 'For large organizations',
      features: [
        'Unlimited content generations',
        'Everything in Premium',
        'Bulk CSV upload (up to 1,000 products)',
        'Mass content generation',
        'Priority phone support',
        'Custom content templates',
        'Advanced batch processing',
      ],
      icon: Rocket,
      planType: 'enterprise',
      popular: false,
    },
  ]

  const remainingGenerations = currentLimit - currentUsage
  const usagePercentage =
    currentLimit > 0 ? (currentUsage / currentLimit) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header - Different for logged in vs logged out users */}
        <div className="text-center mb-16">
          {user ? (
            <>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Manage Your Plan
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Upgrade or downgrade your plan anytime. Changes take effect
                immediately.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                Simple Pricing
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Start free, scale as you grow. No hidden fees, cancel anytime.
              </p>
            </>
          )}
        </div>

        {/* Current Usage Card (only if logged in) */}
        {user && (
          <div className="max-w-md mx-auto mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className={`p-2 rounded-full ${
                    remainingGenerations > 50
                      ? 'bg-green-100'
                      : remainingGenerations > 10
                        ? 'bg-yellow-100'
                        : 'bg-red-100'
                  }`}
                >
                  {remainingGenerations > 50 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Current: {getDisplayPlanName(currentPlan)} Plan
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentUsage}/
                    {currentLimit === 999999 ? '∞' : currentLimit} generations
                    this month
                  </p>
                </div>
              </div>

              {currentLimit !== 999999 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      usagePercentage > 90
                        ? 'bg-red-500'
                        : usagePercentage > 75
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {remainingGenerations > 0
                    ? `${remainingGenerations} remaining`
                    : 'Limit reached'}
                </span>
                <span className="text-gray-500">
                  Resets{' '}
                  {new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() + 1,
                    1
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Bulk Upload Status */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Bulk Upload:</span>
                  <span
                    className={`font-medium ${
                      getPlanLimit(currentPlan).bulkProducts > 0
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {getPlanLimit(currentPlan).bulkProducts === 0
                      ? 'Not Available'
                      : `Up to ${getPlanLimit(currentPlan).bulkProducts} products`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isCurrentPlan = user && currentPlan === plan.planType

            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl p-8 transition-all duration-300 hover:shadow-xl ${
                  plan.popular
                    ? 'ring-2 ring-indigo-500 shadow-lg'
                    : 'border border-gray-200 hover:border-gray-300'
                } ${isCurrentPlan ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <Icon
                    className={`h-12 w-12 mx-auto mb-4 ${
                      isCurrentPlan
                        ? 'text-green-600'
                        : plan.popular
                          ? 'text-indigo-600'
                          : 'text-gray-600'
                    }`}
                  />

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>

                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-6">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (!user && plan.planType !== 'starter') {
                      handleLogin()
                    } else if (plan.planType && !isCurrentPlan) {
                      handleUpgrade(plan.planType)
                    }
                  }}
                  disabled={isCurrentPlan || loading}
                  className={`w-full py-3 px-6 rounded-xl font-medium transition-all duration-200 ${
                    isCurrentPlan
                      ? 'bg-green-100 text-green-800 cursor-default'
                      : plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {loading
                    ? 'Processing...'
                    : !user && plan.planType !== 'starter'
                      ? 'Sign In to Upgrade'
                      : isCurrentPlan
                        ? 'Current Plan'
                        : user
                          ? currentPlan === 'enterprise'
                            ? 'Downgrade'
                            : getPlanLimit(plan.planType).generations >
                                getPlanLimit(currentPlan).generations
                              ? 'Upgrade'
                              : 'Switch'
                          : `Get ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA for non-logged users */}
        {!user && (
          <div className="text-center mt-16">
            <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to get started?
              </h3>
              <p className="text-gray-600 mb-6">
                Sign up now and start generating amazing content with AI.
              </p>
              <button
                onClick={handleLogin}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>
            All plans include AI content generation and platform optimization.
          </p>
          <div className="flex justify-center space-x-6 mt-4">
            <button className="hover:text-gray-700 transition-colors cursor-pointer">
              Terms
            </button>
            <button className="hover:text-gray-700 transition-colors cursor-pointer">
              Privacy
            </button>
            <button className="hover:text-gray-700 transition-colors cursor-pointer">
              Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
