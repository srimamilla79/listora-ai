// Fixed UsageDisplay.tsx Component
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface UsageDisplayProps {
  userId?: string
  planType?: string
}

const PLAN_LIMITS = {
  starter: { monthlyGenerations: 10, name: 'Starter' },
  business: { monthlyGenerations: 250, name: 'Business' },
  premium: { monthlyGenerations: 1000, name: 'Premium' },
  enterprise: { monthlyGenerations: 999999, name: 'Enterprise' },
}

const UsageDisplay = ({ userId, planType = 'starter' }: UsageDisplayProps) => {
  const [monthlyUsage, setMonthlyUsage] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const currentPlan =
    PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.starter
  const monthlyLimit = currentPlan.monthlyGenerations
  const remainingGenerations = monthlyLimit - monthlyUsage
  const usagePercentage = (monthlyUsage / monthlyLimit) * 100

  useEffect(() => {
    if (userId) {
      fetchUsage()
    }
  }, [userId])

  const fetchUsage = async () => {
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

      if (usageData && !usageError) {
        setMonthlyUsage(usageData.usage_count || 0)
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

        setMonthlyUsage(count || 0)
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
      setMonthlyUsage(0)
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="bg-white rounded-lg border p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-700">Monthly Usage</h3>
        </div>
        <span className="text-sm text-gray-500 font-medium">
          {monthlyUsage}/{monthlyLimit === 999999 ? '∞' : monthlyLimit}{' '}
          generations
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
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

      {/* Usage Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1">
          {remainingGenerations > 50 ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : remainingGenerations > 10 ? (
            <AlertTriangle className="h-3 w-3 text-yellow-600" />
          ) : (
            <AlertTriangle className="h-3 w-3 text-red-600" />
          )}
          <span
            className={`font-medium ${
              remainingGenerations < 10
                ? 'text-red-600'
                : remainingGenerations < 50
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

      {/* Warning Messages */}
      {remainingGenerations < 10 && remainingGenerations > 0 && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          ⚠️ Running low on generations. Consider upgrading your plan.
        </div>
      )}

      {remainingGenerations <= 0 && (
        <div className="mt-3 text-xs text-red-700 bg-red-100 p-2 rounded border border-red-300">
          🚫 Monthly limit reached. Upgrade your plan to continue generating
          content.
        </div>
      )}

      {/* Plan Info */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{currentPlan.name} Plan</span>
          <span>Resets monthly</span>
        </div>
      </div>
    </div>
  )
}

export default UsageDisplay
