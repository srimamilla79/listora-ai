// src/app/api/walmart/publish/route.ts - Updated with rate limiting and latest spec version
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import {
  rateLimiter,
  walmartApiCall,
  validateFeedFileSize,
} from '@/lib/walmart-rate-limiter'

// Latest MP_ITEM spec version as of documentation
const ITEM_SPEC_VERSION = '5.0'

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Walmart publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()
    const supabase = await createServerSideClient()

    // Check rate limit ONCE at the beginning
    const canProceed = await rateLimiter.checkRateLimit('feeds:submit:MP_ITEM')
    if (!canProceed) {
      const remaining = rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM')
      return NextResponse.json(
        {
          error: `Rate limit exceeded. ${remaining} requests remaining. Please wait before trying again.`,
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
    const sellerId = connection.seller_id || connection.seller_info?.partnerId
    console.log('✅ Walmart connection found:', connection.id)
    console.log('🔍 Connection debug:', {
      connection_seller_id: connection.seller_id,
      seller_info: connection.seller_info,
      final_sellerId: sellerId,
    })
    console.log('🏪 Seller ID:', sellerId)

    // Check if token needs refresh (5 minute buffer)
    const accessToken = await refreshTokenIfNeeded(connection, supabase)
    console.log('🔐 Using access token:', accessToken.substring(0, 20) + '...')

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-WM-${Date.now()}`

    // Create XML feed with latest spec version and multiple images support
    const itemJson = createItemJson({
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
      specVersion: ITEM_SPEC_VERSION,
    })

    // Validate file size before submission
    const jsonSizeBytes = new TextEncoder().encode(itemJson).length
    if (!validateFeedFileSize('MP_ITEM', jsonSizeBytes)) {
      return NextResponse.json(
        {
          error:
            'JSON file size exceeds 26MB limit. Please reduce content size.',
        },
        { status: 413 }
      )
    }

    console.log('📄 Creating Walmart item via Feed API')
    console.log(`📏 JSON size: ${(jsonSizeBytes / 1024).toFixed(2)} KB`)

    // Submit feed to Walmart with rate limiting
    const feedResult = await submitWalmartFeedWithRateLimit(
      itemJson,
      accessToken,
      sellerId
    )

    console.log('✅ Walmart feed submitted:', feedResult.feedId)

    // Save to walmart_listings table
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

    // Generate GTIN if not already defined
    const gtin =
      '00' + sku.replace(/\D/g, '').padStart(12, '0').substring(0, 12)

    // Save to unified published_products table
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
          specVersion: ITEM_SPEC_VERSION,
          sellerId: sellerId,
          gtin: gtin, // ADD THIS LINE - This enables the search functionality
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
        publishedProductId: publishedProduct?.id,
        remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM'),
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

function createItemJson(data: any): string {
  // Build secondary images array
  const secondaryImages = []
  if (data.images && data.images.length > 1) {
    for (let i = 1; i < Math.min(data.images.length, 9); i++) {
      if (data.images[i]) {
        secondaryImages.push(data.images[i])
      }
    }
  }

  // Walmart expects MPItemFeed > MPItem[] structure for JSON
  const feedData = {
    MPItemFeed: {
      MPItem: [
        {
          sku: data.sku,
          productIdentifiers: {
            productIdType: 'SKU',
            productId: data.sku,
          },
          MPProduct: {
            productName: data.title,
            shortDescription: data.description.substring(0, 200),
            brand: data.brand,
            mainImageUrl: data.images?.[0] || '',
            productSecondaryImageURL: secondaryImages,
            manufacturerPartNumber: data.sku,
            msrp: data.price,
            category: {
              categoryPath: 'Home/Furniture/Living Room Furniture',
            },
          },
          MPOffer: {
            price: data.price,
            shippingWeight: {
              value: 1,
              unit: 'LB',
            },
            productTaxCode: '2038710',
            MinimumAdvertisedPrice: data.price,
          },
          MPLogistics: {
            fulfillmentLagTime: 1,
          },
        },
      ],
    },
  }

  return JSON.stringify(feedData, null, 2)
}

// Submit feed WITHOUT rate limiting check (already checked above)
async function submitWalmartFeedWithRateLimit(
  jsonContent: string,
  accessToken: string,
  sellerId?: string
): Promise<any> {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const feedUrl = `${baseUrl}/v3/feeds?feedType=MP_ITEM`

  console.log('📤 Submitting feed to:', feedUrl)

  // Don't check rate limit here - already checked in main function
  // Just make the API call and update from response headers
  const response = await fetch(feedUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_PARTNER.ID': sellerId || process.env.WALMART_PARTNER_ID || '',
      WM_MARKET: 'us',
      'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      'WM_SVC.NAME': 'Walmart Marketplace',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: jsonContent,
  })

  // Update rate limits from response headers
  rateLimiter.updateFromHeaders('feeds:submit:MP_ITEM', response.headers)

  if (response.status === 429) {
    throw new Error('Rate limit exceeded by Walmart')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Feed submission failed: ${errorText}`)
  }

  const result = await response.json()

  // Ensure we have a valid feed response
  return {
    feedId: result.feedId || `FEED-${Date.now()}`,
    status: result.status || 'SUBMITTED',
    ...result,
  }
}

// Updated token refresh with 5-minute buffer
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000) // 5-minute buffer

  if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token (expires within 5 minutes)...')

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

    console.log('✅ Walmart token refreshed successfully')
    return newToken.access_token
  }

  return connection.access_token
}

async function refreshWalmartToken(refreshToken: string, sellerId?: string) {
  // Force production URL for now
  const tokenUrl = 'https://marketplace.walmartapis.com/v3/token'

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
