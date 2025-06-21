// src/hooks/useUserPlan.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export type PlanType = 'starter' | 'business' | 'premium' | 'enterprise'

export interface UserPlan {
  plan_type: PlanType
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export interface PlanLimits {
  name: string
  maxBulkProducts: number
  monthlyGenerations: number
  price: string
  features: string[]
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    name: 'Starter',
    maxBulkProducts: 0,
    monthlyGenerations: 10,
    price: 'Free',
    features: ['Single product generation', 'Basic features'],
  },
  business: {
    name: 'Business',
    maxBulkProducts: 50,
    monthlyGenerations: 250,
    price: '$29/month',
    features: [
      'Bulk CSV upload (50 products)',
      'Voice-to-content',
      'Priority support',
    ],
  },
  premium: {
    name: 'Premium',
    maxBulkProducts: 200,
    monthlyGenerations: 1000,
    price: '$59/month',
    features: [
      'Bulk CSV upload (200 products)',
      'Advanced customization',
      'Batch export',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    maxBulkProducts: 1000,
    monthlyGenerations: 999999,
    price: '$99/month',
    features: [
      'Bulk CSV upload (1000 products)',
      'Priority phone support',
      'Custom templates',
    ],
  },
}

export function useUserPlan() {
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  const fetchUserPlan = async () => {
    if (!supabase) return

    try {
      setLoading(true)
      setError(null)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const response = await fetch('/api/user/plan', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user plan')
      }

      const planData = await response.json()
      setUserPlan(planData)
    } catch (err) {
      console.error('Error fetching user plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch plan')

      // Default to starter plan on error
      setUserPlan({
        plan_type: 'starter',
        created_at: new Date().toISOString(),
        expires_at: null,
        is_active: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const updateUserPlan = async (newPlan: PlanType) => {
    if (!supabase) return { success: false, error: 'Supabase not initialized' }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user?.id) {
        throw new Error('No valid session')
      }

      const response = await fetch('/api/user/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: newPlan,
          user_id: session.user.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user plan')
      }

      const result = await response.json()

      if (result.success) {
        // Refresh the plan data
        await fetchUserPlan()
        return { success: true }
      } else {
        throw new Error(result.error || 'Failed to update plan')
      }
    } catch (err) {
      console.error('Error updating user plan:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update plan',
      }
    }
  }

  const checkPlanLimits = (
    productCount: number
  ): { allowed: boolean; message?: string } => {
    if (!userPlan) {
      return { allowed: false, message: 'Plan information not available' }
    }

    const planLimits = PLAN_LIMITS[userPlan.plan_type]

    if (planLimits.maxBulkProducts === 0) {
      return {
        allowed: false,
        message: `Bulk upload is not available on the ${planLimits.name} plan. Please upgrade to access bulk processing.`,
      }
    }

    if (productCount > planLimits.maxBulkProducts) {
      return {
        allowed: false,
        message: `Your ${planLimits.name} plan supports up to ${planLimits.maxBulkProducts} products per upload. You're trying to upload ${productCount} products.`,
      }
    }

    return { allowed: true }
  }

  const getPlanLimits = (): PlanLimits => {
    if (!userPlan) {
      return PLAN_LIMITS.starter
    }
    return PLAN_LIMITS[userPlan.plan_type]
  }

  const canUseBulkUpload = (): boolean => {
    if (!userPlan) return false
    return PLAN_LIMITS[userPlan.plan_type].maxBulkProducts > 0
  }

  const isExpired = (): boolean => {
    if (!userPlan?.expires_at) return false
    return new Date(userPlan.expires_at) < new Date()
  }

  const daysUntilExpiry = (): number | null => {
    if (!userPlan?.expires_at) return null
    const expiryDate = new Date(userPlan.expires_at)
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // ✅ Only fetch plan when Supabase is ready
  useEffect(() => {
    if (supabase && mounted) {
      fetchUserPlan()
    }
  }, [supabase, mounted])

  return {
    userPlan,
    loading,
    error,
    planLimits: getPlanLimits(),
    canUseBulkUpload: canUseBulkUpload(),
    isExpired: isExpired(),
    daysUntilExpiry: daysUntilExpiry(),
    checkPlanLimits,
    updateUserPlan,
    refreshPlan: fetchUserPlan,
    PLAN_LIMITS,
  }
}
