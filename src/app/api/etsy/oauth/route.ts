// src/app/api/etsy/oauth/route.ts
// Etsy OAuth 1.0a initiation

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Etsy OAuth 1.0a parameters
    const oauthParams = {
      oauth_callback: process.env.ETSY_REDIRECT_URI!,
      oauth_consumer_key: process.env.ETSY_KEYSTRING!,
      oauth_nonce: generateNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    }

    // Create signature base string
    const signatureBaseString = createSignatureBaseString(
      'GET',
      'https://openapi.etsy.com/v3/public/oauth/request_token',
      oauthParams
    )

    // Generate signature
    const signature = generateSignature(
      signatureBaseString,
      process.env.ETSY_SHARED_SECRET!,
      ''
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

    console.log('🔗 Requesting Etsy request token...')

    // Request token from Etsy
    const response = await fetch(
      'https://openapi.etsy.com/v3/public/oauth/request_token',
      {
        method: 'GET',
        headers: {
          Authorization: `OAuth ${authHeader}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Etsy request token failed: ${errorText}`)
    }

    const responseText = await response.text()
    const params = new URLSearchParams(responseText)
    const requestToken = params.get('oauth_token')
    const requestTokenSecret = params.get('oauth_token_secret')

    if (!requestToken || !requestTokenSecret) {
      throw new Error('Failed to get request token from Etsy')
    }

    // Store request token secret for later use (in production, use Redis or database)
    // For now, we'll pass it in the state parameter
    const state = `${userId}:${requestTokenSecret}`

    // Redirect to Etsy authorization
    const authUrl = `https://www.etsy.com/oauth/signin?oauth_token=${requestToken}&state=${encodeURIComponent(state)}`

    console.log('✅ Redirecting to Etsy OAuth:', authUrl)

    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('❌ Etsy OAuth initiation error:', error)
    return NextResponse.json(
      {
        error: 'OAuth initiation failed',
      },
      { status: 500 }
    )
  }
}

// Helper functions for OAuth 1.0a
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

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
