import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerStripe } from '@/lib/supabase'
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

    // Return response immediately to prevent timeout
    const response = NextResponse.json({ received: true })

    // Process webhook in background
    processWebhookInBackground(event, stripe).catch(console.error)

    const processingTime = Date.now() - startTime
    console.log(`⚡ Webhook acknowledged in ${processingTime}ms`)

    return response
  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Background processing to prevent timeouts
async function processWebhookInBackground(event: any, stripe: any) {
  const supabase = createServiceRoleClient()
  const processingStart = Date.now()

  try {
    console.log(`🔄 Background processing: ${event.type}`)

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

    const processingTime = Date.now() - processingStart
    console.log(`✅ Background processing completed in ${processingTime}ms`)
  } catch (error) {
    console.error('❌ CRITICAL: Background processing failed:', {
      eventType: event.type,
      eventId: event.id,
      error: (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString(),
    })

    // 🚨 ADD ALERT MECHANISM - uncomment and configure for your monitoring service
    // await sendAlertToMonitoring(error, event)
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
    sessionId: session.id,
  })

  if (!userId) {
    throw new Error(`No userId in session metadata for session: ${session.id}`)
  }

  if (!session.subscription) {
    throw new Error(`No subscription in checkout session: ${session.id}`)
  }

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
      {
        expand: ['items.data.price'], // Only expand what we need
      }
    )

    console.log('📦 Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      planName: planName,
    })

    // Check if user has existing subscription and handle it
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (existingSubscription) {
      console.log('🔄 Updating existing subscription for user:', userId)

      // Cancel old subscription in Stripe if different
      if (existingSubscription.stripe_subscription_id !== subscription.id) {
        console.log(
          '🗑️ Canceling old subscription:',
          existingSubscription.stripe_subscription_id
        )
        try {
          await stripe.subscriptions.cancel(
            existingSubscription.stripe_subscription_id
          )
        } catch (cancelError) {
          console.warn(
            '⚠️ Could not cancel old subscription:',
            (cancelError as Error).message
          )
          // Don't fail the entire process for this
        }
      }
    }

    // Get current usage before updating plan (PRESERVATION LOGIC)
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: currentUsage } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    const preservedUsage = currentUsage?.usage_count || 0
    console.log('📊 Preserving usage:', preservedUsage)

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
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    }

    console.log('💾 Saving subscription data:', subscriptionData)

    // Use upsert with the unique constraint now in place
    const { error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    if (subscriptionError) {
      throw new Error(
        `Failed to save subscription: ${subscriptionError.message}`
      )
    }

    console.log('✅ Subscription saved successfully')

    // Update user plan using transaction approach
    // First deactivate old plans
    const { error: deactivateError } = await supabase
      .from('user_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (deactivateError) {
      throw new Error(
        `Failed to deactivate old plans: ${deactivateError.message}`
      )
    }

    // Then create new active plan
    const userPlanData = {
      user_id: userId,
      plan_type: planName === 'pro' ? 'business' : planName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const { error: planError } = await supabase
      .from('user_plans')
      .insert(userPlanData)

    if (planError) {
      throw new Error(`Failed to create user plan: ${planError.message}`)
    }

    console.log('✅ User plan updated successfully')

    // PRESERVE USAGE: Update usage tracking with preserved usage
    const usageTrackingData = {
      user_id: userId,
      month_year: currentMonth,
      usage_count: preservedUsage, // ✅ PRESERVE USAGE (not reset to 0)
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: usageTrackingError } = await supabase
      .from('user_usage_tracking')
      .upsert(usageTrackingData, { onConflict: 'user_id,month_year' })

    if (usageTrackingError) {
      throw new Error(
        `Failed to update usage tracking: ${usageTrackingError.message}`
      )
    }

    console.log(`✅ Usage tracking preserved: ${preservedUsage} generations`)

    // Update legacy user_usage table (if still needed)
    const limits = {
      pro: 250,
      business: 250,
      premium: 1000,
      enterprise: 999999,
    }
    const limit = limits[planName as keyof typeof limits] || 250

    const usageData = {
      user_id: userId,
      month_year: currentMonth,
      generations_limit: limit,
      generations_used: preservedUsage, // ✅ PRESERVE USAGE
      plan_name: planName,
      updated_at: new Date().toISOString(),
    }

    const { error: usageError } = await supabase
      .from('user_usage')
      .upsert(usageData, { onConflict: 'user_id,month_year' })

    if (usageError) {
      throw new Error(`Failed to update legacy usage: ${usageError.message}`)
    }

    console.log('✅ Legacy usage limits updated')
    console.log(
      '🎉 Checkout completed successfully for user:',
      userId,
      'plan:',
      planName
    )
  } catch (error) {
    console.error('❌ CRITICAL ERROR in checkout completed handler:', {
      userId,
      sessionId: session.id,
      planName,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })

    // Re-throw to trigger monitoring alerts
    throw error
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
    // Optimized: Get customer email without full retrieve
    const customerId = subscription.customer
    let customerEmail = null

    // Try to get email from subscription metadata first (faster)
    if (subscription.metadata?.customer_email) {
      customerEmail = subscription.metadata.customer_email
    } else {
      // Fallback to customer retrieve
      const customer = await stripe.customers.retrieve(customerId)
      customerEmail = (customer as any).email
    }

    if (!customerEmail) {
      throw new Error(
        'No customer email found for subscription: ' + subscription.id
      )
    }

    console.log('🔍 Looking up user by email:', customerEmail)

    // Get user by email using listUsers (getUserByEmail doesn't exist in this version)
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers()

    if (error) {
      throw new Error(`Error listing users: ${error.message}`)
    }

    const user = users.find((u: any) => u.email === customerEmail)

    if (!user) {
      throw new Error(`No user found with email: ${customerEmail}`)
    }

    console.log('✅ Found user:', user.id)

    // Deduplication check: Skip if already processed recently
    const { data: existingPlan } = await supabase
      .from('user_plans')
      .select('id, plan_type, created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingPlan) {
      const planCreatedAt = new Date(existingPlan.created_at)
      const now = new Date()
      const timeDifference = now.getTime() - planCreatedAt.getTime()

      if (timeDifference < 30000) {
        // 30 seconds
        console.log(
          '⏭️ Skipping subscription.created - already processed by checkout.completed'
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

    // Get current usage for preservation
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: currentUsage } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', user.id)
      .eq('month_year', currentMonth)
      .single()

    const preservedUsage = currentUsage?.usage_count || 0

    // Save subscription
    const subscriptionData = {
      user_id: user.id,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      plan_name: planName,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error: subError } = await supabase
      .from('user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    if (subError) {
      throw new Error(`Failed to create subscription: ${subError.message}`)
    }

    console.log('✅ Subscription created successfully')

    // Update user plan with usage preservation
    await supabase
      .from('user_plans')
      .delete()
      .eq('user_id', user.id)
      .eq('is_active', true)

    const userPlanData = {
      user_id: user.id,
      plan_type: planName === 'pro' ? 'business' : planName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const { error: planError } = await supabase
      .from('user_plans')
      .insert(userPlanData)

    if (planError) {
      throw new Error(
        `Failed to update user_plans from subscription: ${planError.message}`
      )
    }

    console.log('✅ User plan created from subscription')

    // Preserve usage
    const usageTrackingData = {
      user_id: user.id,
      month_year: currentMonth,
      usage_count: preservedUsage, // ✅ PRESERVE USAGE
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('user_usage_tracking')
      .upsert(usageTrackingData, { onConflict: 'user_id,month_year' })

    console.log(`✅ Usage preserved: ${preservedUsage} generations`)
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription created handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })
    throw error
  }
}

async function handleSubscriptionUpdated(event: any, supabase: any) {
  console.log('📝 Processing subscription updated')

  const subscription = event.data.object

  try {
    // Optimized: Single update operation
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        current_period_start: subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`)
    }

    console.log('✅ Subscription updated successfully')

    // Update user_plans expires_at in single query
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (subData) {
      await supabase
        .from('user_plans')
        .update({
          expires_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', subData.user_id)
        .eq('is_active', true)

      console.log('✅ User plan expires_at updated')
    }
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription updated handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })
    throw error
  }
}

async function handleSubscriptionDeleted(event: any, supabase: any) {
  console.log('🗑️ Processing subscription deleted')

  const subscription = event.data.object

  try {
    // Get user_id before operations
    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!subData) {
      throw new Error('No subscription found for deletion: ' + subscription.id)
    }

    // Get current usage for preservation
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: currentUsage } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', subData.user_id)
      .eq('month_year', currentMonth)
      .single()

    const preservedUsage = currentUsage?.usage_count || 0

    // Update subscription status
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`)
    }

    console.log('✅ Subscription canceled successfully')

    // Revert to starter plan
    await supabase.from('user_plans').delete().eq('user_id', subData.user_id)

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
      throw new Error(
        `Failed to revert to starter plan: ${starterError.message}`
      )
    }

    console.log('✅ User reverted to starter plan')

    // Preserve usage when reverting to starter
    const usageTrackingData = {
      user_id: subData.user_id,
      month_year: currentMonth,
      usage_count: preservedUsage, // ✅ PRESERVE USAGE
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('user_usage_tracking')
      .upsert(usageTrackingData, { onConflict: 'user_id,month_year' })

    console.log(
      `✅ Usage preserved during cancellation: ${preservedUsage} generations`
    )
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription deleted handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
      stack: (error as Error).stack,
    })
    throw error
  }
}

async function handlePaymentSucceeded(event: any, supabase: any) {
  console.log('✅ Processing payment succeeded')

  const invoice = event.data.object

  if (invoice.subscription) {
    try {
      // Optimized: Single update operation
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription)

      if (error) {
        throw new Error(`Failed to update payment status: ${error.message}`)
      }

      console.log('✅ Payment status updated successfully')

      // Activate user plan
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single()

      if (subData) {
        await supabase
          .from('user_plans')
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', subData.user_id)
          .neq('plan_type', 'starter')

        console.log('✅ User plan activated')
      }
    } catch (error) {
      console.error('❌ CRITICAL ERROR in payment succeeded handler:', {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw error
    }
  }
}

// 🚨 ADD MONITORING AND ALERTING (uncomment and configure for your monitoring service)
/*
async function sendAlertToMonitoring(error: Error, event: any) {
  console.error('🚨 WEBHOOK FAILURE ALERT:', {
    error: error.message,
    eventType: event.type,
    eventId: event.id,
    timestamp: new Date().toISOString()
  })
  
  // Add your monitoring service here:
  // await Sentry.captureException(error)
  // await sendEmailAlert(error, event)
  // await sendSlackAlert(error, event)
}
*/
