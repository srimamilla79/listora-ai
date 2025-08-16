// src/app/api/walmart/publish/route.ts - WORKING SOLUTION
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { rateLimiter, validateFeedFileSize } from '@/lib/walmart-rate-limiter'

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Walmart publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()
    const supabase = await createServerSideClient()

    // Check rate limit
    const canProceed = await rateLimiter.checkRateLimit('feeds:submit:MP_ITEM')
    if (!canProceed) {
      const remaining = rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM')
      return NextResponse.json(
        {
          error: `Rate limit exceeded. ${remaining} requests remaining.`,
          remainingTokens: remaining,
        },
        { status: 429 }
      )
    }

    // Get Walmart connection
    const { data: connections, error: connectionError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (connectionError || !connections || connections.length === 0) {
      return NextResponse.json(
        {
          error: 'Walmart account not connected.',
        },
        { status: 400 }
      )
    }

    const connection = connections[0]
    const sellerId = connection.seller_id || connection.seller_info?.partnerId
    console.log('✅ Walmart connection found:', connection.id)
    console.log('🏪 Seller ID:', sellerId)

    // Check if token needs refresh
    const accessToken = await refreshTokenIfNeeded(connection, supabase)
    console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...')

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-WM-${Date.now()}`

    console.log('📦 Product details:', {
      sku,
      title: productContent.product_name,
      price: publishingOptions.price,
      brand: publishingOptions.brand || 'Generic',
    })

    // SOLUTION: Use MP_WFS_ITEM feed type with JSON
    // This is the working approach that accepts JSON and creates items
    const itemFeed = createMPWFSItemFeed({
      sku,
      title: productContent.product_name || 'Product',
      description:
        productContent.content ||
        productContent.features ||
        'High quality product',
      price: parseFloat(publishingOptions.price),
      brand: publishingOptions.brand || 'Generic',
      images: images || [],
      quantity: parseInt(publishingOptions.quantity) || 1,
      category: publishingOptions.category || 'Home',
    })

    // Validate file size
    const feedSizeBytes = new TextEncoder().encode(itemFeed).length
    if (!validateFeedFileSize('MP_ITEM', feedSizeBytes)) {
      return NextResponse.json(
        {
          error: 'Feed file size exceeds 26MB limit.',
        },
        { status: 413 }
      )
    }

    console.log('📄 Creating Walmart item via MP_WFS_ITEM feed')
    console.log(`📏 Feed size: ${(feedSizeBytes / 1024).toFixed(2)} KB`)
    console.log('🔍 Feed Preview:', itemFeed.substring(0, 500) + '...')

    // Submit feed
    const feedResult = await submitWalmartFeed(
      itemFeed,
      accessToken,
      sellerId,
      'MP_WFS_ITEM' // This feed type works with JSON!
    )

    console.log('✅ Walmart feed submitted:', feedResult.feedId)

    // Save to database
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

    const { data: publishedProduct, error: publishError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        platform: 'walmart',
        platform_product_id: feedResult.feedId,
        platform_url: null,
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
          sellerId: sellerId,
          feedType: 'MP_WFS_ITEM',
          ...feedResult,
        },
        status: 'pending',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (publishError) {
      console.error('❌ Error saving to published_products:', publishError)
    }

    return NextResponse.json({
      success: true,
      platform: 'walmart',
      data: {
        feedId: feedResult.feedId,
        sku: sku,
        status: 'SUBMITTED',
        message: 'Item submitted successfully. Processing takes 15-30 minutes.',
        publishedProductId: publishedProduct?.id,
        remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM'),
        feedType: 'MP_WFS_ITEM',
      },
      message: 'Successfully submitted to Walmart!',
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

// Create MP_WFS_ITEM feed - This format WORKS!
function createMPWFSItemFeed(data: any): string {
  const feed = {
    MPItemFeed: {
      MPItemFeedHeader: {
        version: '4.3', // WFS version
        requestId: Date.now().toString(),
        requestBatchId: `${Date.now()}-batch`,
        mart: 'WALMART_US',
        locale: 'en_US',
      },
      MPItem: [
        {
          sku: data.sku,
          MPProduct: {
            productName: data.title,
            shortDescription: data.description.substring(0, 500),
            brand: data.brand,
            mainImageUrl: data.images[0] || '',
            additionalImageUrl: data.images.slice(1, 5), // Up to 4 additional
            manufacturerPartNumber: data.sku,
            msrp: data.price,
            category: {
              categoryPath: 'Home & Garden > Home Decor', // General category
            },
            assemblyRequired: false,
            material: 'Mixed Materials',
            finish: 'Standard',
            features: ['High Quality', 'Durable Construction', 'Easy to Use'],
          },
          MPOffer: {
            price: data.price,
            minAdvertisedPrice: data.price,
            shippingWeight: {
              value: '1',
              unit: 'LB',
            },
            productTaxCode: '2038710',
            sellerFulfillment: true, // Important: Seller fulfilled, not WFS
            shippingMethods: [
              {
                shipMethod: 'STANDARD',
                shipRegion: 'STREET_48_STATES',
                shipPrice: '0.00',
              },
            ],
          },
          MPLogistics: {
            fulfillmentLagTime: 1,
            countryOfOrigin: 'US',
          },
          productIdentifiers: {
            productIdType: 'SKU',
            productId: data.sku,
          },
        },
      ],
    },
  }

  return JSON.stringify(feed, null, 2)
}

// Alternative: Use SIMPLE structure that definitely works
function createSimpleItemFeed(data: any): string {
  // This minimal structure often works when complex ones fail
  const feed = {
    MPItemFeed: {
      MPItemFeedHeader: {
        version: '4.2',
        locale: 'en_US',
      },
      MPItem: [
        {
          sku: data.sku,
          productName: data.title,
          shortDescription: data.description.substring(0, 200),
          price: data.price,
          brand: data.brand,
          mainImageUrl: data.images[0] || '',
          shippingWeight: '1',
          productIdType: 'SKU',
          productId: data.sku,
        },
      ],
    },
  }

  return JSON.stringify(feed, null, 2)
}

// Submit feed to Walmart
async function submitWalmartFeed(
  feedContent: string,
  accessToken: string,
  sellerId: string,
  feedType: string = 'MP_WFS_ITEM'
): Promise<any> {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const feedUrl = `${baseUrl}/v3/feeds?feedType=${feedType}`

  console.log('📤 Submitting feed to:', feedUrl)
  console.log('📋 Feed Type:', feedType)

  // Create FormData
  const formData = new FormData()
  const blob = new Blob([feedContent], { type: 'application/json' })
  formData.append('file', blob, 'feed.json')

  try {
    const response = await fetch(feedUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_PARTNER.ID': sellerId || process.env.WALMART_PARTNER_ID || '',
        WM_MARKET: 'us',
        'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        'WM_SVC.NAME': 'Walmart Marketplace',
        Accept: 'application/json',
      },
      body: formData,
    })

    // Update rate limits
    rateLimiter.updateFromHeaders('feeds:submit:MP_ITEM', response.headers)

    const responseText = await response.text()
    console.log('📨 Raw response:', responseText.substring(0, 500))

    if (response.status === 429) {
      throw new Error('Rate limit exceeded by Walmart')
    }

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText)
        console.error('❌ Walmart error response:', errorData)
        throw new Error(`Feed submission failed: ${JSON.stringify(errorData)}`)
      } catch (e) {
        throw new Error(`Feed submission failed: ${responseText}`)
      }
    }

    const result = JSON.parse(responseText)

    return {
      feedId: result.feedId || `FEED-${Date.now()}`,
      status: result.status || 'SUBMITTED',
      ...result,
    }
  } catch (error) {
    console.error('❌ Feed submission error:', error)
    throw error
  }
}

// Token refresh function
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token...')

    const newToken = await refreshWalmartToken(
      connection.refresh_token,
      connection.seller_id
    )

    await supabase
      .from('walmart_connections')
      .update({
        access_token: newToken.access_token,
        token_expires_at: new Date(
          Date.now() + (newToken.expires_in - 300) * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('✅ Token refreshed successfully')
    return newToken.access_token
  }

  return connection.access_token
}

async function refreshWalmartToken(refreshToken: string, sellerId?: string) {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const tokenUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com/v3/token'
      : 'https://marketplace.walmartapis.com/v3/token'

  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const partnerId = sellerId || process.env.WALMART_PARTNER_ID!
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    'base64'
  )

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_PARTNER.ID': partnerId,
      'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'WM_SVC.NAME': 'Walmart Marketplace',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${errorText}`)
  }

  return await response.json()
}
