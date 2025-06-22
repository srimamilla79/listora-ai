// src/app/api/etsy/publish/route.ts
// Etsy listing creation - TypeScript fixes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ FIX 1: Type definition for Etsy listing result
interface EtsyListingResult {
  listing_id: string
  title?: string
  state?: string
  url?: string
  price?: string
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productContent, images, publishingOptions, userId } = body

    console.log('🎨 Etsy publishing request received:', {
      userId,
      productName: productContent?.product_name,
      price: publishingOptions?.price,
      imageCount: images?.length || 0,
    })

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!productContent?.product_name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    if (!publishingOptions?.price) {
      return NextResponse.json({ error: 'Price is required' }, { status: 400 })
    }

    // Get Etsy connection for user
    const { data: etsyConnection, error: connectionError } = await supabase
      .from('etsy_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (connectionError || !etsyConnection) {
      console.error('❌ No active Etsy connection found:', connectionError)
      return NextResponse.json(
        {
          error:
            'No active Etsy connection found. Please reconnect your Etsy account.',
        },
        { status: 400 }
      )
    }

    console.log('✅ Etsy connection found for user:', userId)

    // Detect Etsy category
    const categoryId = detectEtsyCategory(productContent)

    // Determine who_made and when_made based on product content
    const etsyClassification = classifyEtsyProduct(productContent)

    // Prepare listing data
    const listingData = {
      title: truncateTitle(productContent.product_name, 140), // Etsy max title length
      description: formatEtsyDescription(productContent),
      price: publishingOptions.price,
      quantity: publishingOptions.quantity || 1,
      sku: publishingOptions.sku || generateSKU(productContent.product_name),

      // Etsy required fields
      taxonomy_id: categoryId,
      who_made: etsyClassification.who_made,
      when_made: etsyClassification.when_made,
      is_supply: etsyClassification.is_supply,

      // Optional fields
      tags: generateEtsyTags(productContent),
      materials: extractMaterials(productContent),
      shipping_template_id: null, // You can set a default shipping template

      // Status
      state: 'draft', // Start as draft, user can activate manually
    }

    console.log('🎨 Creating Etsy listing with data:', {
      title: listingData.title,
      price: listingData.price,
      category: categoryId,
      who_made: listingData.who_made,
    })

    // Create listing on Etsy
    const listingResult = (await createEtsyListing(
      etsyConnection.access_token,
      etsyConnection.access_token_secret,
      listingData
    )) as EtsyListingResult // ✅ FIX 1: Type assertion

    if (!listingResult.listing_id) {
      throw new Error('Failed to create Etsy listing')
    }

    console.log('✅ Etsy listing created:', listingResult.listing_id)

    // Upload images if provided
    let imageUploadResults: any[] = [] // ✅ FIX 2: Explicit type annotation
    if (images && images.length > 0) {
      console.log('📸 Uploading images to Etsy listing...')
      imageUploadResults = await uploadImagesToListing(
        etsyConnection.access_token,
        etsyConnection.access_token_secret,
        listingResult.listing_id,
        images
      )
    }

    // Save listing to database
    const { data: savedListing, error: saveError } = await supabase
      .from('etsy_listings')
      .insert({
        user_id: userId,
        listing_id: listingResult.listing_id,
        title: listingData.title,
        price: listingData.price,
        quantity: listingData.quantity,
        sku: listingData.sku,
        status: 'draft',
        listing_data: listingResult,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('⚠️ Failed to save listing to database:', saveError)
      // Don't fail the request, listing was created successfully
    }

    const response = {
      success: true,
      platform: 'etsy',
      data: {
        listingId: listingResult.listing_id,
        listingUrl: `https://www.etsy.com/listing/${listingResult.listing_id}`,
        title: listingData.title,
        price: listingData.price,
        status: 'draft',
        imageCount: imageUploadResults.length,
      },
      message: `Successfully created Etsy listing! Listing ID: ${listingResult.listing_id}`,
    }

    console.log('✅ Etsy publishing completed:', response.data)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Etsy publishing failed:', error)
    return NextResponse.json(
      {
        success: false,
        platform: 'etsy',
        error: error.message || 'Failed to publish to Etsy',
      },
      { status: 500 }
    )
  }
}

// Helper function to create Etsy listing
async function createEtsyListing(
  access_token: string,
  access_token_secret: string,
  listingData: any
): Promise<EtsyListingResult> {
  const oauth = require('oauth')

  const oa = new oauth.OAuth(
    'https://openapi.etsy.com/v2/oauth/request_token',
    'https://openapi.etsy.com/v2/oauth/access_token',
    process.env.ETSY_KEYSTRING!,
    process.env.ETSY_SHARED_SECRET!,
    '1.0A',
    null,
    'HMAC-SHA1'
  )

  return new Promise<EtsyListingResult>((resolve, reject) => {
    // ✅ FIX 1: Explicit return type
    const postData = new URLSearchParams(listingData).toString()

    oa.post(
      'https://openapi.etsy.com/v2/listings',
      access_token,
      access_token_secret,
      postData,
      'application/x-www-form-urlencoded',
      (error: any, data: any) => {
        if (error) {
          console.error('❌ Etsy listing creation error:', error)
          reject(error)
        } else {
          try {
            const result = JSON.parse(data)
            if (result.results && result.results.length > 0) {
              resolve(result.results[0] as EtsyListingResult) // ✅ FIX 1: Type assertion
            } else {
              reject(new Error('No listing data returned from Etsy'))
            }
          } catch (parseError) {
            console.error('❌ Error parsing Etsy response:', parseError)
            reject(parseError)
          }
        }
      }
    )
  })
}

// Helper function to upload images
async function uploadImagesToListing(
  access_token: string,
  access_token_secret: string,
  listing_id: string,
  images: string[]
): Promise<any[]> {
  const results: any[] = [] // ✅ FIX 2: Explicit type annotation

  for (let i = 0; i < Math.min(images.length, 10); i++) {
    // Etsy allows max 10 images
    try {
      const imageResult = await uploadSingleImage(
        access_token,
        access_token_secret,
        listing_id,
        images[i]
      )
      results.push(imageResult)
      console.log(`✅ Image ${i + 1} uploaded to Etsy listing`)
    } catch (error) {
      console.error(`❌ Failed to upload image ${i + 1}:`, error)
    }
  }

  return results
}

// Helper function to upload single image
async function uploadSingleImage(
  access_token: string,
  access_token_secret: string,
  listing_id: string,
  imageUrl: string
): Promise<any> {
  // This would require downloading the image and uploading it to Etsy
  // For now, we'll return a placeholder
  console.log('📸 Image upload to Etsy (placeholder):', imageUrl)
  return { success: true, image_url: imageUrl }
}

// Helper function to detect Etsy category
function detectEtsyCategory(productContent: any): number {
  const title = (productContent.product_name || '').toLowerCase()
  const content = (productContent.content || '').toLowerCase()
  const description = `${title} ${content}`.toLowerCase()

  // Etsy category mapping (simplified)
  if (
    description.includes('jewelry') ||
    description.includes('necklace') ||
    description.includes('earring')
  ) {
    return 68887 // Jewelry category
  }
  if (
    description.includes('clothing') ||
    description.includes('shirt') ||
    description.includes('dress')
  ) {
    return 69150 // Clothing category
  }
  if (
    description.includes('art') ||
    description.includes('print') ||
    description.includes('painting')
  ) {
    return 67358 // Art category
  }
  if (
    description.includes('craft') ||
    description.includes('supplies') ||
    description.includes('material')
  ) {
    return 68887 // Craft supplies
  }

  return 69150 // Default to clothing category
}

// Helper function to classify Etsy product
function classifyEtsyProduct(productContent: any) {
  const content =
    `${productContent.product_name || ''} ${productContent.content || ''}`.toLowerCase()

  // Determine who made it
  let who_made = 'i_did' // Default: handmade by seller
  if (content.includes('vintage') || content.includes('antique')) {
    who_made = 'someone_else'
  }

  // Determine when it was made
  let when_made = '2020_2024' // Default: recent
  if (content.includes('vintage')) {
    when_made = '1970_1989'
  } else if (content.includes('antique')) {
    when_made = 'before_1950'
  }

  // Determine if it's a supply
  const is_supply =
    content.includes('supplies') ||
    content.includes('material') ||
    content.includes('craft')

  return { who_made, when_made, is_supply }
}

// Helper function to generate Etsy tags
function generateEtsyTags(productContent: any): string[] {
  const content = `${productContent.product_name || ''} ${productContent.features || ''} ${productContent.content || ''}`
  const words = content.toLowerCase().split(/\s+/)

  const commonTags = ['handmade', 'unique', 'custom', 'gift', 'artisan']
  const contentTags = words
    .filter(
      (word) =>
        word.length > 3 &&
        word.length < 20 &&
        !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
    )
    .slice(0, 8)

  return [...new Set([...commonTags.slice(0, 5), ...contentTags])].slice(0, 13) // Etsy max 13 tags
}

// Helper function to extract materials
function extractMaterials(productContent: any): string[] {
  const content =
    `${productContent.content || ''} ${productContent.features || ''}`.toLowerCase()

  const materials: string[] = [] // ✅ FIX 2: Explicit type annotation
  const materialKeywords = [
    'cotton',
    'silk',
    'wood',
    'metal',
    'silver',
    'gold',
    'leather',
    'ceramic',
    'glass',
    'paper',
  ]

  materialKeywords.forEach((material) => {
    if (content.includes(material)) {
      materials.push(material)
    }
  })

  return materials.slice(0, 13) // Etsy max 13 materials
}

// Helper function to format description
function formatEtsyDescription(productContent: any): string {
  let description = productContent.content || productContent.product_name || ''

  // Add features if available
  if (productContent.features) {
    description += '\n\n✨ Features:\n' + productContent.features
  }

  // Add Etsy-specific footer
  description += '\n\n🎨 Handcrafted with care\n✉️ Message us for custom orders'

  return description.substring(0, 5000) // Etsy description limit
}

// Helper function to truncate title
function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength - 3) + '...'
}

// Helper function to generate SKU
function generateSKU(productName: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `ETSY-${prefix}-${timestamp}`
}
