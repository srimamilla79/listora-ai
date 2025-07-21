// src/app/api/shopify/publish/route.ts - COMPLETE OPTIMIZED VERSION
// Industry-standard formatting based on top ecommerce brands research
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
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

    // ✅ OPTIMIZED: Parse the generated content to extract relevant sections
    const contentSections = parseGeneratedContent(
      mergedProductContent.generated_content
    )

    // ✅ OPTIMIZED: Create industry-standard Shopify product data
    const shopifyProduct = createOptimizedShopifyProduct(
      contentSections,
      mergedProductContent,
      publishingOptions,
      images,
      connection
    )

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

    // ✅ DEBUG: Log the product creation response
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
      // Don't fail the request, just log the error
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
      listingId: createdProduct?.id?.toString() || 'Unknown', // ✅ ADD: Alternative ID field
      id: createdProduct?.id?.toString() || 'Unknown', // ✅ ADD: Generic ID field
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

// ✅ OPTIMIZED: Industry-standard content parsing (removes markdown artifacts)
function parseGeneratedContent(content: string) {
  const sections = {
    title: '',
    shortDescription: '',
    fullDescription: '',
    bulletPoints: [] as string[],
    instagramCaption: '',
    blogIntro: '',
  }

  try {
    const lines = content.split('\n').filter((line) => line.trim())

    let currentSection = ''
    let description: string[] = []
    let bulletPoints: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()

      // ✅ ENHANCED: Better title extraction (removes markdown)
      if (trimmed.match(/^#{1,3}\s*1\.\s*PRODUCT TITLE/i)) {
        currentSection = 'title'
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (
            nextLine &&
            nextLine.startsWith('**') &&
            nextLine.endsWith('**')
          ) {
            // ✅ CLEAN title extraction
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

      // ✅ SKIP social media sections (Instagram/Blog) for professional listing
      if (trimmed.match(/^#{1,3}\s*[4-6]\./i)) {
        currentSection = 'skip'
        continue
      }

      // Process content based on current section
      if (currentSection === 'bullets') {
        if (trimmed.startsWith('-') && trimmed.includes('**')) {
          const bulletMatch = trimmed.match(/^-\s*\*\*(.*?)\*\*:\s*(.*)/)
          if (bulletMatch) {
            // ✅ CLEAN bullet points (no bold markdown)
            bulletPoints.push(`${bulletMatch[1]}: ${bulletMatch[2]}`)
          }
        }
      } else if (currentSection === 'description') {
        if (
          trimmed.length > 10 &&
          !trimmed.match(/^#{1,3}/) &&
          !trimmed.match(/^\*?\*?[A-Z\s]+:?\*?\*?$/) &&
          !trimmed.includes('**') // ✅ SKIP lines with markdown
        ) {
          description.push(trimmed)
        }
      }
    }

    sections.bulletPoints = bulletPoints
    sections.fullDescription = description.join('\n\n')
    sections.shortDescription = description[0] || ''
  } catch (error) {
    console.error('❌ Error parsing content:', error)
    // ✅ CLEAN fallback
    const cleanContent = content.replace(/\*\*/g, '').replace(/#{1,6}\s*/g, '')
    const paragraphs = cleanContent
      .split('\n\n')
      .filter((p) => p.trim().length > 50)
    sections.fullDescription = paragraphs[0] || cleanContent.substring(0, 300)
  }

  return sections
}

// ✅ HYBRID: Clean original format (removes artifacts but keeps original structure)
function formatProductDescription(sections: {
  shortDescription: string
  bulletPoints: string[]
  fullDescription: string
}): string {
  let html = ''

  // ✅ Keep original opening but clean formatting
  if (sections.shortDescription) {
    html += `<p style="font-weight: bold; margin-bottom: 20px;">${sections.shortDescription}</p>`
  }

  // ✅ Keep original emoji style but clean bullet points
  if (sections.bulletPoints && sections.bulletPoints.length > 0) {
    html += `<h3>✨ Key Features</h3><ul style="list-style-type: none; padding-left: 0;">`
    sections.bulletPoints.forEach((point: string) => {
      html += `<li style="margin: 8px 0;"><strong>✓</strong> ${point}</li>`
    })
    html += `</ul>`
  }

  // ✅ Keep original detailed description
  if (sections.fullDescription) {
    html += `<h3>📋 Product Details</h3>`
    const paragraphs = sections.fullDescription.split('\n\n')
    paragraphs.forEach((paragraph) => {
      if (paragraph.trim()) {
        html += `<p style="margin: 15px 0;">${paragraph.trim()}</p>`
      }
    })
  }

  return html
}

// ✅ OPTIMIZED: Better Shopify product data structure
function createOptimizedShopifyProduct(
  contentSections: any,
  mergedProductContent: any,
  publishingOptions: any,
  images: string[],
  connection: any
) {
  return {
    product: {
      // ✅ Clean title without markdown
      title: contentSections.title || mergedProductContent.product_name,

      // ✅ OPTIMIZED description with industry-standard formatting
      body_html: formatProductDescription(contentSections),

      // ✅ Better vendor and product type
      vendor:
        extractBrand(mergedProductContent.generated_content) ||
        connection.platform_store_info.shop_name ||
        'Listora AI',
      product_type: detectProductType(mergedProductContent.generated_content),

      // ✅ Start as published (if user wants immediate visibility)
      status: 'draft', // Changed from 'draft' to 'active'

      // ✅ Enhanced variant with better attributes
      variants: [
        {
          price: publishingOptions.price.toString(),
          inventory_quantity: publishingOptions.quantity,
          sku: publishingOptions.sku,
          requires_shipping: true,
          taxable: true,
          inventory_management: 'shopify',
          fulfillment_service: 'manual',
          inventory_policy: 'deny', // Don't oversell
          weight: estimateWeight(mergedProductContent.generated_content),
          weight_unit: 'lb',
        },
      ],

      // ✅ Enhanced images with better alt text
      images: prepareEnhancedShopifyImages(
        images,
        mergedProductContent.product_name,
        contentSections.bulletPoints
      ),

      // ✅ Better tags for SEO
      tags: generateEnhancedTags(mergedProductContent),

      // ✅ Enhanced SEO
      seo: {
        title: `${contentSections.title || mergedProductContent.product_name} | ${connection.platform_store_info.shop_name}`,
        description:
          contentSections.shortDescription ||
          generateMetaDescription(mergedProductContent.generated_content),
      },

      // ✅ Add product options if applicable
      //options: generateProductOptions(mergedProductContent.generated_content),
    },
  }
}

// ✅ HELPER FUNCTIONS for enhanced Shopify optimization

function extractBrand(content: string): string {
  const brands = [
    'Adidas',
    'Nike',
    'Apple',
    'Samsung',
    'Sony',
    'Bose',
    'Calvin Klein',
    'Tommy Hilfiger',
  ]
  const contentLower = content.toLowerCase()

  for (const brand of brands) {
    if (contentLower.includes(brand.toLowerCase())) {
      return brand
    }
  }
  return ''
}

function detectProductType(content: string): string {
  const contentLower = content.toLowerCase()

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

  // Estimate based on product type
  if (contentLower.includes('shoes') || contentLower.includes('sneakers'))
    return 2.0
  if (contentLower.includes('shirt') || contentLower.includes('clothing'))
    return 0.5
  if (contentLower.includes('headphones')) return 0.8
  if (contentLower.includes('phone')) return 0.4
  if (contentLower.includes('laptop')) return 4.0

  return 1.0 // Default weight
}

function generateEnhancedTags(productContent: any): string {
  const tags = new Set<string>()

  // Extract from content
  const content = (productContent.generated_content || '').toLowerCase()
  const features = (productContent.features || '').toLowerCase()
  const productName = productContent.product_name.toLowerCase()

  // Add brand tags
  const brand = extractBrand(productContent.generated_content)
  if (brand) tags.add(brand)

  // Add category tags
  const productType = detectProductType(productContent.generated_content)
  tags.add(productType)

  // Add feature-based tags
  if (content.includes('wireless')) tags.add('Wireless')
  if (content.includes('bluetooth')) tags.add('Bluetooth')
  if (content.includes('waterproof')) tags.add('Waterproof')
  if (content.includes('lightweight')) tags.add('Lightweight')
  if (content.includes('premium')) tags.add('Premium')
  if (content.includes('eco-friendly')) tags.add('Eco-Friendly')

  // Add size/color tags if mentioned
  if (content.includes('black')) tags.add('Black')
  if (content.includes('white')) tags.add('White')
  if (content.includes('large')) tags.add('Large')
  if (content.includes('small')) tags.add('Small')

  return Array.from(tags).slice(0, 10).join(', ') // Limit to 10 tags
}

function generateMetaDescription(content: string): string {
  // Extract first meaningful sentence for meta description
  const sentences = content.split('.').filter((s) => s.trim().length > 50)
  let metaDesc = sentences[0]?.trim() || ''

  // Clean up markdown and formatting
  metaDesc = metaDesc
    .replace(/#{1,6}/g, '')
    .replace(/\*\*/g, '')
    .trim()

  // Ensure it's not too long (160 chars max for SEO)
  if (metaDesc.length > 160) {
    metaDesc = metaDesc.substring(0, 157) + '...'
  }

  return metaDesc
}

function generateProductOptions(content: string): any[] {
  const options = []
  const contentLower = content.toLowerCase()

  // Add size option for applicable products
  if (
    contentLower.includes('size') ||
    contentLower.includes('shoes') ||
    contentLower.includes('clothing')
  ) {
    options.push({
      name: 'Size',
      values: ['S', 'M', 'L', 'XL'], // Default sizes
    })
  }

  // Add color option if multiple colors mentioned
  const colors = ['Black', 'White', 'Red', 'Blue', 'Green']
  const mentionedColors = colors.filter((color) =>
    contentLower.includes(color.toLowerCase())
  )

  if (mentionedColors.length > 1) {
    options.push({
      name: 'Color',
      values: mentionedColors,
    })
  }

  return options
}

function prepareEnhancedShopifyImages(
  imageUrls: string[],
  productName: string,
  bulletPoints: string[]
): any[] {
  if (!imageUrls || imageUrls.length === 0) return []

  return imageUrls
    .map((imageUrl, index) => {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Create descriptive alt text
        let altText = `${productName} - Image ${index + 1}`

        // Add feature-based alt text for better SEO
        if (index === 0) altText = `${productName} - Main Product Image`
        else if (index === 1 && bulletPoints.length > 0) {
          const firstFeature = bulletPoints[0]?.split(':')[0] || ''
          if (firstFeature) altText = `${productName} - ${firstFeature}`
        }

        return {
          src: imageUrl,
          alt: altText,
          position: index + 1,
        }
      }
      return null
    })
    .filter(Boolean)
}

// Helper function to extract tags from features (legacy function)
function extractTags(features: string): string {
  try {
    // Extract key words from features for tags
    const words = features
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && word.length < 15)
      .slice(0, 10)

    return words.join(', ')
  } catch (error) {
    return ''
  }
}

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
