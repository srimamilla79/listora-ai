// src/app/api/walmart/oauth/initiate/route.ts
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
    const userId = searchParams.get('user_id')
    const walmartCallbackUri = searchParams.get('walmartCallbackUri')

    console.log('🛒 Walmart OAuth initiate called')
    console.log('📝 User ID:', userId)
    console.log('🔗 Walmart Callback URI:', walmartCallbackUri)

    // Case 1: Called from Walmart App Store with walmartCallbackUri
    if (walmartCallbackUri) {
      console.log('🏪 Called from Walmart App Store - showing app login page')

      // Store the Walmart callback URI in session/state for later use
      const state = crypto.randomBytes(16).toString('hex')

      await supabase.from('oauth_states').insert({
        user_id: 'pending', // Will be updated after login
        platform: 'walmart',
        state: state,
        nonce: walmartCallbackUri, // Store Walmart callback URI in nonce field temporarily
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      // Redirect to your app's login page with state
      const loginUrl = new URL(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/walmart/oauth/app-login`
      )
      loginUrl.searchParams.set('state', state)
      loginUrl.searchParams.set('walmartCallbackUri', walmartCallbackUri)

      console.log('🔐 Redirecting to app login page:', loginUrl.toString())
      return NextResponse.redirect(loginUrl.toString())
    }

    // Case 2: Called from your app directly (user already logged in)
    if (!walmartCallbackUri && userId) {
      console.log('🔗 Direct connection from app - user already authenticated')

      // Generate state for this connection
      const state = `${userId}-${crypto.randomBytes(16).toString('hex')}`

      await supabase.from('oauth_states').insert({
        user_id: userId,
        platform: 'walmart',
        state: state,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      // Redirect directly to Walmart authorization
      const clientId = process.env.WALMART_CLIENT_ID!
      const redirectUri = process.env.WALMART_REDIRECT_URI!
      const nonce = crypto.randomBytes(8).toString('hex')

      const walmartAuthUrl = new URL(
        'https://login.account.wal-mart.com/authorize'
      )
      walmartAuthUrl.searchParams.set('responseType', 'code')
      walmartAuthUrl.searchParams.set('clientId', clientId)
      walmartAuthUrl.searchParams.set('redirectUri', redirectUri)
      walmartAuthUrl.searchParams.set('clientType', 'seller')
      walmartAuthUrl.searchParams.set('nonce', nonce)
      walmartAuthUrl.searchParams.set('state', state)

      console.log(
        '🔐 Redirecting to Walmart authorization:',
        walmartAuthUrl.toString()
      )
      return NextResponse.redirect(walmartAuthUrl.toString())
    }

    // Invalid request
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ OAuth initiation error:', error)

    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_failed&message=${encodeURIComponent('Failed to initiate Walmart OAuth')}`
    return NextResponse.redirect(errorUrl)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
