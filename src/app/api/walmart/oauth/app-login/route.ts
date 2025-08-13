// src/app/api/walmart/oauth/app-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const walmartCallbackUri = searchParams.get('walmartCallbackUri')

    if (!state || !walmartCallbackUri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // For now, we'll simulate that the user is already logged in
    // In a real implementation, you'd show a login form here
    // For demo purposes, we'll use a default user ID or get from session

    // Get the current user from cookies/session
    const cookieStore = request.cookies
    const authCookie = cookieStore.get('sb-auth-token')

    let userId = null

    if (authCookie) {
      try {
        // Parse the auth token to get user ID
        const tokenData = JSON.parse(authCookie.value)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(tokenData.access_token)
        if (user && !error) {
          userId = user.id
        }
      } catch (err) {
        console.error('Error parsing auth cookie:', err)
      }
    }

    // If no user found, redirect to login page
    if (!userId) {
      // Store the Walmart flow info and redirect to login
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set(
        'redirect',
        `/api/walmart/oauth/app-login?state=${state}&walmartCallbackUri=${encodeURIComponent(walmartCallbackUri)}`
      )

      return NextResponse.redirect(loginUrl.toString())
    }

    // User is authenticated, update the state with user ID
    await supabase
      .from('oauth_states')
      .update({ user_id: userId })
      .eq('state', state)

    // Now redirect to Walmart with all required parameters
    const clientId = process.env.WALMART_CLIENT_ID!
    const redirectUri = process.env.WALMART_REDIRECT_URI!
    const nonce = crypto.randomBytes(8).toString('hex')

    const walmartAuthUrl = new URL(walmartCallbackUri)
    walmartAuthUrl.searchParams.set('responseType', 'code')
    walmartAuthUrl.searchParams.set('clientId', clientId)
    walmartAuthUrl.searchParams.set('redirectUri', redirectUri)
    walmartAuthUrl.searchParams.set('clientType', 'seller')
    walmartAuthUrl.searchParams.set('nonce', nonce)
    walmartAuthUrl.searchParams.set('state', state)

    console.log(
      '🔐 User authenticated, redirecting to Walmart:',
      walmartAuthUrl.toString()
    )

    return NextResponse.redirect(walmartAuthUrl.toString())
  } catch (error) {
    console.error('❌ App login error:', error)

    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_failed&message=${encodeURIComponent('Failed during app login')}`
    return NextResponse.redirect(errorUrl)
  }
}
