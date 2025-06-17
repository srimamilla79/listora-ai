// src/app/api/shopify/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Helper function to prepare images for Shopify
// Helper function to prepare images for Shopify
async function prepareShopifyImages(imageUrls: string[], productName: string) {
  if (!imageUrls || imageUrls.length === 0) {
    return []
  }

  const shopifyImages = []

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]

    // Check if it's a valid URL (not base64)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      shopifyImages.push({
        src: imageUrl,
        alt: `${productName} - Image ${i + 1}`,
        position: i + 1,
      })
    } else if (imageUrl.startsWith('data:image/')) {
      // Skip base64 images for now
    } else {
      // Skip invalid image formats
    }
  }

  return shopifyImages
}

export async function POST(request: NextRequest) {
  try {
    const { productContent, images, publishingOptions, userId } =
      await request.json()

    const supabase = createClient()

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

    // Parse the generated content to extract relevant sections
    const contentSections = parseGeneratedContent(productContent.content)

    // Prepare Shopify product data
    // Prepare Shopify product data
    const shopifyProduct = {
      product: {
        title: contentSections.title || productContent.product_name,
        body_html: formatProductDescription(contentSections),
        vendor: connection.platform_store_info.shop_name || 'Listora AI',
        product_type: 'General',
        status: 'draft', // Start as draft for safety
        variants: [
          {
            price: publishingOptions.price.toString(),
            inventory_quantity: publishingOptions.quantity,
            sku: publishingOptions.sku,
            requires_shipping: true,
            taxable: true,
            inventory_management: 'shopify',
          },
        ],
        images: await prepareShopifyImages(images, productContent.product_name),
        tags: extractTags(productContent.features),
        seo: {
          title: productContent.product_name,
          description:
            contentSections.shortDescription || productContent.product_name,
        },
      },
    }

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

    // Save to unified published_products table
    const { data: savedProduct, error: saveError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: productContent.id,
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
      productId: createdProduct.id,
      handle: createdProduct.handle,
      adminUrl: `https://${shopDomain}/admin/products/${createdProduct.id}`,
      publicUrl: `https://${shopDomain}/products/${createdProduct.handle}`,
      status: createdProduct.status,
      message: `Product created successfully in Shopify! Status: ${createdProduct.status}`,
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

// Helper function to parse AI-generated content
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
    // Split content into sections based on common AI patterns
    const lines = content.split('\n').filter((line) => line.trim())

    let currentSection = ''
    let description = []
    let foundTitleSection = false

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim()

      // Enhanced title extraction - FIXED LOGIC
      if (
        trimmed.match(
          /^\*?\*?(?:1\.\s*)?PRODUCT TITLE|HEADLINE|ENHANCED PRODUCT TITLE/i
        )
      ) {
        currentSection = 'title'
        foundTitleSection = true

        // Look for the title in the next few lines
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j].trim()
          if (
            nextLine &&
            !nextLine.match(/^\*?\*?[A-Z\s]+:?\*?\*?$/) &&
            nextLine.length > 10
          ) {
            sections.title = nextLine.replace(/^[\-–—]\s*/, '').trim()

            break
          }
        }
        continue
      }

      // Only check for other sections if we're not in title extraction mode
      if (!foundTitleSection || i > 5) {
        // Reset after checking first few lines
        if (trimmed.match(/^\*?\*?(?:2\.\s*)?KEY SELLING|BULLET|FEATURES/i)) {
          currentSection = 'bullets'
        } else if (
          trimmed.match(/^\*?\*?(?:3\.\s*)?PRODUCT DESCRIPTION|DETAILED/i)
        ) {
          currentSection = 'description'
        } else if (trimmed.match(/^\*?\*?(?:4\.\s*)?INSTAGRAM/i)) {
          currentSection = 'instagram'
        } else if (trimmed.match(/^\*?\*?(?:5\.\s*)?BLOG/i)) {
          currentSection = 'blog'
        }
      }

      // Process content based on current section
      if (
        trimmed.startsWith('•') ||
        trimmed.startsWith('-') ||
        trimmed.match(/^[\-\*]\s/)
      ) {
        // Bullet point

        sections.bulletPoints.push(trimmed.replace(/^[•\-\*]\s*/, ''))
      } else if (
        currentSection === 'description' &&
        trimmed.length > 10 &&
        !trimmed.match(/^\*?\*?[A-Z\s]+:?\*?\*?$/)
      ) {
        description.push(trimmed)
      } else if (currentSection === 'instagram' && trimmed.length > 10) {
        sections.instagramCaption += trimmed + ' '
      } else if (currentSection === 'blog' && trimmed.length > 10) {
        sections.blogIntro += trimmed + ' '
      }
    }

    sections.fullDescription = description.join('\n\n')
    sections.shortDescription = description[0] || ''
  } catch (error) {
    console.error(' Error parsing content:', error)
    sections.fullDescription = content
  }

  return sections
}

// Helper function to format description for Shopify
function formatProductDescription(sections: {
  shortDescription: string
  bulletPoints: string[]
  fullDescription: string
}): string {
  let html = ''

  if (sections.shortDescription) {
    html += `<p><strong>${sections.shortDescription}</strong></p>\n\n`
  }

  if (sections.bulletPoints && sections.bulletPoints.length > 0) {
    html += '<h3>Key Features:</h3>\n<ul>\n'
    sections.bulletPoints.forEach((point: string) => {
      html += `<li>${point}</li>\n`
    })
    html += '</ul>\n\n'
  }

  if (sections.fullDescription) {
    html += '<h3>Product Description:</h3>\n'
    html += sections.fullDescription
      .replace(/\n\n/g, '</p>\n<p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
  }

  return html
}

// Helper function to extract tags from features
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
