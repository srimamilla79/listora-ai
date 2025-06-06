// src/lib/stripe.ts
import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance (only use on server)
export const getServerStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  })
}

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Plan configuration
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
  premium: {
    generations: 2000,
    price: 79,
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
    price: 199,
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

// Helper function to check if user can generate content
export async function checkUsageLimit(userId: string, supabase: any) {
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

  // Get user's current usage
  const { data: usage, error: usageError } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', currentMonth)
    .single()

  if (usageError && usageError.code !== 'PGRST116') {
    throw new Error('Failed to check usage')
  }

  // Get user's subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  const planName = subscription?.plan_name || 'free'
  const planLimits = getPlanDetails(planName as PlanName)

  // If no usage record exists, create one
  if (!usage) {
    const { error: insertError } = await supabase.from('user_usage').insert({
      user_id: userId,
      month_year: currentMonth,
      generations_used: 0,
      generations_limit: planLimits.generations,
      plan_name: planName,
    })

    if (insertError) {
      throw new Error('Failed to initialize usage')
    }

    return {
      canGenerate: true,
      used: 0,
      limit: planLimits.generations,
      planName,
    }
  }

  const canGenerate =
    planLimits.generations === -1 ||
    usage.generations_used < planLimits.generations

  return {
    canGenerate,
    used: usage.generations_used,
    limit: planLimits.generations,
    planName,
  }
}

// Helper function to increment usage
export async function incrementUsage(userId: string, supabase: any) {
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { error } = await supabase
    .from('user_usage')
    .update({
      generations_used: supabase.raw('generations_used + 1'),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('month_year', currentMonth)

  if (error) {
    throw new Error('Failed to update usage')
  }
}
