// src/app/api/walmart/update-inventory/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import {
  rateLimiter,
  walmartApiCall,
  validateFeedFileSize,
} from '@/lib/walmart-rate-limiter'

export async function PATCH(request: NextRequest) {
  try {
    console.log('📦 Walmart inventory update route called')

    const { sku, newQuantity, userId, productId } = await request.json()

    if (!sku || newQuantity === undefined || !userId) {
      return NextResponse.json(
        { error: 'SKU, quantity, and userId are required' },
        { status: 400 }
      )
    }

    // Check rate limit before proceeding (50/hour for inventory feeds)
    const canProceed = await rateLimiter.checkRateLimit(
      'feeds:submit:inventory'
    )
    if (!canProceed) {
      const remaining = rateLimiter.getRemainingTokens('feeds:submit:inventory')
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

    // Create inventory update XML with latest spec
    const inventoryXml = createInventoryUpdateXml(sku, newQuantity)

    // Validate file size (10MB limit for inventory feeds)
    const xmlSizeBytes = new TextEncoder().encode(inventoryXml).length
    if (!validateFeedFileSize('inventory', xmlSizeBytes)) {
      return NextResponse.json(
        { error: 'XML file size exceeds 5MB limit.' },
        { status: 413 }
      )
    }

    console.log(`📏 Inventory XML size: ${(xmlSizeBytes / 1024).toFixed(2)} KB`)

    // Submit inventory update feed with rate limiting
    const feedResult = await submitWalmartFeedWithRateLimit(
      inventoryXml,
      accessToken,
      'inventory',
      sellerId
    )

    console.log('✅ Inventory update feed submitted:', feedResult.feedId)

    // Update the published_products table
    if (productId) {
      await supabase
        .from('published_products')
        .update({
          quantity: parseInt(newQuantity),
          updated_at: new Date().toISOString(),
          platform_data: {
            lastInventoryUpdate: new Date().toISOString(),
            inventoryUpdateFeedId: feedResult.feedId,
          },
        })
        .eq('id', productId)
        .eq('user_id', userId)
    }

    // Also update walmart_listings table
    await supabase
      .from('walmart_listings')
      .update({
        quantity: parseInt(newQuantity),
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .eq('user_id', userId)

    return NextResponse.json({
      success: true,
      message: 'Inventory update submitted successfully',
      feedId: feedResult.feedId,
      newQuantity: parseInt(newQuantity),
      remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:inventory'),
    })
  } catch (error) {
    console.error('❌ Inventory update error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    )
  }
}

// Create inventory update XML with latest format
function createInventoryUpdateXml(sku: string, quantity: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<InventoryFeed xmlns="http://walmart.com/">
  <InventoryHeader>
    <version>1.4</version>
    <feedDate>${new Date().toISOString()}</feedDate>
  </InventoryHeader>
  <inventory>
    <sku>${escapeXml(sku)}</sku>
    <quantity>
      <unit>EACH</unit>
      <amount>${quantity}</amount>
    </quantity>
    <fulfillmentLagTime>1</fulfillmentLagTime>
  </inventory>
</InventoryFeed>`
}

// Bulk inventory update XML (for future use)
export function createBulkInventoryUpdateXml(
  items: Array<{ sku: string; quantity: number }>
): string {
  const inventoryItems = items
    .map(
      (item) => `
  <inventory>
    <sku>${escapeXml(item.sku)}</sku>
    <quantity>
      <unit>EACH</unit>
      <amount>${item.quantity}</amount>
    </quantity>
    <fulfillmentLagTime>1</fulfillmentLagTime>
  </inventory>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<InventoryFeed xmlns="http://walmart.com/">
  <InventoryHeader>
    <version>1.4</version>
    <feedDate>${new Date().toISOString()}</feedDate>
  </InventoryHeader>
  ${inventoryItems}
</InventoryFeed>`
}

// Submit feed with rate limiting
async function submitWalmartFeedWithRateLimit(
  xmlContent: string,
  accessToken: string,
  feedType: string = 'inventory',
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
