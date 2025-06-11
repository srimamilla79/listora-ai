// File 2: src/app/api/amazon/connect/route.ts - FIXED (Handle Duplicates)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Amazon SP-API connection test
async function testAmazonConnection() {
  try {
    const clientId = process.env.AMAZON_SP_API_CLIENT_ID
    const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET
    const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Missing Amazon SP-API credentials in environment variables'
      )
    }

    console.log('🔑 Testing Amazon SP-API connection...')

    // Test LWA (Login with Amazon) token exchange
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      throw new Error(
        `LWA token exchange failed: ${tokenResponse.status} - ${errorData}`
      )
    }

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('No access token received from Amazon')
    }

    console.log('✅ Amazon SP-API connection test successful')
    return {
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    }
  } catch (error) {
    console.error('❌ Amazon connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    console.log('🔗 Amazon connect request for user:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Test Amazon SP-API connection
    const connectionTest = await testAmazonConnection()

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          error: connectionTest.error,
          details:
            'Failed to connect to Amazon SP-API. Please check your credentials.',
        },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Generate unique seller ID to avoid duplicates
    const uniqueSellerId = `${userId.substring(0, 8)}-${Date.now()}`

    // Check if connection already exists for this user
    const { data: existingConnection } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    const connectionData = {
      user_id: userId,
      seller_id: uniqueSellerId, // Use unique seller ID
      marketplace_id: process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      access_token_expires_at: new Date(
        Date.now() + connectionTest.expires_in * 1000
      ).toISOString(),
      status: 'active',
      last_sync_at: new Date().toISOString(),
    }

    let result
    if (existingConnection) {
      // Update existing connection
      console.log('📝 Updating existing Amazon connection')
      const { data, error } = await supabase
        .from('amazon_connections')
        .update({
          ...connectionData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

      result = { data, error }
    } else {
      // Create new connection
      console.log('🆕 Creating new Amazon connection')
      const { data, error } = await supabase
        .from('amazon_connections')
        .insert([
          {
            ...connectionData,
            connected_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      console.error('❌ Database error:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save connection to database',
          details: result.error.message,
        },
        { status: 500 }
      )
    }

    console.log('✅ Amazon connection saved successfully')

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Amazon Seller Central',
      connection: {
        seller_id: result.data.seller_id,
        marketplace_id: result.data.marketplace_id,
        connected_at: result.data.connected_at,
        status: result.data.status,
      },
    })
  } catch (error) {
    console.error('❌ Amazon connect error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to Amazon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
