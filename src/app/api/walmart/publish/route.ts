// src/app/api/walmart/publish/route.ts - Complete Fixed Version
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import {
  rateLimiter,
  walmartApiCall,
  validateFeedFileSize,
} from '@/lib/walmart-rate-limiter'

// MP_ITEM spec version - Use 4.8 as it's the latest stable version mentioned in docs
const ITEM_SPEC_VERSION = '4.8'

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
    console.log('🏪 Seller ID:', sellerId)

    // Check if token needs refresh (5 minute buffer)
    const accessToken = await refreshTokenIfNeeded(connection, supabase)
    console.log('🔑 Using access token:', accessToken.substring(0, 20) + '...')

    // Generate SKU and GTIN
    const sku = publishingOptions.sku || `LISTORA-WM-${Date.now()}`
    // Generate a valid 12-digit UPC/GTIN
    const gtin = generateValidGTIN(sku)

    console.log('📦 Product details:', {
      sku,
      gtin,
      title: productContent.product_name,
      price: publishingOptions.price,
    })

    // Create JSON feed - This is the critical fix!
    const itemJson = createMPItemJson({
      sku,
      gtin,
      title: productContent.product_name || 'Product',
      description:
        productContent.content ||
        productContent.features ||
        'High quality product',
      price: parseFloat(publishingOptions.price),
      brand: publishingOptions.brand || 'Generic',
      images: images || [],
      quantity: parseInt(publishingOptions.quantity) || 1,
      category: publishingOptions.category || 'Home & Garden',
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
    console.log('🔍 JSON Preview:', itemJson.substring(0, 500) + '...')

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
          gtin: gtin,
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
        gtin: gtin,
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

// CRITICAL FIX: The JSON structure for MP_ITEM is different than what you had
function createMPItemJson(data: any): string {
  // Based on research, MP_ITEM expects a flat structure, not wrapped in MPItemFeed
  // This matches the spec 4.8 format

  const itemData = {
    sku: data.sku,
    productIdentifiers: {
      productIdType: 'GTIN',
      productId: data.gtin,
    },
    processMode: 'CREATE', // Required for MP_ITEM
    productName: data.title,
    shortDescription: data.description.substring(0, 4000), // Max 4000 chars
    longDescription: data.description, // Full description
    brand: data.brand,
    mainImageUrl: data.images?.[0] || '',
    productSecondaryImageURL: data.images?.slice(1, 9) || [], // Up to 8 secondary images
    price: data.price,
    shippingWeight: {
      value: 1,
      unit: 'LB',
    },
    productTaxCode: '2038710', // General taxable goods
    category: 'Home & Garden > Furniture > Living Room Furniture',
    manufacturerPartNumber: data.sku,
    msrp: data.price,
    minimumAdvertisedPrice: data.price,
    fulfillmentLagTime: 1,
    // Additional required fields for spec 4.8
    ProductIdUpdate: 'No',
    SkuUpdate: 'No',
    // Category specific attributes - adjust based on your category
    additionalProductAttributes: {
      assemblyRequired: 'No',
      countryOfOrigin: 'US',
    },
  }

  return JSON.stringify(itemData, null, 2)
}

// Generate a valid GTIN/UPC (12 digits with check digit)
function generateValidGTIN(sku: string): string {
  // Extract numbers from SKU and pad to 11 digits
  const numbers = sku.replace(/\D/g, '').padStart(11, '0').substring(0, 11)

  // Calculate check digit
  let sum = 0
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(numbers[i])
    sum += i % 2 === 0 ? digit : digit * 3
  }
  const checkDigit = (10 - (sum % 10)) % 10

  return numbers + checkDigit
}

// CRITICAL FIX: Submit feed with proper content-type handling
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

  // CRITICAL: Create FormData with proper content-type for JSON
  const formData = new FormData()
  const blob = new Blob([jsonContent], { type: 'application/json' })
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
        // DO NOT set Content-Type - let fetch set it with boundary for multipart
      },
      body: formData,
    })

    // Update rate limits from response headers
    rateLimiter.updateFromHeaders('feeds:submit:MP_ITEM', response.headers)

    const responseText = await response.text()
    console.log('📨 Raw response:', responseText.substring(0, 500))

    if (response.status === 429) {
      throw new Error('Rate limit exceeded by Walmart')
    }

    if (!response.ok) {
      // Try to parse error response
      try {
        const errorData = JSON.parse(responseText)
        console.error('❌ Walmart error response:', errorData)
        throw new Error(`Feed submission failed: ${JSON.stringify(errorData)}`)
      } catch (e) {
        throw new Error(`Feed submission failed: ${responseText}`)
      }
    }

    const result = JSON.parse(responseText)

    // Ensure we have a valid feed response
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

// Updated token refresh with 5-minute buffer
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

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
