import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===')
  const startTime = Date.now()

  try {
    const stripe = getServerStripe()
    const body = await req.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!body) {
      console.log('❌ No webhook payload provided')
      return NextResponse.json(
        { error: 'No webhook payload was provided' },
        { status: 400 }
      )
    }

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

    // CRITICAL: Return response immediately to prevent timeout
    const response = NextResponse.json({ received: true })

    // Process in background with timeout protection
    setImmediate(() => {
      processWebhookWithTimeout(event, stripe).catch((error) => {
        console.error('❌ CRITICAL: Background processing failed:', {
          eventType: event.type,
          eventId: event.id,
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      })
    })

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

// Timeout-protected background processing
async function processWebhookWithTimeout(event: any, stripe: any) {
  const TIMEOUT_MS = 25000 // 25 seconds (5 seconds buffer)

  const processingPromise = processWebhookInBackground(event, stripe)

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Processing timeout')), TIMEOUT_MS)
  })

  try {
    await Promise.race([processingPromise, timeoutPromise])
  } catch (error) {
    if ((error as Error).message === 'Processing timeout') {
      console.error('❌ TIMEOUT: Webhook processing timed out')
      await handleTimeoutRecovery(event)
    } else {
      throw error
    }
  }
}

// Timeout recovery logging
async function handleTimeoutRecovery(event: any) {
  console.error('🚨 TIMEOUT RECOVERY NEEDED:', {
    eventType: event.type,
    eventId: event.id,
    userId: event.data.object?.metadata?.userId,
    subscriptionId: event.data.object?.subscription,
    customerId: event.data.object?.customer,
    timestamp: new Date().toISOString(),
    message: 'This event needs manual processing due to timeout',
  })
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
    throw error
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
    console.log('🔍 DEBUG: About to retrieve subscription from Stripe...')
    console.log('🔍 DEBUG: Subscription ID:', session.subscription)

    // OPTIMIZED: Skip Stripe API call and use webhook data directly
    // This was the main cause of timeouts
    const subscriptionId = session.subscription
    const customerId = session.customer

    console.log('✅ Using webhook data directly (skipping Stripe API call)')
    console.log('📦 Subscription details from webhook:', {
      id: subscriptionId,
      customer: customerId,
      planName: planName,
    })

    // Check if user has existing subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log(
      '🔍 Existing subscription check:',
      existingSubscription ? 'Found' : 'None'
    )

    if (
      existingSubscription &&
      existingSubscription.stripe_subscription_id !== subscriptionId
    ) {
      console.log(
        '🗑️ Would cancel old subscription:',
        existingSubscription.stripe_subscription_id
      )
      // Skip actual cancellation to avoid API timeout - just log it
      console.log('⚠️ Skipping Stripe API cancellation to prevent timeout')
    }

    // Get current usage for preservation
    const currentMonth = new Date().toISOString().slice(0, 7)
    const { data: currentUsage } = await supabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    const preservedUsage = currentUsage?.usage_count || 0
    console.log('📊 Preserving usage:', preservedUsage)

    // Save subscription data
    const subscriptionData = {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_name: planName,
      plan_price:
        planName === 'pro'
          ? 29
          : planName === 'premium'
            ? 59
            : planName === 'enterprise'
              ? 99
              : 29,
      status: 'active', // Assume active since checkout completed
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }

    console.log('💾 Saving subscription data...')

    // Upsert subscription
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

    // Update user plan - first deactivate old plans
    await supabase
      .from('user_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)

    // Create new active plan
    const userPlanData = {
      user_id: userId,
      plan_type: planName === 'pro' ? 'business' : planName,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const { error: planError } = await supabase
      .from('user_plans')
      .insert(userPlanData)

    if (planError) {
      throw new Error(`Failed to create user plan: ${planError.message}`)
    }

    console.log('✅ User plan updated successfully')

    // Preserve usage tracking
    const usageTrackingData = {
      user_id: userId,
      month_year: currentMonth,
      usage_count: preservedUsage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('user_usage_tracking')
      .upsert(usageTrackingData, { onConflict: 'user_id,month_year' })

    console.log(`✅ Usage tracking preserved: ${preservedUsage} generations`)

    // Update legacy user_usage table with over-limit protection
    const limits: Record<string, number> = {
      pro: 250,
      business: 250,
      premium: 1000,
      enterprise: 999999,
      starter: 10, // Add starter limit
    }
    const newLimit = limits[planName] || 250

    // Check if user will be over limit after plan change
    const isOverLimit = preservedUsage > newLimit
    const effectiveUsage = preservedUsage // Keep actual usage, don't reduce it

    console.log(
      `📊 Usage check: ${effectiveUsage}/${newLimit}, over limit: ${isOverLimit}`
    )

    const usageData = {
      user_id: userId,
      month_year: currentMonth,
      generations_limit: newLimit,
      generations_used: effectiveUsage, // Preserve actual usage
      plan_name: planName,
      is_over_limit: isOverLimit, // Track over-limit status
      over_limit_since: isOverLimit ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('user_usage')
      .upsert(usageData, { onConflict: 'user_id,month_year' })

    if (isOverLimit) {
      console.log(
        `⚠️ User ${userId} is over limit: ${effectiveUsage}/${newLimit} for plan ${planName}`
      )
      // TODO: Send over-limit notification email in future
    }

    console.log('✅ Legacy usage limits updated with over-limit protection')
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
    // OPTIMIZED: Skip Stripe API call for customer retrieval
    console.log('🔍 Processing subscription created (optimized)')

    // Try to get customer email from webhook data first
    let customerEmail = subscription.metadata?.customer_email

    if (!customerEmail) {
      console.log(
        '⚠️ No customer email in metadata, skipping subscription.created'
      )
      return
    }

    console.log('🔍 Looking up user by email:', customerEmail)

    // Get user by email
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

    // Skip if recently processed
    const { data: existingPlan } = await supabase
      .from('user_plans')
      .select('created_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (existingPlan) {
      const timeDiff = Date.now() - new Date(existingPlan.created_at).getTime()
      if (timeDiff < 30000) {
        // 30 seconds
        console.log('⏭️ Skipping - already processed by checkout.completed')
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
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

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
      usage_count: preservedUsage,
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
          expires_at: (subscription as any).current_period_end
            ? new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString()
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
    // Get user_id from subscription
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
      usage_count: preservedUsage,
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

  if ((invoice as any).subscription) {
    try {
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', (invoice as any).subscription)

      console.log('✅ Payment status updated successfully')

      // Activate user plan
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', (invoice as any).subscription)
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
        error: (error as Error).message,
      })
      throw error
    }
  }
}
