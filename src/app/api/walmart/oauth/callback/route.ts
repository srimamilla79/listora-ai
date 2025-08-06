// src/app/api/walmart/oauth/callback/route.ts
// Walmart OAuth callback handler
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface WalmartTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope?: string
}

interface WalmartSellerInfo {
  sellerId: string
  sellerName?: string
  marketplaceId?: string
  status?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🛒 Walmart OAuth callback received')
    console.log('📋 Code present:', !!code)
    console.log('🔐 State:', state)
    console.log('❌ Error:', error)

    // Handle OAuth errors
    if (error) {
      console.error('❌ Walmart OAuth error:', error)
      const errorDescription =
        searchParams.get('error_description') || 'Unknown error'

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate?error=walmart_oauth_failed&message=${encodeURIComponent(errorDescription)}`
      )
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing OAuth parameters')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate?error=walmart_oauth_invalid&message=Missing OAuth parameters`
      )
    }

    // Extract user ID from state
    const userId = state.split('-')[0]
    if (!userId) {
      console.error('❌ Invalid state parameter:', state)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate?error=walmart_oauth_invalid&message=Invalid state parameter`
      )
    }

    console.log('👤 User ID from state:', userId)

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code)

    if (!tokenResponse.access_token) {
      throw new Error('No access token received from Walmart')
    }

    console.log('✅ Access token received from Walmart')
    console.log('⏰ Token expires in:', tokenResponse.expires_in, 'seconds')

    // Get seller information using the access token
    const sellerInfo = await getSellerInfo(tokenResponse.access_token)

    console.log('👤 Seller info retrieved:', {
      sellerId: sellerInfo.sellerId,
      sellerName: sellerInfo.sellerName,
      status: sellerInfo.status,
    })

    // Calculate token expiration
    const expiresAt = new Date(
      Date.now() + tokenResponse.expires_in * 1000
    ).toISOString()

    // Save or update connection in database
    const { data: existingConnection, error: checkError } = await supabase
      .from('walmart_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('walmart_connections')
        .update({
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token || null,
          token_expires_at: expiresAt,
          seller_info: sellerInfo,
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
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token || null,
          token_expires_at: expiresAt,
          seller_info: sellerInfo,
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
    const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate?success=walmart_connected&seller=${encodeURIComponent(sellerInfo.sellerName || sellerInfo.sellerId)}`

    console.log('🎉 Walmart OAuth completed successfully')
    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error('❌ Walmart OAuth callback error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate?error=walmart_connection_failed&message=${encodeURIComponent(errorMessage)}`

    return NextResponse.redirect(errorUrl)
  }
}

// Exchange authorization code for access token
async function exchangeCodeForToken(
  code: string
): Promise<WalmartTokenResponse> {
  try {
    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const redirectUri = process.env.WALMART_REDIRECT_URI!
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

    // Walmart token endpoint
    const tokenUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token'
        : 'https://marketplace.walmartapis.com/v3/token'

    console.log('🔄 Exchanging code for token at:', tokenUrl)

    // Basic auth credentials
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Token exchange failed:', response.status, errorText)
      throw new Error(
        `Token exchange failed: ${response.status} - ${errorText}`
      )
    }

    const tokenData: WalmartTokenResponse = await response.json()
    console.log('✅ Token exchange successful')

    return tokenData
  } catch (error) {
    console.error('❌ Token exchange error:', error)
    throw error
  }
}

// Get seller information from Walmart API
async function getSellerInfo(accessToken: string): Promise<WalmartSellerInfo> {
  try {
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

    // Walmart seller info endpoint
    const sellerUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/seller'
        : 'https://marketplace.walmartapis.com/v3/seller'

    console.log('👤 Fetching seller info from:', sellerUrl)

    const response = await fetch(sellerUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Seller info fetch failed:', response.status, errorText)

      // Return basic info even if seller API fails
      return {
        sellerId: 'Unknown',
        sellerName: 'Walmart Seller',
        status: 'connected',
      }
    }

    const sellerData = await response.json()
    console.log('✅ Seller info retrieved successfully')

    return {
      sellerId: sellerData.sellerId || sellerData.id || 'Unknown',
      sellerName: sellerData.sellerName || sellerData.name || 'Walmart Seller',
      marketplaceId: sellerData.marketplaceId || 'WALMART_US',
      status: sellerData.status || 'connected',
    }
  } catch (error) {
    console.error('❌ Seller info error:', error)

    // Return basic info on error
    return {
      sellerId: 'Unknown',
      sellerName: 'Walmart Seller',
      status: 'connected',
    }
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
