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

    // If this is the initial call from our app, show our login/connect page
    if (!walmartCallbackUri && userId) {
      // Store user ID in state for later
      const state = `${userId}-${crypto.randomBytes(16).toString('hex')}`

      await supabase.from('oauth_states').insert({
        user_id: userId,
        platform: 'walmart',
        state: state,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })

      // For now, simulate that user is already logged in and redirect to Walmart
      // In a real implementation, you might show a login page here
      const clientId = process.env.WALMART_CLIENT_ID!
      const redirectUri = process.env.WALMART_REDIRECT_URI!
      const nonce = crypto.randomBytes(8).toString('hex')

      // Build the Walmart authorization URL according to their docs
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

    // If Walmart is calling us with their callback URI (from App Store)
    if (walmartCallbackUri) {
      console.log('🏪 Called from Walmart App Store')

      // In production, you'd show your app's login page here
      // For now, we'll redirect directly to Walmart's auth
      const clientId = process.env.WALMART_CLIENT_ID!
      const redirectUri = process.env.WALMART_REDIRECT_URI!
      const nonce = crypto.randomBytes(8).toString('hex')
      const state = crypto.randomBytes(16).toString('hex')

      // Build URL with Walmart's expected parameters
      const authUrl = new URL(walmartCallbackUri)
      authUrl.searchParams.set('responseType', 'code')
      authUrl.searchParams.set('clientId', clientId)
      authUrl.searchParams.set('redirectUri', redirectUri)
      authUrl.searchParams.set('clientType', 'seller')
      authUrl.searchParams.set('nonce', nonce)
      authUrl.searchParams.set('state', state)

      console.log('🔐 Redirecting to Walmart with params:', authUrl.toString())

      return NextResponse.redirect(authUrl.toString())
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
