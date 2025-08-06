// src/app/api/walmart/update-price/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

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
    const accessToken = await refreshTokenIfNeeded(connection, supabase)

    // Create price update XML
    const priceXml = createPriceUpdateXml(sku, newPrice)

    // Submit price update feed
    const feedResult = await submitWalmartFeed(priceXml, accessToken, 'price')

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
    })
  } catch (error) {
    console.error('❌ Price update error:', error)
    return NextResponse.json(
      { error: 'Failed to update price' },
      { status: 500 }
    )
  }
}

// Create price update XML
function createPriceUpdateXml(sku: string, price: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<PriceFeed xmlns="http://walmart.com/">
  <PriceHeader>
    <version>1.0</version>
    <feedDate>${new Date().toISOString()}</feedDate>
  </PriceHeader>
  <Price>
    <itemIdentifier>
      <sku>${escapeXml(sku)}</sku>
    </itemIdentifier>
    <pricingList>
      <pricing>
        <currentPrice>
          <value currency="USD" amount="${price}"/>
        </currentPrice>
      </pricing>
    </pricingList>
  </Price>
</PriceFeed>`
}

// Submit feed to Walmart
async function submitWalmartFeed(
  xmlContent: string,
  accessToken: string,
  feedType: string = 'price'
) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const partnerId = process.env.WALMART_PARTNER_ID!
  const feedUrl = `${baseUrl}/v3/feeds?feedType=${feedType}`

  console.log(`📤 Submitting ${feedType} feed to:`, feedUrl)
  console.log(`🔑 Using Partner ID in headers:`, partnerId)

  const response = await fetch(feedUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`,
      'WM_SVC.NAME': 'Walmart Marketplace',
      'WM_PARTNER.ID': partnerId,
      'Content-Type': 'application/xml',
      Accept: 'application/json',
    },
    body: xmlContent,
  })

  const responseText = await response.text()
  console.log(`📨 ${feedType} Feed API Response:`, response.status)

  if (!response.ok) {
    throw new Error(`Feed submission failed: ${responseText}`)
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return {
      feedId: `${feedType.toUpperCase()}-${Date.now()}`,
      status: 'SUBMITTED',
      message: responseText,
    }
  }
}

// XML escape function
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Token refresh function
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

  if (expiresAt <= oneHourFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token...')

    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const tokenUrl = 'https://sandbox.walmartapis.com/v3/token'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const partnerId = process.env.WALMART_PARTNER_ID!

    if (!partnerId) {
      throw new Error('WALMART_PARTNER_ID environment variable is not set')
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    console.log(`🔄 Refreshing token with ${environment} endpoint...`)

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

    await supabase
      .from('walmart_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return tokenData.access_token
  }

  return connection.access_token
}
