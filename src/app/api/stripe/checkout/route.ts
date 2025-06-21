import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServerStripe } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  console.log('=== CHECKOUT API DEBUG START ===')

  try {
    const { plan } = await req.json()
    console.log('1. Plan requested:', plan)

    // Get authentication quickly - try Authorization header first for speed
    const authHeader = req.headers.get('authorization')
    let authenticatedUser = null

    if (authHeader?.startsWith('Bearer ')) {
      console.log('2. Using Authorization header (faster)...')
      const accessToken = authHeader.replace('Bearer ', '')

      const tokenSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: () => null,
            set: () => {},
            remove: () => {},
          },
        }
      )

      await tokenSupabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      })

      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await tokenSupabase.auth.getUser()

      if (tokenUser && !tokenError) {
        authenticatedUser = tokenUser
        console.log('3. Token auth successful:', tokenUser.id)
      }
    }

    // Fallback to cookies if token auth failed
    if (!authenticatedUser) {
      console.log('3. Fallback to cookie authentication...')
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options)
            },
            remove(name: string, options: any) {
              cookieStore.delete(name)
            },
          },
        }
      )

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (user && !authError) {
        authenticatedUser = user
        console.log('4. Cookie auth successful:', user.id)
      }
    }

    if (!authenticatedUser) {
      console.log('5. Authentication failed')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(
      '5. Final authenticated user:',
      authenticatedUser.id,
      authenticatedUser.email
    )

    const plans = {
      pro: {
        name: 'Pro',
        priceId: process.env.STRIPE_PRO_PRICE_ID!,
        price: 29,
      },
      premium: {
        name: 'Premium',
        priceId: process.env.STRIPE_PREMIUM_PRICE_ID!,
        price: 59,
      },
      enterprise: {
        name: 'Enterprise',
        priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
        price: 99,
      },
    }

    const selectedPlan = plans[plan as keyof typeof plans]
    if (!selectedPlan) {
      console.log('6. ERROR: Invalid plan:', plan)
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    console.log('6. Plan details:', selectedPlan)

    const stripe = getServerStripe()
    console.log('7. Creating Stripe checkout session...')

    const session = await stripe.checkout.sessions.create({
      customer_email: authenticatedUser.email!,
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: authenticatedUser.id,
        plan: plan,
        email: authenticatedUser.email!,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price.toString(),
      },
      subscription_data: {
        metadata: {
          userId: authenticatedUser.id,
          plan: plan,
          planName: selectedPlan.name,
          userEmail: authenticatedUser.email!,
        },
      },
      // Remove customer_creation - not needed for subscription mode
    })

    console.log('8. Checkout session created:', session.id)
    console.log('9. Session URL created successfully')

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('=== CHECKOUT API ERROR ===')
    console.error('Error details:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
