import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productContent, images, platforms, userId } = body

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

    // Generate caption from content
    const caption = generateMetaCaption(productContent)
    const results = []

    // Publish to Facebook if selected
    if (platforms.includes('facebook') && connection.facebook_page_id) {
      const fbResult = await publishToFacebook(
        connection.facebook_page_id,
        connection.facebook_page_access_token,
        caption,
        images[0] // Use first image
      )
      results.push({ platform: 'facebook', ...fbResult })
    }

    // Publish to Instagram if selected
    if (platforms.includes('instagram') && connection.instagram_account_id) {
      const igResult = await publishToInstagram(
        connection.instagram_account_id,
        connection.facebook_page_access_token,
        caption,
        images[0] // Use first image
      )
      results.push({ platform: 'instagram', ...igResult })
    }

    // Save to published_products table
    await supabase.from('published_products').insert({
      user_id: userId,
      content_id: productContent.id,
      platform: 'meta',
      platform_product_id: results.map((r) => r.id).join(','),
      platform_url: results[0]?.permalink || null,
      title: productContent.product_name,
      description: caption,
      price: 0, // Social posts don't have prices
      quantity: 0,
      sku: `META-${Date.now()}`,
      images: images,
      platform_data: { results },
      status: 'published',
      published_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    })

    // Also save to meta_published_posts for tracking
    await supabase.from('meta_published_posts').insert({
      user_id: userId,
      content_id: productContent.id,
      platform: platforms.join(','),
      facebook_post_id: results.find((r) => r.platform === 'facebook')?.id,
      instagram_post_id: results.find((r) => r.platform === 'instagram')?.id,
      caption,
      image_urls: images,
      published_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully posted to ${platforms.join(' and ')}!`,
    })
  } catch (error) {
    console.error('Meta publish error:', error)
    return NextResponse.json(
      { error: 'Failed to publish to Meta platforms' },
      { status: 500 }
    )
  }
}

async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl: string
) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${pageId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        url: imageUrl,
        access_token: accessToken,
      }),
    }
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  // Get the post permalink
  const postResponse = await fetch(
    `https://graph.facebook.com/v18.0/${data.id}?fields=permalink_url&access_token=${accessToken}`
  )
  const postData = await postResponse.json()

  return {
    id: data.id,
    post_id: data.post_id,
    permalink: postData.permalink_url,
  }
}

async function publishToInstagram(
  accountId: string,
  accessToken: string,
  caption: string,
  imageUrl: string
) {
  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.facebook.com/v18.0/${accountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  )

  const containerData = await containerResponse.json()

  if (containerData.error) {
    throw new Error(containerData.error.message)
  }

  // Step 2: Publish the container
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

  return {
    id: publishData.id,
    permalink: `https://www.instagram.com/p/${publishData.id}/`,
  }
}

function generateMetaCaption(productContent: any): string {
  // Extract Instagram caption from generated content
  const content = productContent.generated_content || ''
  const instagramMatch = content.match(
    /INSTAGRAM CAPTION:([\s\S]*?)(?=\*\*\d+\.|$)/i
  )

  if (instagramMatch) {
    return instagramMatch[1].trim()
  }

  // Fallback caption
  return `Check out our ${productContent.product_name}! 🌟\n\n${productContent.features || ''}\n\n#shopping #onlineshopping #newproduct`
}
