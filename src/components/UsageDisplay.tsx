// Enhanced UsageDisplay.tsx with Smart Refresh & Upgrade Prompts - FINAL FIXED VERSION
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Crown,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  Star,
  Rocket,
  X,
} from 'lucide-react'

interface UsageDisplayProps {
  userId?: string
  planType?: string
  refreshKey?: number // 🚀 NEW: Trigger refresh
  onUsageUpdate?: (usage: number, limit: number) => void // 🚀 NEW: Report usage back to parent
}

const PLAN_LIMITS = {
  starter: { monthlyGenerations: 10, name: 'Starter' },
  business: { monthlyGenerations: 250, name: 'Business' },
  premium: { monthlyGenerations: 1000, name: 'Premium' },
  enterprise: { monthlyGenerations: 999999, name: 'Enterprise' },
}

const UsageDisplay = ({
  userId,
  planType = 'starter',
  refreshKey = 0,
  onUsageUpdate,
}: UsageDisplayProps) => {
  const [monthlyUsage, setMonthlyUsage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasLoadedRealPlan, setHasLoadedRealPlan] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const currentPlan =
    PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter
  const monthlyLimit = currentPlan.monthlyGenerations
  const remainingGenerations = monthlyLimit - monthlyUsage
  const usagePercentage = (monthlyUsage / monthlyLimit) * 100

  // 🚀 NEW: Determine warning level
  const getWarningLevel = () => {
    if (usagePercentage >= 100) return 'limit-reached'
    if (usagePercentage >= 95) return 'critical'
    if (usagePercentage >= 90) return 'warning'
    if (usagePercentage >= 75) return 'caution'
    return 'safe'
  }

  const warningLevel = getWarningLevel()

  // 🚀 FIXED: Track when real plan loads
  useEffect(() => {
    if (planType !== 'starter') {
      setHasLoadedRealPlan(true)
    }
  }, [planType])

  useEffect(() => {
    if (userId) {
      fetchUsage()
      checkAdminStatus()
    }
  }, [userId, refreshKey]) // 🚀 NEW: Refresh when refreshKey changes

  // 🚀 NEW: Smart refresh with loading state
  const refreshUsage = async () => {
    if (!userId) return

    setIsRefreshing(true)
    try {
      await fetchUsage(true) // Force refresh
    } finally {
      setIsRefreshing(false)
    }
  }

  // 🚀 NEW: Check admin status
  const checkAdminStatus = async () => {
    if (!userId) return

    try {
      const { data: adminCheck } = await supabase.rpc('is_admin', {
        user_uuid: userId,
      })
      setIsAdmin(adminCheck || false)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    }
  }

  // 🚀 ENHANCED: Fetch usage with refresh capability
  const fetchUsage = async (forceRefresh = false) => {
    if (!userId) return

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

      setMonthlyUsage(usage)

      // 🚀 FIXED: Only call onUsageUpdate after real plan has loaded (not starter default)
      if (
        onUsageUpdate &&
        currentPlan &&
        currentPlan.monthlyGenerations > 0 &&
        (hasLoadedRealPlan || planType !== 'starter')
      ) {
        console.log('✅ UsageDisplay updating parent with correct plan limits')
        onUsageUpdate(usage, currentPlan.monthlyGenerations)
      } else {
        console.log(
          '⏳ Waiting for real plan to load before calling onUsageUpdate'
        )
      }

      // 🚀 NEW: Auto-show upgrade prompt when limit reached
      if (
        usage >= currentPlan.monthlyGenerations &&
        !isAdmin &&
        planType !== 'enterprise'
      ) {
        setShowUpgradePrompt(true)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
      setMonthlyUsage(0)
    } finally {
      setLoading(false)
    }
  }

  // 🚀 NEW: Upgrade button handlers
  const handleUpgrade = () => {
    router.push('/pricing')
  }

  const dismissUpgradePrompt = () => {
    setShowUpgradePrompt(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    )
  }

  // 👑 ADMIN/OWNER DISPLAY (unchanged but enhanced)
  if (isAdmin) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-xl border-2 border-purple-200 p-6 mb-6 shadow-sm relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full opacity-20 -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-200 to-purple-200 rounded-full opacity-20 -ml-8 -mb-8"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Crown className="h-6 w-6 text-purple-600" />
                <h3 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Owner Access
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                <span className="text-sm bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-bold border border-yellow-300">
                  ∞ UNLIMITED
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-700">
                {monthlyUsage}
                {isRefreshing && (
                  <span className="ml-2 text-sm">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  </span>
                )}
              </div>
              <div className="text-xs text-purple-600 font-medium">
                generated this month
              </div>
            </div>
          </div>

          {/* Infinite Progress Bar */}
          <div className="w-full bg-purple-200 rounded-full h-3 mb-4 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 h-3 rounded-full w-full relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-400 animate-pulse"></div>
            </div>
          </div>

          {/* Owner Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-purple-700">
                  No Limits
                </span>
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Generate unlimited content
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-purple-700">
                  All Features
                </span>
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Voice, images, analytics
              </div>
            </div>
          </div>

          {/* Owner Features */}
          <div className="bg-white/40 backdrop-blur-sm rounded-lg p-4 border border-purple-100">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">
                  Voice Processing
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">
                  Image Analysis
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">
                  All Platforms
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">Bulk Upload</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">
                  Admin Dashboard
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-purple-700 font-medium">
                  Priority Support
                </span>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-bold text-purple-700">
                  Owner Privileges Active
                </span>
              </div>
              <div className="text-xs text-purple-600 font-medium">
                No restrictions • Full access
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 🚀 ENHANCED: Regular user display with upgrade prompts
  return (
    <div className="space-y-4 mb-6">
      {/* 🚀 NEW: Upgrade Prompt (Priority Display) */}
      {showUpgradePrompt && warningLevel === 'limit-reached' && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-red-900">
                  Monthly Limit Reached!
                </h4>
                <p className="text-red-700 text-sm">
                  You've used all {monthlyLimit} generations this month. Upgrade
                  to continue creating content.
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-red-600">
                  <span>🚀 10x more generations</span>
                  <span>⚡ Priority processing</span>
                  <span>🎨 Advanced features</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all transform hover:scale-105 shadow-lg"
              >
                <Rocket className="h-4 w-4" />
                <span>Upgrade Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={dismissUpgradePrompt}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Usage Display */}
      <div
        className={`bg-white rounded-lg border p-4 shadow-sm transition-all ${
          warningLevel === 'limit-reached'
            ? 'border-red-300'
            : warningLevel === 'critical'
              ? 'border-orange-300'
              : warningLevel === 'warning'
                ? 'border-yellow-300'
                : 'border-gray-200'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp
              className={`h-4 w-4 ${
                warningLevel === 'limit-reached'
                  ? 'text-red-600'
                  : warningLevel === 'critical'
                    ? 'text-orange-600'
                    : warningLevel === 'warning'
                      ? 'text-yellow-600'
                      : 'text-gray-600'
              }`}
            />
            <h3 className="text-sm font-medium text-gray-700">Monthly Usage</h3>
            {isRefreshing && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 font-medium">
              {monthlyUsage}/{monthlyLimit === 999999 ? '∞' : monthlyLimit}{' '}
              generations
            </span>
            {warningLevel !== 'safe' && (
              <Star
                className={`h-4 w-4 ${
                  warningLevel === 'limit-reached'
                    ? 'text-red-500'
                    : warningLevel === 'critical'
                      ? 'text-orange-500'
                      : 'text-yellow-500'
                }`}
              />
            )}
          </div>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              warningLevel === 'limit-reached'
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : warningLevel === 'critical'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500'
                  : warningLevel === 'warning'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : warningLevel === 'caution'
                      ? 'bg-gradient-to-r from-blue-500 to-yellow-500'
                      : 'bg-gradient-to-r from-green-500 to-blue-500'
            } ${warningLevel === 'limit-reached' ? 'animate-pulse' : ''}`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>

        {/* Enhanced Usage Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            {warningLevel === 'safe' ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : (
              <AlertTriangle
                className={`h-3 w-3 ${
                  warningLevel === 'limit-reached'
                    ? 'text-red-600'
                    : warningLevel === 'critical'
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                }`}
              />
            )}
            <span
              className={`font-medium ${
                warningLevel === 'limit-reached'
                  ? 'text-red-600'
                  : warningLevel === 'critical'
                    ? 'text-orange-600'
                    : warningLevel === 'warning'
                      ? 'text-yellow-600'
                      : 'text-green-600'
              }`}
            >
              {remainingGenerations > 0
                ? `${remainingGenerations} remaining`
                : 'Limit reached'}
            </span>
          </div>
          <span className="text-gray-500">
            {usagePercentage.toFixed(1)}% used
          </span>
        </div>

        {/* 🚀 NEW: Progressive Warning Messages */}
        {warningLevel === 'critical' && remainingGenerations > 0 && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-800 text-sm font-medium">
                  ⚠️ Only {remainingGenerations} generations left
                </span>
              </div>
              <button
                onClick={handleUpgrade}
                className="text-orange-600 hover:text-orange-700 font-medium text-xs px-2 py-1 rounded border border-orange-300 hover:bg-orange-50 transition-colors"
              >
                Upgrade
              </button>
            </div>
          </div>
        )}

        {warningLevel === 'warning' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-yellow-800 text-sm">
                💡 Consider upgrading soon - you're at 90% usage
              </span>
              <button
                onClick={handleUpgrade}
                className="text-yellow-600 hover:text-yellow-700 font-medium text-xs px-2 py-1 rounded border border-yellow-300 hover:bg-yellow-50 transition-colors"
              >
                View Plans
              </button>
            </div>
          </div>
        )}

        {remainingGenerations <= 0 && (
          <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-800 font-medium text-sm">
                    🚫 Monthly limit reached
                  </span>
                </div>
                <p className="text-red-700 text-xs">
                  Upgrade your plan to continue generating content and unlock
                  advanced features.
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center space-x-2 transition-colors"
              >
                <Rocket className="h-4 w-4" />
                <span>Upgrade</span>
              </button>
            </div>
          </div>
        )}

        {/* Plan Info with Upgrade Option */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{currentPlan.name} Plan</span>
            <div className="flex items-center space-x-3">
              <span>Resets monthly</span>
              {planType !== 'enterprise' && (
                <button
                  onClick={handleUpgrade}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Upgrade →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageDisplay
