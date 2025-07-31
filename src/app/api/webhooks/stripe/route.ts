import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getServerStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  console.log('=== WEBHOOK RECEIVED ===')
  const startTime = Date.now()

  try {
    // Use your existing Stripe setup
    const stripe = getServerStripe()

    // Get raw body as text
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

    // Return response immediately to prevent timeout
    const response = NextResponse.json({ received: true })

    // Process webhook in background
    processWebhookInBackground(event, stripe).catch((error) => {
      console.error('❌ Background processing failed:', error)
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

    // Get subscription details using the stripe instance
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
      {
        expand: ['items.data.price'],
      }
    )

    console.log('✅ Stripe subscription retrieved successfully')
    console.log('📦 Subscription details:', {
      id: subscription.id,
      status: subscription.status,
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
      existingSubscription.stripe_subscription_id !== subscription.id
    ) {
      console.log(
        '🗑️ Canceling old subscription:',
        existingSubscription.stripe_subscription_id
      )
      try {
        await stripe.subscriptions.cancel(
          existingSubscription.stripe_subscription_id
        )
        console.log('✅ Old subscription canceled')
      } catch (cancelError) {
        console.warn(
          '⚠️ Could not cancel old subscription:',
          (cancelError as Error).message
        )
      }
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

    // Update legacy user_usage table
    const limits: Record<string, number> = {
      pro: 250,
      business: 250,
      premium: 1000,
      enterprise: 999999,
    }
    const limit = limits[planName] || 250

    const usageData = {
      user_id: userId,
      month_year: currentMonth,
      generations_limit: limit,
      generations_used: preservedUsage,
      plan_name: planName,
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('user_usage')
      .upsert(usageData, { onConflict: 'user_id,month_year' })

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
    // Get customer email
    const customer = await stripe.customers.retrieve(subscription.customer)
    const customerEmail = customer.email

    if (!customerEmail) {
      throw new Error(
        'No customer email found for subscription: ' + subscription.id
      )
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

    // Continue with subscription creation logic...
    console.log('✅ Subscription created successfully')
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription created handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
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
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription updated handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
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

    // Update subscription status to canceled
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

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

    await supabase.from('user_plans').insert(starterPlanData)

    console.log('✅ User reverted to starter plan')
  } catch (error) {
    console.error('❌ CRITICAL ERROR in subscription deleted handler:', {
      subscriptionId: subscription.id,
      error: (error as Error).message,
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
    } catch (error) {
      console.error('❌ CRITICAL ERROR in payment succeeded handler:', {
        invoiceId: invoice.id,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
