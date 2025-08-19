import { NextRequest, NextResponse } from 'next/server'

const CLIENT_ID = process.env.WALMART_CLIENT_ID!
const REDIRECT_URI = process.env.WALMART_REDIRECT_URI!
const ENV = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()

function getAuthBase() {
  // ✅ CORRECTED Walmart authorize endpoints
  return ENV === 'sandbox'
    ? 'https://sandbox.walmart.com/v3/mp/auth/authorize'
    : 'https://seller.walmart.com/v3/mp/auth/authorize'
}

function buildAuthUrl(state: string) {
  const u = new URL(getAuthBase())
  // ✅ CORRECTED parameter names for Walmart
  u.searchParams.set('clientId', CLIENT_ID) // Changed from 'client_id'
  u.searchParams.set('redirectUri', REDIRECT_URI) // Changed from 'redirect_uri'
  u.searchParams.set('responseType', 'code') // Changed from 'response_type'
  u.searchParams.set('state', state)
  return u.toString()
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const userId = (sp.get('user_id') || '').trim()
  const state = (sp.get('state') || crypto.randomUUID()).trim()

  // If not logged in, send to login with a simple walmart_oauth marker.
  if (!userId) {
    const res = NextResponse.redirect(
      new URL(
        `/login?walmart_oauth=${encodeURIComponent(state)}`,
        req.nextUrl.origin
      )
    )
    res.cookies.set('wm_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 10 * 60,
    })
    return res
  }

  // Logged-in path: set short-lived cookies to tie the flow to this user and state
  const authUrl = buildAuthUrl(state)
  const res = NextResponse.redirect(authUrl)
  res.cookies.set('wm_oauth_user', userId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60,
  })
  res.cookies.set('wm_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 10 * 60,
  })
  return res
}
