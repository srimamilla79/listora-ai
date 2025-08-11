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

    // Get Meta connection
    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single()

    if (!connection) {
      return NextResponse.json(
        { error: 'No Meta connection found' },
        { status: 404 }
      )
    }

    // Check permissions BEFORE attempting any marketplace operations
    console.log('Checking Facebook permissions...')
    try {
      const permissionCheck = await fetch(
        `https://graph.facebook.com/v18.0/me/permissions?access_token=${connection.facebook_page_access_token}`
      )
      const permissions = await permissionCheck.json()

      console.log('Available permissions:', permissions.data)

      // Check for required permissions
      const requiredPermissions = ['pages_manage_posts', 'pages_show_list']
      const hasBasicPermissions = requiredPermissions.every((perm) =>
        permissions.data?.some(
          (p: any) => p.permission === perm && p.status === 'granted'
        )
      )

      // Check for commerce permissions (these might not be granted yet)
      const commercePermissions = [
        'commerce_account_read_settings',
        'commerce_account_manage_orders',
        'business_management',
      ]
      const hasCommercePermissions = commercePermissions.some((perm) =>
        permissions.data?.some(
          (p: any) => p.permission === perm && p.status === 'granted'
        )
      )

      if (!hasBasicPermissions) {
        return NextResponse.json(
          {
            error:
              'Missing basic Facebook permissions. Please reconnect your Facebook account.',
            permissions_required: requiredPermissions,
            permissions_found:
              permissions.data?.map((p: any) => p.permission) || [],
          },
          { status: 403 }
        )
      }

      if (!hasCommercePermissions) {
        console.warn(
          'Commerce permissions not available, attempting basic marketplace listing...'
        )

        // For now, we'll proceed with a simplified approach
        // that doesn't require catalog management
        return await createSimplifiedMarketplaceListing({
          connection,
          productContent,
          images,
          publishOptions,
          userId,
          supabase,
        })
      }
    } catch (permError) {
      console.error('Permission check failed:', permError)
      // Continue with simplified approach if permission check fails
      return await createSimplifiedMarketplaceListing({
        connection,
        productContent,
        images,
        publishOptions,
        userId,
        supabase,
      })
    }

    // Only attempt catalog operations if we have commerce permissions
    // Check if catalog exists, create if needed
    if (!connection.facebook_catalog_id) {
      console.log('No catalog found, attempting to create one...')

      try {
        // First, check if user has a business account
        const businessResponse = await fetch(
          `https://graph.facebook.com/v18.0/me/businesses?access_token=${connection.facebook_page_access_token}`
        )
        const businesses = await businessResponse.json()

        if (!businesses.data || businesses.data.length === 0) {
          console.log('No business account found, using simplified approach')
          return await createSimplifiedMarketplaceListing({
            connection,
            productContent,
            images,
            publishOptions,
            userId,
            supabase,
          })
        }

        // Create catalog under the first business
        const businessId = businesses.data[0].id
        const catalogResponse = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/owned_product_catalogs`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Listora AI Products',
              vertical: 'commerce',
              access_token: connection.facebook_page_access_token,
            }),
          }
        )

        const catalog = await catalogResponse.json()

        if (catalog.error) {
          console.error('Catalog creation failed:', catalog.error)
          return await createSimplifiedMarketplaceListing({
            connection,
            productContent,
            images,
            publishOptions,
            userId,
            supabase,
          })
        }

        // Update connection with catalog ID
        await supabase
          .from('meta_connections')
          .update({
            facebook_catalog_id: catalog.id,
            commerce_enabled: true,
          })
          .eq('user_id', userId)

        connection.facebook_catalog_id = catalog.id
      } catch (catalogError) {
        console.error('Catalog creation error:', catalogError)
        return await createSimplifiedMarketplaceListing({
          connection,
          productContent,
          images,
          publishOptions,
          userId,
          supabase,
        })
      }
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
        additional_image_urls: images.slice(1, 10),
        inventory: productContent.quantity || 1,
        currency: 'USD',
      },
    })

    if (catalogProduct.error) {
      console.error('Catalog product creation failed:', catalogProduct.error)
      // Fallback to simplified approach
      return await createSimplifiedMarketplaceListing({
        connection,
        productContent,
        images,
        publishOptions,
        userId,
        supabase,
      })
    }

    // Step 2: Create Marketplace listing
    const marketplaceListing = await createMarketplaceListing({
      pageId: connection.facebook_page_id,
      accessToken: connection.facebook_page_access_token,
      catalogProductId: catalogProduct.id,
      product: productContent,
      location: publishOptions.location,
    })

    if (marketplaceListing.error) {
      console.error('Marketplace listing failed:', marketplaceListing.error)
      return NextResponse.json(
        {
          error:
            marketplaceListing.error.message ||
            'Failed to create marketplace listing',
        },
        { status: 400 }
      )
    }

    // Step 3: Save to database
    await supabase.from('marketplace_listings').insert({
      user_id: userId,
      content_id: productContent.id,
      catalog_product_id: catalogProduct.id,
      marketplace_listing_id: marketplaceListing.id,
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

// Simplified marketplace listing without catalog
async function createSimplifiedMarketplaceListing(options: {
  connection: any
  productContent: MarketplaceProduct
  images: string[]
  publishOptions: any
  userId: string
  supabase: any
}) {
  const {
    connection,
    productContent,
    images,
    publishOptions,
    userId,
    supabase,
  } = options

  console.log('Using simplified marketplace approach (no catalog required)')

  // Create a marketplace post with product details
  const caption = generateMarketplaceCaption(productContent)

  try {
    // Post to Facebook with marketplace-style content
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${connection.facebook_page_id}/photos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: caption,
          url: images[0],
          access_token: connection.facebook_page_access_token,
        }),
      }
    )

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error.message)
    }

    // Get the post permalink
    const postResponse = await fetch(
      `https://graph.facebook.com/v18.0/${result.id}?fields=permalink_url&access_token=${connection.facebook_page_access_token}`
    )
    const postData = await postResponse.json()

    // Save simplified listing to database
    await supabase.from('marketplace_listings').insert({
      user_id: userId,
      content_id: productContent.id,
      facebook_post_id: result.id,
      title: productContent.product_name,
      description: productContent.features,
      price: productContent.price,
      quantity: productContent.quantity,
      sku: productContent.sku || `LISTORA-${Date.now()}`,
      condition: publishOptions.condition || 'new',
      category: publishOptions.category,
      images: images,
      status: 'active',
      listing_url: postData.permalink_url,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        postId: result.id,
        listingUrl: postData.permalink_url,
      },
      message: 'Successfully posted marketplace-style listing to Facebook!',
      note: 'This is a simplified listing. For full marketplace features, additional permissions are required.',
    })
  } catch (postError) {
    console.error('Simplified listing failed:', postError)
    return NextResponse.json(
      {
        error:
          postError instanceof Error
            ? postError.message
            : 'Failed to create marketplace post',
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

  // Get listing URL if successful
  if (listing.id && !listing.error) {
    try {
      const urlResponse = await fetch(
        `https://graph.facebook.com/v18.0/${listing.id}?fields=url&access_token=${accessToken}`
      )
      const urlData = await urlResponse.json()
      listing.url =
        urlData.url || `https://www.facebook.com/marketplace/item/${listing.id}`
    } catch (urlError) {
      console.error('Failed to get listing URL:', urlError)
      listing.url = `https://www.facebook.com/marketplace/item/${listing.id}`
    }
  }

  return listing
}

// Extract structured details from generated content
function extractProductDetails(productContent: any) {
  const { generated_content, product_name } = productContent

  // Extract title
  const titleMatch = generated_content?.match(
    /\*\*1\.\s*PRODUCT TITLE\/HEADLINE:\*\*\s*\n[^\n]*\n([^\n]+)/i
  )
  const title = titleMatch?.[1]?.trim() || product_name

  // Extract description
  const descMatch = generated_content?.match(
    /\*\*3\.\s*DETAILED PRODUCT DESCRIPTION:\*\*\s*([\s\S]*?)(?=\*\*4\.|$)/i
  )
  const description =
    descMatch?.[1]?.trim()?.substring(0, 500) || productContent.features

  // Try to extract brand from title or features
  const brandMatch =
    title.match(/^(\w+)\s/) ||
    productContent.features?.match(/brand[:\s]+(\w+)/i)
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

// Generate marketplace-specific caption
function generateMarketplaceCaption(product: any): string {
  const { product_name, price, features } = product

  let caption = `🛍️ FOR SALE: ${product_name}\n\n`
  caption += `💰 Price: $${price}\n\n`

  // Add key features
  if (features) {
    const featureList = features.split(/[,\n]/).filter(Boolean).slice(0, 3)
    if (featureList.length > 0) {
      caption += `✨ Features:\n`
      featureList.forEach((feature: string) => {
        caption += `• ${feature.trim()}\n`
      })
      caption += '\n'
    }
  }

  caption += `📍 Available for local pickup or shipping\n`
  caption += `💬 DM for more details or to purchase!\n\n`
  caption += `#FacebookMarketplace #ForSale #${product_name.replace(/\s+/g, '')}`

  return caption
}
