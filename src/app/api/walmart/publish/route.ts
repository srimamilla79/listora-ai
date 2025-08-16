// src/app/api/walmart/publish/route.ts - MP_ITEM with XML Format
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
      category: publishingOptions.category || 'Home',
    })

    // Create XML feed for MP_ITEM (NOT JSON!)
    const itemXML = createMPItemXML({
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
    const feedSizeBytes = new TextEncoder().encode(itemXML).length
    if (!validateFeedFileSize('MP_ITEM', feedSizeBytes)) {
      return NextResponse.json(
        {
          error:
            'Feed file size exceeds 26MB limit. Please reduce content size.',
        },
        { status: 413 }
      )
    }

    console.log('📄 Creating Walmart item via MP_ITEM XML feed')
    console.log(`📏 Feed size: ${(feedSizeBytes / 1024).toFixed(2)} KB`)
    console.log('🔍 Feed Preview:', itemXML.substring(0, 500) + '...')

    // Submit XML feed to Walmart
    const feedResult = await submitWalmartXMLFeed(
      itemXML,
      accessToken,
      sellerId,
      'MP_ITEM'
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
          feedType: 'MP_ITEM',
          format: 'XML',
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
        format: 'XML',
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

// Create XML for MP_ITEM feed type
function createMPItemXML(data: any): string {
  // Escape XML special characters
  const escapeXml = (str: string): string => {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\n+/g, ' ')
      .trim()
  }

  // Map category to Walmart structure
  const categoryData = getCategoryMapping(data.category)

  // Build XML based on working examples from Stack Overflow
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MPItemFeed xmlns="http://walmart.com/">
  <MPItemFeedHeader>
    <version>3.1</version>
    <mart>WALMART_US</mart>
  </MPItemFeedHeader>
  <MPItem>
    <sku>${escapeXml(data.sku)}</sku>
    <productIdentifiers>
      <productIdentifier>
        <productIdType>SKU</productIdType>
        <productId>${escapeXml(data.sku)}</productId>
      </productIdentifier>
    </productIdentifiers>
    <MPProduct>
      <productName>${escapeXml(data.title)}</productName>
      <ProductIdUpdate>No</ProductIdUpdate>
      <SkuUpdate>No</SkuUpdate>
      <category>
        <${categoryData.categoryName}>
          ${getCategorySpecificXML(categoryData.categoryName, data)}
        </${categoryData.categoryName}>
      </category>
    </MPProduct>
    <MPOffer>
      <price>${data.price}</price>
      <MinimumAdvertisedPrice>${data.price}</MinimumAdvertisedPrice>
      <ShippingWeight>
        <measure>1</measure>
        <unit>lb</unit>
      </ShippingWeight>
      <ProductTaxCode>2038710</ProductTaxCode>
    </MPOffer>
  </MPItem>
</MPItemFeed>`

  return xml
}

// Get category-specific XML content
function getCategorySpecificXML(categoryName: string, data: any): string {
  const escapeXml = (str: string): string => {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/\n+/g, ' ')
      .trim()
  }

  // Common fields for all categories
  const commonFields = `
          <shortDescription>${escapeXml(data.description.substring(0, 500))}</shortDescription>
          <brand>${escapeXml(data.brand)}</brand>
          <mainImageUrl>${escapeXml(data.images[0] || '')}</mainImageUrl>`

  switch (categoryName) {
    case 'Footwear':
      return `${commonFields}
          <manufacturer>${escapeXml(data.brand)}</manufacturer>
          <manufacturerPartNumber>${escapeXml(data.sku)}</manufacturerPartNumber>
          <modelNumber>${escapeXml(data.sku)}</modelNumber>
          <gender>Unisex</gender>
          <ageGroup>Adult</ageGroup>
          <shoeSize>Various</shoeSize>
          <color>Multi</color>`

    case 'Electronics':
      return `${commonFields}
          <manufacturer>${escapeXml(data.brand)}</manufacturer>
          <manufacturerPartNumber>${escapeXml(data.sku)}</manufacturerPartNumber>
          <modelNumber>${escapeXml(data.sku)}</modelNumber>
          <warrantyLength>90 days</warrantyLength>
          <warrantyText>90 day limited warranty</warrantyText>`

    case 'ClothingAndAccessories':
      return `${commonFields}
          <manufacturer>${escapeXml(data.brand)}</manufacturer>
          <manufacturerPartNumber>${escapeXml(data.sku)}</manufacturerPartNumber>
          <gender>Unisex</gender>
          <ageGroup>Adult</ageGroup>
          <clothingSize>One Size</clothingSize>
          <color>Multi</color>`

    case 'ToysAndGames':
      return `${commonFields}
          <manufacturer>${escapeXml(data.brand)}</manufacturer>
          <manufacturerPartNumber>${escapeXml(data.sku)}</manufacturerPartNumber>
          <modelNumber>${escapeXml(data.sku)}</modelNumber>
          <recommendedMinimumAge>
            <measure>36</measure>
            <unit>months</unit>
          </recommendedMinimumAge>
          <targetAudience>Unisex</targetAudience>`

    case 'Home':
    default:
      return `${commonFields}
          <manufacturer>${escapeXml(data.brand)}</manufacturer>
          <manufacturerPartNumber>${escapeXml(data.sku)}</manufacturerPartNumber>
          <modelNumber>${escapeXml(data.sku)}</modelNumber>
          <assemblyRequired>false</assemblyRequired>
          <material>Mixed Materials</material>`
  }
}

// Get category mapping
function getCategoryMapping(userCategory: string) {
  const category = userCategory?.toLowerCase() || 'general'

  const categoryMappings: any = {
    shoes: { categoryName: 'Footwear' },
    'men shoes': { categoryName: 'Footwear' },
    'women shoes': { categoryName: 'Footwear' },
    electronics: { categoryName: 'Electronics' },
    clothing: { categoryName: 'ClothingAndAccessories' },
    toys: { categoryName: 'ToysAndGames' },
    sports: { categoryName: 'SportsAndRecreation' },
    home: { categoryName: 'Home' },
    default: { categoryName: 'Home' },
  }

  // Find the best category match
  for (const [key, value] of Object.entries(categoryMappings)) {
    if (category.includes(key) || key.includes(category)) {
      return value
    }
  }

  return categoryMappings.default
}

// Submit XML feed to Walmart
async function submitWalmartXMLFeed(
  xmlContent: string,
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

  console.log('📤 Submitting XML feed to:', feedUrl)
  console.log('📋 Feed Type:', feedType)
  console.log('📝 Format: XML')

  // Create FormData with XML content
  const formData = new FormData()
  const blob = new Blob([xmlContent], { type: 'text/xml' })
  formData.append('file', blob, 'feed.xml')

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
