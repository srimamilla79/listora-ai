// src/app/api/walmart/update-price/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import {
  rateLimiter,
  walmartApiCall,
  validateFeedFileSize,
} from '@/lib/walmart-rate-limiter'

export async function PATCH(request: NextRequest) {
  try {
    console.log('💰 Walmart price update route called')

    const { sku, newPrice, userId, productId } = await request.json()

    if (!sku || !newPrice || !userId) {
      return NextResponse.json(
        { error: 'SKU, price, and userId are required' },
        { status: 400 }
      )
    }

    // Check rate limit before proceeding (10/hour for price feeds)
    const canProceed = await rateLimiter.checkRateLimit('feeds:submit:price')
    if (!canProceed) {
      const remaining = rateLimiter.getRemainingTokens('feeds:submit:price')
      return NextResponse.json(
        {
          error: `Rate limit exceeded. ${remaining} requests remaining. Please wait before trying again.`,
          remainingTokens: remaining,
        },
        { status: 429 }
      )
    }

    const supabase = await createServerSideClient()

    // Get Walmart connection
    const { data: connections, error: connectionError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (connectionError || !connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'Walmart account not connected' },
        { status: 400 }
      )
    }

    const connection = connections[0]
    const sellerId = connection.seller_id || connection.seller_info?.sellerId
    console.log('🏪 Using Seller ID:', sellerId)

    const accessToken = await refreshTokenIfNeeded(connection, supabase)

    // Create price update XML with latest spec
    const priceXml = createPriceUpdateXml(sku, newPrice)

    // Validate file size (10MB limit for price feeds)
    const xmlSizeBytes = new TextEncoder().encode(priceXml).length
    if (!validateFeedFileSize('price', xmlSizeBytes)) {
      return NextResponse.json(
        { error: 'XML file size exceeds 10MB limit.' },
        { status: 413 }
      )
    }

    console.log(`📏 Price XML size: ${(xmlSizeBytes / 1024).toFixed(2)} KB`)

    // Submit price update feed with rate limiting
    const feedResult = await submitWalmartFeedWithRateLimit(
      priceXml,
      accessToken,
      'price',
      sellerId
    )

    console.log('✅ Price update feed submitted:', feedResult.feedId)

    // Update the published_products table
    if (productId) {
      await supabase
        .from('published_products')
        .update({
          price: parseFloat(newPrice),
          updated_at: new Date().toISOString(),
          platform_data: {
            lastPriceUpdate: new Date().toISOString(),
            priceUpdateFeedId: feedResult.feedId,
          },
        })
        .eq('id', productId)
        .eq('user_id', userId)
    }

    // Also update walmart_listings table if it exists
    await supabase
      .from('walmart_listings')
      .update({
        price: parseFloat(newPrice),
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .eq('user_id', userId)

    return NextResponse.json({
      success: true,
      message: 'Price update submitted successfully',
      feedId: feedResult.feedId,
      newPrice: parseFloat(newPrice),
      remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:price'),
    })
  } catch (error) {
    console.error('❌ Price update error:', error)
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    )
  }
}

// Create price update XML with latest format
function createPriceUpdateXml(sku: string, price: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PriceFeed xmlns="http://walmart.com/">
  <PriceHeader>
    <version>1.7</version>
    <feedDate>${new Date().toISOString()}</feedDate>
  </PriceHeader>
  <Price>
    <itemIdentifier>
      <sku>${escapeXml(sku)}</sku>
    </itemIdentifier>
    <pricingList>
      <pricing>
        <currentPriceType>BASE</currentPriceType>
        <currentPrice>
          <currency>USD</currency>
          <amount>${price}</amount>
        </currentPrice>
      </pricing>
    </pricingList>
  </Price>
</PriceFeed>`
}

// Submit feed with rate limiting
async function submitWalmartFeedWithRateLimit(
  xmlContent: string,
  accessToken: string,
  feedType: string = 'price',
  sellerId?: string
): Promise<any> {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const feedUrl = `${baseUrl}/v3/feeds?feedType=${feedType}`
  const rateLimitKey = `feeds:submit:${feedType}`

  console.log(`📤 Submitting ${feedType} feed to:`, feedUrl)

  // Use rate-limited API call wrapper
  const result = await walmartApiCall<any>(feedUrl, rateLimitKey, () =>
    fetch(feedUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_PARTNER.ID': sellerId || process.env.WALMART_PARTNER_ID || '',
        WM_MARKET: 'us',
        'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        'WM_SVC.NAME': 'Walmart Marketplace',
        'Content-Type': 'application/xml',
        Accept: 'application/json',
      },
      body: xmlContent,
    })
  )

  // Ensure we have a valid feed response
  return {
    feedId: result.feedId || `${feedType.toUpperCase()}-${Date.now()}`,
    status: result.status || 'SUBMITTED',
    ...result,
  }
}

// XML escape function
function escapeXml(unsafe: string): string {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Token refresh with 5-minute buffer
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000) // 5-minute buffer

  if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token (expires within 5 minutes)...')

    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const tokenUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token'
        : 'https://marketplace.walmartapis.com/v3/token'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const partnerId =
      connection.seller_id ||
      connection.seller_info?.sellerId ||
      process.env.WALMART_PARTNER_ID!

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    console.log(`🔄 Refreshing token with ${environment} endpoint...`)
    console.log('🔑 Using Seller/Partner ID:', partnerId)

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_PARTNER.ID': partnerId,
        WM_MARKET: 'us',
        'WM_QOS.CORRELATION_ID': Date.now().toString(),
        'WM_SVC.NAME': 'Listora AI',
      },
      body: `grant_type=refresh_token&refresh_token=${connection.refresh_token}`,
    })

    const responseText = await response.text()
    console.log('📨 Token refresh response status:', response.status)

    if (!response.ok) {
      console.error(`❌ Token refresh failed:`, responseText)
      throw new Error(`Failed to refresh Walmart token: ${responseText}`)
    }

    const tokenData = JSON.parse(responseText)
    console.log(`✅ Token refreshed successfully`)

    // Update with 5-minute buffer
    await supabase
      .from('walmart_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + (tokenData.expires_in - 300) * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return tokenData.access_token
  }

  return connection.access_token
}
