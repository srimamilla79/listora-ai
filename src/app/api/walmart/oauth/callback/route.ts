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

    // Validate state - add debugging
    console.log('🔍 Validating state:', state)

    let userId: string | null = null

    // Check if this is from Walmart App Store (they use their own state format)
    if (type === 'auth' && clientId && sellerId) {
      console.log('🏪 OAuth initiated from Walmart App Store')

      // For Walmart App Store, they generate their own state
      // We need to identify the user differently

      // First, check if we have an existing connection for this seller
      const { data: existingConnection } = await supabase
        .from('walmart_connections')
        .select('user_id')
        .eq('seller_id', sellerId)
        .eq('environment', process.env.WALMART_ENVIRONMENT || 'sandbox')
        .single()

      if (existingConnection && existingConnection.user_id) {
        // Existing seller reconnecting
        userId = existingConnection.user_id
        console.log('📝 Found existing user for seller ID:', sellerId)
      } else {
        // New seller from Walmart App Store
        console.log(
          '🆕 New seller from Walmart App Store - Seller ID:',
          sellerId
        )

        // For demo purposes, if this is Mohammad's seller ID, use the test account
        if (sellerId === '10001267269') {
          userId = 'e4b937f0-95ac-498b-a5dd-c6d3d07d582e'
          console.log('✅ Using test account for Walmart demo')
        } else {
          // Only redirect to signup if no authenticated user
          const tempOAuthId = crypto.randomUUID()

          // Store the OAuth params in oauth_states temporarily
          await supabase.from('oauth_states').insert({
            id: tempOAuthId,
            state: `walmart-temp-${tempOAuthId}`,
            user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
            platform: 'walmart',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            metadata: {
              oauth_params: {
                code,
                state,
                type,
                clientId,
                sellerId,
              },
              is_temp: true,
            },
          })

          // Redirect to signup with the temp OAuth ID
          const signupUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/signup?walmart_oauth=${tempOAuthId}&seller_id=${sellerId}&message=Create%20account%20to%20complete%20Walmart%20connection`
          console.log(
            '🔐 Redirecting to signup with temp OAuth ID:',
            tempOAuthId
          )
          return NextResponse.redirect(signupUrl)
        }
      }
    } else {
      // Standard OAuth flow - state should be in our database
      let { data: stateData, error: stateError } = await supabase
        .from('oauth_states')
        .select('user_id')
        .eq('state', state)
        .eq('platform', 'walmart')
        .single()

      // If not found with platform, try without platform filter
      if (!stateData || stateError) {
        console.log('🔍 Trying without platform filter...')
        const { data: fallbackState, error: fallbackError } = await supabase
          .from('oauth_states')
          .select('user_id')
          .eq('state', state)
          .single()

        if (fallbackState) {
          console.log('✅ Found state without platform filter')
          stateData = fallbackState
          stateError = null
        } else {
          console.log('❌ State not found in database')
          console.log('Fallback error:', fallbackError)
        }
      }

      if (stateError || !stateData || !stateData.user_id) {
        console.error('❌ Invalid state parameter or missing user_id')
        const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid&message=Invalid%20state%20parameter`
        return NextResponse.redirect(errorUrl)
      }

      userId = stateData.user_id
    }

    // Ensure we have a valid user ID
    if (!userId) {
      console.error('❌ No valid user ID found')
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_invalid&message=User%20authentication%20required`
      return NextResponse.redirect(errorUrl)
    }

    // Use sellerId from callback if provided, otherwise use environment variable
    const walmartSellerId = sellerId || process.env.WALMART_PARTNER_ID!

    // Clean up used state (only for non-Walmart App Store flow)
    if (!type || type !== 'auth') {
      await supabase.from('oauth_states').delete().eq('state', state)
    }

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
          seller_id: sellerInfo.partnerId || walmartSellerId,
          partner_id: sellerInfo.partnerId || walmartSellerId,
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
          seller_id: sellerInfo.partnerId || walmartSellerId,
          partner_id: sellerInfo.partnerId || walmartSellerId,
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
