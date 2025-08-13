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

    // Get the auth token from request cookies
    const cookieStore = request.cookies

    // The cookie name format: sb-<project-ref>-auth-token
    const projectRef = process.env
      .NEXT_PUBLIC_SUPABASE_URL!.split('//')[1]
      .split('.')[0]
    const cookieName = `sb-${projectRef}-auth-token`

    const authCookie = cookieStore.get(cookieName)

    if (!authCookie) {
      console.log('❌ No auth cookie found, redirecting to login')
      // No auth cookie, redirect to login
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set(
        'redirect',
        `/api/walmart/oauth/app-login?state=${state}&walmartCallbackUri=${encodeURIComponent(walmartCallbackUri)}`
      )
      return NextResponse.redirect(loginUrl.toString())
    }

    // Parse the cookie value to get user ID
    let userId = null
    try {
      const cookieValue = authCookie.value
      console.log('🔍 Auth cookie found, parsing...')

      // Try to parse as JSON
      let tokenData
      try {
        tokenData = JSON.parse(cookieValue)
      } catch {
        // If not JSON, use the raw value
        tokenData = cookieValue
      }

      // Extract access token
      let accessToken
      if (Array.isArray(tokenData)) {
        accessToken = tokenData[0]
      } else if (typeof tokenData === 'object' && tokenData.access_token) {
        accessToken = tokenData.access_token
      } else if (typeof tokenData === 'string') {
        accessToken = tokenData
      }

      if (accessToken) {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(accessToken)
        if (user && !error) {
          userId = user.id
          console.log('✅ User authenticated:', userId)
        } else {
          console.log('❌ Failed to get user:', error)
        }
      }
    } catch (err) {
      console.error('❌ Error parsing auth cookie:', err)
    }

    if (!userId) {
      console.log('❌ No user ID found after parsing, redirecting to login')
      // Still no user, redirect to login
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
