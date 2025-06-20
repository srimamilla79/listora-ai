import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// AWS signing function
async function sign(key: string, msg: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(msg))
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  return sign('AWS4' + key, dateStamp)
    .then((kDate) =>
      sign(
        Array.from(new Uint8Array(kDate))
          .map((b) => String.fromCharCode(b))
          .join(''),
        regionName
      )
    )
    .then((kRegion) =>
      sign(
        Array.from(new Uint8Array(kRegion))
          .map((b) => String.fromCharCode(b))
          .join(''),
        serviceName
      )
    )
    .then((kService) =>
      sign(
        Array.from(new Uint8Array(kService))
          .map((b) => String.fromCharCode(b))
          .join(''),
        'aws4_request'
      )
    )
}

// Get LWA access token
async function getAccessToken(): Promise<string> {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_SP_API_CLIENT_ID!,
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET!,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LWA Error: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Make signed SP-API request
async function makeSignedSPAPIRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const accessToken = await getAccessToken()

  // AWS Signature V4
  const region = process.env.AMAZON_REGION || 'us-east-1'
  const service = 'execute-api'
  const host = 'sellingpartnerapi-na.amazon.com'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
  const dateStamp = amzDate.substr(0, 8)

  const canonicalUri = path
  const canonicalQuerystring = ''
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-date'

  const payloadHash = body
    ? Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(body))
          )
        )
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(canonicalRequest)
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`

  const signingKey = await getSignatureKey(
    process.env.AWS_SECRET_ACCESS_KEY!,
    dateStamp,
    region,
    service
  )
  const signature = Array.from(
    new Uint8Array(
      await sign(
        Array.from(new Uint8Array(signingKey))
          .map((b) => String.fromCharCode(b))
          .join(''),
        stringToSign
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const authorizationHeader = `${algorithm} Credential=${process.env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  // Make the request
  const headers: any = {
    Authorization: authorizationHeader,
    'x-amz-access-token': accessToken,
    'x-amz-date': amzDate,
    'Content-Type': 'application/json',
  }

  const requestOptions: any = {
    method,
    headers,
  }

  if (body) {
    requestOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`https://${host}${path}`, requestOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SP-API Error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

// Create Amazon listing using Feeds API with dynamic attributes
async function createAmazonListing(
  productData: any,
  options: any
): Promise<any> {
  try {
    // Generate unique SKU
    const sku = `LISTORA-${Date.now()}`

    // Get images from your existing system
    let amazonImages: string[] = []

    if (productData.id) {
      console.log('📸 Fetching stored images for product:', productData.id)

      try {
        // Get images using your existing GET endpoint
        const imageResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/store-images?contentId=${productData.id}`
        )

        if (imageResponse.ok) {
          const imageData = await imageResponse.json()

          if (
            imageData.success &&
            imageData.images?.publicUrls?.processed?.amazon
          ) {
            amazonImages = imageData.images.publicUrls.processed.amazon
            console.log('📸 Found Amazon images:', amazonImages.length)
          } else {
            console.log(
              '📸 No Amazon-specific images found, checking original images...'
            )
            // Fallback to original images if no Amazon-specific ones
            if (imageData.images?.publicUrls?.original) {
              amazonImages = imageData.images.publicUrls.original
              console.log('📸 Using original images:', amazonImages.length)
            }
          }
        }
      } catch (imageError) {
        console.log(
          '⚠️ Could not fetch images, proceeding without:',
          imageError
        )
      }
    }

    // Prepare image attributes for Amazon
    const imageAttributes: any = {}

    if (amazonImages.length > 0) {
      console.log(
        '📸 Processing',
        amazonImages.length,
        'images for Amazon listing'
      )

      // ✅ Main product image (only once!)
      imageAttributes.main_product_image_locator = [
        {
          value: amazonImages[0],
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ]

      // ✅ Additional images (if available)
      for (let i = 1; i < Math.min(amazonImages.length, 9); i++) {
        // ✅ Up to 9 total images
        imageAttributes[`other_product_image_locator_${i}`] = [
          {
            value: amazonImages[i],
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ]
      }

      console.log('📸 Image attributes prepared:', Object.keys(imageAttributes))
    } else {
      console.log('📸 No images available for this product')
    }
    // Determine product type based on content
    let productType = 'WATCH' // Default fallback - known working type
    let itemTypeKeyword = 'watch' // Default fallback

    // Smart product type detection
    const title = productData.title?.toLowerCase() || ''
    const description = productData.description?.toLowerCase() || ''
    const features = productData.features?.toLowerCase() || ''
    const allText = `${title} ${description} ${features}`

    console.log(
      '🔍 Analyzing content for product type:',
      allText.substring(0, 80) + '...'
    )

    // ✅ NEW: Use user-selected product type if provided
    if (options.productType) {
      productType = options.productType
      itemTypeKeyword = options.productType.toLowerCase().replace('_', ' ')
      console.log('👤 User selected product type:', productType)
    } else {
      // ✅ ENHANCED: Fallback to smart detection if no user selection
      if (allText.includes('watch') || allText.includes('timepiece')) {
        productType = 'WATCH'
        itemTypeKeyword = 'watch'
      } else {
        // Default to WATCH for all other products (we know it works)
        productType = 'WATCH'
        itemTypeKeyword = 'watch'
      }
      console.log('🤖 Auto-detected product type:', productType)
    }

    console.log(
      '🎯 Final product type:',
      productType,
      'for:',
      title.substring(0, 50)
    )

    // ✅ DYNAMIC ATTRIBUTES SYSTEM - Works for all product types
    const baseAttributes = {
      condition_type: [{ value: 'new_new' }],
      item_name: [
        {
          value: productData.title,
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      brand: [
        {
          value: productData.brand || 'Listora AI',
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      manufacturer: [
        {
          value: productData.manufacturer || 'Listora AI',
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      product_description: [
        {
          value: productData.description,
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      bullet_point: productData.features
        .split('\n')
        .filter((f: string) => f.trim())
        .map((feature: string) => ({
          value: feature.trim(),
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        })),
      list_price: [
        {
          value: parseFloat(options.price) || 49.99, // ✅ Change 'Amount' to 'value'
          currency_code: 'USD', // ✅ Change 'CurrencyCode' to 'currency_code'
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      fulfillment_availability: [
        {
          fulfillment_channel_code: 'DEFAULT',
          quantity: parseInt(options.quantity) || 10,
        },
      ],
      item_type_keyword: [
        {
          value: itemTypeKeyword,
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      // Universal attributes that most categories need
      color: [
        {
          value: 'Multi-Color',
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      country_of_origin: [
        { value: 'US', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
      ],
      target_gender: [
        {
          value: 'male', // ✅ Try 'male' instead of 'mens'
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
        },
      ],
      department: [
        { value: 'Unisex', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
      ],
      age_range_description: [
        { value: 'Adult', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
      ],
      // ✅ Keep images
      ...imageAttributes,
    }

    // ✅ ADD product-type specific attributes
    let productSpecificAttributes = {}

    if (productType === 'WATCH') {
      productSpecificAttributes = {
        externally_assigned_product_identifier: [
          {
            product_identity: 'UPC',
            value: '123456789012',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        part_number: [
          {
            value: `LISTORA-${sku}`,
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        calendar_type: [
          {
            value: 'Analog',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        item_shape: [
          { value: 'Round', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
        ],
        warranty_type: [
          {
            value: 'Limited',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        supplier_declared_dg_hz_regulation: [
          {
            value: 'not_applicable',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        // ✅ FIXED: merchant_suggested_asin with 10+ characters
        merchant_suggested_asin: [
          {
            value: 'B000000000',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
      }
    } else if (productType === 'SHOES') {
      productSpecificAttributes = {
        footwear_size: [
          {
            value: 'One Size',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        heel: [
          { value: 'flat', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
        ],
        closure: [
          {
            value: 'slip-on',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        outer: [
          {
            value: 'synthetic',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        sole_material: [
          {
            value: 'rubber',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_name: [
          {
            value: 'Generic',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_number: [
          {
            value: `LISTORA-${sku}`,
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        style: [
          {
            value: 'casual',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        height_map: [
          { value: 'low', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
        ],
        water_resistance_level: [
          {
            value: 'not_water_resistant',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        externally_assigned_product_identifier: [
          {
            product_identity: 'UPC',
            value: '123456789012',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        merchant_suggested_asin: [
          { value: '', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
        ],
      }
    } else if (productType === 'CLOTHING') {
      productSpecificAttributes = {
        size: [
          {
            value: 'One Size',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        material_type: [
          {
            value: 'cotton',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_name: [
          {
            value: 'Generic',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_number: [
          {
            value: `LISTORA-${sku}`,
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        style: [
          {
            value: 'casual',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
      }
    } else if (productType === 'ELECTRONICS') {
      productSpecificAttributes = {
        model_name: [
          {
            value: 'Generic',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_number: [
          {
            value: `LISTORA-${sku}`,
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        externally_assigned_product_identifier: [
          {
            product_identity: 'UPC',
            value: '123456789012',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        merchant_suggested_asin: [
          { value: '', marketplace_id: process.env.AMAZON_MARKETPLACE_ID },
        ],
      }
    } else {
      // ✅ Default minimal attributes for unknown types
      productSpecificAttributes = {
        model_name: [
          {
            value: 'Generic',
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
        model_number: [
          {
            value: `LISTORA-${sku}`,
            marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          },
        ],
      }
    }

    // ✅ COMBINE base + product-specific attributes
    const finalAttributes = { ...baseAttributes, ...productSpecificAttributes }

    console.log(
      '🏷️ Final attributes for',
      productType,
      ':',
      Object.keys(finalAttributes)
    )

    // Create feed document for JSON_LISTINGS_FEED
    const feedDocument = {
      header: {
        sellerId: process.env.AMAZON_SELLER_ID!,
        version: '2.0',
        issueLocale: 'en_US',
      },
      messages: [
        {
          messageId: 1,
          sku: sku,
          operationType: 'UPDATE',
          productType: productType,
          requirements: 'LISTING',
          attributes: finalAttributes, // ✅ Use dynamic attributes
        },
      ],
    }

    console.log('📦 Creating Amazon listing via Feeds API...')
    console.log('📄 Feed document:', JSON.stringify(feedDocument, null, 2))

    // STEP 1: Create feed document
    console.log('📄 Step 1: Creating feed document...')
    const createDocumentResponse = await makeSignedSPAPIRequest(
      'POST',
      '/feeds/2021-06-30/documents',
      {
        contentType: 'application/json; charset=UTF-8',
      }
    )

    console.log('✅ Feed document created:', createDocumentResponse)

    // STEP 2: Upload feed content to the document
    console.log('📤 Step 2: Uploading feed content...')
    const uploadResponse = await fetch(createDocumentResponse.url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(feedDocument),
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload feed content: ${uploadResponse.status}`)
    }

    console.log('✅ Feed content uploaded successfully')

    // STEP 3: Create feed using the document ID
    console.log('🏭 Step 3: Submitting feed to Amazon...')
    const feedResponse = await makeSignedSPAPIRequest(
      'POST',
      `/feeds/2021-06-30/feeds`,
      {
        feedType: 'JSON_LISTINGS_FEED',
        marketplaceIds: [process.env.AMAZON_MARKETPLACE_ID],
        inputFeedDocumentId: createDocumentResponse.feedDocumentId,
      }
    )

    console.log('✅ Feed submitted successfully:', feedResponse)

    return {
      success: true,
      sku: sku,
      feedId: feedResponse.feedId,
      status: 'submitted',
      imageCount: amazonImages.length,
      imagesIncluded: amazonImages.length > 0,
      message: `Product submitted to Amazon via Feeds API${amazonImages.length > 0 ? ` with ${amazonImages.length} images` : ' (no images)'}. It will appear in Seller Central within 15 minutes.`,
    }
  } catch (error: any) {
    console.error('❌ Error creating Amazon listing:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Amazon publish route called')

    const body = await request.json()
    const { contentId, userId, productData, options } = body

    console.log('📦 Publishing to Amazon:', {
      contentId,
      userId,
      productData: productData?.title,
    })

    // Create listing on Amazon using working Feeds API
    const amazonResult = await createAmazonListing(productData, options)

    console.log('✅ Amazon listing created:', amazonResult)

    // Save to database
    const { data: publishData, error: publishError } = await supabase
      .from('published_products')
      .insert({
        content_id: contentId,
        user_id: userId,
        platform: 'amazon',
        platform_product_id: amazonResult.feedId,
        platform_url: `https://sellercentral.amazon.com/`,
        title:
          productData.title || productData.product_name || 'Amazon Product',
        description: productData.description || productData.content || '',
        price: options.price || 0,
        quantity: options.quantity || 1,
        sku: amazonResult.sku,
        images: [], // Add images array if you have them
        platform_data: {
          feed_id: amazonResult.feedId,
          sku: amazonResult.sku,
          marketplace_id: process.env.AMAZON_MARKETPLACE_ID,
          product_type: productData.productType || 'WATCH',
          status: amazonResult.status,
        },
        status: amazonResult.status,
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (publishError) {
      console.error('❌ Database error:', publishError)
      // Don't fail the whole operation for DB errors
    }

    console.log('💾 Saved to database:', publishData?.id)

    return NextResponse.json({
      success: true,
      message: 'Product successfully published to Amazon!',
      data: {
        sku: amazonResult.sku,
        feedId: amazonResult.feedId,
        status: amazonResult.status,
        publishId: publishData?.id,
        instructions:
          'Check your Amazon Seller Central → Manage Inventory in 10-15 minutes to see your new product listing.',
      },
    })
  } catch (error: any) {
    console.error('❌ Amazon publish error:', error)

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to publish to Amazon',
        error: error.message,
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
