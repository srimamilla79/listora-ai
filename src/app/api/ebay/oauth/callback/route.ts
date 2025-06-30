// src/app/api/ebay/oauth/callback/route.ts
// Fixed eBay OAuth callback with environment-aware URLs

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is our user_id
    const error = searchParams.get('error')

    if (error) {
      console.error('❌ eBay OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?ebay_error=${error}`
      )
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing authorization code or user ID' },
        { status: 400 }
      )
    }

    console.log('✅ eBay OAuth callback received:', {
      code: code.substring(0, 10) + '...',
      userId: state,
      environment: process.env.EBAY_ENVIRONMENT,
    })

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code)

    if (!tokenResponse.access_token) {
      throw new Error('Failed to get access token from eBay')
    }

    // Get eBay seller info
    const sellerInfo = await getEbaySellerInfo(tokenResponse.access_token)

    // Save connection to database
    const { data: connection, error: dbError } = await supabase
      .from('ebay_connections')
      .insert({
        user_id: state,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ).toISOString(),
        seller_info: sellerInfo,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save eBay connection')
    }

    console.log('✅ eBay connection saved:', connection.id)

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?ebay_connected=true`
    )
  } catch (error) {
    console.error('❌ eBay OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?ebay_error=connection_failed`
    )
  }
}

// Helper function to exchange code for token
async function exchangeCodeForToken(code: string) {
  // ✅ ENVIRONMENT-AWARE: Uses production or sandbox based on EBAY_ENVIRONMENT
  const tokenUrl =
    process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token'

  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64')

  console.log(
    `🔄 Exchanging code for token (${process.env.EBAY_ENVIRONMENT}):`,
    tokenUrl
  )

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.EBAY_RUNAME!, // ✅ Use RuName here too
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ eBay token exchange failed:', errorText)
    throw new Error(`eBay token exchange failed: ${errorText}`)
  }

  return await response.json()
}

// Helper function to get seller info
async function getEbaySellerInfo(accessToken: string) {
  try {
    // ✅ ENVIRONMENT-AWARE: Uses production or sandbox based on EBAY_ENVIRONMENT
    const apiUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/sell/account/v1/seller_account'
        : 'https://api.ebay.com/sell/account/v1/seller_account'

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      return await response.json()
    } else {
      console.log('⚠️ Could not fetch seller info, using default')
      return { seller_id: 'unknown', status: 'connected' }
    }
  } catch (error) {
    console.error('⚠️ Could not fetch seller info:', error)
    return { seller_id: 'unknown', status: 'connected' }
  }
}
