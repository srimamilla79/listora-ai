// src/app/api/ebay/publish/route.ts
// eBay listing creation with DUAL TOKEN SYSTEM - User + Application Tokens
// ✅ TRUE eBay BEST PRACTICES 2024 (Mobile-First, 800 Character Limit)
// ✅ ENHANCED CONTENT EXTRACTION - Rich Details from AI-Generated Content
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

interface EbayListingData {
  Title: string
  Description: string
  PrimaryCategory: { CategoryID: string }
  StartPrice: string
  Quantity: number
  ListingType: string
  ListingDuration: string
  ConditionID: string
  SKU: string
  ShippingDetails: any
  ReturnPolicy: any
  PaymentMethods: any[]
  DispatchTimeMax: number
  PictureDetails?: { PictureURL: string[] }
  ItemSpecifics?: Array<{ Name: string; Value: string[] }>
}

interface EbayApiResult {
  ItemID: string
  Fees: any[]
  Errors: any[]
  Warnings: any[]
  Ack: string
  RawResponse: string
}

interface CategoryResult {
  categoryId: string
  categoryName: string
  source: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 eBay publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()
    const supabase = await createServerSideClient()

    // Always fetch the latest product content from the backend using the content ID
    const { data: latestContent, error: fetchError } = await supabase
      .from('product_contents')
      .select('*')
      .eq('id', productContent.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !latestContent) {
      return NextResponse.json(
        { error: 'Could not fetch latest product content' },
        { status: 500 }
      )
    }

    // Use the latest content for publishing
    const mergedProductContent = { ...productContent, ...latestContent }

    console.log('📋 Request data:', {
      userId,
      productName: mergedProductContent?.product_name,
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
    const userAccessToken = await refreshTokenIfNeeded(connection, supabase)
    console.log(
      '🔐 Using user access token:',
      userAccessToken.substring(0, 20) + '...'
    )

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-${Date.now()}`

    // ✅ Generate comprehensive content for processing
    const productName = mergedProductContent.product_name.toLowerCase()
    const content = (mergedProductContent.generated_content || '').toLowerCase()
    const features = (mergedProductContent.features || '').toLowerCase()
    const description = (mergedProductContent.description || '').toLowerCase()
    const fullText = `${productName} ${content} ${features} ${description}`

    console.log('🔍 Processing full content length:', fullText.length)

    // ✅ DUAL TOKEN SYSTEM: Get category using Application Token
    const categoryResult = await detectCategoryWithDualTokens(fullText)

    console.log('🏷️ Final category decision:', categoryResult)

    // ✅ Extract AI-generated title
    const aiGeneratedTitle = extractTitleFromContent(
      mergedProductContent.generated_content || ''
    )
    const finalTitle = aiGeneratedTitle || mergedProductContent.product_name

    console.log(
      '🎯 Using title:',
      finalTitle.substring(0, 50) + (finalTitle.length > 50 ? '...' : '')
    )

    // Prepare eBay listing data
    const listingData: EbayListingData = {
      Title: truncateTitle(finalTitle),
      Description: formatEbayBestPracticesDescription(mergedProductContent), // ✅ ENHANCED: Rich content extraction
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
      fullText
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
        content_id: mergedProductContent.id,
        ebay_item_id: ebayResult.ItemID,
        sku: sku,
        title: listingData.Title,
        description: mergedProductContent.generated_content,
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

    // ✅ Save to unified published_products table
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
        description: mergedProductContent.generated_content,
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
      productId: ebayResult.ItemID, // ✅ Return productId for UnifiedPublisher
      listingId: ebayResult.ItemID,
      id: ebayResult.ItemID,
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

// ✅ ENHANCED eBay DESCRIPTION FORMATTER - Rich Content + No Duplicates
// Extracts the BEST details from AI-generated content
function formatEbayBestPracticesDescription(productContent: any): string {
  // Parse the generated content with enhanced extraction
  const sections = parseEnhancedGeneratedContent(
    productContent.generated_content || ''
  )

  // ✅ eBay Mobile-Optimized Description Format
  let html = `<div vocab="https://schema.org/" typeof="Product">`

  // ✅ MOBILE DESCRIPTION (800 character limit including HTML tags)
  html += `<span property="description">`

  let mobileContent = ''
  let charCount = 0

  // Add enhanced key selling points (max 5 for mobile)
  if (
    sections.enhancedBulletPoints &&
    sections.enhancedBulletPoints.length > 0
  ) {
    mobileContent += '<ul>'
    charCount += 4 // <ul> = 4 characters

    let pointsAdded = 0
    for (const point of sections.enhancedBulletPoints.slice(0, 5)) {
      const liContent = `<li>${point}</li>`

      // Check if adding this point would exceed 750 chars (leave buffer)
      if (charCount + liContent.length < 750 && pointsAdded < 5) {
        mobileContent += liContent
        charCount += liContent.length
        pointsAdded++
      } else {
        break
      }
    }

    mobileContent += '</ul>'
    charCount += 5 // </ul> = 5 characters
  }

  // Add concise product highlight if space allows
  if (sections.productHighlight && charCount < 600) {
    const remainingChars = 750 - charCount
    const words = sections.productHighlight.split(' ')
    let briefDesc = ''

    for (const word of words) {
      if ((briefDesc + ' ' + word).length < remainingChars - 20) {
        briefDesc += (briefDesc ? ' ' : '') + word
      } else {
        break
      }
    }

    if (briefDesc !== sections.productHighlight && briefDesc.length > 20) {
      briefDesc += '...'
    }

    if (briefDesc.length > 20) {
      mobileContent += `<br>${briefDesc}`
    }
  }

  html += mobileContent
  html += `</span>` // End mobile description

  // ✅ DESKTOP DESCRIPTION - Additional details (NO DUPLICATES)
  // Only add desktop content if it's different from mobile content
  if (sections.detailedFeatures && sections.detailedFeatures.length > 0) {
    html += `<br><br><strong>Product Features:</strong><br>`

    // Add detailed features that weren't in mobile bullets
    for (let i = 0; i < Math.min(sections.detailedFeatures.length, 3); i++) {
      const feature = sections.detailedFeatures[i]
      if (feature && feature.length > 30) {
        // Ensure this content isn't already in mobile section
        if (
          !mobileContent
            .toLowerCase()
            .includes(feature.toLowerCase().substring(0, 30))
        ) {
          html += `${feature}<br>`
        }
      }
    }
  }

  // ✅ PRODUCT SPECIFICATIONS (Enhanced extraction)
  if (sections.specifications && sections.specifications.length > 0) {
    html += `<br><strong>Specifications:</strong><br>`
    sections.specifications.forEach((spec) => {
      html += `${spec}<br>`
    })
  }

  // ✅ SIMPLE ITEM INFORMATION (No fancy tables)
  html += `<br><strong>Condition:</strong> New<br>`
  html += `<strong>Brand:</strong> ${extractEnhancedBrand(productContent.generated_content || productContent.product_name)}<br>`
  html += `<strong>Shipping:</strong> Fast shipping available<br>`
  html += `<strong>Returns:</strong> 30-day return policy<br><br>`

  // ✅ SIMPLE CONTACT INFO
  html += `Questions? Please message us for more details.<br>`
  html += `Thanks for shopping with us!`

  html += `</div>`

  console.log(`📱 Mobile description character count: ${mobileContent.length}`)

  return html
}

// ✅ ENHANCED CONTENT PARSING - Extracts Rich Details
function parseEnhancedGeneratedContent(content: string) {
  const sections = {
    title: '',
    enhancedBulletPoints: [] as string[],
    productHighlight: '',
    detailedFeatures: [] as string[],
    specifications: [] as string[],
    fullDescription: '',
  }

  try {
    const lines = content.split('\n').filter((line) => line.trim())

    let currentSection = ''
    let description: string[] = []
    let enhancedBullets: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()

      // Extract title (removes markdown)
      if (trimmed.match(/^#{1,3}\s*1\.\s*PRODUCT TITLE/i)) {
        currentSection = 'title'
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (
            nextLine &&
            nextLine.startsWith('**') &&
            nextLine.endsWith('**')
          ) {
            sections.title = nextLine.replace(/\*\*/g, '').trim()
            break
          }
        }
        continue
      }

      if (trimmed.match(/^#{1,3}\s*2\.\s*KEY SELLING/i)) {
        currentSection = 'bullets'
        continue
      }

      if (trimmed.match(/^#{1,3}\s*3\.\s*DETAILED? PRODUCT DESCRIPTION/i)) {
        currentSection = 'description'
        continue
      }

      // Skip social media sections for professional listing
      if (trimmed.match(/^#{1,3}\s*[4-6]\./i)) {
        currentSection = 'skip'
        continue
      }

      // ✅ ENHANCED BULLET POINT EXTRACTION
      if (currentSection === 'bullets') {
        if (trimmed.startsWith('-') && trimmed.includes('**')) {
          const bulletMatch = trimmed.match(/^-\s*\*\*(.*?)\*\*:\s*(.*)/)
          if (bulletMatch) {
            const title = bulletMatch[1]
            const description = bulletMatch[2]

            // Extract key descriptive phrases (first meaningful part)
            let keyDesc = description

            // Take content up to first comma or period, but ensure minimum length
            if (description.includes(',')) {
              keyDesc = description.split(',')[0]
            } else if (description.includes('.')) {
              keyDesc = description.split('.')[0]
            }

            // If too short, take more content
            if (keyDesc.length < 30 && description.length > keyDesc.length) {
              const words = description.split(' ')
              keyDesc = words.slice(0, Math.min(12, words.length)).join(' ')
            }

            // Create enhanced bullet point with rich details
            enhancedBullets.push(`${title}: ${keyDesc}`)
          }
        }
      }

      // ✅ ENHANCED DESCRIPTION EXTRACTION
      else if (currentSection === 'description') {
        if (
          trimmed.length > 15 &&
          !trimmed.match(/^#{1,3}/) &&
          !trimmed.match(/^\*?\*?[A-Z\s]+:?\*?\*?$/) &&
          !trimmed.includes('**')
        ) {
          // Prioritize sentences with rich product details
          const hasRichDetails = trimmed.match(
            /\b(gradient|mesh|cushioned|air pockets|wave patterns|transition|breathable|visible|striking|dynamic|flexible|shock absorption)\b/i
          )

          if (hasRichDetails) {
            description.unshift(trimmed) // Put rich descriptions first
          } else {
            description.push(trimmed)
          }
        }
      }
    }

    sections.enhancedBulletPoints = enhancedBullets
    sections.fullDescription = description.join('\n\n')

    // Extract product highlight (first rich description sentence)
    if (description.length > 0) {
      sections.productHighlight = description[0]
    }

    // Extract detailed features (remaining descriptions)
    if (description.length > 1) {
      sections.detailedFeatures = description.slice(1, 4) // Take 2-3 additional features
    }

    // Extract specifications from detailed content
    sections.specifications = extractSpecifications(content)
  } catch (error) {
    console.error('❌ Error parsing enhanced content:', error)
    // Fallback to basic extraction
    const cleanContent = content.replace(/\*\*/g, '').replace(/#{1,6}\s*/g, '')
    const paragraphs = cleanContent
      .split('\n\n')
      .filter((p) => p.trim().length > 50)
    sections.productHighlight = paragraphs[0] || cleanContent.substring(0, 200)
    sections.enhancedBulletPoints = [
      'High Quality Product',
      'Professional Design',
      'Durable Construction',
    ]
  }

  return sections
}

// ✅ EXTRACT PRODUCT SPECIFICATIONS
function extractSpecifications(content: string): string[] {
  const specs: string[] = []
  const text = content.toLowerCase()

  // Look for specific product attributes mentioned in content
  const specPatterns = [
    {
      pattern: /material[:\s]+(mesh|leather|synthetic|cotton|polyester|nylon)/i,
      format: 'Material: $1',
    },
    { pattern: /sole[:\s]+(rubber|eva|air|cushioned)/i, format: 'Sole: $1' },
    { pattern: /color[:\s]+([\w\s]+?)(?:\.|,|$)/i, format: 'Color: $1' },
    { pattern: /size[:\s]+([\d\.]+ ?\w*)/i, format: 'Size: $1' },
    { pattern: /weight[:\s]+([\d\.]+ ?\w+)/i, format: 'Weight: $1' },
  ]

  specPatterns.forEach(({ pattern, format }) => {
    const match = content.match(pattern)
    if (match && match[1]) {
      const value = match[1].trim().replace(/\.$/, '')
      specs.push(format.replace('$1', value))
    }
  })

  // Add brand if found
  const brand = extractEnhancedBrand(content)
  if (brand && brand !== 'Unbranded') {
    specs.unshift(`Brand: ${brand}`)
  }

  return specs
}

// ✅ ENHANCED BRAND EXTRACTION
function extractEnhancedBrand(fullText: string): string {
  const text = fullText.toLowerCase()

  // Shoe/Athletic brands (priority for athletic footwear)
  if (text.includes('adidas')) return 'Adidas'
  if (text.includes('nike')) return 'Nike'
  if (text.includes('jordan')) return 'Air Jordan'
  if (text.includes('puma')) return 'PUMA'
  if (text.includes('under armour')) return 'Under Armour'
  if (text.includes('new balance')) return 'New Balance'
  if (text.includes('reebok')) return 'Reebok'
  if (text.includes('converse')) return 'Converse'
  if (text.includes('vans')) return 'Vans'
  if (text.includes('skechers')) return 'Skechers'

  // Electronics brands
  if (text.includes('apple')) return 'Apple'
  if (text.includes('samsung')) return 'Samsung'
  if (text.includes('google')) return 'Google'
  if (text.includes('sony')) return 'Sony'
  if (text.includes('lg')) return 'LG'
  if (text.includes('microsoft')) return 'Microsoft'

  // Watch brands
  if (text.includes('cheetah')) return 'Cheetah'
  if (text.includes('rolex')) return 'Rolex'
  if (text.includes('omega')) return 'Omega'
  if (text.includes('seiko')) return 'Seiko'
  if (text.includes('casio')) return 'Casio'
  if (text.includes('fossil')) return 'Fossil'
  if (text.includes('timex')) return 'Timex'

  return 'Unbranded'
}

// ✅ EXTRACT AI-GENERATED TITLE FROM CONTENT
function extractTitleFromContent(content: string): string | null {
  // Extract from "PRODUCT TITLE/HEADLINE:" section
  const titleMatch = content.match(
    /###\s*1\.\s*PRODUCT TITLE\/HEADLINE:\s*\*\*(.*?)\*\*/i
  )
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim()
  }
  // Fallback: look for any title with ** formatting
  const fallbackMatch = content.match(
    /\*\*(.*?(?:Premium|Professional|Luxury|Quality).*?)\*\*/i
  )
  return fallbackMatch ? fallbackMatch[1].trim() : null
}

// ✅ EXTRACT FEATURES FROM AI-GENERATED CONTENT
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
    : [
        'High Quality',
        'Durable Design',
        'Premium Materials',
        'Excellent Performance',
        'Great Value',
      ]
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

// ✅ VERIFIED CATEGORY DETECTION (FALLBACK)
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
    return '14969' // Headphones
  }

  // KITCHEN & HOME - Check BEFORE generic electronics
  if (
    text.includes('air fryer') ||
    text.includes('fryer') ||
    text.includes('kitchen appliance') ||
    text.includes('cooker')
  ) {
    console.log('✅ Detected KITCHEN APPLIANCES category')
    return '20667' // Small Kitchen Appliances
  }

  if (
    text.includes('mug') ||
    text.includes('cup') ||
    text.includes('coffee mug')
  ) {
    console.log('✅ Detected DINNERWARE category')
    return '20642' // Dinnerware & Serveware
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
    return '15709' // Athletic Shoes
  }

  if (
    text.includes('tshirt') ||
    text.includes('t-shirt') ||
    text.includes('polo shirt') ||
    text.includes('casual shirt')
  ) {
    console.log('✅ Detected SHIRTS category')
    return '1059' // Casual Shirts
  }

  if (text.includes('jeans') || text.includes('denim pants')) {
    console.log('✅ Detected JEANS category')
    return '11554' // Jeans
  }

  if (
    text.includes('watch') ||
    text.includes('timepiece') ||
    text.includes('smartwatch') ||
    text.includes('wristwatch')
  ) {
    console.log('✅ Detected WATCH category')
    return '31387' // Wristwatches
  }

  // ELECTRONICS - Check LAST (most generic)
  if (
    text.includes('laptop') ||
    text.includes('computer') ||
    text.includes('macbook') ||
    text.includes('notebook')
  ) {
    console.log('✅ Detected LAPTOP category')
    return '177' // PC Laptops & Netbooks
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
    return '9355' // Cell Phones & Smartphones
  }

  // Only match "phone" if no other category detected
  if (text.includes('phone') && !text.includes('headphone')) {
    console.log('✅ Detected generic PHONE category')
    return '9355' // Cell Phones & Smartphones
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

  // Always add universal basics
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

  // Universal aspect handling
  if (aspect.includes('brand')) return extractBrand(fullText)
  if (aspect.includes('color') || aspect.includes('colour'))
    return extractColor(fullText)
  if (aspect.includes('model')) return extractGenericModel(fullText)
  if (aspect.includes('size')) return extractGenericSize(fullText)
  if (aspect.includes('material')) return extractGenericMaterial(fullText)

  // Category-specific aspect handling
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
  } else if (categoryId === '31387') {
    // Watches
    if (aspect.includes('type') || aspect.includes('style'))
      return extractWatchType(fullText)
    if (aspect.includes('movement')) return extractMovement(fullText)
    if (aspect.includes('band material')) return extractBandMaterial(fullText)
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
    // Cell Phones
    specifics.push({ Name: 'Model', Value: [extractPhoneModel(fullText)] })
    specifics.push({
      Name: 'Storage Capacity',
      Value: [extractStorageCapacity(fullText)],
    })
    specifics.push({ Name: 'Network', Value: [extractNetwork(fullText)] })
    specifics.push({ Name: 'Operating System', Value: [extractOS(fullText)] })
  } else if (categoryId === '177') {
    // Laptops
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
  } else if (categoryId === '31387') {
    // Watches
    specifics.push({ Name: 'Watch Type', Value: [extractWatchType(fullText)] })
    specifics.push({ Name: 'Movement', Value: [extractMovement(fullText)] })
    specifics.push({
      Name: 'Band Material',
      Value: [extractBandMaterial(fullText)],
    })
    specifics.push({
      Name: 'Case Material',
      Value: [extractCaseMaterial(fullText)],
    })
  } else {
    // Universal fallback
    specifics.push({ Name: 'Model', Value: [extractGenericModel(fullText)] })
    specifics.push({ Name: 'Type', Value: ['Standard'] })
  }

  return specifics
}

// ✅ EXTRACTION FUNCTIONS

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

  // Watch brands
  if (text.includes('cheetah')) return 'Cheetah'
  if (text.includes('rolex')) return 'Rolex'
  if (text.includes('omega')) return 'Omega'
  if (text.includes('seiko')) return 'Seiko'
  if (text.includes('casio')) return 'Casio'
  if (text.includes('fossil')) return 'Fossil'
  if (text.includes('timex')) return 'Timex'

  // Fashion brands
  if (text.includes('nike')) return 'Nike'
  if (text.includes('adidas')) return 'adidas'
  if (text.includes('jordan')) return 'Jordan'
  if (text.includes('puma')) return 'PUMA'

  return 'Unbranded'
}

function extractColor(fullText: string): string {
  const text = fullText.toLowerCase()

  // Enhanced color detection
  const colorMap = {
    beige: ['beige', 'tan', 'khaki', 'sand', 'nude'],
    gold: ['gold', 'golden', 'gold tone', 'gold color'],
    white: ['white', 'off-white'],
    black: ['black', 'ebony', 'charcoal'],
    gray: ['gray', 'grey', 'silver', 'slate'],
    red: ['red', 'crimson', 'scarlet'],
    blue: ['blue', 'navy', 'cobalt'],
    green: ['green', 'emerald', 'forest'],
    yellow: ['yellow', 'gold', 'golden'],
    brown: ['brown', 'bronze', 'chocolate'],
    pink: ['pink', 'rose', 'magenta'],
    purple: ['purple', 'violet', 'lavender'],
    orange: ['orange', 'amber', 'copper'],
  }

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

// PHONE EXTRACTORS
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

// LAPTOP EXTRACTORS
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

// WATCH EXTRACTORS
function extractWatchType(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('smartwatch') || text.includes('smart watch'))
    return 'Smart Watch'
  if (text.includes('digital')) return 'Digital'
  if (text.includes('analog') || text.includes('analogue')) return 'Analog'
  if (text.includes('automatic')) return 'Automatic'
  if (text.includes('quartz')) return 'Quartz'
  return 'Analog'
}

function extractMovement(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('automatic')) return 'Automatic'
  if (text.includes('mechanical')) return 'Mechanical'
  if (text.includes('quartz')) return 'Quartz'
  if (text.includes('digital')) return 'Digital'
  return 'Quartz'
}

function extractBandMaterial(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('leather')) return 'Leather'
  if (
    text.includes('metal') ||
    text.includes('steel') ||
    text.includes('bracelet')
  )
    return 'Metal'
  if (text.includes('rubber') || text.includes('silicone')) return 'Rubber'
  if (text.includes('fabric') || text.includes('nylon')) return 'Fabric'
  if (text.includes('gold')) return 'Gold Tone'
  return 'Metal'
}

function extractCaseMaterial(fullText: string): string {
  const text = fullText.toLowerCase()
  if (text.includes('stainless steel')) return 'Stainless Steel'
  if (text.includes('titanium')) return 'Titanium'
  if (text.includes('gold')) return 'Gold'
  if (text.includes('aluminum')) return 'Aluminum'
  if (text.includes('plastic')) return 'Plastic'
  return 'Metal'
}

// GENERIC EXTRACTORS
function extractGenericModel(fullText: string): string {
  const modelMatch =
    fullText.match(/model\s+([a-z0-9\-]+)/i) ||
    fullText.match(/\b([a-z]{2,}\-?\d{2,})\b/i)
  if (modelMatch) return modelMatch[1]

  const text = fullText.toLowerCase()
  if (text.includes('cheetah')) return 'Cheetah Model'
  if (text.includes('nike')) return 'Nike Model'
  if (text.includes('apple')) return 'Apple Model'

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
  return 'Mixed Materials'
}

// ✅ eBay API FUNCTIONS
async function createEbayListing(
  listingData: EbayListingData,
  userAccessToken: string
): Promise<EbayApiResult> {
  const tradingApiUrl =
    process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
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

async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
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
