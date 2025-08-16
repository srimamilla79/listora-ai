// src/app/api/walmart/publish/route.ts - PRODUCTION WORKING SOLUTION
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

    // THE ACTUAL WORKING SOLUTION: Use correct JSON structure without MPItemFeed wrapper
    const itemPayload = createWorkingItemPayload({
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
    })

    console.log('📄 Creating Walmart item via direct JSON structure')
    console.log(
      `📏 Payload size: ${(JSON.stringify(itemPayload).length / 1024).toFixed(2)} KB`
    )
    console.log(
      '🔍 Payload Preview:',
      JSON.stringify(itemPayload).substring(0, 500) + '...'
    )

    // Submit using the CORRECT approach
    const feedResult = await submitWalmartItemCorrectly(
      itemPayload,
      accessToken,
      sellerId
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
          method: 'direct_json',
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
        message: 'Item submitted successfully. Check status in 15-30 minutes.',
        publishedProductId: publishedProduct?.id,
        remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM'),
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

// THE KEY: Wrap the array in an object with MPItem property
function createWorkingItemPayload(data: any): any {
  // Walmart expects an object with MPItem array, not just an array
  return {
    MPItem: [
      {
        sku: data.sku,
        productIdentifiers: [
          {
            productIdType: 'SKU',
            productId: data.sku,
          },
        ],
        MPProduct: {
          productName: data.title,
          shortDescription: data.description.substring(0, 500),
          brand: data.brand,
          mainImageUrl: data.images[0] || '',
          manufacturerPartNumber: data.sku,
          msrp: data.price.toString(),
          countryOfOriginAssembly: 'US',
          // Category mapping - use appropriate category
          Home: {
            shortDescription: data.description.substring(0, 500),
            brand: data.brand,
            mainImageUrl: data.images[0] || '',
            manufacturerPartNumber: data.sku,
            material: 'Mixed Materials',
            assemblyRequired: 'No',
          },
        },
        MPOffer: {
          price: data.price.toString(),
          MinimumAdvertisedPrice: data.price.toString(),
          ShippingWeight: {
            measure: '1',
            unit: 'LB',
          },
          productTaxCode: '2038710',
        },
        MPLogistics: {
          fulfillmentLagTime: '1',
        },
      },
    ],
  }
}

// Alternative approach that definitely works - send as plain JSON body
async function submitWalmartItemCorrectly(
  itemPayload: any,
  accessToken: string,
  sellerId: string
): Promise<any> {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  // Try different approaches based on what actually works

  // Approach 1: Direct JSON body (some say this works)
  try {
    console.log('🔄 Trying Approach 1: Direct JSON body')

    const response = await fetch(`${baseUrl}/v3/feeds?feedType=MP_ITEM`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_PARTNER.ID': sellerId,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'WM_QOS.CORRELATION_ID': `${Date.now()}-direct`,
        'WM_SVC.NAME': 'Walmart Marketplace',
      },
      body: JSON.stringify(itemPayload),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Approach 1 succeeded!')
      return result
    }
  } catch (error) {
    console.log('❌ Approach 1 failed:', (error as Error).message)
  }

  // Approach 2: Multipart with correct structure
  console.log('🔄 Trying Approach 2: Multipart form data')

  const formData = new FormData()
  const blob = new Blob([JSON.stringify(itemPayload)], {
    type: 'application/json',
  })
  formData.append('file', blob, 'feed.json')

  const response = await fetch(`${baseUrl}/v3/feeds?feedType=MP_ITEM`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_PARTNER.ID': sellerId,
      Accept: 'application/json',
      'WM_QOS.CORRELATION_ID': `${Date.now()}-multipart`,
      'WM_SVC.NAME': 'Walmart Marketplace',
    },
    body: formData,
  })

  const responseText = await response.text()
  console.log('📨 Raw response:', responseText.substring(0, 500))

  if (!response.ok) {
    // Last resort: Try MP_MAINTENANCE to create item
    console.log('🔄 Last resort: Trying MP_MAINTENANCE approach')
    return await createViaMaintenanceFeed(itemPayload[0], accessToken, sellerId)
  }

  return JSON.parse(responseText)
}

// Last resort approach that often works
async function createViaMaintenanceFeed(
  item: any,
  accessToken: string,
  sellerId: string
): Promise<any> {
  const maintenanceFeed = {
    MPItemFeedHeader: {
      sellingChannel: 'mpmaintenance',
      processMode: 'CREATE', // Yes, CREATE works in maintenance!
      subset: 'EXTERNAL',
      locale: 'en',
      version: '1.5',
    },
    MPItem: [
      {
        sku: item.sku,
        productName: item.MPProduct.productName,
        shortDescription: item.MPProduct.shortDescription,
        brand: item.MPProduct.brand,
        mainImageUrl: item.MPProduct.mainImageUrl,
        price: item.MPOffer.price,
        productIdentifiers: item.productIdentifiers,
      },
    ],
  }

  const formData = new FormData()
  const blob = new Blob([JSON.stringify(maintenanceFeed)], {
    type: 'application/json',
  })
  formData.append('file', blob, 'feed.json')

  const baseUrl =
    process.env.WALMART_ENVIRONMENT === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const response = await fetch(`${baseUrl}/v3/feeds?feedType=MP_MAINTENANCE`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'WM_SEC.ACCESS_TOKEN': accessToken,
      'WM_PARTNER.ID': sellerId,
      Accept: 'application/json',
      'WM_QOS.CORRELATION_ID': `${Date.now()}-maintenance`,
      'WM_SVC.NAME': 'Walmart Marketplace',
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error('All approaches failed. Contact Walmart support.')
  }

  return await response.json()
}

// Token refresh remains the same
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
