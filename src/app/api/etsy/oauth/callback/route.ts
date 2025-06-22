// src/app/api/etsy/oauth/callback/route.ts
// Etsy OAuth callback handler

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
    const oauthToken = searchParams.get('oauth_token')
    const oauthVerifier = searchParams.get('oauth_verifier')
    const state = searchParams.get('state')

    if (!oauthToken || !oauthVerifier || !state) {
      throw new Error('Missing OAuth parameters')
    }

    // Extract user ID and request token secret from state
    const [userId, requestTokenSecret] = state.split(':')

    console.log('✅ Etsy OAuth callback received:', {
      userId,
      token: oauthToken.substring(0, 10) + '...',
    })

    // Exchange for access token
    const accessTokenData = await exchangeForAccessToken(
      oauthToken,
      oauthVerifier,
      requestTokenSecret
    )

    // Get shop information
    const shopInfo = await getShopInfo(
      accessTokenData.oauth_token,
      accessTokenData.oauth_token_secret
    )

    // Save connection to database
    const { data: connection, error: dbError } = await supabase
      .from('etsy_connections')
      .insert({
        user_id: userId,
        access_token: accessTokenData.oauth_token,
        access_token_secret: accessTokenData.oauth_token_secret,
        shop_id: shopInfo.shop_id,
        shop_name: shopInfo.shop_name,
        shop_info: shopInfo,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save Etsy connection')
    }

    console.log('✅ Etsy connection saved:', connection.id)

    // Redirect back to dashboard with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?etsy_connected=true`
    )
  } catch (error: any) {
    console.error('❌ Etsy OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?etsy_error=connection_failed`
    )
  }
}

async function exchangeForAccessToken(
  requestToken: string,
  verifier: string,
  requestTokenSecret: string
) {
  const oauthParams = {
    oauth_consumer_key: process.env.ETSY_KEYSTRING!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: requestToken,
    oauth_verifier: verifier,
    oauth_version: '1.0',
  }

  const signatureBaseString = createSignatureBaseString(
    'GET',
    'https://openapi.etsy.com/v3/public/oauth/access_token',
    oauthParams
  )

  const signature = generateSignature(
    signatureBaseString,
    process.env.ETSY_SHARED_SECRET!,
    requestTokenSecret
  )

  const finalParams = {
    ...oauthParams,
    oauth_signature: signature,
  }

  const authHeader = Object.entries(finalParams)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(', ')

  const response = await fetch(
    'https://openapi.etsy.com/v3/public/oauth/access_token',
    {
      method: 'GET',
      headers: {
        Authorization: `OAuth ${authHeader}`,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Access token exchange failed: ${errorText}`)
  }

  const responseText = await response.text()
  const params = new URLSearchParams(responseText)

  return {
    oauth_token: params.get('oauth_token')!,
    oauth_token_secret: params.get('oauth_token_secret')!,
  }
}

async function getShopInfo(accessToken: string, accessTokenSecret: string) {
  try {
    console.log('🏪 Fetching Etsy shop info...')

    // OAuth parameters for authenticated request
    const oauthParams = {
      oauth_consumer_key: process.env.ETSY_KEYSTRING!,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: '1.0',
    }

    // Create signature base string for GET request
    const signatureBaseString = createSignatureBaseString(
      'GET',
      'https://openapi.etsy.com/v3/application/shops',
      oauthParams
    )

    // Generate signature using access token secret
    const signature = generateSignature(
      signatureBaseString,
      process.env.ETSY_SHARED_SECRET!,
      accessTokenSecret
    )

    // Add signature to parameters
    const finalParams = {
      ...oauthParams,
      oauth_signature: signature,
    }

    // Create authorization header
    const authHeader = Object.entries(finalParams)
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ')

    // Make authenticated request to Etsy API
    const response = await fetch(
      'https://openapi.etsy.com/v3/application/shops?fields=shop_id,shop_name,url,title,announcement,currency_code,is_vacation,vacation_message,sale_message,digital_sale_message',
      {
        method: 'GET',
        headers: {
          Authorization: `OAuth ${authHeader}`,
          'x-api-key': process.env.ETSY_KEYSTRING!,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        '❌ Etsy shop info request failed:',
        response.status,
        errorText
      )
      throw new Error(`Shop info request failed: ${errorText}`)
    }

    const data = await response.json()
    console.log('📦 Etsy API response:', data)

    // Extract shop information
    if (data.results && data.results.length > 0) {
      const shop = data.results[0]

      const shopInfo = {
        shop_id: shop.shop_id?.toString() || 'unknown',
        shop_name: shop.shop_name || 'Connected Shop',
        title: shop.title || shop.shop_name || 'Etsy Shop',
        url: shop.url || `https://www.etsy.com/shop/${shop.shop_name}`,
        currency_code: shop.currency_code || 'USD',
        announcement: shop.announcement || '',
        is_vacation: shop.is_vacation || false,
        vacation_message: shop.vacation_message || '',
        sale_message: shop.sale_message || '',
        digital_sale_message: shop.digital_sale_message || '',
        status: 'active',
        fetched_at: new Date().toISOString(),
      }

      console.log('✅ Etsy shop info retrieved:', {
        shop_id: shopInfo.shop_id,
        shop_name: shopInfo.shop_name,
        currency: shopInfo.currency_code,
        is_vacation: shopInfo.is_vacation,
      })

      return shopInfo
    } else {
      console.log('⚠️ No shops found in Etsy response')
      throw new Error('No shops found for this user')
    }
  } catch (error: any) {
    console.error('❌ Error fetching Etsy shop info:', error)

    // Return fallback data instead of failing OAuth
    const fallbackInfo = {
      shop_id: 'shop_' + crypto.randomBytes(4).toString('hex'),
      shop_name: 'Connected Shop',
      title: 'Connected Etsy Shop',
      url: 'https://www.etsy.com',
      currency_code: 'USD',
      announcement: '',
      is_vacation: false,
      vacation_message: '',
      sale_message: '',
      digital_sale_message: '',
      status: 'active',
      fetched_at: new Date().toISOString(),
      error: error.message,
    }

    console.log('⚠️ Using fallback shop info due to error')
    return fallbackInfo
  }
}

// Reuse helper functions from oauth route
function createSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const sortedParams = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join('&')

  return `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`
}

function generateSignature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`
  return crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64')
}
