import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productContent,
      images,
      platforms,
      userId,
      publishType = 'post',
    } = body

    if (!userId || !productContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const cookieStore = cookies()
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

    const results = []

    // Check if commerce catalog exists (for shopping posts)
    let catalogId = null
    if (publishType === 'shopping' && connection.commerce_account_id) {
      catalogId = await getOrCreateCatalog(
        connection.commerce_account_id,
        connection.facebook_page_access_token
      )
    }

    // Publish to Facebook
    if (platforms.includes('facebook') && connection.facebook_page_id) {
      const fbResult = await publishToFacebook({
        pageId: connection.facebook_page_id,
        accessToken: connection.facebook_page_access_token,
        productContent,
        imageUrl: images[0],
        publishType,
        catalogId,
      })
      results.push({ platform: 'facebook', ...fbResult })
    }

    // Publish to Instagram
    if (platforms.includes('instagram') && connection.instagram_account_id) {
      const igResult = await publishToInstagram({
        accountId: connection.instagram_account_id,
        accessToken: connection.facebook_page_access_token,
        productContent,
        imageUrl: images[0],
        publishType,
      })
      results.push({ platform: 'instagram', ...igResult })
    }

    // Save to published_products table with enhanced data
    await supabase.from('published_products').insert({
      user_id: userId,
      content_id: productContent.id,
      platform: 'meta',
      platform_product_id: results.map((r) => r.id).join(','),
      platform_url: results[0]?.permalink || null,
      title: productContent.product_name,
      description: productContent.generated_content,
      price: productContent.price || 0,
      quantity: productContent.quantity || 0,
      sku: productContent.sku || `META-${Date.now()}`,
      images: images,
      platform_data: {
        results,
        publishType,
        catalogId,
      },
      status: 'published',
      published_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })

    // Save to meta_published_posts
    await supabase.from('meta_published_posts').insert({
      user_id: userId,
      content_id: productContent.id,
      platform: platforms.join(','),
      facebook_post_id: results.find((r) => r.platform === 'facebook')?.id,
      instagram_post_id: results.find((r) => r.platform === 'instagram')?.id,
      caption: generateEnhancedCaption(productContent),
      image_urls: images,
      published_at: new Date().toISOString(),
      post_type: publishType,
      product_data: {
        price: productContent.price,
        quantity: productContent.quantity,
        sku: productContent.sku,
      },
    })

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully posted to ${platforms.join(' and ')}!`,
      publishType,
    })
  } catch (error) {
    console.error('Meta publish error:', error)
    return NextResponse.json(
      { error: 'Failed to publish to Meta platforms' },
      { status: 500 }
    )
  }
}

interface PublishOptions {
  pageId?: string
  accountId?: string
  accessToken: string
  productContent: any
  imageUrl: string
  publishType: 'post' | 'shopping' | 'story'
  catalogId?: string
}

async function publishToFacebook(options: PublishOptions) {
  const {
    pageId,
    accessToken,
    productContent,
    imageUrl,
    publishType,
    catalogId,
  } = options

  if (publishType === 'shopping' && catalogId) {
    // Create product in catalog first
    const product = await createCatalogProduct({
      catalogId,
      accessToken,
      productContent,
      imageUrl,
    })

    // Then create a shopping post
    return createFacebookShoppingPost({
      pageId: pageId!,
      accessToken,
      productId: product.id,
      productContent,
    })
  }

  // Enhanced regular post with rich formatting
  const caption = generateEnhancedCaption(productContent)

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: caption,
        url: imageUrl,
        access_token: accessToken,
        // Add call-to-action button if price exists
        ...(productContent.price && {
          call_to_action: {
            type: 'SHOP_NOW',
            value: {
              link:
                productContent.product_url ||
                `https://listora.ai/products/${productContent.id}`,
            },
          },
        }),
      }),
    }
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  // Get the post permalink
  const postResponse = await fetch(
    `https://graph.facebook.com/v18.0/${data.id}?fields=permalink_url,full_picture&access_token=${accessToken}`
  )
  const postData = await postResponse.json()

  return {
    id: data.id,
    post_id: data.post_id,
    permalink: postData.permalink_url,
    image: postData.full_picture,
  }
}

async function publishToInstagram(options: PublishOptions) {
  const { accountId, accessToken, productContent, imageUrl, publishType } =
    options

  const caption = generateInstagramCaption(productContent)

  if (publishType === 'shopping') {
    // Instagram Shopping Tags (requires approved Instagram Shopping)
    return createInstagramShoppingPost({
      accountId: accountId!,
      accessToken,
      productContent,
      imageUrl,
      caption,
    })
  }

  // Regular Instagram post with enhanced caption
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
        // Add product tags if available
        ...(productContent.instagram_product_tags && {
          product_tags: productContent.instagram_product_tags,
        }),
      }),
    }
  )

  const containerData = await containerResponse.json()

  if (containerData.error) {
    throw new Error(containerData.error.message)
  }

  // Publish the container
  const publishResponse = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: accessToken,
      }),
    }
  )

  const publishData = await publishResponse.json()

  if (publishData.error) {
    throw new Error(publishData.error.message)
  }

  // Get post details
  const postDetailsResponse = await fetch(
    `https://graph.facebook.com/v18.0/${publishData.id}?fields=permalink,media_url&access_token=${accessToken}`
  )
  const postDetails = await postDetailsResponse.json()

  return {
    id: publishData.id,
    permalink: postDetails.permalink,
    media_url: postDetails.media_url,
  }
}

function generateEnhancedCaption(productContent: any): string {
  const { product_name, generated_content, price, features, platform } =
    productContent

  // Extract all sections from generated content
  const titleMatch = generated_content.match(/PRODUCT TITLE[^\n]*:\s*([^\n]+)/i)
  const sellingPointsMatch = generated_content.match(
    /KEY SELLING POINTS:([\s\S]*?)(?=\*\*\d+\.|$)/i
  )
  const descriptionMatch = generated_content.match(
    /DETAILED PRODUCT DESCRIPTION:([\s\S]*?)(?=\*\*\d+\.|$)/i
  )
  const blogIntroMatch = generated_content.match(
    /BLOG INTRO:([\s\S]*?)(?=\*\*\d+\.|$)/i
  )
  const ctaMatch = generated_content.match(
    /CALL-TO-ACTION:[\s\S]*?Facebook:\s*([^\n]+)/i
  )

  const fullTitle = titleMatch?.[1]?.trim() || product_name
  const sellingPoints = extractBulletPoints(sellingPointsMatch?.[1] || features)
  const description = descriptionMatch?.[1]?.trim() || ''
  const blogIntro = blogIntroMatch?.[1]?.trim() || ''
  const facebookCta = ctaMatch?.[1]?.trim() || 'Shop Now!'

  // Build rich Facebook caption
  let caption = `🌟 ${fullTitle.toUpperCase()} 🌟\n\n`

  // Add price prominently if available
  if (price && price > 0) {
    caption += `💰 Special Price: $${price} 💰\n\n`
  }

  // Add compelling intro (first paragraph of blog intro or description)
  const introText = blogIntro.split('\n')[0] || description.split('.')[0]
  if (introText) {
    caption += `${introText.trim()}.\n\n`
  }

  // Add key benefits with emojis
  if (sellingPoints.length > 0) {
    caption += `✨ WHY YOU'LL LOVE IT:\n\n`
    const benefitEmojis = ['✅', '⭐', '💪', '🎯', '🔥', '👟', '🏆']
    sellingPoints.slice(0, 7).forEach((point, index) => {
      const emoji = benefitEmojis[index] || '•'
      caption += `${emoji} ${point}\n`
    })
    caption += '\n'
  }

  // Add a snippet from the detailed description for credibility
  if (description) {
    const descSnippet = description.split('.').slice(1, 3).join('.').trim()
    if (descSnippet) {
      caption += `📝 ${descSnippet}.\n\n`
    }
  }

  // Add social proof elements
  caption += `🌟 Join thousands of satisfied customers\n`
  caption += `🚚 Free shipping on orders over $50\n`
  caption += `✔️ 30-day money-back guarantee\n\n`

  // Add the specific Facebook CTA
  caption += `${facebookCta}\n\n`

  // Add engagement prompts
  caption += `💬 Comment your favorite feature below!\n`
  caption += `📤 Share with someone who needs this!\n`
  caption += `👍 Like if you're ready to upgrade your gear!\n\n`

  // Add relevant hashtags (fewer than Instagram)
  const hashtags = generateHashtags(productContent).slice(0, 15)
  caption += hashtags.join(' ')

  return caption
}

function generateInstagramCaption(productContent: any): string {
  const { generated_content, product_name, price } = productContent

  // Extract the full product title
  const titleMatch = generated_content.match(/PRODUCT TITLE[^\n]*:\s*([^\n]+)/i)
  const fullTitle = titleMatch?.[1]?.trim() || product_name

  // Try to extract Instagram-specific caption
  const instagramMatch = generated_content.match(
    /INSTAGRAM CAPTION:([\s\S]*?)(?=\*\*\d+\.|$)/i
  )

  if (instagramMatch) {
    let caption = instagramMatch[1].trim()

    // Add full title at the beginning if not already included
    if (!caption.toLowerCase().includes(product_name.toLowerCase())) {
      caption = `🌟 ${fullTitle.toUpperCase()} 🌟\n\n${caption}`
    }

    // Add price prominently if not already included
    if (price && price > 0 && !caption.includes('$')) {
      // Insert price after title
      const lines = caption.split('\n')
      lines.splice(2, 0, `💰 Special Price: $${price} 💰\n`)
      caption = lines.join('\n')
    }

    return caption
  }

  // Fallback Instagram caption
  return generateFallbackInstagramCaption(productContent)
}

function generateFallbackInstagramCaption(productContent: any): string {
  const { product_name, features, price } = productContent

  let caption = `✨ NEW ARRIVAL: ${product_name} ✨\n\n`

  if (price && price > 0) {
    caption += `💸 Just $${price}!\n\n`
  }

  const benefits = features?.split(/[,\n]/).filter(Boolean).slice(0, 3) || []
  if (benefits.length > 0) {
    benefits.forEach((benefit: string) => {
      caption += `👉 ${benefit.trim()}\n`
    })
    caption += '\n'
  }

  caption += `📸 Swipe for more details\n`
  caption += `🛍️ Link in bio to shop\n`
  caption += `💬 DM for questions\n\n`

  const hashtags = generateHashtags(productContent)
  caption += hashtags.join(' ')

  return caption
}

function extractBulletPoints(text: string): string[] {
  if (!text) return []

  const lines = text.split('\n').filter((line) => line.trim())
  const points = lines
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 100)

  return points
}

function generateHashtags(productContent: any): string[] {
  const { product_name, features, platform } = productContent
  const hashtags = new Set<string>()

  // Add product-specific hashtags
  const productWords = product_name.toLowerCase().split(/\s+/)
  productWords.forEach((word: string) => {
    if (word.length > 3) {
      hashtags.add(`#${word}`)
    }
  })

  // Add feature-based hashtags
  const keywords = extractKeywords(features)
  keywords.forEach((keyword) => {
    hashtags.add(`#${keyword.toLowerCase().replace(/\s+/g, '')}`)
  })

  // Add general e-commerce hashtags
  const generalHashtags = [
    '#shopping',
    '#onlineshopping',
    '#newproduct',
    '#musthave',
    '#productlaunch',
    '#shopnow',
    '#instashopping',
    '#shoponline',
  ]

  generalHashtags.forEach((tag) => hashtags.add(tag))

  return Array.from(hashtags).slice(0, 30) // Instagram allows max 30 hashtags
}

function extractKeywords(text: string): string[] {
  if (!text) return []

  // Simple keyword extraction - you can enhance this
  const commonWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
  ])
  const words = text.toLowerCase().match(/\b\w+\b/g) || []

  return words
    .filter((word) => word.length > 4 && !commonWords.has(word))
    .slice(0, 5)
}

// Helper functions for Facebook Commerce
async function getOrCreateCatalog(
  commerceAccountId: string,
  accessToken: string
) {
  // Check existing catalogs
  const catalogsResponse = await fetch(
    `https://graph.facebook.com/v18.0/${commerceAccountId}/product_catalogs?access_token=${accessToken}`
  )
  const catalogs = await catalogsResponse.json()

  if (catalogs.data && catalogs.data.length > 0) {
    return catalogs.data[0].id
  }

  // Create new catalog
  const createResponse = await fetch(
    `https://graph.facebook.com/v18.0/${commerceAccountId}/product_catalogs`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Listora AI Products',
        access_token: accessToken,
      }),
    }
  )

  const newCatalog = await createResponse.json()
  return newCatalog.id
}

async function createCatalogProduct(options: {
  catalogId: string
  accessToken: string
  productContent: any
  imageUrl: string
}) {
  const { catalogId, accessToken, productContent, imageUrl } = options

  const productData = {
    retailer_id: productContent.sku || `SKU-${Date.now()}`,
    name: productContent.product_name,
    description:
      productContent.features ||
      productContent.generated_content.substring(0, 500),
    availability: 'in stock',
    condition: 'new',
    price: productContent.price * 100, // Price in cents
    currency: 'USD',
    image_url: imageUrl,
    brand: productContent.brand || 'Generic',
    url:
      productContent.product_url ||
      `https://listora.ai/products/${productContent.id}`,
    access_token: accessToken,
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${catalogId}/products`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    }
  )

  return response.json()
}

async function createFacebookShoppingPost(options: {
  pageId: string
  accessToken: string
  productId: string
  productContent: any
}) {
  const { pageId, accessToken, productId, productContent } = options

  const postData = {
    message: generateEnhancedCaption(productContent),
    product_id: productId,
    access_token: accessToken,
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/posts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData),
    }
  )

  return response.json()
}

async function createInstagramShoppingPost(options: {
  accountId: string
  accessToken: string
  productContent: any
  imageUrl: string
  caption: string
}) {
  const { accountId, accessToken, productContent, imageUrl, caption } = options

  // For Instagram Shopping, you need approved Instagram Shopping
  // This is a simplified version - full implementation requires catalog integration
  const containerData = {
    image_url: imageUrl,
    caption,
    product_tags: [
      {
        product_id: productContent.instagram_product_id,
        x: 0.5, // Tag position
        y: 0.5,
      },
    ],
    access_token: accessToken,
  }

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerData),
    }
  )

  return response.json()
}
