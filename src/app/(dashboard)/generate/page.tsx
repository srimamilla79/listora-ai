'use client'

import { useState, useEffect } from 'react'
import ProductForm from '@/components/ProductForm'
import UsageDisplay from '@/components/UsageDisplay'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

export default function EnhancedGeneratePage() {
  const [user, setUser] = useState<any>(undefined)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // 🚀 NEW: Smart usage management
  const [usageRefreshKey, setUsageRefreshKey] = useState(0)
  const [currentUsage, setCurrentUsage] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(10)

  const router = useRouter()

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

  // 🚀 NEW: Fetch current usage from database
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

  // 🚀 UPDATED: Handle successful generation
  // 🚀 UPDATED: Handle successful generation with better sync
  const handleGenerationSuccess = () => {
    console.log('🎉 Generation successful! Refreshing usage...')

    // Calculate the new usage count
    const newUsage = currentUsage + 1

    // Update both local state AND trigger UsageDisplay refresh
    setCurrentUsage(newUsage)
    setUsageRefreshKey((prev) => prev + 1)

    // 🚀 FIXED: Force immediate sync - update UsageDisplay's state too
    // This ensures both components show the same number immediately
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

  // 🚀 UPDATED: Handle usage data updates from UsageDisplay
  const handleUsageUpdate = (usage: number, limit: number) => {
    // Only update if the values are different to avoid loops
    if (usage !== currentUsage) {
      setCurrentUsage(usage)
    }
    if (limit !== monthlyLimit) {
      setMonthlyLimit(limit)
    }
  }

  // Show loading during redirect or initial load
  if (loading || redirecting || !mounted || !supabase) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Enhanced Loading Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {redirecting
              ? 'Redirecting to login...'
              : 'Loading AI Content Generator...'}
          </p>
        </div>

        {/* Animation Styles */}
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

  // This should never show now
  if (user === null) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Enhanced Loading Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        <div className="text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Sparkles className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Redirecting...</p>
        </div>

        {/* Animation Styles */}
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

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <main className="relative z-10 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Enhanced Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mr-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                AI Content Generator
              </h1>
            </div>

            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Create compelling product listings for any platform using AI. Just
              enter your product details and let our AI craft the perfect
              content.
            </p>
          </div>

          {/* Content Container */}
          <div className="space-y-8">
            {/* 🚀 PRESERVED: Usage Display with smart refresh - EXACT same functionality */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <UsageDisplay
                userId={user?.id}
                planType={userPlan}
                refreshKey={usageRefreshKey}
                onUsageUpdate={handleUsageUpdate}
              />
            </div>

            {/* 🚀 PRESERVED: Product Form - EXACT same functionality */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
              <ProductForm
                onGenerationSuccess={handleGenerationSuccess}
                currentUsage={currentUsage}
                monthlyLimit={monthlyLimit}
                user={user}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Animation Styles */}
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
