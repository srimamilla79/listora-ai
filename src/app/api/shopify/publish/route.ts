// src/app/api/shopify/publish/route.ts - UNIVERSAL CONTENT PARSER
// Works with ANY content format - structured, unstructured, or mixed
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { productContent, images, publishingOptions, userId } =
      await request.json()
    const supabase = await createServerSideClient()

    // Always fetch the latest product content from the backend
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

    // Get user's Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'shopify')
      .eq('status', 'connected')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        {
          error:
            'Shopify store not connected. Please connect your Shopify store first.',
        },
        { status: 400 }
      )
    }

    const shopDomain = connection.platform_store_info.shop_domain
    const accessToken = connection.access_token

    // ✅ UNIVERSAL: Parse ANY content format
    const contentSections = parseUniversalContent(
      mergedProductContent.generated_content,
      mergedProductContent.product_name
    )

    // ✅ Create Shopify product with universal data
    const shopifyProduct = createShopifyProduct(
      contentSections,
      mergedProductContent,
      publishingOptions,
      images,
      connection
    )

    console.log('🚀 Publishing to Shopify:', {
      title: shopifyProduct.product.title,
      descriptionLength: shopifyProduct.product.body_html.length,
      hasImages: shopifyProduct.product.images.length > 0,
    })

    // Create product in Shopify
    const shopifyResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-04/products.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopifyProduct),
      }
    )

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json()
      console.error('❌ Shopify API error:', errorData)
      return NextResponse.json(
        {
          error: `Shopify API error: ${errorData.errors || 'Unknown error'}`,
          details: errorData,
        },
        { status: shopifyResponse.status }
      )
    }

    const shopifyResult = await shopifyResponse.json()
    const createdProduct = shopifyResult.product

    console.log('✅ Shopify product created:', {
      id: createdProduct?.id,
      handle: createdProduct?.handle,
      status: createdProduct?.status,
      title: createdProduct?.title,
    })

    // Save to unified published_products table
    const { data: savedProduct, error: saveError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: mergedProductContent.id,
        platform: 'shopify',
        platform_product_id: createdProduct?.id?.toString(),
        platform_url: `https://${shopDomain}/admin/products/${createdProduct?.id}`,
        title: createdProduct.title,
        description: stripHtml(createdProduct.body_html),
        price: parseFloat(createdProduct.variants[0].price),
        quantity: createdProduct.variants[0].inventory_quantity,
        sku: createdProduct.variants[0].sku,
        images: createdProduct.images?.map((img: any) => img.src) || [],
        platform_data: {
          shopify_product_id: createdProduct.id,
          shopify_handle: createdProduct.handle,
          shop_domain: shopDomain,
          variant_id: createdProduct.variants[0].id,
          status: createdProduct.status,
        },
        status: createdProduct.status === 'active' ? 'published' : 'draft',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('⚠️ Failed to save to database:', saveError)
    }

    // Update platform connection last_used_at
    await supabase
      .from('platform_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      platform: 'shopify',
      productId: createdProduct?.id?.toString() || 'Unknown',
      listingId: createdProduct?.id?.toString() || 'Unknown',
      id: createdProduct?.id?.toString() || 'Unknown',
      handle: createdProduct?.handle || 'unknown',
      adminUrl: `https://${shopDomain}/admin/products/${createdProduct?.id || 'unknown'}`,
      publicUrl: `https://${shopDomain}/products/${createdProduct?.handle || 'unknown'}`,
      status: createdProduct?.status || 'unknown',
      message: `Product created successfully in Shopify! Product ID: ${createdProduct?.id || 'Unknown'} | Status: ${createdProduct?.status || 'Unknown'}`,
    })
  } catch (error) {
    console.error('❌ Shopify publish error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to publish to Shopify',
        platform: 'shopify',
      },
      { status: 500 }
    )
  }
}

// ✅ UNIVERSAL CONTENT PARSER - Works with ANY format
function parseUniversalContent(content: string, fallbackTitle?: string) {
  console.log('🔍 Universal parsing started...')

  const sections = {
    title: '',
    description: '',
    bulletPoints: [] as string[],
    features: [] as string[],
  }

  try {
    // ✅ UNIVERSAL TITLE EXTRACTION
    sections.title = extractUniversalTitle(content, fallbackTitle)

    // ✅ UNIVERSAL DESCRIPTION EXTRACTION
    sections.description = extractUniversalDescription(content)

    // ✅ UNIVERSAL BULLET POINTS EXTRACTION
    sections.bulletPoints = extractUniversalBulletPoints(content)

    // ✅ UNIVERSAL FEATURES EXTRACTION
    sections.features = extractUniversalFeatures(content)

    console.log('✅ Universal parsing results:', {
      title: sections.title.substring(0, 50) + '...',
      description: sections.description.substring(0, 100) + '...',
      bulletCount: sections.bulletPoints.length,
      featuresCount: sections.features.length,
    })
  } catch (error) {
    console.error('❌ Universal parsing error:', error)

    // ✅ ABSOLUTE FALLBACK - Always works
    sections.title =
      fallbackTitle || extractFirstMeaningfulLine(content) || 'Premium Product'
    sections.description = content
      .replace(/\*\*/g, '')
      .replace(/#{1,6}/g, '')
      .trim()
      .substring(0, 500)
    sections.bulletPoints = content.match(/^-\s*.+$/gm)?.slice(0, 5) || []
  }

  return sections
}

// ✅ EXTRACT TITLE FROM ANY FORMAT - FIXED FOR YOUR EXACT FORMAT
function extractUniversalTitle(
  content: string,
  fallbackTitle?: string
): string {
  console.log('🔍 Extracting universal title from content...')
  console.log('🔍 Content preview:', content.substring(0, 300))

  // Try multiple title patterns - FIXED for your exact format
  const titlePatterns = [
    // Your exact format: **1. PRODUCT TITLE/HEADLINE:**
    /\*\*1\.\s*PRODUCT\s+TITLE[\/\s]*HEADLINE[:\s]*\*\*\s*\n([^\n\*]+)/i,
    /\*\*1\.\s*PRODUCT\s+TITLE[:\s]*\*\*\s*\n([^\n\*]+)/i,

    // Alternative formats
    /(?:\*\*)?1\.?\s*(?:PRODUCT\s+)?TITLE[:\s\/]*(?:HEADLINE)?[:\s]*(?:\*\*)?\s*[\n\r]*([^\n\r\*]+)/i,
    /(?:\*\*)?(?:PRODUCT\s+)?TITLE[:\s]*(?:\*\*)?\s*[\n\r]*([^\n\r\*]+)/i,
    /#{1,6}\s*TITLE[:\s]*([^\n\r]+)/i,

    // Quote patterns
    /"([^"]{10,100})"/,

    // First meaningful line that looks like a title
    /^([A-Z][^.\n]{10,80})$/m,
  ]

  for (let i = 0; i < titlePatterns.length; i++) {
    const pattern = titlePatterns[i]
    const match = content.match(pattern)
    console.log(
      `🔍 Pattern ${i + 1} match:`,
      match ? match[1]?.substring(0, 50) : 'No match'
    )

    if (match && match[1]) {
      let title = match[1].trim()

      // Clean the title
      title = title
        .replace(/\*\*/g, '') // Remove bold
        .replace(/\*/g, '') // Remove italic
        .replace(/#{1,6}\s*/g, '') // Remove headers
        .replace(/^[-•]\s*/, '') // Remove bullets
        .replace(/[^\w\s-,&()'/]/g, ' ') // Remove special chars except common ones
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()

      // Validate title quality
      if (title.length >= 10 && title.length <= 150 && /[a-zA-Z]/.test(title)) {
        console.log('✅ Found valid title:', title)
        return title
      }
    }
  }

  // Use fallback title or extract from content
  const fallback =
    fallbackTitle || extractFirstMeaningfulLine(content) || 'Premium Product'
  console.log('⚠️ Using fallback title:', fallback)
  return fallback
}

// ✅ EXTRACT DESCRIPTION FROM ANY FORMAT
function extractUniversalDescription(content: string): string {
  console.log('🔍 Extracting universal description...')

  // Try structured description patterns first
  const structuredPatterns = [
    /(?:\*\*)?3\.?\s*(?:DETAILED\s*)?(?:PRODUCT\s*)?DESCRIPTION[:\s]*(?:\*\*)?\s*[\n\r]+([\s\S]*?)(?=(?:\*\*)?[4-9]\.|$)/i,
    /(?:\*\*)?DESCRIPTION[:\s]*(?:\*\*)?\s*[\n\r]+([\s\S]*?)(?=(?:\*\*)?[A-Z\s]*:|$)/i,
    /#{1,6}\s*DESCRIPTION[:\s]*[\n\r]+([\s\S]*?)(?=#{1,6}|$)/i,
  ]

  for (const pattern of structuredPatterns) {
    const match = content.match(pattern)
    if (match && match[1] && match[1].trim().length > 50) {
      let description = match[1].trim()
      description = cleanTextContent(description)
      if (description.length > 50) {
        console.log(
          '✅ Found structured description:',
          description.substring(0, 100) + '...'
        )
        return description
      }
    }
  }

  // Try to extract largest paragraph
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => cleanTextContent(p))
    .filter((p) => p.length > 100 && !p.match(/^[\d\s\*\-#]/)) // Skip lists and headers
    .sort((a, b) => b.length - a.length)

  if (paragraphs.length > 0) {
    console.log(
      '✅ Found paragraph description:',
      paragraphs[0].substring(0, 100) + '...'
    )
    return paragraphs[0]
  }

  // Fallback: clean entire content
  const fallbackDesc = cleanTextContent(content).substring(0, 500)
  console.log(
    '✅ Using fallback description:',
    fallbackDesc.substring(0, 100) + '...'
  )
  return fallbackDesc
}

// ✅ EXTRACT BULLET POINTS FROM ANY FORMAT
function extractUniversalBulletPoints(content: string): string[] {
  console.log('🔍 Extracting universal bullet points...')

  const bulletPoints: string[] = []

  // Pattern 1: Lines starting with - or •
  const dashBullets = content.match(/^[\s]*[-•]\s*(.+)$/gm)
  if (dashBullets) {
    dashBullets.forEach((bullet) => {
      const clean = cleanTextContent(bullet.replace(/^[\s]*[-•]\s*/, ''))
      if (clean.length > 10 && clean.length < 200) {
        bulletPoints.push(clean)
      }
    })
  }

  // Pattern 2: Lines starting with numbers
  const numberedBullets = content.match(/^[\s]*\d+[\.\)]\s*(.+)$/gm)
  if (numberedBullets) {
    numberedBullets.forEach((bullet) => {
      const clean = cleanTextContent(bullet.replace(/^[\s]*\d+[\.\)]\s*/, ''))
      if (clean.length > 10 && clean.length < 200) {
        bulletPoints.push(clean)
      }
    })
  }

  // Pattern 3: Key-value pairs with colons
  const keyValuePairs = content.match(
    /^[\s]*([A-Z][^:\n]{3,30}):\s*([^:\n]{10,150})$/gm
  )
  if (keyValuePairs) {
    keyValuePairs.forEach((pair) => {
      const clean = cleanTextContent(pair)
      if (clean.length > 10 && clean.length < 200) {
        bulletPoints.push(clean)
      }
    })
  }

  // Deduplicate and limit
  const uniqueBullets = [...new Set(bulletPoints)].slice(0, 8)
  console.log(`✅ Found ${uniqueBullets.length} bullet points`)

  return uniqueBullets
}

// ✅ EXTRACT FEATURES FROM ANY FORMAT
function extractUniversalFeatures(content: string): string[] {
  const features: string[] = []

  // Look for feature keywords
  const featureKeywords = [
    'premium',
    'quality',
    'durable',
    'lightweight',
    'wireless',
    'bluetooth',
    'waterproof',
    'eco-friendly',
    'handmade',
    'authentic',
    'certified',
    'comfortable',
    'stylish',
    'modern',
    'classic',
    'vintage',
    'luxury',
  ]

  featureKeywords.forEach((keyword) => {
    if (content.toLowerCase().includes(keyword)) {
      features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1))
    }
  })

  return [...new Set(features)].slice(0, 10)
}

// ✅ HELPER: Clean text content
function cleanTextContent(text: string): string {
  return text
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/^\s*[-•]\s*/, '') // Remove bullet markers
    .replace(/^\s*\d+[\.\)]\s*/, '') // Remove numbers
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
}

// ✅ HELPER: Extract first meaningful line
function extractFirstMeaningfulLine(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const cleaned = cleanTextContent(line)
    if (
      cleaned.length > 15 &&
      cleaned.length < 100 &&
      /[a-zA-Z]/.test(cleaned)
    ) {
      return cleaned
    }
  }
  return 'Premium Product'
}

// ✅ SIMPLE CLEAN FORMATTER - Like Adidas Example
function formatShopifyDescription(sections: any): string {
  let html = ''

  console.log('🎨 Simple clean formatting:', {
    hasDescription: !!sections.description,
    bulletCount: sections.bulletPoints.length,
    featuresCount: sections.features.length,
  })

  // ✅ MAIN DESCRIPTION - Clean paragraph, no styling
  if (sections.description) {
    html += sections.description
    html += '<br><br>'
  }

  // ✅ KEY FEATURES - Simple format like Adidas example
  if (sections.bulletPoints && sections.bulletPoints.length > 0) {
    html += '✨ Key Features<br>'

    sections.bulletPoints.slice(0, 6).forEach((point: string) => {
      const cleanPoint = cleanTextContent(point)
      if (cleanPoint.length > 5) {
        html += `• ${cleanPoint}<br>`
      }
    })
    html += '<br>'
  }

  // ✅ PRODUCT DETAILS - Additional content if available
  if (sections.description && sections.bulletPoints.length > 0) {
    html += '📋 Product Details<br>'

    // Create additional details from the description
    const sentences = sections.description.split('. ')
    if (sentences.length > 1) {
      // Take second part of description or create generic details
      const additionalInfo = sentences.slice(1, 3).join('. ')
      if (additionalInfo.length > 50) {
        html += additionalInfo
        if (!additionalInfo.endsWith('.')) html += '.'
      } else {
        // Generic professional details based on product type
        html += createGenericDetails(sections.description, sections.title)
      }
    } else {
      html += createGenericDetails(sections.description, sections.title)
    }
  }

  console.log('✅ Simple clean description formatted successfully')
  return html
}

// ✅ CREATE GENERIC PROFESSIONAL DETAILS
function createGenericDetails(description: string, title: string): string {
  const content = (description + ' ' + title).toLowerCase()

  if (content.includes('gold') || content.includes('metal')) {
    return 'This premium precious metal piece represents both investment value and timeless elegance. Each item undergoes rigorous quality control to ensure authenticity and purity. Perfect for collectors, investors, and those who appreciate fine craftsmanship. The secure packaging and certification guarantee make this an ideal choice for building a diversified portfolio or as a meaningful gift for special occasions.'
  }

  if (content.includes('shoes') || content.includes('footwear')) {
    return 'Designed with advanced materials and construction techniques, these shoes deliver exceptional performance and durability. The innovative design ensures optimal comfort during extended wear, whether for athletic activities or casual use. Quality craftsmanship meets modern style, making these shoes suitable for various occasions and environments.'
  }

  if (content.includes('clothing') || content.includes('apparel')) {
    return 'Crafted from premium materials with attention to detail, this garment combines style and functionality. The design focuses on comfort and versatility, making it suitable for various occasions. Quality construction ensures long-lasting wear and easy care, while the timeless style transcends seasonal trends.'
  }

  if (content.includes('electronics') || content.includes('device')) {
    return 'Engineered with cutting-edge technology and premium components, this device delivers reliable performance and user satisfaction. The intuitive design ensures easy operation while maintaining professional standards. Advanced features are balanced with user-friendly functionality, making it suitable for both casual and professional use.'
  }

  // Generic fallback
  return 'Carefully crafted with attention to quality and detail, this product represents excellent value and reliable performance. The thoughtful design considers both functionality and aesthetics, ensuring satisfaction with every use. Whether for personal use or as a gift, this product meets high standards of quality and craftsmanship.'
}

// ✅ CREATE SHOPIFY PRODUCT WITH UNIVERSAL DATA
function createShopifyProduct(
  contentSections: any,
  mergedProductContent: any,
  publishingOptions: any,
  images: string[],
  connection: any
) {
  return {
    product: {
      title:
        contentSections.title ||
        mergedProductContent.product_name ||
        'Premium Product',
      body_html: formatShopifyDescription(contentSections),
      vendor:
        extractBrand(
          contentSections.description + ' ' + contentSections.title
        ) ||
        connection.platform_store_info.shop_name ||
        'Premium Brand',
      product_type: detectProductType(
        contentSections.description + ' ' + contentSections.title
      ),
      status: 'draft',
      variants: [
        {
          price: publishingOptions.price.toString(),
          inventory_quantity: publishingOptions.quantity,
          sku: publishingOptions.sku,
          requires_shipping: true,
          taxable: true,
          inventory_management: 'shopify',
          fulfillment_service: 'manual',
          inventory_policy: 'deny',
          weight: estimateWeight(contentSections.description),
          weight_unit: 'lb',
        },
      ],
      images: prepareShopifyImages(images, contentSections.title),
      tags: generateTags(contentSections),
      seo: {
        title: `${contentSections.title} | ${connection.platform_store_info.shop_name}`,
        description:
          contentSections.description
            .substring(0, 160)
            .replace(/<[^>]*>/g, '') + '...',
      },
    },
  }
}

// ✅ HELPER FUNCTIONS
function extractBrand(content: string): string {
  const brands = [
    'Adidas',
    'Nike',
    'Apple',
    'Samsung',
    'Sony',
    'Bose',
    'PAMP',
    'Calvin Klein',
    'Tommy Hilfiger',
  ]
  const contentLower = content.toLowerCase()
  for (const brand of brands) {
    if (contentLower.includes(brand.toLowerCase())) return brand
  }
  return ''
}

function detectProductType(content: string): string {
  const contentLower = content.toLowerCase()
  if (contentLower.includes('gold') || contentLower.includes('silver'))
    return 'Precious Metals'
  if (contentLower.includes('shoes') || contentLower.includes('sneakers'))
    return 'Footwear'
  if (contentLower.includes('shirt') || contentLower.includes('clothing'))
    return 'Apparel'
  if (contentLower.includes('headphones') || contentLower.includes('earbuds'))
    return 'Electronics'
  if (contentLower.includes('phone') || contentLower.includes('smartphone'))
    return 'Electronics'
  if (contentLower.includes('laptop') || contentLower.includes('computer'))
    return 'Electronics'
  return 'General'
}

function estimateWeight(content: string): number {
  const contentLower = content.toLowerCase()
  if (contentLower.includes('gold') || contentLower.includes('metal'))
    return 0.1
  if (contentLower.includes('shoes') || contentLower.includes('sneakers'))
    return 2.0
  if (contentLower.includes('shirt') || contentLower.includes('clothing'))
    return 0.5
  if (contentLower.includes('headphones')) return 0.8
  if (contentLower.includes('phone')) return 0.4
  if (contentLower.includes('laptop')) return 4.0
  return 1.0
}

function generateTags(sections: any): string {
  const tags = new Set<string>()

  // Extract from features
  sections.features?.forEach((feature: string) => tags.add(feature))

  // Extract from content
  const content = (sections.description + ' ' + sections.title).toLowerCase()
  if (content.includes('premium')) tags.add('Premium')
  if (content.includes('luxury')) tags.add('Luxury')
  if (content.includes('quality')) tags.add('Quality')
  if (content.includes('authentic')) tags.add('Authentic')
  if (content.includes('handmade')) tags.add('Handmade')
  if (content.includes('vintage')) tags.add('Vintage')
  if (content.includes('modern')) tags.add('Modern')

  return Array.from(tags).slice(0, 10).join(', ')
}

function prepareShopifyImages(
  imageUrls: string[],
  productTitle: string
): any[] {
  if (!imageUrls || imageUrls.length === 0) return []

  return imageUrls
    .map((imageUrl, index) => {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return {
          src: imageUrl,
          alt: `${productTitle} - Image ${index + 1}`,
          position: index + 1,
        }
      }
      return null
    })
    .filter(Boolean)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
