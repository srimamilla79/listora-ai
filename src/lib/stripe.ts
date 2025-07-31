// src/lib/stripe.ts - IMPROVED VERSION
import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance (only use on server)
export const getServerStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
    // Add these for better error handling
    maxNetworkRetries: 3,
    timeout: 10000, // 10 seconds
  })
}

// Client-side Stripe instance
export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}

// Plan configuration - UPDATED to match your webhook
export const PLAN_LIMITS = {
  free: {
    generations: 10,
    price: 0,
    priceId: null,
    features: [
      'Basic content generation',
      'All platforms (Amazon, Etsy, Shopify, Instagram)',
      'Dashboard access',
      'Email support',
    ],
    limitations: [
      'No image upload',
      'No bulk processing',
      'No voice input',
      'Standard generation speed',
    ],
  },
  pro: {
    generations: 500,
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Everything in Starter',
      'Image upload & processing',
      'Advanced content optimization',
      'Priority generation speed',
      'Platform-specific optimization',
      'Content history & regeneration',
      'Priority email support',
    ],
  },
  // FIXED: Map 'business' to what your webhook expects
  business: {
    generations: 500, // Same as pro since your webhook maps pro -> business
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID, // Same as pro
    features: [
      'Everything in Starter',
      'Image upload & processing',
      'Advanced content optimization',
      'Priority generation speed',
      'Platform-specific optimization',
      'Content history & regeneration',
      'Priority email support',
    ],
  },
  premium: {
    generations: 2000,
    price: 59,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Everything in Business',
      'Bulk CSV upload (50+ products)',
      'Voice-to-content generation',
      'Background removal',
      'Advanced analytics',
      'Team collaboration (3 users)',
      'API access',
      'Priority support',
    ],
  },
  enterprise: {
    generations: -1, // unlimited
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Premium',
      'Unlimited generations',
      'White-label options',
      'Custom integrations',
      'Unlimited team members',
      'Dedicated account manager',
      'Phone support',
      'Custom training',
    ],
  },
} as const

export type PlanName = keyof typeof PLAN_LIMITS

// Helper function to get plan details
export function getPlanDetails(planName: PlanName) {
  return PLAN_LIMITS[planName]
}

// IMPROVED: Better error handling and type safety
export async function checkUsageLimit(userId: string, supabase: any) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

    // Get user's current usage from the new tracking table
    const { data: usage, error: usageError } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error(`Failed to check usage: ${usageError.message}`)
    }

    // Get user's subscription/plan
    const { data: plan } = await supabase
      .from('user_plans')
      .select('plan_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    const planName = (plan?.plan_type || 'free') as PlanName
    const planLimits = getPlanDetails(planName)

    const currentUsage = usage?.usage_count || 0

    // If no usage record exists, create one
    if (!usage) {
      const { error: insertError } = await supabase
        .from('user_usage_tracking')
        .insert({
          user_id: userId,
          month_year: currentMonth,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to initialize usage tracking:', insertError)
      }
    }

    const canGenerate =
      planLimits.generations === -1 || currentUsage < planLimits.generations

    return {
      canGenerate,
      used: currentUsage,
      limit: planLimits.generations,
      planName,
    }
  } catch (error) {
    console.error('Error checking usage limit:', error)
    throw error
  }
}

// IMPROVED: Better error handling
export async function incrementUsage(userId: string, supabase: any) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7)

    const { error } = await supabase.from('user_usage_tracking').upsert(
      {
        user_id: userId,
        month_year: currentMonth,
        usage_count: supabase.raw('COALESCE(usage_count, 0) + 1'),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,month_year',
        ignoreDuplicates: false,
      }
    )

    if (error) {
      throw new Error(`Failed to update usage: ${error.message}`)
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    throw error
  }
}
