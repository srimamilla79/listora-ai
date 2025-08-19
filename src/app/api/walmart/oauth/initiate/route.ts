// app/api/walmart/oauth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Generate alphanumeric string without hyphens
function generateAlphanumericId(length: number = 10): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase()
}

function authBase() {
  // For Walmart App Store OAuth, use their SSO URL
  return 'https://login.account.wal-mart.com/authorize'
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSideClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Generate state without hyphens
    const state = generateAlphanumericId(10)

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
  let state = resumeState || generateAlphanumericId(10)

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

  // Walmart App Store OAuth parameters
  u.searchParams.set('responseType', 'code')
  u.searchParams.set('clientId', process.env.WALMART_CLIENT_ID!)
  u.searchParams.set('redirectUri', process.env.WALMART_REDIRECT_URI!)
  u.searchParams.set('state', state)
  u.searchParams.set('clientType', 'seller')

  // Generate nonce without hyphens (8-10 characters)
  const nonce = generateAlphanumericId(8)
  u.searchParams.set('nonce', nonce)

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
  res.cookies.set('wm_oauth_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    maxAge: 600,
    path: '/',
  })
  return res
}
