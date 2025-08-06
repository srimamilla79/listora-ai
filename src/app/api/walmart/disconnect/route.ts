// src/app/api/walmart/disconnect/route.ts
// Walmart connection disconnect handler
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    console.log('🛒 Walmart disconnect request for user:', userId)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find active Walmart connection
    const { data: connection, error: findError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (findError || !connection) {
      console.log('❌ No active Walmart connection found:', findError)
      return NextResponse.json(
        { error: 'No active Walmart connection found' },
        { status: 404 }
      )
    }

    console.log('✅ Found Walmart connection:', connection.id)

    // Optionally revoke token with Walmart (if they provide revocation endpoint)
    try {
      await revokeWalmartToken(connection.access_token)
      console.log('✅ Token revoked with Walmart')
    } catch (revokeError) {
      console.log(
        '⚠️ Token revocation failed (continuing with disconnect):',
        revokeError
      )
      // Continue with disconnect even if revocation fails
    }

    // Update connection status to 'disconnected' instead of deleting
    const { error: updateError } = await supabase
      .from('walmart_connections')
      .update({
        status: 'disconnected',
        access_token: null, // Clear sensitive data
        refresh_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    if (updateError) {
      console.error('❌ Failed to update connection status:', updateError)
      throw updateError
    }

    console.log('✅ Walmart connection disconnected successfully')

    // Optionally update any active listings to 'disconnected' status
    const { error: listingsError } = await supabase
      .from('walmart_listings')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('status', ['active', 'pending'])

    if (listingsError) {
      console.error('⚠️ Failed to update listings status:', listingsError)
      // Don't fail the disconnect for this
    } else {
      console.log('✅ Updated associated listings status')
    }

    // Update published_products table
    const { error: publishedError } = await supabase
      .from('published_products')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('platform', 'walmart')
      .eq('status', 'published')

    if (publishedError) {
      console.error(
        '⚠️ Failed to update published products status:',
        publishedError
      )
      // Don't fail the disconnect for this
    } else {
      console.log('✅ Updated published products status')
    }

    return NextResponse.json({
      success: true,
      message: 'Walmart account disconnected successfully',
      disconnectedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Walmart disconnect error:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to disconnect Walmart account',
      },
      { status: 500 }
    )
  }
}

// Optional: Revoke token with Walmart (if they provide this endpoint)
async function revokeWalmartToken(accessToken: string): Promise<void> {
  try {
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!

    // Note: Walmart may not have a token revocation endpoint
    // This is a placeholder for best practices
    const revokeUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token/revoke'
        : 'https://marketplace.walmartapis.com/v3/token/revoke'

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        token: accessToken,
        token_type_hint: 'access_token',
      }),
    })

    if (!response.ok) {
      // If revocation endpoint doesn't exist (common), just log and continue
      const errorText = await response.text()
      console.log(
        '⚠️ Token revocation not supported or failed:',
        response.status,
        errorText
      )
      return
    }

    console.log('✅ Token successfully revoked with Walmart')
  } catch (error) {
    // Don't throw - revocation is best effort
    console.log('⚠️ Token revocation attempt failed:', error)
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
