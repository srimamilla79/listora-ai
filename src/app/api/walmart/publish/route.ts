// src/app/api/walmart/publish/route.ts - Fixed to save to published_products table
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Walmart publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()
    const supabase = await createServerSideClient()

    // Get Walmart connection
    const { data: connections, error: connectionError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (connectionError || !connections || connections.length === 0) {
      console.log('❌ Walmart connection not found:', connectionError)
      return NextResponse.json(
        {
          error:
            'Walmart account not connected. Please connect your Walmart account first.',
        },
        { status: 400 }
      )
    }

    const connection = connections[0]
    console.log('✅ Walmart connection found:', connection.id)

    // Check if token needs refresh
    const accessToken = await refreshTokenIfNeeded(connection, supabase)
    console.log('🔐 Using access token:', accessToken.substring(0, 20) + '...')

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-WM-${Date.now()}`

    // Create simple XML feed for item
    const itemXml = createItemXml({
      sku,
      title: productContent.product_name || 'Product',
      description:
        productContent.content ||
        productContent.features ||
        'High quality product',
      price: parseFloat(publishingOptions.price),
      brand: 'Generic',
      imageUrl: images?.[0] || '',
      quantity: parseInt(publishingOptions.quantity) || 1,
    })

    console.log('📄 Creating Walmart item via Feed API')

    // Submit feed to Walmart
    const feedResult = await submitWalmartFeed(itemXml, accessToken)

    console.log('✅ Walmart feed submitted:', feedResult.feedId)

    // Save to walmart_listings table (for backward compatibility)
    const { data: walmartListing } = await supabase
      .from('walmart_listings')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        walmart_item_id: feedResult.feedId,
        sku: sku,
        title: productContent.product_name,
        description: productContent.content,
        price: parseFloat(publishingOptions.price),
        quantity: parseInt(publishingOptions.quantity) || 1,
        images: images || [],
        walmart_data: feedResult,
        status: 'pending',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    // IMPORTANT: Also save to the unified published_products table
    const { data: publishedProduct, error: publishError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        platform: 'walmart', // Important: set platform to 'walmart'
        platform_product_id: feedResult.feedId,
        platform_url: null, // Will be updated once feed is processed
        title: productContent.product_name || 'Untitled Product',
        description: productContent.content || productContent.features || '',
        price: parseFloat(publishingOptions.price) || 0,
        quantity: parseInt(publishingOptions.quantity) || 1,
        sku: sku,
        images: images || [],
        platform_data: {
          feedId: feedResult.feedId,
          status: feedResult.status || 'SUBMITTED',
          walmartListingId: walmartListing?.id,
          ...feedResult,
        },
        status: 'pending', // Will update to 'published' once feed is processed
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (publishError) {
      console.error('❌ Error saving to published_products:', publishError)
      // Don't fail the request, but log the error
    } else {
      console.log('✅ Saved to published_products table:', publishedProduct?.id)
    }

    return NextResponse.json({
      success: true,
      platform: 'walmart',
      data: {
        feedId: feedResult.feedId,
        sku: sku,
        status: 'SUBMITTED',
        message:
          'Item submitted to Walmart. Processing may take a few minutes.',
        publishedProductId: publishedProduct?.id, // Include the published product ID
      },
      message:
        'Successfully submitted to Walmart! Check your Seller Center for status updates.',
    })
  } catch (error) {
    const err = error as Error
    console.error('❌ Walmart publish error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to publish to Walmart' },
      { status: 500 }
    )
  }
}

// Create simple XML for item
function createItemXml(data: any): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<MPItemFeed xmlns="http://walmart.com/">
  <MPItem>
    <sku>${data.sku}</sku>
    <Product>
      <productName>${escapeXml(data.title)}</productName>
      <shortDescription>${escapeXml(data.description.substring(0, 200))}</shortDescription>
      <brand>${data.brand}</brand>
      <mainImageUrl>${data.imageUrl}</mainImageUrl>
    </Product>
    <price>
      <amount>${data.price}</amount>
      <currency>USD</currency>
    </price>
    <shippingWeight>
      <value>1</value>
      <unit>LB</unit>
    </shippingWeight>
    <productIdentifiers>
      <productIdType>SKU</productIdType>
      <productId>${data.sku}</productId>
    </productIdentifiers>
    <category>
      <Clothing>
        <ClothingCategory>
          <gender>Unisex</gender>
        </ClothingCategory>
      </Clothing>
    </category>
    <quantity>
      <amount>${data.quantity}</amount>
    </quantity>
  </MPItem>
</MPItemFeed>`
}

// Submit feed to Walmart
async function submitWalmartFeed(xmlContent: string, accessToken: string) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const feedUrl = `${baseUrl}/v3/feeds?feedType=MP_ITEM`

  console.log('📤 Submitting feed to:', feedUrl)

  const response = await fetch(feedUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'WM_SVC.NAME': 'Walmart Marketplace',
      'Content-Type': 'application/xml',
      Accept: 'application/json',
    },
    body: xmlContent,
  })

  const responseText = await response.text()
  console.log(
    '📨 Feed API Response:',
    response.status,
    responseText.substring(0, 200)
  )

  if (!response.ok) {
    throw new Error(`Feed submission failed: ${responseText}`)
  }

  try {
    return JSON.parse(responseText)
  } catch {
    // If response is not JSON, return basic success
    return {
      feedId: `FEED-${Date.now()}`,
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
    const newToken = await refreshWalmartToken(connection.refresh_token)

    await supabase
      .from('walmart_connections')
      .update({
        access_token: newToken.access_token,
        token_expires_at: new Date(
          Date.now() + newToken.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('✅ Walmart token refreshed successfully')
    return newToken.access_token
  }

  return connection.access_token
}

async function refreshWalmartToken(refreshToken: string) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const tokenUrl = 'https://sandbox.walmartapis.com/v3/token'

  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const partnerId = process.env.WALMART_PARTNER_ID!
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
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  })

  const responseText = await response.text()
  console.log('📨 Token refresh response status:', response.status)

  if (!response.ok) {
    console.error(`❌ Token refresh failed:`, responseText)
    throw new Error('Failed to refresh Walmart token')
  }

  const tokenData = JSON.parse(responseText)
  console.log(`✅ Token refreshed successfully`)

  return tokenData
}

// Optional: Add a function to check feed status and update the published_products table
export async function updateFeedStatus(feedId: string, userId: string) {
  const supabase = await createServerSideClient()

  // This would be called by a webhook or polling mechanism
  // to update the status once Walmart processes the feed

  const { data: product } = await supabase
    .from('published_products')
    .update({
      status: 'published',
      platform_url: `https://www.walmart.com/seller/${feedId}`, // Update with actual URL
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })
    .eq('platform_product_id', feedId)
    .eq('user_id', userId)
    .single()

  return product
}
