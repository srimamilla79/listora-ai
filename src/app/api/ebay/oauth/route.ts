// src/app/api/ebay/oauth/route.ts
// eBay OAuth initiation ONLY

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // eBay OAuth URL construction
    const ebayAuthUrl = new URL(
      'https://auth.sandbox.ebay.com/oauth2/authorize'
    )

    const params = {
      client_id: process.env.EBAY_APP_ID!,
      response_type: 'code',
      redirect_uri: process.env.EBAY_REDIRECT_URI!,
      scope: [
        'https://api.ebay.com/oauth/api_scope/sell.listing.item',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
      ].join(' '),
      state: userId, // Pass user ID for callback
    }

    Object.entries(params).forEach(([key, value]) => {
      ebayAuthUrl.searchParams.append(key, value)
    })

    console.log('🔗 Redirecting to eBay OAuth:', ebayAuthUrl.toString())

    return NextResponse.redirect(ebayAuthUrl.toString())
  } catch (error) {
    console.error('❌ eBay OAuth initiation error:', error)
    return NextResponse.json(
      {
        error: 'OAuth initiation failed',
      },
      { status: 500 }
    )
  }
}
