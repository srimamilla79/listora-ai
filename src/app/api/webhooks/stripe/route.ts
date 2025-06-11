import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerStripe } from '@/lib/supabase'
import { createServerClient } from '@supabase/ssr'

// Service role client for database operations
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===')
  const startTime = Date.now()

  try {
    const stripe = getServerStripe()
    const body = await req.text()

    if (!body) {
      console.log('❌ No webhook payload provided')
      return NextResponse.json(
        { error: 'No webhook payload was provided' },
        { status: 400 }
      )
    }

    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig) {
      console.log('❌ No Stripe signature provided')
      return NextResponse.json(
        { error: 'No Stripe signature provided' },
        { status: 400 }
      )
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      console.log(`❌ Webhook signature verification failed.`, err.message)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log(`✅ Received Stripe webhook: ${event.type}`)

    const supabase = createServiceRoleClient()

    // Handle only the events we care about for faster processing
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event, stripe, supabase)
        break
      }
      case 'customer.subscription.created': {
        await handleSubscriptionCreated(event, stripe, supabase)
        break
      }
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event, supabase)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event, supabase)
        break
      }
      case 'invoice.payment_succeeded': {
        await handlePaymentSucceeded(event, supabase)
        break
      }
      default:
        console.log(`🔔 Unhandled event type: ${event.type}`)
    }

    const processingTime = Date.now() - startTime
    console.log(`⚡ Webhook processed in ${processingTime}ms`)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(event: any, stripe: any, supabase: any) {
  console.log('💳 Processing checkout session completed')

  const session = event.data.object
  const userId = session.metadata?.userId
  const planName = session.metadata?.plan || 'pro'

  console.log('Session metadata:', {
    userId,
    planName,
    customer: session.customer,
  })

  if (!userId) {
    console.log('❌ No userId in session metadata')
    return
  }

  if (!session.subscription) {
    console.log('❌ No subscription in checkout session')
    return
  }

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription
    )

    console.log('📦 Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      planName: planName,
    })

    // Save subscription to user_subscriptions table
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscription.id,
      plan_name: planName,
      plan_price: subscription.items.data[0]?.price?.unit_amount
        ? subscription.items.data[0].price.unit_amount / 100
        : 29,
      status: subscription.status,
      current_period_start: (subscription as any).current_period_start
        ? new Date(
            (subscription as any).current_period_start * 1000
          ).toISOString()
        : new Date().toISOString(),
      current_period_end: (subscription as any).current_period_end
        ? new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: (subscription as any).cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    }

    console.log('💾 Saving subscription data for user:', userId)

    // Use upsert for user_subscriptions (this works fine)
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    if (subscriptionError) {
      console.log('❌ Error saving subscription:', subscriptionError)
    } else {
      console.log('✅ Subscription saved successfully')
    }

    // 🔧 BULLETPROOF FIX: Use DELETE + INSERT for user_plans
    console.log('📋 Updating user_plans table...')

    // Delete any existing active plans for this user (more reliable than UPDATE)
    await supabase
      .from('user_plans')
      .delete()
      .eq('user_id', userId)
      .eq('is_active', true)

    console.log('🗑️ Deleted existing active plans')

    // Then, insert the new plan
    const userPlanData = {
      user_id: userId,
      plan_type: planName === 'pro' ? 'business' : planName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: (subscription as any).current_period_end
        ? new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString()
        : null,
    }

    const { error: planError } = await supabase
      .from('user_plans')
      .insert(userPlanData)

    if (planError) {
      console.log('❌ Error updating user_plans:', planError)
    } else {
      console.log('✅ User plan updated successfully')
    }

    // Update usage limits in user_usage_tracking table
    const limits = { pro: 500, premium: 2000, enterprise: 10000 }
    const limit = limits[planName as keyof typeof limits] || 500
    const currentMonth = new Date().toISOString().slice(0, 7)

    const usageData = {
      user_id: userId,
      month_year: currentMonth,
      generations_limit: limit,
      generations_used: 0,
      plan_name: planName,
      updated_at: new Date().toISOString(),
    }

    console.log('📊 Updating usage limits:', limit)

    // Update user_usage_tracking table for consistent usage tracking
    const usageTrackingData = {
      user_id: userId,
      month_year: currentMonth,
      usage_count: 0, // Reset usage for new plan
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: usageTrackingError } = await supabase
      .from('user_usage_tracking')
      .upsert(usageTrackingData, { onConflict: 'user_id,month_year' })

    if (usageTrackingError) {
      console.log('❌ Error updating usage tracking:', usageTrackingError)
    } else {
      console.log('✅ Usage tracking updated')
    }

    // Legacy user_usage table (if you still use it)
    const { error: usageError } = await supabase
      .from('user_usage')
      .upsert(usageData, { onConflict: 'user_id,month_year' })

    if (usageError) {
      console.log('❌ Error updating usage:', usageError)
    } else {
      console.log('✅ Usage limits updated')
    }
  } catch (error) {
    console.error('❌ Error in checkout completed handler:', error)
  }
}

async function handleSubscriptionCreated(
  event: any,
  stripe: any,
  supabase: any
) {
  console.log('🆕 Processing subscription created')

  const subscription = event.data.object

  try {
    // Get customer email to find user
    const customer = await stripe.customers.retrieve(subscription.customer)
    const customerEmail = (customer as any).email

    if (!customerEmail) {
      console.log('❌ No customer email found')
      return
    }

    console.log('🔍 Looking up user by email:', customerEmail)

    // Find user by email using admin API
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers()

    if (error) {
      console.log('❌ Error listing users:', error)
      return
    }

    const user = users.find((u: any) => u.email === customerEmail)

    if (!user) {
      console.log('❌ No user found with email:', customerEmail)
      return
    }

    console.log('✅ Found user:', user.id)

    // 🔧 DEDUPLICATION CHECK: Skip if already processed by checkout.completed
    const { data: existingPlan } = await supabase
      .from('user_plans')
      .select('id, plan_type, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingPlan) {
      // Check if this plan was created very recently (within last 30 seconds)
      const planCreatedAt = new Date(existingPlan.created_at)
      const now = new Date()
      const timeDifference = now.getTime() - planCreatedAt.getTime()

      if (timeDifference < 30000) {
        // 30 seconds
        console.log(
          '⏭️ Skipping subscription.created - already processed by checkout.completed'
        )
        console.log(
          `   Existing plan: ${existingPlan.plan_type}, created ${Math.round(timeDifference / 1000)}s ago`
        )
        return
      }
    }

    // Determine plan from price ID
    let planName = 'pro'
    const priceId = subscription.items.data[0]?.price?.id

    if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
      planName = 'premium'
    } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
      planName = 'enterprise'
    }

    // Save subscription to user_subscriptions
    const subscriptionData = {
      user_id: user.id,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan_name: planName,
      current_period_start: (subscription as any).current_period_start
        ? new Date(
            (subscription as any).current_period_start * 1000
          ).toISOString()
        : new Date().toISOString(),
      current_period_end: (subscription as any).current_period_end
        ? new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Use upsert for user_subscriptions (this works fine)
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    if (subError) {
      console.error('❌ Error creating subscription:', subError)
    } else {
      console.log('✅ Subscription created successfully')
    }

    // 🔧 BULLETPROOF FIX: Use DELETE + INSERT for user_plans
    console.log('📋 Updating user_plans table from subscription created...')

    // Delete existing active plans
    await supabase
      .from('user_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', true)

    console.log('🗑️ Deleted existing active plans')

    // Insert new plan
    const userPlanData = {
      user_id: user.id,
      plan_type: planName === 'pro' ? 'business' : planName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: (subscription as any).current_period_end
        ? new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString()
        : null,
    }

    const { error: planError } = await supabase
      .from('user_plans')
      .insert(userPlanData)

    if (planError) {
      console.log('❌ Error updating user_plans from subscription:', planError)
    } else {
      console.log('✅ User plan created from subscription')
    }
  } catch (error) {
    console.error('❌ Error in subscription created handler:', error)
  }
}

async function handleSubscriptionUpdated(event: any, supabase: any) {
  console.log('📝 Processing subscription updated')

  const subscription = event.data.object

  try {
    // Update user_subscriptions table
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: (subscription as any).current_period_start
          ? new Date(
              (subscription as any).current_period_start * 1000
            ).toISOString()
          : new Date().toISOString(),
        current_period_end: (subscription as any).current_period_end
          ? new Date(
              (subscription as any).current_period_end * 1000
            ).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end:
          (subscription as any).cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.log('❌ Error updating subscription:', error)
    } else {
      console.log('✅ Subscription updated successfully')
    }

    // Also update user_plans table
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('user_id, plan_name')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (subData) {
      // Update expires_at in user_plans
      const { error: planError } = await supabase
        .from('user_plans')
        .update({
          expires_at: (subscription as any).current_period_end
            ? new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', subData.user_id)
        .eq('is_active', true)

      if (planError) {
        console.log('❌ Error updating user_plans expires_at:', planError)
      } else {
        console.log('✅ User plan expires_at updated')
      }
    }
  } catch (error) {
    console.error('❌ Error in subscription updated handler:', error)
  }
}

async function handleSubscriptionDeleted(event: any, supabase: any) {
  console.log('🗑️ Processing subscription deleted')

  const subscription = event.data.object

  try {
    // Update user_subscriptions table
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.log('❌ Error canceling subscription:', error)
    } else {
      console.log('✅ Subscription canceled successfully')
    }

    // Also deactivate user_plans and revert to starter
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (subData) {
      // 🔧 BULLETPROOF FIX: Delete all plans
      await supabase.from('user_plans').delete().eq('user_id', subData.user_id)

      console.log('🗑️ Deleted all user plans')

      // Insert starter plan
      const starterPlanData = {
        user_id: subData.user_id,
        plan_type: 'starter',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
      }

      const { error: starterError } = await supabase
        .from('user_plans')
        .insert(starterPlanData)

      if (starterError) {
        console.log('❌ Error reverting to starter plan:', starterError)
      } else {
        console.log('✅ User reverted to starter plan')
      }
    }
  } catch (error) {
    console.error('❌ Error in subscription deleted handler:', error)
  }
}

async function handlePaymentSucceeded(event: any, supabase: any) {
  console.log('✅ Processing payment succeeded')

  const invoice = event.data.object

  if (invoice.subscription) {
    try {
      // Update user_subscriptions table
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        console.error('❌ Error updating payment status:', error)
      } else {
        console.log('✅ Payment status updated successfully')
      }

      // Ensure user_plans is also active
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single()

      if (subData) {
        const { error: planError } = await supabase
          .from('user_plans')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', subData.user_id)
          .neq('plan_type', 'starter')

        if (planError) {
          console.log('❌ Error activating user plan:', planError)
        } else {
          console.log('✅ User plan activated')
        }
      }
    } catch (error) {
      console.error('❌ Error in payment succeeded handler:', error)
    }
  }
}
