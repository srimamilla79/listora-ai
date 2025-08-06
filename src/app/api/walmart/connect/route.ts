// src/app/api/walmart/connect/route.ts
// Walmart connection status and management
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Check connection status
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

    console.log('🔍 Checking Walmart connection status for user:', userId)

    // Get active Walmart connection
    const { data: connection, error: connectionError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (connectionError && connectionError.code !== 'PGRST116') {
      console.error('❌ Database error:', connectionError)
      throw connectionError
    }

    if (!connection) {
      console.log('❌ No active Walmart connection found')
      return NextResponse.json({
        connected: false,
        connection: null,
        message: 'No active Walmart connection found',
      })
    }

    // Check if token is expired
    const isExpired = new Date(connection.token_expires_at) <= new Date()

    // Test connection by making a simple API call
    let isValid = false
    let sellerInfo = null

    try {
      if (!isExpired) {
        const testResult = await testWalmartConnection(connection.access_token)
        isValid = testResult.valid
        sellerInfo = testResult.sellerInfo
      }
    } catch (error) {
      console.log('⚠️ Connection test failed:', error)
      isValid = false
    }

    // Update last_used_at if connection is valid
    if (isValid) {
      await supabase
        .from('walmart_connections')
        .update({
          last_used_at: new Date().toISOString(),
          seller_info: sellerInfo || connection.seller_info,
        })
        .eq('id', connection.id)
    }

    console.log('✅ Walmart connection status:', {
      connected: isValid,
      expired: isExpired,
      sellerId: connection.seller_info?.sellerId,
    })

    return NextResponse.json({
      connected: isValid,
      connection: {
        id: connection.id,
        sellerId: connection.seller_info?.sellerId || 'Unknown',
        sellerName: connection.seller_info?.sellerName || 'Walmart Seller',
        status: connection.status,
        connectedAt: connection.created_at,
        lastUsedAt: connection.last_used_at,
        expiresAt: connection.token_expires_at,
        isExpired: isExpired,
      },
      message: isValid
        ? 'Walmart connection is active'
        : 'Walmart connection needs refresh',
    })
  } catch (error) {
    console.error('❌ Walmart connection check error:', error)

    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check Walmart connection',
      },
      { status: 500 }
    )
  }
}

// POST: Refresh connection or update settings
export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🛒 Walmart connection action:', action, 'for user:', userId)

    if (action === 'refresh') {
      // Refresh the connection token
      const { data: connection, error: findError } = await supabase
        .from('walmart_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (findError || !connection) {
        return NextResponse.json(
          { error: 'No active Walmart connection found' },
          { status: 404 }
        )
      }

      if (!connection.refresh_token) {
        return NextResponse.json(
          {
            error:
              'No refresh token available. Please reconnect your Walmart account.',
          },
          { status: 400 }
        )
      }

      try {
        // Refresh the token
        const newTokenData = await refreshWalmartToken(connection.refresh_token)

        // Update connection with new token
        const expiresAt = new Date(
          Date.now() + newTokenData.expires_in * 1000
        ).toISOString()

        const { error: updateError } = await supabase
          .from('walmart_connections')
          .update({
            access_token: newTokenData.access_token,
            refresh_token:
              newTokenData.refresh_token || connection.refresh_token,
            token_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

        if (updateError) {
          throw updateError
        }

        console.log('✅ Walmart token refreshed successfully')

        return NextResponse.json({
          success: true,
          message: 'Walmart connection refreshed successfully',
          expiresAt: expiresAt,
        })
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)

        return NextResponse.json(
          {
            error:
              'Failed to refresh token. Please reconnect your Walmart account.',
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('❌ Walmart connection action error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to perform connection action',
      },
      { status: 500 }
    )
  }
}

// Test Walmart connection validity
async function testWalmartConnection(
  accessToken: string
): Promise<{ valid: boolean; sellerInfo?: any }> {
  try {
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const testUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/seller'
        : 'https://marketplace.walmartapis.com/v3/seller'

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_QOS.CORRELATION_ID': `test-${Date.now()}`,
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const sellerData = await response.json()
      return {
        valid: true,
        sellerInfo: {
          sellerId: sellerData.sellerId || sellerData.id || 'Unknown',
          sellerName:
            sellerData.sellerName || sellerData.name || 'Walmart Seller',
          status: sellerData.status || 'active',
        },
      }
    } else {
      console.log('⚠️ Walmart connection test failed:', response.status)
      return { valid: false }
    }
  } catch (error) {
    console.log('⚠️ Walmart connection test error:', error)
    return { valid: false }
  }
}

// Refresh Walmart token
async function refreshWalmartToken(refreshToken: string) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const tokenUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com/v3/token'
      : 'https://marketplace.walmartapis.com/v3/token'

  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
