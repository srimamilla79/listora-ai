// src/app/api/shopify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')

    if (!code || !shop || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Verify HMAC signature for security
    const queryString = new URL(request.url).search.substring(1)
    const parameters = new URLSearchParams(queryString)
    parameters.delete('hmac')

    const sortedParams = Array.from(parameters.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')

    const calculatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(sortedParams)
      .digest('hex')

    if (calculatedHmac !== hmac) {
      return NextResponse.json(
        { error: 'Invalid request signature' },
        { status: 401 }
      )
    }

    // Verify state parameter
    const supabase = createClient()
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .eq('platform', 'shopify')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (stateError || !stateData) {
      return NextResponse.json(
        { error: 'Invalid or expired state' },
        { status: 401 }
      )
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code,
        }),
      }
    )

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get shop information
    const shopResponse = await fetch(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    )

    if (!shopResponse.ok) {
      throw new Error('Failed to fetch shop information')
    }

    const shopData = await shopResponse.json()
    const shopInfo = shopData.shop

    // Store connection in database
    await supabase.from('platform_connections').upsert({
      user_id: stateData.user_id,
      platform: 'shopify',
      platform_user_id: shopInfo.id.toString(),
      platform_store_info: {
        shop_domain: shop,
        shop_name: shopInfo.name,
        shop_email: shopInfo.email,
        shop_currency: shopInfo.currency,
        shop_timezone: shopInfo.timezone,
      },
      access_token: accessToken, // In production, encrypt this
      status: 'connected',
      connected_at: new Date().toISOString(),
      last_used_at: new Date().toISOString(),
    })

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state)

    // Redirect back to app with success
    return NextResponse.redirect(
      new URL('/generate?shopify=connected', request.url)
    )
  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect(
      new URL('/generate?shopify=error', request.url)
    )
  }
}
