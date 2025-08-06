// src/app/api/walmart/oauth/route.ts
// Walmart OAuth - Using Refresh Token Method (Working!)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    console.log('🛒 Walmart OAuth initiation for user:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get credentials and refresh token
    const clientId = process.env.WALMART_CLIENT_ID
    const clientSecret = process.env.WALMART_CLIENT_SECRET
    const refreshToken =
      process.env.WALMART_REFRESH_TOKEN ||
      'APszCUk6tm6BUA3dgKVLUVTtvx5hZPz_uLLiOxtTpLocnPm6-RjOpKLmofjB_9xxfegTqLjPIdlpaeMVPlP7IC0'
    const partnerId = process.env.WALMART_PARTNER_ID
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

    if (!clientId || !clientSecret || !refreshToken) {
      console.error('❌ Missing Walmart OAuth configuration')
      return NextResponse.json(
        { error: 'Walmart OAuth not configured' },
        { status: 500 }
      )
    }

    console.log('🔐 Using Walmart Refresh Token flow')
    console.log('🌍 Environment:', environment)
    console.log('🔑 Partner ID:', partnerId)

    try {
      // Use refresh token to get access token
      const tokenData = await getAccessTokenWithRefresh(
        clientId,
        clientSecret,
        refreshToken,
        partnerId || '10002958024'
      )

      if (!tokenData.access_token) {
        throw new Error('No access token received from Walmart')
      }

      console.log('✅ Access token received from Walmart')
      console.log('⏰ Token expires in:', tokenData.expires_in, 'seconds')

      // Calculate token expiration
      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 900) * 1000
      ).toISOString()

      // Get or create seller info
      const sellerInfo = {
        sellerId: partnerId || 'SANDBOX_SELLER',
        sellerName: 'Sandbox Test Seller',
        marketplaceId: 'WALMART_US',
        status: 'active',
        partnerId: partnerId,
      }

      // Check if connection already exists
      const { data: existingConnection } = await supabase
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
            access_token: tokenData.access_token,
            refresh_token: refreshToken, // Keep the same refresh token
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
            access_token: tokenData.access_token,
            refresh_token: refreshToken,
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
      const successUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'}/generate?success=walmart_connected&seller=${encodeURIComponent(sellerInfo.sellerName)}`

      console.log('🎉 Walmart connection completed successfully')
      return NextResponse.redirect(successUrl)
    } catch (tokenError) {
      console.error('❌ Token acquisition failed:', tokenError)

      const errorMessage =
        tokenError instanceof Error
          ? tokenError.message
          : 'Failed to connect to Walmart'
      const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'}/generate?error=walmart_connection_failed&message=${encodeURIComponent(errorMessage)}`

      return NextResponse.redirect(errorUrl)
    }
  } catch (error) {
    console.error('❌ Walmart OAuth error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000'}/generate?error=walmart_oauth_failed&message=${encodeURIComponent(errorMessage)}`

    return NextResponse.redirect(errorUrl)
  }
}

// Get access token using refresh token (THIS WORKS!)
async function getAccessTokenWithRefresh(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  partnerId: string
) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'

  // IMPORTANT: Use sandbox endpoint - it's the only one that works!
  const tokenUrl = 'https://sandbox.walmartapis.com/v3/token'

  console.log('🔄 Getting access token from:', tokenUrl)
  console.log('🔄 Using refresh token method')

  // Create Basic auth credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_QOS.CORRELATION_ID': Date.now().toString(),
      'WM_SVC.NAME': 'Listora AI',
      'WM_PARTNER.ID': partnerId,
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Token request failed:', response.status, errorText)
    throw new Error(`Token request failed: ${response.status}`)
  }

  const tokenData = await response.json()
  console.log('✅ Token obtained successfully using refresh token!')

  return {
    access_token: tokenData.access_token,
    token_type: tokenData.token_type || 'Bearer',
    expires_in: tokenData.expires_in || 900,
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
