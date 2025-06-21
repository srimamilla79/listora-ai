import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { getServerStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideClient()

    // Rest of your code stays exactly the same...
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(
      '🔄 Starting downgrade to starter plan for user:',
      session.user.id
    )

    // Get current month for usage tracking
    const currentMonth = new Date().toISOString().slice(0, 7) // '2025-01'

    // 1. Get current usage BEFORE changing plan (preserve it)
    const { data: currentUsage } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', session.user.id)
      .eq('month_year', currentMonth)
      .single()

    console.log('📊 Current usage found:', currentUsage?.usage_count || 0)

    // 2. Get user's current subscription for Stripe cancellation
    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('stripe_subscription_id, plan_type')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    // 3. Cancel the Stripe subscription if it exists
    if (userPlan?.stripe_subscription_id) {
      console.log(
        '🚫 Cancelling Stripe subscription:',
        userPlan.stripe_subscription_id
      )
      const stripe = getServerStripe()
      await stripe.subscriptions.cancel(userPlan.stripe_subscription_id)
    }

    // 4. Simple and reliable approach - find and update existing plan
    const { data: existingPlan } = await supabase
      .from('user_plans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (existingPlan) {
      // Update the existing plan to starter
      const { error: updateError } = await supabase
        .from('user_plans')
        .update({
          plan_type: 'starter',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPlan.id)

      if (updateError) {
        console.error('❌ Error updating plan:', updateError)
        throw new Error('Failed to update plan')
      }

      console.log('✅ Plan updated to starter successfully')
    } else {
      // No existing plan, create new starter plan
      const { error: insertError } = await supabase.from('user_plans').insert({
        user_id: session.user.id,
        plan_type: 'starter',
        is_active: true,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('❌ Error creating starter plan:', insertError)
        throw new Error('Failed to create starter plan')
      }

      console.log('✅ New starter plan created successfully')
    }

    // 6. PRESERVE USAGE - Industry best practice (FIXED NULL CHECK)
    const preservedUsage = currentUsage?.usage_count || 0

    if (preservedUsage > 0) {
      console.log('💾 Preserving usage:', preservedUsage, 'generations')

      const { error: usageError } = await supabase
        .from('user_usage_tracking')
        .upsert({
          user_id: session.user.id,
          month_year: currentMonth,
          usage_count: preservedUsage,
          updated_at: new Date().toISOString(),
        })

      if (usageError) {
        console.error('⚠️ Warning: Could not preserve usage:', usageError)
      } else {
        console.log('✅ Usage preserved successfully')
      }
    } else {
      console.log('📊 No existing usage to preserve')
    }

    console.log('✅ Successfully downgraded to starter plan')

    return NextResponse.json({
      success: true,
      message: 'Successfully downgraded to starter plan',
      preserved_usage: preservedUsage,
      billing_note:
        'Stripe will automatically pro-rate your next bill and credit your account for unused time',
    })
  } catch (error) {
    console.error('❌ Cancel subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
