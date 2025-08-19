// app/api/walmart/oauth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authBase() {
  const env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
  return env === 'sandbox'
    ? 'https://sandbox.walmart.com/v3/mp/auth/authorize'
    : 'https://seller.walmart.com/v3/mp/auth/authorize'
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSideClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Generate state early so we can pass it through the login flow
    const state = randomUUID()

    // Store the pending OAuth state in database even before login
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await admin.from('oauth_states').insert({
      state,
      user_id: null, // Will be updated after login
      platform: 'walmart',
      environment: (
        process.env.WALMART_ENVIRONMENT || 'production'
      ).toLowerCase(),
      created_at: new Date().toISOString(),
      metadata: { pending_login: true },
    })

    // Redirect to login with Walmart OAuth parameters
    const login = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
    login.searchParams.set('walmart_oauth', state)
    login.searchParams.set(
      'redirect',
      `/api/walmart/oauth/initiate?resume=${state}`
    )

    return NextResponse.redirect(login.toString())
  }

  // Check if this is a resume after login
  const resumeState = req.nextUrl.searchParams.get('resume')
  let state = resumeState || randomUUID()

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (resumeState) {
    // Update the existing state with the user_id
    await admin
      .from('oauth_states')
      .update({
        user_id: user.id,
        metadata: { pending_login: false },
      })
      .eq('state', resumeState)
  } else {
    // Create new state
    await admin.from('oauth_states').insert({
      state,
      user_id: user.id,
      platform: 'walmart',
      environment: (
        process.env.WALMART_ENVIRONMENT || 'production'
      ).toLowerCase(),
      created_at: new Date().toISOString(),
    })
  }

  const u = new URL(authBase())
  u.searchParams.set('clientId', process.env.WALMART_CLIENT_ID!)
  u.searchParams.set('redirectUri', process.env.WALMART_REDIRECT_URI!)
  u.searchParams.set('responseType', 'code')
  u.searchParams.set('state', state)

  const res = NextResponse.redirect(u.toString())
  res.cookies.set('wm_oauth_user', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 600,
    path: '/',
  })
  res.cookies.set('wm_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 600,
    path: '/',
  })
  return res
}
