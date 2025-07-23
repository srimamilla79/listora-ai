// src/app/api/shopify/publish/route.ts - PROFESSIONAL SHOPIFY BEST PRACTICES 2024
// Follows Shopify's recommended description format for better conversion
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

    // ✅ ENHANCED: Parse content with professional formatting
    const contentSections = parseEnhancedContent(
      mergedProductContent.generated_content,
      mergedProductContent.product_name
    )

    // ✅ Create Shopify product with professional data
    const shopifyProduct = createProfessionalShopifyProduct(
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

// ✅ ENHANCED: Content Parser with Better Structure
function parseEnhancedContent(content: string, fallbackTitle?: string) {
  console.log('🔍 Enhanced parsing started...')

  const sections = {
    title: '',
    shortDescription: '', // NEW: Brief intro paragraph
    keyBenefits: [] as string[], // NEW: Main selling points
    bulletPoints: [] as string[],
    specifications: [] as string[], // NEW: Technical details
    features: [] as string[],
  }

  try {
    // ✅ ENHANCED TITLE EXTRACTION
    sections.title = extractEnhancedTitle(content, fallbackTitle)

    // ✅ ENHANCED CONTENT PARSING
    const parsedContent = parseStructuredContent(content)

    sections.shortDescription = parsedContent.shortDescription
    sections.keyBenefits = parsedContent.keyBenefits
    sections.bulletPoints = parsedContent.bulletPoints
    sections.specifications = parsedContent.specifications
    sections.features = parsedContent.features

    console.log('✅ Enhanced parsing results:', {
      title: sections.title.substring(0, 50) + '...',
      shortDescription: sections.shortDescription.substring(0, 100) + '...',
      keyBenefitsCount: sections.keyBenefits.length,
      bulletCount: sections.bulletPoints.length,
      specificationsCount: sections.specifications.length,
    })
  } catch (error) {
    console.error('❌ Enhanced parsing error:', error)

    // ✅ FALLBACK with proper structure
    sections.title = fallbackTitle || 'Premium Product'
    sections.shortDescription = extractBriefDescription(content)
    sections.keyBenefits = [
      'Premium Quality',
      'Professional Design',
      'Reliable Performance',
    ]
    sections.bulletPoints = content.match(/^-\s*.+$/gm)?.slice(0, 5) || []
  }

  return sections
}

// ✅ ENHANCED: Title Extraction (Same as before but cleaned up)
function extractEnhancedTitle(content: string, fallbackTitle?: string): string {
  console.log('🔍 Extracting enhanced title...')

  const titlePatterns = [
    /\*\*1\.\s*PRODUCT\s+TITLE[\/\s]*HEADLINE[:\s]*\*\*\s*\n([^\n\*]+)/i,
    /\*\*1\.\s*PRODUCT\s+TITLE[:\s]*\*\*\s*\n([^\n\*]+)/i,
    /(?:\*\*)?1\.?\s*(?:PRODUCT\s+)?TITLE[:\s\/]*(?:HEADLINE)?[:\s]*(?:\*\*)?\s*[\n\r]*([^\n\r\*]+)/i,
    /(?:\*\*)?(?:PRODUCT\s+)?TITLE[:\s]*(?:\*\*)?\s*[\n\r]*([^\n\r\*]+)/i,
    /#{1,6}\s*TITLE[:\s]*([^\n\r]+)/i,
    /"([^"]{10,100})"/,
    /^([A-Z][^.\n]{10,80})$/m,
  ]

  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      let title = match[1].trim()
      title = cleanTitle(title)
      if (title.length >= 10 && title.length <= 150) {
        console.log('✅ Found valid title:', title)
        return title
      }
    }
  }

  return (
    fallbackTitle || extractFirstMeaningfulLine(content) || 'Premium Product'
  )
}

// ✅ NEW: Parse Structured Content for Better Organization
function parseStructuredContent(content: string) {
  const result = {
    shortDescription: '',
    keyBenefits: [] as string[],
    bulletPoints: [] as string[],
    specifications: [] as string[],
    features: [] as string[],
  }

  // Extract sections
  const sections = content.split(/(?=\*\*\d+\.)/g)

  for (const section of sections) {
    const cleanSection = section.trim()

    // Description section
    if (
      cleanSection.match(
        /\*\*3\.\s*(?:DETAILED\s*)?(?:PRODUCT\s*)?DESCRIPTION/i
      )
    ) {
      const descMatch = cleanSection.match(
        /\*\*3\.\s*(?:DETAILED\s*)?(?:PRODUCT\s*)?DESCRIPTION[:\s]*\*\*\s*\n([\s\S]+)/i
      )
      if (descMatch) {
        const fullDesc = cleanTextContent(descMatch[1])
        // Extract first 1-2 sentences for short description
        const sentences = fullDesc.split(/[.!?]+/)
        result.shortDescription = sentences.slice(0, 2).join('. ').trim()
        if (result.shortDescription && !result.shortDescription.endsWith('.')) {
          result.shortDescription += '.'
        }
      }
    }

    // Key selling points section
    else if (
      cleanSection.match(
        /\*\*2\.\s*(?:KEY\s*)?(?:SELLING\s*)?(?:POINTS|FEATURES|BENEFITS)/i
      )
    ) {
      const bulletMatches = cleanSection.match(
        /^[\s]*[-•*]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/gm
      )
      if (bulletMatches) {
        bulletMatches.forEach((match) => {
          const bulletMatch = match.match(
            /^[\s]*[-•*]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/
          )
          if (bulletMatch) {
            const title = bulletMatch[1].trim()
            const description = cleanTextContent(bulletMatch[2])
            result.keyBenefits.push(`${title}: ${description}`)
          }
        })
      }
    }
  }

  // Fallback extraction if structured parsing fails
  if (result.keyBenefits.length === 0) {
    result.keyBenefits = extractFallbackBenefits(content)
  }

  if (!result.shortDescription) {
    result.shortDescription = extractBriefDescription(content)
  }

  // Extract bullet points
  result.bulletPoints = extractCleanBulletPoints(content)

  // Extract specifications
  result.specifications = extractProductSpecs(content)

  return result
}

// ✅ NEW: Extract Brief Description (1-2 sentences max)
function extractBriefDescription(content: string): string {
  // Look for description section first
  const descMatch = content.match(
    /\*\*3\.\s*(?:DETAILED\s*)?(?:PRODUCT\s*)?DESCRIPTION[:\s]*\*\*\s*\n([\s\S]*?)(?=\*\*\d+\.|$)/i
  )

  let description = ''
  if (descMatch) {
    description = cleanTextContent(descMatch[1])
  } else {
    // Fallback: find largest meaningful paragraph
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => cleanTextContent(p))
      .filter((p) => p.length > 100 && !p.match(/^[\d\s\*\-#]/))
      .sort((a, b) => b.length - a.length)

    description = paragraphs[0] || cleanTextContent(content)
  }

  // Extract first 1-2 sentences only
  const sentences = description.split(/[.!?]+/)
  let shortDesc = sentences.slice(0, 2).join('. ').trim()

  // Ensure it ends with a period
  if (shortDesc && !shortDesc.endsWith('.')) {
    shortDesc += '.'
  }

  // Limit to 200 characters max for mobile readability
  if (shortDesc.length > 200) {
    shortDesc = shortDesc.substring(0, 197) + '...'
  }

  return shortDesc || 'Premium quality product designed for modern needs.'
}

// ✅ NEW: Extract Key Benefits (Main selling points)
function extractFallbackBenefits(content: string): string[] {
  const benefits: string[] = []

  // Look for bold titles with descriptions
  const boldMatches = content.match(
    /\*\*([^*]{5,30})\*\*[:\s]*([^.\n]{20,100})/g
  )
  if (boldMatches) {
    boldMatches.forEach((match) => {
      const parts = match.match(/\*\*([^*]{5,30})\*\*[:\s]*([^.\n]{20,100})/)
      if (parts) {
        const title = cleanTextContent(parts[1])
        const desc = cleanTextContent(parts[2])
        if (title && desc && desc.length > 10) {
          benefits.push(`${title}: ${desc}`)
        }
      }
    })
  }

  // Fallback to generic benefits if none found
  if (benefits.length === 0) {
    const content_lower = content.toLowerCase()
    if (
      content_lower.includes('premium') ||
      content_lower.includes('quality')
    ) {
      benefits.push(
        'Premium Quality: Built with superior materials and craftsmanship'
      )
    }
    if (
      content_lower.includes('comfort') ||
      content_lower.includes('ergonomic')
    ) {
      benefits.push('Enhanced Comfort: Designed for optimal user experience')
    }
    if (
      content_lower.includes('durable') ||
      content_lower.includes('lasting')
    ) {
      benefits.push('Long-lasting Durability: Made to withstand daily use')
    }
  }

  return benefits.slice(0, 4) // Limit to 4 key benefits
}

// ✅ NEW: Extract Clean Bullet Points
function extractCleanBulletPoints(content: string): string[] {
  const bullets: string[] = []

  // Pattern 1: Standard bullets with bold titles
  const bulletMatches = content.match(
    /^[\s]*[-•*]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/gm
  )
  if (bulletMatches) {
    bulletMatches.forEach((match) => {
      const parts = match.match(/^[\s]*[-•*]\s*\*\*([^*]+)\*\*:\s*([^\n]+)/)
      if (parts) {
        const title = cleanTextContent(parts[1])
        const desc = cleanTextContent(parts[2])
        bullets.push(`${title}: ${desc}`)
      }
    })
  }

  // Pattern 2: Simple bullet points
  if (bullets.length === 0) {
    const simpleBullets = content.match(/^[\s]*[-•*]\s*([^\n]{10,100})/gm)
    if (simpleBullets) {
      simpleBullets.forEach((bullet) => {
        const clean = cleanTextContent(bullet.replace(/^[\s]*[-•*]\s*/, ''))
        if (clean.length > 10) {
          bullets.push(clean)
        }
      })
    }
  }

  return bullets.slice(0, 6) // Limit to 6 bullets
}

// ✅ NEW: Extract Product Specifications
function extractProductSpecs(content: string): string[] {
  const specs: string[] = []

  // Look for specification patterns
  const specPatterns = [
    /(?:material|size|weight|color|brand|model|type)[:\s]+([^\n,]{3,30})/gi,
    /([A-Z][a-z]+):\s*([^\n,]{3,30})/g,
  ]

  specPatterns.forEach((pattern) => {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[2]) {
        const key = match[1].trim()
        const value = cleanTextContent(match[2])
        if (value.length > 2 && value.length < 50) {
          specs.push(`${key}: ${value}`)
        }
      } else if (match[1] && match[1].length > 5) {
        specs.push(cleanTextContent(match[1]))
      }
    }
  })

  return [...new Set(specs)].slice(0, 5) // Remove duplicates, limit to 5
}

// ✅ PROFESSIONAL: Shopify Description Formatter - Following Best Practices
function formatProfessionalShopifyDescription(sections: any): string {
  console.log('🎨 Professional Shopify formatting started...')

  let html = ''

  // ✅ 1. BRIEF INTRODUCTION (Mobile-friendly)
  if (sections.shortDescription) {
    html += `<p>${sections.shortDescription}</p>\n\n`
  }

  // ✅ 2. KEY BENEFITS (What makes this product special)
  if (sections.keyBenefits && sections.keyBenefits.length > 0) {
    html += `<h3>✨ Why Choose This Product</h3>\n<ul>\n`

    sections.keyBenefits.slice(0, 4).forEach((benefit: string) => {
      const cleanBenefit = cleanTextContent(benefit)
      html += `<li><strong>${cleanBenefit}</strong></li>\n`
    })

    html += `</ul>\n\n`
  }

  // ✅ 3. DETAILED FEATURES (Bulleted list)
  if (sections.bulletPoints && sections.bulletPoints.length > 0) {
    html += `<h3>🔥 Product Features</h3>\n<ul>\n`

    sections.bulletPoints.slice(0, 6).forEach((point: string) => {
      const cleanPoint = cleanTextContent(point)
      if (cleanPoint.length > 5) {
        html += `<li>${cleanPoint}</li>\n`
      }
    })

    html += `</ul>\n\n`
  }

  // ✅ 4. SPECIFICATIONS (If available)
  if (sections.specifications && sections.specifications.length > 0) {
    html += `<h3>📋 Specifications</h3>\n<ul>\n`

    sections.specifications.slice(0, 5).forEach((spec: string) => {
      const cleanSpec = cleanTextContent(spec)
      html += `<li>${cleanSpec}</li>\n`
    })

    html += `</ul>\n\n`
  }

  // ✅ 5. TRUST SIGNALS (Professional closing)
  html += `<h3>🛡️ Our Promise</h3>\n`
  html += `<p>We stand behind the quality of our products. Each item is carefully selected and tested to meet our high standards. Your satisfaction is our priority.</p>\n\n`

  // ✅ 6. CALL TO ACTION
  html += `<p><strong>Ready to experience the difference? Add to cart now and enjoy fast, reliable shipping!</strong></p>`

  console.log('✅ Professional Shopify description formatted:', {
    totalLength: html.length,
    sections: ['Introduction', 'Benefits', 'Features', 'Specs', 'Trust', 'CTA'],
  })

  return html
}

// ✅ CREATE PROFESSIONAL SHOPIFY PRODUCT
function createProfessionalShopifyProduct(
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
      body_html: formatProfessionalShopifyDescription(contentSections),
      vendor:
        extractBrand(
          contentSections.shortDescription + ' ' + contentSections.title
        ) ||
        connection.platform_store_info.shop_name ||
        'Premium Brand',
      product_type: detectProductType(
        contentSections.shortDescription + ' ' + contentSections.title
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
          weight: estimateWeight(contentSections.shortDescription),
          weight_unit: 'lb',
        },
      ],
      images: prepareShopifyImages(images, contentSections.title),
      tags: generateEnhancedTags(contentSections),
      seo: {
        title: `${contentSections.title} | ${connection.platform_store_info.shop_name}`,
        description:
          contentSections.shortDescription
            .substring(0, 160)
            .replace(/<[^>]*>/g, '') + '...',
      },
    },
  }
}

// ✅ HELPER FUNCTIONS (Enhanced)

function cleanTitle(title: string): string {
  return title
    .replace(/\*\*/g, '') // Remove bold
    .replace(/\*/g, '') // Remove italic
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/^\s*[-•]\s*/, '') // Remove bullets
    .replace(/[^\w\s-,&()'/]/g, ' ') // Remove special chars except common ones
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim()
}

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

function generateEnhancedTags(sections: any): string {
  const tags = new Set<string>()

  // Extract from features and benefits
  sections.features?.forEach((feature: string) => tags.add(feature))
  sections.keyBenefits?.forEach((benefit: string) => {
    const words = benefit.split(':')[0].split(' ')
    words.forEach((word) => {
      if (word.length > 3) tags.add(word)
    })
  })

  // Extract from content
  const content = (
    sections.shortDescription +
    ' ' +
    sections.title
  ).toLowerCase()
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
