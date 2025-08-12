// src/app/api/walmart/oauth/callback/route.ts
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
    const type = searchParams.get('type')
    const clientId = searchParams.get('clientId')
    const sellerId = searchParams.get('sellerId')

    console.log('🔄 Walmart OAuth callback received')
    console.log('📝 Code:', code ? 'Present' : 'Missing')
    console.log('📝 State:', state ? 'Present' : 'Missing')
    console.log('📝 Type:', type)
    console.log('📝 Client ID:', clientId)
    console.log('📝 Seller ID:', sellerId)
    console.log('❌ Error:', error)

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth error from Walmart:', error)
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_denied&message=${encodeURIComponent(error)}`
      return NextResponse.redirect(errorUrl)
    }

    if (!code || !state) {
      console.error('❌ Missing code or state in callback')
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid&message=Missing%20authorization%20code`
      return NextResponse.redirect(errorUrl)
    }

    // Validate state
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .eq('platform', 'walmart')
      .single()

    if (stateError || !stateData) {
      console.error('❌ Invalid state parameter')
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid&message=Invalid%20state%20parameter`
      return NextResponse.redirect(errorUrl)
    }

    // Use sellerId from callback if provided
    let userId = stateData.user_id
    const walmartSellerId = sellerId || process.env.WALMART_PARTNER_ID!

    // Clean up used state
    await supabase.from('oauth_states').delete().eq('state', state)

    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code, walmartSellerId)

    if (!tokenData.access_token) {
      throw new Error('No access token received from Walmart')
    }

    console.log('✅ Tokens received from Walmart')
    console.log('⏰ Access token expires in:', tokenData.expires_in, 'seconds')

    // Get seller info using the access token
    const sellerInfo = await getSellerInfo(tokenData.access_token)

    // Calculate token expiration
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in || 900) * 1000
    ).toISOString()

    // Check if connection exists
    const { data: existingConnection } = await supabase
      .from('walmart_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('environment', process.env.WALMART_ENVIRONMENT || 'sandbox')
      .single()

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('walmart_connections')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          seller_info: sellerInfo,
          seller_id: sellerInfo.partnerId,
          partner_id: sellerInfo.partnerId,
          status: 'active',
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id)

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        throw updateError
      }

      console.log('✅ Updated existing Walmart connection')
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('walmart_connections')
        .insert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          seller_info: sellerInfo,
          seller_id: sellerInfo.partnerId,
          partner_id: sellerInfo.partnerId,
          environment: process.env.WALMART_ENVIRONMENT || 'sandbox',
          status: 'active',
          last_used_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('❌ Database insert error:', insertError)
        throw insertError
      }

      console.log('✅ Created new Walmart connection')
    }

    // Redirect to success page
    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?success=walmart_connected&seller=${encodeURIComponent(sellerInfo.partnerName || 'Walmart Seller')}`

    console.log('🎉 Walmart OAuth completed successfully')
    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error('❌ Walmart OAuth callback error:', error)

    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to complete Walmart OAuth'
    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_failed&message=${encodeURIComponent(errorMessage)}`

    return NextResponse.redirect(errorUrl)
  }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string, sellerId?: string) {
  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const redirectUri = process.env.WALMART_REDIRECT_URI!
  const partnerId = sellerId || process.env.WALMART_PARTNER_ID!
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

  const tokenUrl =
    environment === 'production'
      ? 'https://marketplace.walmartapis.com/v3/token'
      : 'https://sandbox.walmartapis.com/v3/token'

  console.log('🔄 Exchanging code for token at:', tokenUrl)
  console.log('🏪 Using Partner/Seller ID:', partnerId)

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
      'WM_SVC.NAME': 'Listora AI',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Token exchange failed:', response.status, errorText)
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  const tokenData = await response.json()
  return tokenData
}

// Get seller info using access token
async function getSellerInfo(accessToken: string) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const partnerId = process.env.WALMART_PARTNER_ID!

  try {
    // For now, return mock data since seller info endpoint might not be available
    // In production, you would call the actual API endpoint
    return {
      partnerId: partnerId,
      partnerName: 'Walmart Test Seller',
      marketplaceId: 'WALMART_US',
      status: 'active',
    }
  } catch (error) {
    console.log('⚠️ Could not fetch seller info, using defaults')
    return {
      partnerId: partnerId,
      partnerName: 'Walmart Seller',
      marketplaceId: 'WALMART_US',
      status: 'active',
    }
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
