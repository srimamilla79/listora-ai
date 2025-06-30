// src/app/api/ebay/publish/route.ts
// eBay listing creation with DUAL TOKEN SYSTEM - User + Application Tokens
// ✅ FIXED: Uses AI-generated content instead of user input
// ✅ FIXED: AI-generated features in item specifics

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectEbayCategory } from '@/lib/ebay-category-detector'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EbayListingData {
  Title: string
  Description: string
  PrimaryCategory: { CategoryID: string }
  StartPrice: string
  Quantity: number
  ListingType: string
  ListingDuration: string
  ConditionID: string
  PictureDetails?: { PictureURL: string[] }
  ItemSpecifics?: Array<{ Name: string; Value: string[] }>
  ShippingDetails: {
    ShippingType: string
    ShippingServiceOptions: Array<{
      ShippingServicePriority: number
      ShippingService: string
      ShippingServiceCost: string
    }>
  }
  ReturnPolicy: {
    ReturnsAcceptedOption: string
    RefundOption: string
    ReturnsWithinOption: string
    ShippingCostPaidByOption: string
  }
  PaymentMethods: string[]
  PayPalEmailAddress?: string
  DispatchTimeMax: number
  SKU: string
}

interface EbayApiResult {
  ItemID: string
  Fees: string[]
  Errors: string[]
  Warnings: string[]
  Ack: string
  RawResponse: string
}

interface CategoryResult {
  categoryId: string
  categoryName: string
  source: 'taxonomy_api' | 'verified_fallback' | 'bulletproof_fallback'
}

// ✅ NEW: EXTRACT TITLE FROM AI-GENERATED CONTENT
function extractTitleFromContent(content: string): string | null {
  // Extract from "PRODUCT TITLE/HEADLINE:" section
  const titleMatch = content.match(
    /###\s*1\.\s*PRODUCT TITLE\/HEADLINE:\s*\*\*(.*?)\*\*/i
  )
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim()
  }

  // Fallback: look for any title with ** formatting near the start
  const fallbackMatch = content.match(
    /\*\*(.*?(?:Bluetooth|Wireless|Headphones|Premium|BOSE).*?)\*\*/i
  )
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim()
  }

  return null
}

// ✅ NEW: EXTRACT FEATURES FROM AI-GENERATED CONTENT
function extractFeaturesFromContent(content: string): string[] {
  const features: string[] = []

  // Extract from "KEY SELLING POINTS:" section
  const keyPointsMatch = content.match(
    /###\s*2\.\s*KEY SELLING POINTS:(.*?)(?=###|$)/is
  )
  if (keyPointsMatch) {
    const bulletPoints = keyPointsMatch[1].match(/[-•]\s*\*\*(.*?)\*\*:/g)
    if (bulletPoints) {
      bulletPoints.forEach((point) => {
        const feature = point.replace(/[-•]\s*\*\*(.*?)\*\*:/, '$1').trim()
        if (feature) features.push(feature)
      })
    }
  }

  // Fallback: extract any bullet points with bold text
  if (features.length === 0) {
    const fallbackPoints = content.match(/[-•]\s*\*\*(.*?)\*\*/g)
    if (fallbackPoints) {
      fallbackPoints.slice(0, 5).forEach((point) => {
        const feature = point.replace(/[-•]\s*\*\*(.*?)\*\*/, '$1').trim()
        if (feature) features.push(feature)
      })
    }
  }

  return features.length > 0
    ? features
    : ['High Quality', 'Durable Design', 'Premium Materials']
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 eBay publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()

    console.log('📋 Request data:', {
      userId,
      productName: productContent?.product_name,
      price: publishingOptions?.price,
      imageCount: images?.length || 0,
    })

    // Get eBay connection (use most recent active one)
    const { data: connections, error: connectionError } = await supabase
      .from('ebay_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (connectionError || !connections || connections.length === 0) {
      console.log('❌ eBay connection not found:', connectionError)
      return NextResponse.json(
        {
          error:
            'eBay account not connected. Please connect your eBay account first.',
        },
        { status: 400 }
      )
    }

    // Use the most recent connection
    const connection = connections[0]

    console.log('✅ eBay connection found:', connection.id)

    // Get User Access Token (for listings)
    const userAccessToken = await refreshTokenIfNeeded(connection)
    console.log(
      '🔐 Using user access token:',
      userAccessToken.substring(0, 20) + '...'
    )

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-${Date.now()}`

    // ✅ FIXED: Generate comprehensive content for processing
    const productName = productContent.product_name.toLowerCase()
    const content = (productContent.content || '').toLowerCase()
    const features = (productContent.features || '').toLowerCase()
    const description = (productContent.description || '').toLowerCase()
    const fullText = `${productName} ${content} ${features} ${description}`

    console.log('🔍 Processing full content length:', fullText.length)

    // ✅ DUAL TOKEN SYSTEM: Get category using Application Token
    const categoryResult = await detectCategoryWithDualTokens(fullText)

    console.log('🏷️ Final category decision:', categoryResult)

    // ✅ FIXED: Extract AI-generated title
    const aiGeneratedTitle = extractTitleFromContent(
      productContent.content || ''
    )
    const finalTitle = aiGeneratedTitle || productContent.product_name

    console.log(
      '🎯 Using title:',
      finalTitle.substring(0, 50) + (finalTitle.length > 50 ? '...' : '')
    )

    // Prepare eBay listing data
    const listingData: EbayListingData = {
      Title: truncateTitle(finalTitle), // ✅ FIXED: Use AI-generated title
      Description: formatEbayDescription(productContent),
      PrimaryCategory: { CategoryID: categoryResult.categoryId },
      StartPrice: publishingOptions.price.toString(),
      Quantity: publishingOptions.quantity,
      ListingType: 'FixedPriceItem',
      ListingDuration: 'GTC', // Good Till Cancelled
      ConditionID: mapConditionToEbay(
        publishingOptions.condition,
        categoryResult.categoryId
      ),
      SKU: sku,

      // Shipping details
      ShippingDetails: {
        ShippingType: 'Flat',
        ShippingServiceOptions: [
          {
            ShippingServicePriority: 1,
            ShippingService: 'USPSPriority',
            ShippingServiceCost: '9.99',
          },
        ],
      },

      // Return policy
      ReturnPolicy: {
        ReturnsAcceptedOption: 'ReturnsAccepted',
        RefundOption: 'MoneyBack',
        ReturnsWithinOption: 'Days_30',
        ShippingCostPaidByOption: 'Buyer',
      },

      PaymentMethods: [], // Empty for eBay managed payments
      DispatchTimeMax: 3,
    }

    // Add images if available
    if (images && images.length > 0) {
      listingData.PictureDetails = {
        PictureURL: images.slice(0, 12), // eBay allows max 12 images
      }
      console.log('🖼️ Added images:', images.length)
    }

    // ✅ SMART ITEM SPECIFICS GENERATION
    listingData.ItemSpecifics = await generateSmartItemSpecifics(
      categoryResult,
      fullText // ← FIXED: Using fullText instead of content
    )

    console.log('📋 Generated item specifics:', listingData.ItemSpecifics)

    console.log('📦 Creating eBay listing:', {
      title: listingData.Title,
      category: categoryResult.categoryId,
      categoryName: categoryResult.categoryName,
      source: categoryResult.source,
      price: listingData.StartPrice,
      images: images?.length || 0,
      itemSpecifics: listingData.ItemSpecifics?.length || 0,
    })

    // Create listing on eBay using USER TOKEN
    const ebayResult = await createEbayListing(listingData, userAccessToken)

    console.log('✅ eBay API success:', {
      itemId: ebayResult.ItemID,
      hasErrors: !!ebayResult.Errors,
      hasWarnings: !!ebayResult.Warnings,
    })

    // Save to database (eBay-specific table)
    const { data: listing, error: dbError } = await supabase
      .from('ebay_listings')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        ebay_item_id: ebayResult.ItemID,
        sku: sku,
        title: listingData.Title,
        description: productContent.content,
        price: parseFloat(publishingOptions.price),
        quantity: publishingOptions.quantity,
        category_id: categoryResult.categoryId,
        condition_id: listingData.ConditionID,
        images: images || [],
        ebay_data: ebayResult,
        status: 'active',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save error:', dbError)
    } else {
      console.log('✅ Saved to database:', listing.id)
    }

    // ✅ ALSO save to unified published_products table
    const listingUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? `https://sandbox.ebay.com/itm/${ebayResult.ItemID}`
        : `https://www.ebay.com/itm/${ebayResult.ItemID}`

    const { data: publishedProduct, error: publishedError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        platform: 'ebay',
        platform_product_id: ebayResult.ItemID,
        platform_url: listingUrl,
        title: listingData.Title,
        description: productContent.content,
        price: parseFloat(publishingOptions.price),
        quantity: publishingOptions.quantity,
        sku: sku,
        images: images || [],
        platform_data: {
          category_id: categoryResult.categoryId,
          category_name: categoryResult.categoryName,
          category_source: categoryResult.source,
          ebay_data: ebayResult,
          item_specifics: listingData.ItemSpecifics,
        },
        status: 'published',
        published_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (publishedError) {
      console.error('❌ Published products table save error:', publishedError)
    } else {
      console.log('✅ Saved to published_products table:', publishedProduct.id)
    }

    // Update connection last_used_at
    await supabase
      .from('ebay_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', connection.id)

    console.log('✅ eBay listing created successfully:', ebayResult.ItemID)

    return NextResponse.json({
      success: true,
      platform: 'ebay',
      data: {
        itemId: ebayResult.ItemID,
        sku: sku,
        listingUrl: listingUrl,
        fees: ebayResult.Fees,
        categoryId: categoryResult.categoryId,
        categoryName: categoryResult.categoryName,
        categorySource: categoryResult.source,
      },
      message: `Successfully listed on eBay! Item ID: ${ebayResult.ItemID}`,
    })
  } catch (error) {
    const err = error as Error
    console.error('❌ eBay publish error:', err)

    return NextResponse.json(
      {
        error: err.message || 'Failed to publish to eBay',
        platform: 'ebay',
      },
      { status: 500 }
    )
  }
}

// ✅ DUAL TOKEN SYSTEM: APPLICATION TOKEN FOR TAXONOMY API
async function getApplicationToken(): Promise<string> {
  try {
    const credentials = Buffer.from(
      `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
    ).toString('base64')

    const tokenUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        : 'https://api.ebay.com/identity/v1/oauth2/token'

    console.log('🔑 Getting application token for Taxonomy API...')

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(
        '❌ Application token request failed:',
        response.status,
        errorText
      )
      throw new Error(`Failed to get application token: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Application token received for Taxonomy API')
    return data.access_token
  } catch (error) {
    console.error('❌ Application token error:', error)
    throw error
  }
}

// ✅ DUAL TOKEN CATEGORY DETECTION
async function detectCategoryWithDualTokens(
  fullText: string
): Promise<CategoryResult> {
  try {
    console.log('🔍 Starting dual-token category detection...')

    // Step 1: Get Application Token for Taxonomy API
    const appToken = await getApplicationToken()

    // Step 2: Test Taxonomy API access with Application Token
    const taxonomyAvailable = await testTaxonomyAPIWithAppToken(appToken)
    if (!taxonomyAvailable) {
      console.log(
        '⚠️ Taxonomy API not accessible with app token, using verified fallback'
      )
      return {
        categoryId: detectVerifiedCategory(fullText),
        categoryName: 'Verified Category',
        source: 'verified_fallback',
      }
    }

    // Step 3: Get category suggestions using Application Token
    const suggestions = await getCategorySuggestionsWithAppToken(
      fullText,
      appToken
    )
    if (!suggestions || suggestions.length === 0) {
      console.log(
        '⚠️ No category suggestions returned, using verified fallback'
      )
      return {
        categoryId: detectVerifiedCategory(fullText),
        categoryName: 'Verified Category',
        source: 'verified_fallback',
      }
    }

    // Step 4: Verify the suggested category is valid
    const bestSuggestion = suggestions[0]
    const suggestedCategoryId = bestSuggestion.category.categoryId
    const suggestedCategoryName = bestSuggestion.category.categoryName

    console.log(
      `🎯 eBay Taxonomy API suggested: ${suggestedCategoryId} (${suggestedCategoryName})`
    )

    const isValidLeaf = await verifyLeafCategoryWithAppToken(
      suggestedCategoryId,
      appToken
    )

    if (isValidLeaf) {
      console.log(
        `✅ Using eBay Taxonomy API suggestion: ${suggestedCategoryId}`
      )
      return {
        categoryId: suggestedCategoryId,
        categoryName: suggestedCategoryName,
        source: 'taxonomy_api',
      }
    } else {
      console.log(
        `⚠️ Suggested category ${suggestedCategoryId} is not valid, using verified fallback`
      )
      return {
        categoryId: detectVerifiedCategory(fullText),
        categoryName: 'Verified Category',
        source: 'verified_fallback',
      }
    }
  } catch (error) {
    console.error('❌ Dual-token category detection error:', error)
    console.log('⚠️ Using bulletproof fallback due to error')
    return {
      categoryId: '9355', // Guaranteed working category
      categoryName: 'Cell Phones & Smartphones',
      source: 'bulletproof_fallback',
    }
  }
}

// ✅ TAXONOMY API FUNCTIONS WITH APPLICATION TOKEN

async function testTaxonomyAPIWithAppToken(appToken: string): Promise<boolean> {
  try {
    const taxonomyUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=EBAY-US'
        : 'https://api.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=EBAY-US'

    const response = await fetch(taxonomyUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${appToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US',
        'Content-Type': 'application/json',
      },
    })

    console.log(
      '🔍 Taxonomy API test with app token - Status:',
      response.status
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Taxonomy API accessible with application token:', data)
      return true
    } else {
      const errorText = await response.text()
      console.log(
        '❌ Taxonomy API failed with app token:',
        response.status,
        errorText
      )
      return false
    }
  } catch (error) {
    console.error('❌ Taxonomy API test error:', error)
    return false
  }
}

async function getCategorySuggestionsWithAppToken(
  fullText: string,
  appToken: string
): Promise<any[] | null> {
  try {
    // Clean and prepare search query
    const searchQuery = fullText
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100)

    console.log('🔍 eBay category suggestions query:', searchQuery)

    const taxonomyUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions'
        : 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_category_suggestions'

    const response = await fetch(
      `${taxonomyUrl}?q=${encodeURIComponent(searchQuery)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${appToken}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US',
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.log('❌ Category suggestions API failed:', response.status)
      return null
    }

    const data = await response.json()
    console.log(
      '📊 Category suggestions received:',
      data.categorySuggestions?.length || 0
    )

    return data.categorySuggestions || null
  } catch (error) {
    console.error('❌ Category suggestions error:', error)
    return null
  }
}

async function verifyLeafCategoryWithAppToken(
  categoryId: string,
  appToken: string
): Promise<boolean> {
  try {
    console.log('🔍 Verifying leaf category with app token:', categoryId)

    const aspectsUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category'
        : 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category'

    const response = await fetch(`${aspectsUrl}?category_id=${categoryId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${appToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US',
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log(
        `✅ Category ${categoryId} verified - found ${data.aspects?.length || 0} aspects`
      )
      return true
    } else {
      console.log(
        `❌ Category ${categoryId} verification failed:`,
        response.status
      )
      return false
    }
  } catch (error) {
    console.error('❌ Leaf category verification error:', error)
    return false
  }
}

async function getRequiredAspectsWithAppToken(
  categoryId: string,
  appToken: string
): Promise<any[]> {
  try {
    console.log('🔍 Getting required aspects for category:', categoryId)

    const aspectsUrl =
      process.env.EBAY_ENVIRONMENT === 'sandbox'
        ? 'https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category'
        : 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category'

    const response = await fetch(`${aspectsUrl}?category_id=${categoryId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${appToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY-US',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.log('⚠️ Aspects API failed, using category-specific fallback')
      return []
    }

    const data = await response.json()

    const requiredAspects =
      data.aspects?.filter(
        (aspect: any) => aspect.aspectConstraint?.aspectRequired
      ) || []

    console.log(`📊 Found ${requiredAspects.length} required aspects`)

    return requiredAspects
  } catch (error) {
    console.error('❌ Aspects API error:', error)
    return []
  }
}

// ✅ VERIFIED CATEGORY DETECTION (FALLBACK) - FIXED PRIORITY ORDER
function detectVerifiedCategory(fullText: string): string {
  const text = fullText.toLowerCase()

  console.log(
    '🔍 Checking category detection for text preview:',
    text.substring(0, 100)
  )

  // PRIORITY ORDER: Check specific items BEFORE generic terms

  // AUDIO/HEADPHONES - Check FIRST (before phones)
  if (
    text.includes('headphones') ||
    text.includes('earbuds') ||
    text.includes('airpods') ||
    text.includes('headset') ||
    text.includes('earphone') ||
    text.includes('bluetooth headphones') ||
    text.includes('wireless headphones') ||
    text.includes('noise cancelling')
  ) {
    console.log('✅ Detected HEADPHONES category')
    return '112529' // Headphones - CORRECT LEAF CATEGORY ✅
  }

  // KITCHEN & HOME - Check BEFORE generic electronics
  if (
    text.includes('air fryer') ||
    text.includes('fryer') ||
    text.includes('kitchen appliance') ||
    text.includes('cooker')
  ) {
    console.log('✅ Detected KITCHEN APPLIANCES category')
    return '20667' // Small Kitchen Appliances ✅
  }

  if (
    text.includes('mug') ||
    text.includes('cup') ||
    text.includes('coffee mug')
  ) {
    console.log('✅ Detected DINNERWARE category')
    return '20642' // Dinnerware & Serveware ✅
  }

  // FASHION - Check BEFORE generic terms
  if (
    text.includes('sneaker') ||
    text.includes('running shoe') ||
    text.includes('athletic shoe') ||
    text.includes('nike') ||
    text.includes('adidas')
  ) {
    console.log('✅ Detected SHOES category')
    return '15709' // Athletic Shoes ✅
  }

  if (
    text.includes('tshirt') ||
    text.includes('t-shirt') ||
    text.includes('polo shirt') ||
    text.includes('casual shirt')
  ) {
    console.log('✅ Detected SHIRTS category')
    return '1059' // Casual Shirts ✅
  }

  if (text.includes('jeans') || text.includes('denim pants')) {
    console.log('✅ Detected JEANS category')
    return '11554' // Jeans ✅
  }

  if (
    text.includes('watch') ||
    text.includes('timepiece') ||
    text.includes('smartwatch') ||
    text.includes('wristwatch')
  ) {
    console.log('✅ Detected WATCH category')
    return '31387' // Wristwatches ✅
  }

  // ELECTRONICS - Check LAST (most generic)
  if (
    text.includes('laptop') ||
    text.includes('computer') ||
    text.includes('macbook') ||
    text.includes('notebook')
  ) {
    console.log('✅ Detected LAPTOP category')
    return '177' // PC Laptops & Netbooks ✅
  }

  // PHONES - Check LAST (very generic terms)
  if (
    text.includes('iphone') ||
    text.includes('smartphone') ||
    text.includes('android') ||
    text.includes('galaxy') ||
    text.includes('pixel')
  ) {
    console.log('✅ Detected PHONE category')
    return '9355' // Cell Phones & Smartphones ✅
  }

  // Only match "phone" if no other category detected
  if (text.includes('phone') && !text.includes('headphone')) {
    console.log('✅ Detected generic PHONE category')
    return '9355' // Cell Phones & Smartphones ✅
  }

  // GENERIC FALLBACK - Only if nothing else matched
  console.log('⚠️ No specific category detected, using phone fallback')
  return '9355' // Cell Phones - Most reliable category
}

// ✅ SMART ITEM SPECIFICS GENERATION
async function generateSmartItemSpecifics(
  categoryResult: CategoryResult,
  fullText: string
): Promise<Array<{ Name: string; Value: string[] }>> {
  const specifics: Array<{ Name: string; Value: string[] }> = []

  // Always add universal basics - NOW USING FULLTEXT
  specifics.push({ Name: 'Brand', Value: [extractBrand(fullText)] })
  specifics.push({ Name: 'Color', Value: [extractColor(fullText)] })

  try {
    // If using Taxonomy API, get required aspects with application token
    if (categoryResult.source === 'taxonomy_api') {
      const appToken = await getApplicationToken()
      const requiredAspects = await getRequiredAspectsWithAppToken(
        categoryResult.categoryId,
        appToken
      )

      console.log(
        `📊 Found ${requiredAspects.length} required aspects for category ${categoryResult.categoryId}`
      )

      // Generate values for required aspects
      requiredAspects.forEach((aspect) => {
        const aspectName = aspect.localizedAspectName

        const existingAspect = specifics.find(
          (s) => s.Name.toLowerCase() === aspectName.toLowerCase()
        )

        if (!existingAspect) {
          const value = extractValueForAspect(
            fullText,
            aspectName,
            categoryResult.categoryId
          )
          specifics.push({ Name: aspectName, Value: [value] })
        }
      })
    } else {
      // Use category-specific item specifics for verified categories
      const categorySpecifics = generateCategorySpecificAspects(
        categoryResult.categoryId,
        fullText
      )
      specifics.push(...categorySpecifics)
    }
  } catch (error) {
    console.error('❌ Error generating smart item specifics:', error)
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
  }

  // Ensure we have minimum required specifics
  if (specifics.length < 3) {
    specifics.push({ Name: 'Type', Value: ['Standard'] })
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
  }

  return specifics
}

// ✅ EXTRACT VALUE FOR ASPECT
function extractValueForAspect(
  fullText: string,
  aspectName: string,
  categoryId: string
): string {
  const text = fullText.toLowerCase()
  const aspect = aspectName.toLowerCase()

  // Universal aspect handling - NOW USING FULLTEXT
  if (aspect.includes('brand')) return extractBrand(fullText)
  if (aspect.includes('color') || aspect.includes('colour'))
    return extractColor(fullText)
  if (aspect.includes('model')) return extractGenericModel(fullText)
  if (aspect.includes('size')) return extractGenericSize(fullText)
  if (aspect.includes('material')) return extractGenericMaterial(fullText)

  // Category-specific aspect handling - NOW USING FULLTEXT
  if (categoryId === '9355') {
    // Cell Phones
    if (aspect.includes('storage')) return extractStorageCapacity(fullText)
    if (aspect.includes('network')) return extractNetwork(fullText)
    if (aspect.includes('operating system') || aspect.includes('os'))
      return extractOS(fullText)
  } else if (categoryId === '177') {
    // Laptops
    if (aspect.includes('screen size')) return extractScreenSize(fullText)
    if (aspect.includes('processor')) return extractProcessor(fullText)
    if (aspect.includes('memory') || aspect.includes('ram'))
      return extractRAM(fullText)
    if (aspect.includes('storage type')) return extractStorageType(fullText)
    if (aspect.includes('operating system')) return extractLaptopOS(fullText)
  } else if (categoryId === '20667') {
    // Kitchen Appliances
    if (aspect.includes('capacity')) return extractCapacity(fullText)
    if (aspect.includes('type')) return extractApplianceType(fullText)
    if (aspect.includes('power')) return extractPower(fullText)
  } else if (categoryId === '15709') {
    // Shoes
    if (aspect.includes('department')) return extractShoeDepartment(fullText)
    if (aspect.includes('shoe size') || aspect.includes('size'))
      return extractShoeSize(fullText)
    if (aspect.includes('style')) return extractShoeStyle(fullText)
    if (aspect.includes('width')) return extractShoeWidth(fullText)
  } else if (categoryId === '1059') {
    // Shirts
    if (aspect.includes('sleeve')) return extractSleeveLength(fullText)
    if (aspect.includes('fit')) return extractFit(fullText)
    if (aspect.includes('style')) return extractShirtStyle(fullText)
  } else if (categoryId === '112529') {
    // Headphones - NEW CATEGORY SUPPORT
    if (aspect.includes('type') || aspect.includes('style'))
      return extractHeadphoneType(fullText)
    if (aspect.includes('features')) {
      const featuresList = extractHeadphoneFeatures(fullText)
      return featuresList.length > 0 ? featuresList[0] : 'Standard'
    }
    if (aspect.includes('connectivity')) return extractConnectivity(fullText)
  } else if (categoryId === '15052') {
    // Headphones - LEGACY CATEGORY SUPPORT
    if (aspect.includes('type') || aspect.includes('style'))
      return extractHeadphoneType(fullText)
    if (aspect.includes('features')) {
      const featuresList = extractHeadphoneFeatures(fullText)
      return featuresList.length > 0 ? featuresList[0] : 'Standard'
    }
    if (aspect.includes('connectivity')) return extractConnectivity(fullText)
  }

  return 'Standard'
}

// ✅ CATEGORY-SPECIFIC ASPECTS (FALLBACK)
function generateCategorySpecificAspects(
  categoryId: string,
  fullText: string
): Array<{ Name: string; Value: string[] }> {
  const specifics: Array<{ Name: string; Value: string[] }> = []

  if (categoryId === '9355') {
    // Cell Phones - NOW USING FULLTEXT
    specifics.push({ Name: 'Model', Value: [extractPhoneModel(fullText)] })
    specifics.push({
      Name: 'Storage Capacity',
      Value: [extractStorageCapacity(fullText)],
    })
    specifics.push({ Name: 'Network', Value: [extractNetwork(fullText)] })
    specifics.push({ Name: 'Operating System', Value: [extractOS(fullText)] })
  } else if (categoryId === '177') {
    // Laptops - NOW USING FULLTEXT
    specifics.push({
      Name: 'Screen Size',
      Value: [extractScreenSize(fullText)],
    })
    specifics.push({ Name: 'Processor', Value: [extractProcessor(fullText)] })
    specifics.push({ Name: 'Memory (RAM)', Value: [extractRAM(fullText)] })
    specifics.push({
      Name: 'Storage Type',
      Value: [extractStorageType(fullText)],
    })
    specifics.push({
      Name: 'Operating System',
      Value: [extractLaptopOS(fullText)],
    })
  } else if (categoryId === '20667') {
    // Kitchen Appliances - NOW USING FULLTEXT
    specifics.push({ Name: 'Type', Value: [extractApplianceType(fullText)] })
    specifics.push({ Name: 'Capacity', Value: [extractCapacity(fullText)] })
    specifics.push({ Name: 'Power Source', Value: [extractPower(fullText)] })
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
  } else if (categoryId === '15709') {
    // Athletic Shoes - NOW USING FULLTEXT
    specifics.push({
      Name: 'Department',
      Value: [extractShoeDepartment(fullText)],
    })
    specifics.push({ Name: 'US Shoe Size', Value: [extractShoeSize(fullText)] })
    specifics.push({ Name: 'Style', Value: [extractShoeStyle(fullText)] })
    specifics.push({ Name: 'Material', Value: [extractShoeMaterial(fullText)] })
    specifics.push({ Name: 'Width', Value: [extractShoeWidth(fullText)] })
  } else if (categoryId === '1059') {
    // Casual Shirts - NOW USING FULLTEXT
    specifics.push({ Name: 'Size', Value: [extractClothingSize(fullText)] })
    specifics.push({
      Name: 'Material',
      Value: [extractFabricMaterial(fullText)],
    })
    specifics.push({ Name: 'Style', Value: [extractShirtStyle(fullText)] })
    specifics.push({
      Name: 'Sleeve Length',
      Value: [extractSleeveLength(fullText)],
    })
    specifics.push({ Name: 'Fit', Value: [extractFit(fullText)] })
  } else if (categoryId === '112529') {
    // ✅ HEADPHONES Support (Correct Leaf Category)
    specifics.push({ Name: 'Type', Value: [extractHeadphoneType(fullText)] })
    // ✅ FIXED: Use AI-generated features for headphones
    const extractedFeatures = extractHeadphoneFeatures(fullText)
    specifics.push({
      Name: 'Features',
      Value: extractedFeatures,
    })
    specifics.push({
      Name: 'Connectivity',
      Value: [extractConnectivity(fullText)],
    })
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
  } else if (categoryId === '15052') {
    // ✅ LEGACY: Headphones Support (Old Category - Keep for fallback)
    specifics.push({ Name: 'Type', Value: [extractHeadphoneType(fullText)] })
    // ✅ FIXED: Use AI-generated features for headphones (legacy category)
    const extractedFeatures = extractHeadphoneFeatures(fullText)
    specifics.push({
      Name: 'Features',
      Value: extractedFeatures,
    })
    specifics.push({
      Name: 'Connectivity',
      Value: [extractConnectivity(fullText)],
    })
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
  } else {
    // Universal fallback - NOW USING FULLTEXT
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
    specifics.push({ Name: 'Type', Value: ['Standard'] })
  }

  return specifics
}

// ✅ ALL EXTRACTION FUNCTIONS - NOW PROPERLY USING FULLTEXT

function extractBrand(fullText: string): string {
  const text = fullText.toLowerCase()

  // Electronics brands
  if (text.includes('apple')) return 'Apple'
  if (text.includes('samsung')) return 'Samsung'
  if (text.includes('google')) return 'Google'
  if (text.includes('sony')) return 'Sony'
  if (text.includes('lg')) return 'LG'
  if (text.includes('microsoft')) return 'Microsoft'
  if (text.includes('dell')) return 'Dell'
  if (text.includes('hp')) return 'HP'
  if (text.includes('lenovo')) return 'Lenovo'

  // Audio brands (for headphones)
  if (text.includes('bose')) return 'Bose'
  if (text.includes('beats')) return 'Beats'
  if (text.includes('sennheiser')) return 'Sennheiser'
  if (text.includes('skullcandy')) return 'Skullcandy'
  if (text.includes('jbl')) return 'JBL'
  if (text.includes('audio-technica')) return 'Audio-Technica'

  // Kitchen brands
  if (text.includes('chefman')) return 'Chefman'
  if (text.includes('ninja')) return 'Ninja'
  if (text.includes('cuisinart')) return 'Cuisinart'
  if (text.includes('breville')) return 'Breville'
  if (text.includes('kitchenaid')) return 'KitchenAid'

  // Fashion brands
  if (text.includes('nike')) return 'Nike'
  if (text.includes('adidas')) return 'adidas'
  if (text.includes('jordan')) return 'Jordan'
  if (text.includes('puma')) return 'PUMA'
  if (text.includes('under armour')) return 'Under Armour'
  if (text.includes('nautica')) return 'Nautica'
  if (text.includes('carhartt')) return 'Carhartt'
  if (text.includes('polo')) return 'Polo Ralph Lauren'
  if (text.includes('calvin klein')) return 'Calvin Klein'
  if (text.includes('tommy hilfiger')) return 'Tommy Hilfiger'
  if (text.includes('levi')) return "Levi's"
  if (text.includes('hanes')) return 'Hanes'
  if (text.includes('gildan')) return 'Gildan'

  // Watch brands
  if (text.includes('rolex')) return 'Rolex'
  if (text.includes('omega')) return 'Omega'
  if (text.includes('seiko')) return 'Seiko'
  if (text.includes('casio')) return 'Casio'
  if (text.includes('fossil')) return 'Fossil'
  if (text.includes('timex')) return 'Timex'

  return 'Unbranded'
}

// ✅ FIXED: ENHANCED COLOR DETECTION WITH BEIGE SUPPORT
function extractColor(fullText: string): string {
  const text = fullText.toLowerCase()

  // Enhanced color detection with beige/cream colors
  const colorMap = {
    // Neutral colors (check first - most specific)
    beige: [
      'beige',
      'tan',
      'khaki',
      'sand',
      'nude',
      'matte beige',
      'soft beige',
    ],
    cream: ['cream', 'vanilla', 'eggshell', 'linen', 'ivory'],
    white: ['white', 'off-white'],
    black: ['black', 'ebony', 'charcoal'],
    gray: ['gray', 'grey', 'silver', 'slate'],

    // Compound colors (check before single colors)
    'light gray': ['light gray', 'light grey'],
    'dark blue': ['dark blue', 'navy blue'],
    'light blue': ['light blue', 'sky blue'],

    // Primary colors
    red: ['red', 'crimson', 'scarlet'],
    blue: ['blue', 'navy', 'cobalt', 'azure'],
    green: ['green', 'emerald', 'forest'],
    yellow: ['yellow', 'gold', 'golden'],
    brown: ['brown', 'bronze', 'chocolate'],
    pink: ['pink', 'rose', 'magenta'],
    purple: ['purple', 'violet', 'lavender'],
    orange: ['orange', 'amber', 'copper'],
  }

  // Check compound colors first (more specific)
  if (text.includes('light gray') || text.includes('light grey'))
    return 'Light Gray'
  if (text.includes('dark blue')) return 'Dark Blue'
  if (text.includes('light blue')) return 'Light Blue'
  if (text.includes('soft beige') || text.includes('matte beige'))
    return 'Beige'

  // Check all color variants
  for (const [colorName, variants] of Object.entries(colorMap)) {
    for (const variant of variants) {
      if (text.includes(variant)) {
        return colorName.charAt(0).toUpperCase() + colorName.slice(1)
      }
    }
  }

  return 'Multicolor'
}

// ✅ FIXED: HEADPHONE EXTRACTORS - NOW RETURNS ARRAY FOR FEATURES
function extractHeadphoneType(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('over-ear') || text.includes('over ear')) return 'Over-Ear'
  if (text.includes('on-ear') || text.includes('on ear')) return 'On-Ear'
  if (
    text.includes('in-ear') ||
    text.includes('in ear') ||
    text.includes('earbuds')
  )
    return 'In-Ear'
  if (text.includes('wireless') || text.includes('bluetooth')) return 'Wireless'
  return 'Over-Ear'
}

// ✅ FIXED: NOW RETURNS ARRAY OF AI-GENERATED FEATURES
function extractHeadphoneFeatures(fullText: string): string[] {
  // ✅ FIXED: Return AI-generated features instead of single generic feature
  const extractedFeatures = extractFeaturesFromContent(fullText)

  // If we have AI-generated features, use them (max 3 for eBay)
  if (extractedFeatures.length > 0) {
    return extractedFeatures.slice(0, 3)
  }

  // Fallback to keyword detection if no AI features found
  const features: string[] = []
  const text = fullText.toLowerCase()

  if (text.includes('noise cancelling') || text.includes('noise cancellation'))
    features.push('Noise Cancelling')
  if (text.includes('wireless') || text.includes('bluetooth'))
    features.push('Wireless')
  if (text.includes('waterproof') || text.includes('water resistant'))
    features.push('Water Resistant')
  if (text.includes('bass boost') || text.includes('bass'))
    features.push('Bass Boost')

  return features.length > 0 ? features : ['Standard']
}

function extractConnectivity(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('bluetooth') || text.includes('wireless'))
    return 'Bluetooth'
  if (
    text.includes('wired') ||
    text.includes('3.5mm') ||
    text.includes('cable')
  )
    return 'Wired'
  if (text.includes('usb-c') || text.includes('usb c')) return 'USB-C'
  return 'Bluetooth'
}

// PHONE EXTRACTORS - NOW USING FULLTEXT
function extractPhoneModel(fullText: string): string {
  const text = fullText.toLowerCase()

  if (text.includes('iphone')) {
    const match = text.match(/iphone\s*(\d+(?:\s*pro(?:\s*max)?)?)/i)
    if (match) return `iPhone ${match[1]}`
    return 'iPhone'
  }

  if (text.includes('galaxy')) {
    const match = text.match(/galaxy\s+([a-z]\d+)/i)
    if (match) return `Galaxy ${match[1]}`
    return 'Galaxy'
  }

  if (text.includes('pixel')) {
    const match = text.match(/pixel\s*(\d+)/i)
    if (match) return `Pixel ${match[1]}`
    return 'Pixel'
  }

  return 'Smartphone'
}

function extractStorageCapacity(fullText: string): string {
  const storageMatch = fullText.match(/(\d+)\s*(gb|tb)/i)
  if (storageMatch) {
    return `${storageMatch[1]} ${storageMatch[2].toUpperCase()}`
  }
  return '128 GB'
}

function extractNetwork(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('verizon')) return 'Verizon'
  if (text.includes('at&t')) return 'AT&T'
  if (text.includes('t-mobile')) return 'T-Mobile'
  if (text.includes('sprint')) return 'Sprint'
  return 'Unlocked'
}

function extractOS(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('ios') || text.includes('iphone')) return 'iOS'
  if (text.includes('android')) return 'Android'
  return 'iOS'
}

// LAPTOP EXTRACTORS - NOW USING FULLTEXT
function extractScreenSize(fullText: string): string {
  const sizeMatch = fullText.match(/(\d{1,2}(?:\.\d)?)\s*(?:inch|"|in)/i)
  if (sizeMatch) return `${sizeMatch[1]}"`
  return '15.6"'
}

function extractProcessor(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('intel')) return 'Intel'
  if (text.includes('amd')) return 'AMD'
  if (text.includes('apple m1')) return 'Apple M1'
  if (text.includes('apple m2')) return 'Apple M2'
  return 'Intel'
}

function extractRAM(fullText: string): string {
  const ramMatch = fullText.match(/(\d+)\s*gb\s*ram/i)
  if (ramMatch) return `${ramMatch[1]} GB`
  return '8 GB'
}

function extractStorageType(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('ssd')) return 'SSD'
  if (text.includes('hdd')) return 'HDD'
  return 'SSD'
}

function extractLaptopOS(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('windows')) return 'Windows 11'
  if (text.includes('macos')) return 'macOS'
  if (text.includes('chrome os')) return 'Chrome OS'
  return 'Windows 11'
}

// KITCHEN APPLIANCE EXTRACTORS - NOW USING FULLTEXT
function extractApplianceType(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('air fryer')) return 'Air Fryer'
  if (text.includes('coffee maker')) return 'Coffee Maker'
  if (text.includes('blender')) return 'Blender'
  if (text.includes('toaster')) return 'Toaster'
  if (text.includes('microwave')) return 'Microwave'
  return 'Kitchen Appliance'
}

function extractCapacity(fullText: string): string {
  const capacityMatch = fullText.match(
    /(\d+(?:\.\d+)?)\s*(qt|quart|l|liter|cup|oz)/i
  )
  if (capacityMatch) {
    return `${capacityMatch[1]} ${capacityMatch[2].toLowerCase()}`
  }
  return '2 qt'
}

function extractPower(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('electric')) return 'Electric'
  if (text.includes('gas')) return 'Gas'
  if (text.includes('battery')) return 'Battery'
  return 'Electric'
}

// SHOE EXTRACTORS - NOW USING FULLTEXT
function extractShoeDepartment(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('women') || text.includes('ladies')) return 'Women'
  if (text.includes('men') || text.includes('mens')) return 'Men'
  if (text.includes('kids') || text.includes('children')) return 'Kids'
  return 'Unisex'
}

function extractShoeSize(fullText: string): string {
  const sizeMatch = fullText.match(/\b(?:size\s+)?(\d{1,2}(?:\.\d)?)\b/i)
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1])
    if (size >= 4 && size <= 15) return size.toString()
  }
  return '10'
}

function extractShoeStyle(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('running') || text.includes('athletic'))
    return 'Athletic Sneakers'
  if (text.includes('basketball')) return 'Basketball Shoes'
  if (text.includes('casual')) return 'Casual Sneakers'
  if (text.includes('boot')) return 'Boots'
  return 'Athletic Sneakers'
}

function extractShoeMaterial(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('leather')) return 'Leather'
  if (text.includes('canvas')) return 'Canvas'
  if (text.includes('mesh')) return 'Mesh'
  if (text.includes('synthetic')) return 'Synthetic'
  return 'Synthetic'
}

function extractShoeWidth(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('wide')) return 'W'
  if (text.includes('narrow')) return 'N'
  return 'M'
}

// CLOTHING EXTRACTORS - NOW USING FULLTEXT
function extractClothingSize(fullText: string): string {
  const sizeMatch = fullText.match(/\b(XS|S|M|L|XL|XXL|XXXL)\b/i)
  if (sizeMatch) return sizeMatch[1].toUpperCase()

  const numericMatch = fullText.match(/\bsize\s+(\d+)\b/i)
  if (numericMatch) return numericMatch[1]

  return 'M'
}

function extractFabricMaterial(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('cotton')) return 'Cotton'
  if (text.includes('polyester')) return 'Polyester'
  if (text.includes('wool')) return 'Wool'
  if (text.includes('silk')) return 'Silk'
  if (text.includes('denim')) return 'Denim'
  return 'Cotton'
}

function extractShirtStyle(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('polo')) return 'Polo'
  if (text.includes('dress')) return 'Dress'
  if (text.includes('casual')) return 'Casual'
  if (text.includes('button')) return 'Button-Down'
  return 'Casual'
}

function extractSleeveLength(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('short sleeve')) return 'Short Sleeve'
  if (text.includes('long sleeve')) return 'Long Sleeve'
  if (text.includes('sleeveless')) return 'Sleeveless'
  return 'Short Sleeve'
}

function extractFit(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('slim')) return 'Slim'
  if (text.includes('regular')) return 'Regular'
  if (text.includes('relaxed')) return 'Relaxed'
  if (text.includes('fitted')) return 'Fitted'
  if (text.includes('loose')) return 'Loose Fit'
  return 'Regular'
}

// GENERIC EXTRACTORS - NOW USING FULLTEXT
function extractGenericModel(fullText: string): string {
  const modelMatch =
    fullText.match(/model\s+([a-z0-9\-]+)/i) ||
    fullText.match(/\b([a-z]{2,}\-?\d{2,})\b/i)
  if (modelMatch) return modelMatch[1]

  const text = fullText.toLowerCase()
  if (text.includes('carhartt')) return 'Carhartt Model'
  if (text.includes('nautica')) return 'Nautica Model'
  if (text.includes('nike')) return 'Nike Model'
  if (text.includes('chefman')) return 'Chefman Model'
  if (text.includes('bose')) return 'Bose Model'

  return 'Standard Model'
}

function extractGenericSize(fullText: string): string {
  const sizeMatch = fullText.match(/\b(XS|S|M|L|XL|XXL|small|medium|large)\b/i)
  if (sizeMatch) return sizeMatch[1].toUpperCase()
  return 'One Size'
}

function extractGenericMaterial(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('metal')) return 'Metal'
  if (text.includes('plastic')) return 'Plastic'
  if (text.includes('wood')) return 'Wood'
  if (text.includes('glass')) return 'Glass'
  if (text.includes('fabric')) return 'Fabric'
  if (text.includes('cotton')) return 'Cotton'
  if (text.includes('polyester')) return 'Polyester'
  if (text.includes('nonstick')) return 'Non-stick'
  return 'Mixed Materials'
}

// ✅ eBay API FUNCTIONS (UNCHANGED - USES USER TOKEN)
async function createEbayListing(
  listingData: EbayListingData,
  userAccessToken: string
): Promise<EbayApiResult> {
  const apiEndpoints = [
    'https://api.sandbox.ebay.com/ws/api.dll',
    'https://api.sandbox.ebay.com/wsapi',
  ]

  const tradingApiUrl =
    process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? apiEndpoints[0]
      : 'https://api.ebay.com/ws/api.dll'

  console.log('🌐 eBay API URL:', tradingApiUrl)

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${userAccessToken}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <Title>${escapeXml(listingData.Title)}</Title>
    <Description><![CDATA[${listingData.Description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${listingData.PrimaryCategory.CategoryID}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${listingData.StartPrice}</StartPrice>
    <Currency>USD</Currency>
    <Country>US</Country>
    <Location>United States</Location>
    <Quantity>${listingData.Quantity}</Quantity>
    <ListingType>${listingData.ListingType}</ListingType>
    <ListingDuration>${listingData.ListingDuration}</ListingDuration>
    <ConditionID>${listingData.ConditionID}</ConditionID>
    <SKU>${escapeXml(listingData.SKU)}</SKU>
    ${
      listingData.PictureDetails
        ? `
    <PictureDetails>
      ${listingData.PictureDetails.PictureURL.map((url) => `<PictureURL>${url}</PictureURL>`).join('')}
    </PictureDetails>
    `
        : ''
    }
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSPriority</ShippingService>
        <ShippingServiceCost>9.99</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
    <DispatchTimeMax>3</DispatchTimeMax>
    ${generateItemSpecificsXml(listingData.ItemSpecifics)}
  </Item>
</AddFixedPriceItemRequest>`

  console.log('📤 Sending XML request to eBay API...')
  console.log('📋 XML Length:', xmlRequest.length)

  let finalResponse: Response | null = null
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} - Calling eBay API...`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(tradingApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID!,
          'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID!,
          'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID!,
          'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
          'X-EBAY-API-SITEID': '0',
          'User-Agent': 'Listora-AI/1.0',
        },
        body: xmlRequest,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      finalResponse = response
      console.log('✅ eBay API request successful on attempt', attempt)
      break
    } catch (error) {
      const err = error as Error
      console.log(`❌ Attempt ${attempt} failed:`, err.message)

      if (attempt === maxRetries) {
        throw new Error(
          `eBay API connection failed after ${maxRetries} attempts. Please try again.`
        )
      }

      const waitTime = Math.pow(2, attempt) * 1000
      console.log(`⏳ Waiting ${waitTime}ms before retry...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  if (!finalResponse) {
    throw new Error('eBay API request failed - no response received')
  }

  console.log('📨 eBay API Response Status:', finalResponse.status)

  const xmlResponse = await finalResponse.text()
  console.log('📨 eBay API Raw XML Response:')
  console.log('='.repeat(50))
  console.log(xmlResponse)
  console.log('='.repeat(50))

  if (!finalResponse.ok) {
    throw new Error(`eBay API HTTP error: ${finalResponse.status}`)
  }

  const ackMatch = xmlResponse.match(/<Ack>([^<]+)<\/Ack>/)
  const ack = ackMatch ? ackMatch[1] : 'Unknown'
  console.log('📋 eBay Response Ack:', ack)

  const errorsMatch = xmlResponse.match(/<Errors>[\s\S]*?<\/Errors>/g)
  let hasRealErrors = false
  let userFriendlyError = ''

  if (errorsMatch) {
    errorsMatch.forEach((error, index) => {
      console.log(`Error/Warning ${index + 1}:`, error)
      if (error.includes('<SeverityCode>Error</SeverityCode>')) {
        hasRealErrors = true
        userFriendlyError =
          'eBay listing requirements not met. Please check your product details and try again.'
      }
    })

    if (hasRealErrors && ack !== 'Success' && ack !== 'Warning') {
      throw new Error(userFriendlyError || 'Failed to create eBay listing.')
    }
  }

  const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/)
  let itemId = itemIdMatch ? itemIdMatch[1] : `TEMP_${Date.now()}`

  const feesMatch = xmlResponse.match(/<Fee currencyID="USD">([^<]+)<\/Fee>/g)

  return {
    ItemID: itemId,
    Fees: feesMatch || [],
    Errors: errorsMatch || [],
    Warnings: [],
    Ack: ack,
    RawResponse: xmlResponse,
  }
}

// ✅ HELPER FUNCTIONS
function truncateTitle(title: string): string {
  return title.length > 80 ? title.substring(0, 77) + '...' : title
}

// ✅ UPDATED: FORMAT DESCRIPTION WITH AI-GENERATED FEATURES
function formatEbayDescription(productContent: any): string {
  let html = `<div style="font-family: Arial, sans-serif;">`

  if (productContent.content) {
    html += `<h3>Description</h3><p>${productContent.content.replace(/\n/g, '<br>')}</p>`
  }

  // ✅ Use extracted features from generated content instead of user input
  const extractedFeatures = extractFeaturesFromContent(
    productContent.content || ''
  )
  if (extractedFeatures.length > 0) {
    html += `<h3>Key Features</h3><ul>`
    extractedFeatures.forEach((feature: string) => {
      html += `<li>${feature.trim()}</li>`
    })
    html += `</ul>`
  }

  html += `</div>`
  return html
}

function mapConditionToEbay(
  condition: string,
  categoryId: string = '9355'
): string {
  const isProduction = process.env.EBAY_ENVIRONMENT === 'production'

  const electronicsCategories = [
    '9355',
    '177',
    '112529',
    '15052',
    '171485',
    '20667',
  ]
  const clothingCategories = ['1059', '11554', '15709']
  const watchCategories = ['31387']

  if (electronicsCategories.includes(categoryId)) {
    const conditions: Record<string, string> = {
      new: '1000',
      used_like_new: isProduction ? '2000' : '1000',
      used_very_good: isProduction ? '2500' : '3000',
      used_good: '3000',
      used_acceptable: '7000',
    }
    return conditions[condition] || '1000'
  } else if (clothingCategories.includes(categoryId)) {
    const conditions: Record<string, string> = {
      new: '1000',
      used_like_new: isProduction ? '1500' : '1000',
      used_very_good: isProduction ? '1750' : '2000',
      used_good: '2000',
      used_acceptable: '3000',
    }
    return conditions[condition] || '1000'
  } else {
    const universalConditions: Record<string, string> = {
      new: '1000',
      used_like_new: '1000',
      used_very_good: '3000',
      used_good: '3000',
      used_acceptable: '3000',
    }
    return universalConditions[condition] || '1000'
  }
}

function generateItemSpecificsXml(
  specifics?: Array<{ Name: string; Value: string[] }>
): string {
  if (!specifics || specifics.length === 0) return ''

  let xml = '<ItemSpecifics>'
  specifics.forEach((specific) => {
    xml += '<NameValueList>'
    xml += `<Name>${escapeXml(specific.Name)}</Name>`
    specific.Value.forEach((value) => {
      xml += `<Value>${escapeXml(value)}</Value>`
    })
    xml += '</NameValueList>'
  })
  xml += '</ItemSpecifics>'

  return xml
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function refreshTokenIfNeeded(connection: any): Promise<string> {
  const expiresAt = new Date(connection.expires_at)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

  if (expiresAt <= oneHourFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing eBay token...')
    const newToken = await refreshEbayToken(connection.refresh_token)

    await supabase
      .from('ebay_connections')
      .update({
        access_token: newToken.access_token,
        expires_at: new Date(
          Date.now() + newToken.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('✅ eBay token refreshed successfully')
    return newToken.access_token
  }

  return connection.access_token
}

async function refreshEbayToken(refreshToken: string) {
  const tokenUrl =
    process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token'

  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh eBay token')
  }

  return await response.json()
}
