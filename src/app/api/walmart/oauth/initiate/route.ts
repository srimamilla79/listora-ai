// src/app/api/walmart/oauth/initiate/route.ts
// NEW FILE - Walmart OAuth Initiation with proper state and nonce
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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🛒 Initiating Walmart OAuth for user:', userId)

    const clientId = process.env.WALMART_CLIENT_ID!
    const redirectUri =
      process.env.WALMART_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/walmart/oauth/callback`

    // Generate secure state and nonce
    const state = `${userId}-${crypto.randomBytes(16).toString('hex')}`
    const nonce = crypto.randomBytes(16).toString('hex')

    // Store state in database for validation
    await supabase.from('oauth_states').insert({
      user_id: userId,
      platform: 'walmart',
      state: state,
      nonce: nonce,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })

    // Build Walmart authorization URL
    const authParams = new URLSearchParams({
      responseType: 'code',
      clientId: clientId,
      redirectUri: redirectUri,
      state: state,
      nonce: nonce,
      clientType: 'seller', // For US marketplace
      scope: 'items pricing inventory', // Add required scopes
    })

    const authUrl = `https://login.account.wal-mart.com/authorize?${authParams.toString()}`

    console.log('🔐 Redirecting to Walmart OAuth:', authUrl)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('❌ OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}

// Handle preflight requests for CORS
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
