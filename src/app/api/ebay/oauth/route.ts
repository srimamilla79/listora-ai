// src/app/api/ebay/oauth/route.ts
// eBay OAuth with environment-aware URLs

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // ✅ ENVIRONMENT-AWARE: Uses production or sandbox based on EBAY_ENVIRONMENT
    const ebayAuthUrl = new URL(
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
        : 'https://auth.ebay.com/oauth2/authorize'
    )

    const params = {
      client_id: process.env.EBAY_APP_ID!,
      response_type: 'code',
      redirect_uri: process.env.EBAY_RUNAME!,
      // ✅ UPDATED: Use correct scopes from your available list
      scope: [
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.account',
      ].join(' '),
      state: userId,
    }

    Object.entries(params).forEach(([key, value]) => {
      ebayAuthUrl.searchParams.append(key, value)
    })

    console.log(
      `🔗 Redirecting to eBay OAuth (${process.env.EBAY_ENVIRONMENT}):`,
      ebayAuthUrl.toString()
    )

    const response = NextResponse.redirect(ebayAuthUrl.toString())
    response.headers.set('ngrok-skip-browser-warning', 'true')

    return response
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
