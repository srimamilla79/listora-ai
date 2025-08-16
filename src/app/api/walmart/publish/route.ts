// src/app/api/walmart/publish/route.ts - Complete MP_ITEM Implementation
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { rateLimiter, validateFeedFileSize } from '@/lib/walmart-rate-limiter'

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

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-WM-${Date.now()}`

    console.log('📦 Product details:', {
      sku,
      title: productContent.product_name,
      price: publishingOptions.price,
      brand: publishingOptions.brand || 'Generic',
      category: publishingOptions.category || 'Home',
    })

    // Create MP_ITEM feed JSON
    const itemFeed = createMPItemFeed({
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

    // Validate file size before submission
    const feedSizeBytes = new TextEncoder().encode(itemFeed).length
    if (!validateFeedFileSize('MP_ITEM', feedSizeBytes)) {
      return NextResponse.json(
        {
          error:
            'Feed file size exceeds 26MB limit. Please reduce content size.',
        },
        { status: 413 }
      )
    }

    console.log('📄 Creating Walmart item via Feed API')
    console.log(`📏 Feed size: ${(feedSizeBytes / 1024).toFixed(2)} KB`)
    console.log('🔍 Feed Preview:', itemFeed.substring(0, 500) + '...')

    // Submit feed to Walmart
    const feedResult = await submitWalmartFeed(
      itemFeed,
      accessToken,
      sellerId,
      'MP_ITEM' // Using MP_ITEM instead of MP_ITEM_MATCH
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
          sellerId: sellerId,
          feedType: 'MP_ITEM',
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
          'Item submitted to Walmart. Processing typically takes 15-30 minutes.',
        publishedProductId: publishedProduct?.id,
        remainingTokens: rateLimiter.getRemainingTokens('feeds:submit:MP_ITEM'),
        feedType: 'MP_ITEM',
      },
      message:
        'Successfully submitted to Walmart! Check feed status in 15-30 minutes.',
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

// Create MP_ITEM feed structure (full item creation, no matching required)
function createMPItemFeed(data: any): string {
  // Map category to Walmart taxonomy
  const categoryMapping = getCategoryMapping(data.category)

  const feed = {
    MPItemFeed: {
      MPItemFeedHeader: {
        version: '3.2', // Using stable version 3.2
        requestId: Date.now().toString(),
        requestBatchId: `${Date.now()}-batch`,
        mart: 'WALMART_US',
      },
      MPItem: [
        {
          sku: data.sku,
          productIdentifiers: [
            {
              productIdType: 'SKU', // Using SKU as identifier - no GTIN validation
              productId: data.sku,
            },
          ],
          MPProduct: {
            productName: sanitizeText(data.title),
            shortDescription: sanitizeText(data.description.substring(0, 500)),
            brand: sanitizeText(data.brand),
            manufacturer: sanitizeText(data.brand),
            mainImageUrl: data.images[0] || '',
            productIdUpdate: 'No',
            skuUpdate: 'No',
            additionalProductAttributes: {
              hasWarranty: 'No',
              countryOfOriginAssembly: 'US',
              isAssemblyRequired: 'No',
              assemblyInstructions: 'No assembly required',
            },
            category: categoryMapping.categoryStructure,
          },
          MPOffer: {
            price: Number(data.price).toFixed(2),
            MinimumAdvertisedPrice: Number(data.price).toFixed(2),
            shippingWeight: {
              measure: '1',
              unit: 'lb',
            },
            productTaxCode: '2038710', // General taxable goods
            shippingOverrides: [
              {
                shipRegion: 'STREET_48_STATES',
                shipMethod: 'STANDARD',
                shipPrice: '0', // Free shipping
              },
            ],
          },
          MPLogistics: {
            fulfillmentLagTime: '1',
          },
        },
      ],
    },
  }

  return JSON.stringify(feed, null, 2)
}

// Get category mapping based on product type
function getCategoryMapping(userCategory: string) {
  const category = userCategory?.toLowerCase() || 'general'

  // Category mappings with required attributes
  const categoryMappings: any = {
    shoes: {
      categoryName: 'Footwear',
      categoryStructure: {
        Footwear: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          gender: 'Unisex',
          ageGroup: 'Adult',
          shoeSize: 'Various',
          shoeWidth: 'Medium',
          color: 'Multi',
          material: 'Synthetic',
        },
      },
    },
    'men shoes': {
      categoryName: 'Footwear',
      categoryStructure: {
        Footwear: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          gender: 'Men',
          ageGroup: 'Adult',
          shoeSize: 'Various',
          shoeWidth: 'Medium',
          color: 'Multi',
          material: 'Synthetic',
        },
      },
    },
    electronics: {
      categoryName: 'Electronics',
      categoryStructure: {
        Electronics: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          modelNumber: '', // Will be filled
          warrantyLength: '90 days',
          warrantyText: '90 day limited warranty',
        },
      },
    },
    clothing: {
      categoryName: 'ClothingAndAccessories',
      categoryStructure: {
        ClothingAndAccessories: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          gender: 'Unisex',
          ageGroup: 'Adult',
          size: 'One Size',
          color: 'Multi',
          material: 'Cotton Blend',
        },
      },
    },
    toys: {
      categoryName: 'ToysAndGames',
      categoryStructure: {
        ToysAndGames: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          minimumAge: '36',
          maximumAge: '1200', // 100 years in months
          ageGroup: 'Child',
          targetGender: 'Unisex',
        },
      },
    },
    default: {
      categoryName: 'Home',
      categoryStructure: {
        Home: {
          shortDescription: '', // Will be filled
          brand: '', // Will be filled
          mainImageUrl: '', // Will be filled
          manufacturerPartNumber: '', // Will be filled
          modelNumber: '', // Will be filled
          material: 'Mixed Materials',
          finish: 'Standard',
          homeDecorStyle: 'Modern',
        },
      },
    },
  }

  // Find the best category match
  let selectedCategory = categoryMappings.default
  for (const [key, value] of Object.entries(categoryMappings)) {
    if (category.includes(key) || key.includes(category)) {
      selectedCategory = value
      break
    }
  }

  return selectedCategory
}

// Sanitize text to prevent XML/JSON issues
function sanitizeText(text: string): string {
  if (!text) return ''

  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/&/g, 'and') // Replace ampersands
    .replace(/"/g, "'") // Replace quotes
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 4000) // Max length
}

// Submit feed to Walmart
async function submitWalmartFeed(
  feedContent: string,
  accessToken: string,
  sellerId: string,
  feedType: string = 'MP_ITEM'
): Promise<any> {
  const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const feedUrl = `${baseUrl}/v3/feeds?feedType=${feedType}`

  console.log('📤 Submitting feed to:', feedUrl)
  console.log('📋 Feed Type:', feedType)

  // Create FormData with proper content-type
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

// Token refresh with 5-minute buffer
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
