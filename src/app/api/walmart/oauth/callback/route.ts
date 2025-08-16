// app/api/walmart/oauth/callback/route.ts
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
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const sellerId = searchParams.get('sellerId')

    console.log('🔄 Walmart OAuth callback received')

    if (error) {
      console.error('❌ OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_denied`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid`
      )
    }

    // Validate state
    const { data: stateData, error: stateError } = await supabase
      .from('walmart_oauth_states')
      .select('user_id')
      .eq('state', state)
      .single()

    if (stateError || !stateData?.user_id) {
      console.error('❌ Invalid state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid`
      )
    }

    const userId = stateData.user_id

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code, sellerId || undefined)
    // Get seller info
    const sellerInfo = await getSellerInfo(
      tokenData.access_token,
      sellerId || undefined
    )
    // Save connection
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in || 900) * 1000
    ).toISOString()

    await supabase.from('walmart_connections').upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
      seller_id: sellerId || process.env.WALMART_PARTNER_ID!,
      partner_id: sellerId || process.env.WALMART_PARTNER_ID!,
      seller_info: sellerInfo,
      environment: process.env.WALMART_ENVIRONMENT || 'production',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Clean up state
    await supabase.from('walmart_oauth_states').delete().eq('state', state)

    console.log('🎉 Walmart OAuth completed successfully')
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/generate?success=walmart_connected`
    )
  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_failed`
    )
  }
}

async function exchangeCodeForToken(code: string, sellerId?: string) {
  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const redirectUri = process.env.WALMART_REDIRECT_URI!
  const partnerId = sellerId || process.env.WALMART_PARTNER_ID!

  const environment = process.env.WALMART_ENVIRONMENT || 'production'
  const tokenUrl =
    environment === 'production'
      ? 'https://marketplace.walmartapis.com/v3/token'
      : 'https://sandbox.walmartapis.com/v3/token'

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_PARTNER.ID': partnerId,
      'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
      'WM_SVC.NAME': 'Walmart Marketplace',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token exchange failed: ${errorText}`)
  }

  return response.json()
}

async function getSellerInfo(accessToken: string, sellerId?: string) {
  // For now, return basic info
  return {
    partnerId: sellerId || process.env.WALMART_PARTNER_ID!,
    partnerName: 'Walmart Seller',
    marketplaceId: 'WALMART_US',
    status: 'active',
  }
}
