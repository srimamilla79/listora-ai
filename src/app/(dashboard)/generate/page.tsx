'use client'

import { useState, useEffect } from 'react'
import ProductForm from '@/components/ProductForm'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardPageWrapper from '@/components/layout/DashboardPageWrapper'
import { Sparkles, TrendingUp, Zap, Activity, ArrowUpRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from 'lucide-react'

export default function EnhancedGeneratePage() {
  const [user, setUser] = useState<any>(undefined)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // 🚀 Smart usage management
  const [usageRefreshKey, setUsageRefreshKey] = useState(0)
  const [currentUsage, setCurrentUsage] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(10)

  const router = useRouter()
  const {
    outputLanguage,
    setOutputLanguage,
    inputLanguage,
    supportedLanguages,
  } = useLanguage()

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let isMounted = true

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (isMounted) {
          setUser(session?.user ?? null)
          setLoading(false)

          if (!session?.user) {
            setRedirecting(true)
            router.push('/login')
          } else {
            // Fetch user plan and current usage when user is authenticated
            await fetchUserPlan(session.user.id)
            await fetchCurrentUsage(session.user.id)
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        if (!session?.user && event !== 'INITIAL_SESSION') {
          setRedirecting(true)
          router.push('/login')
        } else if (session?.user) {
          await fetchUserPlan(session.user.id)
          await fetchCurrentUsage(session.user.id)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const fetchUserPlan = async (userId: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (data && !error) {
        setUserPlan(data.plan_type)
        console.log('✅ User plan loaded:', data.plan_type)

        // Set monthly limits based on plan
        const planLimits = {
          starter: 10,
          business: 250,
          premium: 1000,
          enterprise: 999999,
        }

        setMonthlyLimit(
          planLimits[data.plan_type as keyof typeof planLimits] || 10
        )
      } else {
        setUserPlan('starter')
        setMonthlyLimit(10)
      }
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setUserPlan('starter')
      setMonthlyLimit(10)
    }
  }

  // 🚀 Fetch current usage from database
  const fetchCurrentUsage = async (userId: string) => {
    if (!supabase) return

    try {
      const currentMonth = new Date().toISOString().slice(0, 7) // '2025-06'

      // First, try to get from usage_tracking table
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage_tracking')
        .select('usage_count')
        .eq('user_id', userId)
        .eq('month_year', currentMonth)
        .single()

      let usage = 0

      if (usageData && !usageError) {
        usage = usageData.usage_count || 0
      } else {
        // Fallback: Count existing records
        const startOfMonth = `${currentMonth}-01T00:00:00.000Z`

        let { count, error } = await supabase
          .from('product_contents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', startOfMonth)

        if (error) {
          const result = await supabase
            .from('user_content')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', startOfMonth)

          count = result.count
        }

        usage = count || 0
      }

      setCurrentUsage(usage)
      console.log('✅ Current usage loaded:', usage)
    } catch (error) {
      console.error('Error fetching current usage:', error)
      setCurrentUsage(0)
    }
  }

  // 🚀 Handle successful generation with better sync
  const handleGenerationSuccess = () => {
    console.log('🎉 Generation successful! Refreshing usage...')

    // Calculate the new usage count
    const newUsage = currentUsage + 1

    // Update both local state AND trigger UsageDisplay refresh
    setCurrentUsage(newUsage)
    setUsageRefreshKey((prev) => prev + 1)

    // 🚀 Force immediate sync
    setTimeout(() => {
      setUsageRefreshKey((prev) => prev + 1)
    }, 100)

    // Also refresh from database after a short delay to confirm
    if (user?.id) {
      setTimeout(() => {
        fetchCurrentUsage(user.id)
      }, 500)
    }
  }

  // Show loading during redirect or initial load
  if (loading || redirecting || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {redirecting ? 'Redirecting to login...' : 'Loading workspace...'}
          </p>
        </div>
      </div>
    )
  }

  // This should never show now
  if (user === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Calculate usage percentage
  const usagePercentage =
    monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0

  // Get plan color and icon
  const getPlanStyle = () => {
    switch (userPlan) {
      case 'premium':
        return {
          color: 'from-yellow-500 to-orange-600',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200',
          lightBg: 'from-yellow-400 to-orange-500',
        }
      case 'business':
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          lightBg: 'from-blue-400 to-indigo-500',
        }
      case 'enterprise':
        return {
          color: 'from-purple-500 to-pink-600',
          bgColor: 'bg-purple-50',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
          lightBg: 'from-purple-400 to-pink-500',
        }
      default:
        return {
          color: 'from-gray-400 to-gray-600',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          lightBg: 'from-gray-400 to-gray-500',
        }
    }
  }

  const planStyle = getPlanStyle()

  return (
    <DashboardPageWrapper title="Generate Content">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        </div>

        <div className="relative p-4 sm:p-6 lg:p-8">
          {/* Compact Status Bar */}
          <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Usage Progress */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="#e5e7eb"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke={usagePercentage > 80 ? '#ef4444' : '#6366f1'}
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - usagePercentage / 100)}`}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">
                      {Math.round(usagePercentage)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Monthly Usage</div>
                  <div className="font-semibold text-gray-900">
                    {currentUsage} / {monthlyLimit} generations
                  </div>
                </div>
              </div>

              {/* Plan Info */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 bg-gradient-to-r ${planStyle.color} rounded-lg flex items-center justify-center shadow-md`}
                  >
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Current Plan</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {userPlan}
                    </div>
                  </div>
                </div>

                {/* AI Status */}
                <div className="flex items-center space-x-3 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="relative">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    AI Ready
                  </span>
                </div>
                {/* Language Status */}
                <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {supportedLanguages[outputLanguage]?.name || 'English'}
                  </span>
                </div>

                {/* Upgrade Button */}
                {userPlan !== 'enterprise' && (
                  <a
                    href={
                      userPlan === 'premium'
                        ? '/contact?plan=enterprise'
                        : '/pricing'
                    }
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {userPlan === 'premium' ? 'Contact Sales' : 'Upgrade'}
                    </span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Optional Minimal Stats - Only for Starter */}
          {userPlan === 'starter' && monthlyLimit - currentUsage <= 3 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">
                  Only {monthlyLimit - currentUsage} generations remaining this
                  month
                </span>
              </div>
              <a
                href="/pricing"
                className="text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                Upgrade for more →
              </a>
            </div>
          )}

          {/* Product Form Container */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <ProductForm
              onGenerationSuccess={handleGenerationSuccess}
              currentUsage={currentUsage}
              monthlyLimit={monthlyLimit}
              user={user}
            />
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
      `}</style>
    </DashboardPageWrapper>
  )
}
