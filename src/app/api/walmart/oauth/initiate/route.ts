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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🛒 Initiating Walmart OAuth for user:', userId)

    const clientId = process.env.WALMART_CLIENT_ID!
    const redirectUri = process.env.WALMART_REDIRECT_URI!
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

    // Generate secure state
    const state = `${userId}-${crypto.randomBytes(16).toString('hex')}`

    // Store state in database for validation
    await supabase.from('oauth_states').insert({
      user_id: userId,
      platform: 'walmart',
      state: state,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })

    // Build Walmart authorization URL - PRODUCTION VERSION
    let authUrl: string

    if (environment === 'production') {
      // Production OAuth URL
      authUrl =
        `https://marketplace.walmartapis.com/v3/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`
    } else {
      // Sandbox OAuth URL
      authUrl =
        `https://sandbox.walmartapis.com/v3/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`
    }

    console.log('🔐 Redirecting to Walmart OAuth:', authUrl)
    console.log('🌍 Environment:', environment)
    console.log('🔑 Client ID:', clientId)
    console.log('🔗 Redirect URI:', redirectUri)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('❌ OAuth initiation error:', error)

    // Redirect to generate page with error
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
