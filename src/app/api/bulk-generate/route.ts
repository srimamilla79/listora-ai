// src/app/api/bulk-generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createServiceRoleClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  console.log('=== BULK GENERATE API START ===')

  try {
    const supabaseAdmin = createServiceRoleClient()

    const { products } = await req.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Invalid products array' },
        { status: 400 }
      )
    }

    console.log(`Processing ${products.length} products`)

    // Get user from Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    console.log('User authenticated:', user.email)

    // Process each product (optimized for speed)
    const results = []
    for (const product of products) {
      try {
        const { productName, features, platform } = product

        if (!productName) {
          results.push({
            ...product,
            error: 'Product name is required',
            status: 'failed',
          })
          continue
        }

        console.log(`Generating content for: ${productName} (${platform})`)

        // Validate and normalize platform
        const validPlatforms = ['amazon', 'shopify', 'etsy', 'instagram']
        let normalizedPlatform = 'amazon' // default

        if (platform) {
          const platformLower = platform.toLowerCase().trim()
          if (validPlatforms.includes(platformLower)) {
            normalizedPlatform = platformLower
          } else {
            // Try to match partial platform names
            if (platformLower.includes('shopify'))
              normalizedPlatform = 'shopify'
            else if (platformLower.includes('etsy')) normalizedPlatform = 'etsy'
            else if (platformLower.includes('instagram'))
              normalizedPlatform = 'instagram'
            else if (platformLower.includes('amazon'))
              normalizedPlatform = 'amazon'
          }
        }

        // Create optimized prompt based on platform
        const platformPrompts = {
          amazon: `Create Amazon product listing for "${productName}". Features: ${
            features || 'Not specified'
          }. Generate: Title (60 chars), 5 bullet points, description, keywords.`,

          shopify: `Create Shopify product content for "${productName}". Features: ${
            features || 'Not specified'
          }. Generate: Title, description, benefits, specifications.`,

          etsy: `Create Etsy listing for "${productName}". Features: ${
            features || 'Not specified'
          }. Generate: Title, story, details, tags.`,

          instagram: `Create Instagram content for "${productName}". Features: ${
            features || 'Not specified'
          }. Generate: Caption, highlights, CTA, hashtags.`,
        }

        const prompt =
          platformPrompts[normalizedPlatform as keyof typeof platformPrompts] ||
          platformPrompts.amazon

        // Use faster GPT-3.5-turbo for bulk processing
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert e-commerce copywriter. Create compelling, concise product content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 800, // Reduced for faster processing
          temperature: 0.7,
        })

        const generatedContent =
          completion.choices[0]?.message?.content ||
          'Failed to generate content'

        // Save to database (simplified)
        const { error: saveError } = await supabaseAdmin
          .from('user_content')
          .insert({
            user_id: user.id,
            product_name: productName,
            platform: normalizedPlatform,
            content: generatedContent,
            created_at: new Date().toISOString(),
          })

        if (saveError) {
          console.error('Error saving content:', saveError)
        }

        results.push({
          ...product,
          content: generatedContent,
          platform: normalizedPlatform, // Return the normalized platform
          status: 'completed',
        })

        console.log(
          `✅ Generated content for: ${productName} (${normalizedPlatform})`
        )
      } catch (error) {
        console.error(`Error processing product ${product.productName}:`, error)
        results.push({
          ...product,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed',
        })
      }
    }

    console.log('=== BULK GENERATE API COMPLETE ===')
    return NextResponse.json({ results })
  } catch (error) {
    console.error('Bulk generate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
