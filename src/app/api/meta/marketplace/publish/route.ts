import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

interface MarketplaceProduct {
  id: string
  product_name: string
  features: string
  generated_content: string
  price: number
  quantity: number
  sku?: string
  brand?: string
  condition?: 'new' | 'refurbished' | 'used'
  category?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productContent,
      images,
      userId,
      publishOptions = {},
    }: {
      productContent: MarketplaceProduct
      images: string[]
      userId: string
      publishOptions?: {
        condition?: 'new' | 'refurbished' | 'used'
        category?: string
        brand?: string
        shippingPrice?: number
        location?: {
          city?: string
          state?: string
          country?: string
        }
      }
    } = body

    if (!productContent.price || productContent.price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required for marketplace listing' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get Meta connection with catalog
    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single()

    if (!connection || !connection.facebook_catalog_id) {
      return NextResponse.json(
        { error: 'No Facebook catalog found. Please set up commerce first.' },
        { status: 404 }
      )
    }

    // Extract product details from generated content
    const productDetails = extractProductDetails(productContent)

    // Step 1: Create product in Facebook Catalog
    const catalogProduct = await createCatalogProduct({
      catalogId: connection.facebook_catalog_id,
      accessToken: connection.facebook_page_access_token,
      product: {
        retailer_id: productContent.sku || `LISTORA-${Date.now()}`,
        name: productDetails.title || productContent.product_name,
        description: productDetails.description,
        price: Math.round(productContent.price * 100), // Convert to cents
        availability: productContent.quantity > 0 ? 'in stock' : 'out of stock',
        condition: publishOptions.condition || 'new',
        brand: publishOptions.brand || productDetails.brand || 'Generic',
        category:
          publishOptions.category || detectProductCategory(productContent),
        image_url: images[0],
        additional_image_urls: images.slice(1, 10), // Max 10 additional images
        inventory: productContent.quantity || 1,
        currency: 'USD',
        // Marketplace specific fields
        marketplace_category: getMarketplaceCategory(productContent),
        shipping: {
          price: publishOptions.shippingPrice || 0,
          country: publishOptions.location?.country || 'US',
        },
      },
    })

    if (catalogProduct.error) {
      throw new Error(catalogProduct.error.message)
    }

    // Step 2: Create Marketplace listing
    const marketplaceListing = await createMarketplaceListing({
      pageId: connection.facebook_page_id,
      accessToken: connection.facebook_page_access_token,
      catalogProductId: catalogProduct.id,
      product: productContent,
      location: publishOptions.location,
    })

    // Step 3: Create a promotional post (optional)
    let postId = null
    if (body.createPost) {
      const post = await createMarketplacePost({
        pageId: connection.facebook_page_id,
        accessToken: connection.facebook_page_access_token,
        product: productContent,
        catalogProductId: catalogProduct.id,
        images,
      })
      postId = post.id
    }

    // Step 4: Save to database
    await supabase.from('marketplace_listings').insert({
      user_id: userId,
      content_id: productContent.id,
      catalog_product_id: catalogProduct.id,
      marketplace_listing_id: marketplaceListing.id,
      facebook_post_id: postId,
      title: productDetails.title,
      description: productDetails.description,
      price: productContent.price,
      quantity: productContent.quantity,
      sku: productContent.sku || `LISTORA-${Date.now()}`,
      condition: publishOptions.condition || 'new',
      category: publishOptions.category,
      images: images,
      status: 'active',
      listing_url: marketplaceListing.url,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        catalogProductId: catalogProduct.id,
        marketplaceListingId: marketplaceListing.id,
        postId: postId,
        listingUrl: marketplaceListing.url,
      },
      message: 'Successfully listed on Facebook Marketplace!',
    })
  } catch (error) {
    console.error('Marketplace publish error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to publish to marketplace',
      },
      { status: 500 }
    )
  }
}

// Helper function to create catalog product
async function createCatalogProduct(options: {
  catalogId: string
  accessToken: string
  product: any
}) {
  const { catalogId, accessToken, product } = options

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${catalogId}/products`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...product,
        access_token: accessToken,
      }),
    }
  )

  return response.json()
}

// Create marketplace listing from catalog product
async function createMarketplaceListing(options: {
  pageId: string
  accessToken: string
  catalogProductId: string
  product: any
  location?: any
}) {
  const { pageId, accessToken, catalogProductId, product, location } = options

  // Create marketplace listing
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/marketplace_listings`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        catalog_product_id: catalogProductId,
        location: {
          city: location?.city || 'South Riding',
          state: location?.state || 'Virginia',
          country: location?.country || 'US',
        },
        access_token: accessToken,
      }),
    }
  )

  const listing = await response.json()

  // Get listing URL
  if (listing.id) {
    const urlResponse = await fetch(
      `https://graph.facebook.com/v18.0/${listing.id}?fields=url&access_token=${accessToken}`
    )
    const urlData = await urlResponse.json()
    listing.url = urlData.url
  }

  return listing
}

// Create promotional post for marketplace item
async function createMarketplacePost(options: {
  pageId: string
  accessToken: string
  product: any
  catalogProductId: string
  images: string[]
}) {
  const { pageId, accessToken, product, catalogProductId } = options

  const caption = generateMarketplaceCaption(product)

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/feed`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: caption,
        link: `https://www.facebook.com/marketplace/item/${catalogProductId}`,
        call_to_action: {
          type: 'SHOP_NOW',
          value: {
            link: `https://www.facebook.com/marketplace/item/${catalogProductId}`,
          },
        },
        access_token: accessToken,
      }),
    }
  )

  return response.json()
}

// Extract structured details from generated content
function extractProductDetails(productContent: any) {
  const { generated_content, product_name } = productContent

  // Extract title
  const titleMatch = generated_content.match(
    /\*\*1\.\s*PRODUCT TITLE\/HEADLINE:\*\*\s*\n[^\n]*\n([^\n]+)/i
  )
  const title = titleMatch?.[1]?.trim() || product_name

  // Extract description
  const descMatch = generated_content.match(
    /\*\*3\.\s*DETAILED PRODUCT DESCRIPTION:\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i
  )
  const description =
    descMatch?.[1]?.trim()?.substring(0, 500) || productContent.features

  // Try to extract brand from title or features
  const brandMatch =
    title.match(/^(\w+)\s/) ||
    productContent.features.match(/brand[:\s]+(\w+)/i)
  const brand = brandMatch?.[1] || null

  return {
    title,
    description,
    brand,
  }
}

// Detect product category
function detectProductCategory(product: any): string {
  const text = `${product.product_name} ${product.features}`.toLowerCase()

  // Facebook commerce categories
  if (text.match(/shoe|sneaker|boot|sandal|footwear/))
    return 'shoes_and_footwear'
  if (text.match(/shirt|dress|pants|jacket|clothing/))
    return 'clothing_and_accessories'
  if (text.match(/phone|laptop|computer|tablet|electronic/))
    return 'electronics'
  if (text.match(/furniture|chair|table|desk|couch/)) return 'furniture'
  if (text.match(/toy|game|puzzle|doll/)) return 'toys_and_games'
  if (text.match(/book|novel|textbook|magazine/)) return 'books_and_magazines'
  if (text.match(/jewelry|necklace|ring|bracelet/)) return 'jewelry_and_watches'
  if (text.match(/beauty|makeup|skincare|cosmetic/)) return 'health_and_beauty'
  if (text.match(/sport|fitness|gym|exercise/)) return 'sports_and_outdoors'

  return 'other'
}

// Get marketplace-specific category
function getMarketplaceCategory(product: any): string {
  const category = detectProductCategory(product)

  // Map to Facebook Marketplace categories
  const categoryMap: Record<string, string> = {
    shoes_and_footwear: 'apparel',
    clothing_and_accessories: 'apparel',
    electronics: 'electronics',
    furniture: 'home',
    toys_and_games: 'family',
    books_and_magazines: 'entertainment',
    jewelry_and_watches: 'apparel',
    health_and_beauty: 'health_beauty',
    sports_and_outdoors: 'sports_outdoors',
    other: 'misc',
  }

  return categoryMap[category] || 'misc'
}

// Generate marketplace-specific caption
function generateMarketplaceCaption(product: any): string {
  const { product_name, price, features } = product

  let caption = `🛍️ FOR SALE: ${product_name}\n\n`
  caption += `💰 Price: $${price}\n\n`

  // Add key features
  const featureList = features.split(/[,\n]/).filter(Boolean).slice(0, 3)
  if (featureList.length > 0) {
    caption += `✨ Features:\n`
    featureList.forEach((feature: string) => {
      caption += `• ${feature.trim()}\n`
    })
    caption += '\n'
  }

  caption += `📍 Available for local pickup or shipping\n`
  caption += `💬 DM for more details or to purchase!\n\n`
  caption += `#FacebookMarketplace #ForSale #${product_name.replace(/\s+/g, '')}`

  return caption
}
