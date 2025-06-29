// src/app/api/bulk-generate/route.ts - Enhanced with Content Sections
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { createServiceRoleClient } from '@/lib/supabase-server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// 🚀 NEW: Content sections interface for bulk processing
interface ContentSections {
  title: boolean
  sellingPoints: boolean
  description: boolean
  instagramCaption: boolean
  blogIntro: boolean
  callToAction: boolean
}

// 🚀 NEW: Default all sections enabled for backward compatibility
const DEFAULT_CONTENT_SECTIONS: ContentSections = {
  title: true,
  sellingPoints: true,
  description: true,
  instagramCaption: true,
  blogIntro: true,
  callToAction: true,
}

export async function POST(req: NextRequest) {
  console.log('=== BULK GENERATE API START ===')

  try {
    const supabaseAdmin = createServiceRoleClient()

    // 🚀 ENHANCED: Accept content sections in bulk request
    const { products, selectedSections } = await req.json()

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Invalid products array' },
        { status: 400 }
      )
    }

    // 🚀 NEW: Ensure we have valid content sections (backward compatibility)
    const contentSections: ContentSections =
      selectedSections || DEFAULT_CONTENT_SECTIONS
    const selectedSectionCount =
      Object.values(contentSections).filter(Boolean).length

    console.log(
      `Processing ${products.length} products with ${selectedSectionCount} content sections`
    )

    // Validate that at least one section is selected
    if (selectedSectionCount === 0) {
      console.log('❌ No content sections selected for bulk processing')
      return NextResponse.json(
        { error: 'Please select at least one content section to generate' },
        { status: 400 }
      )
    }

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

    // 🚀 NEW: Calculate tokens for bulk processing efficiency
    const calculateBulkTokens = (sections: ContentSections): number => {
      const sectionTokens = {
        title: 80, // Reduced for bulk
        sellingPoints: 150,
        description: 200,
        instagramCaption: 180,
        blogIntro: 200,
        callToAction: 60,
      }

      let totalTokens = 80 // Base overhead for bulk

      Object.entries(sections).forEach(([section, enabled]) => {
        if (enabled) {
          totalTokens +=
            sectionTokens[section as keyof typeof sectionTokens] || 100
        }
      })

      // Cap tokens for bulk efficiency
      return Math.min(Math.max(totalTokens, 300), 900)
    }

    const maxTokensPerProduct = calculateBulkTokens(contentSections)

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

        console.log(
          `Generating content for: ${productName} (${platform}) [${selectedSectionCount} sections]`
        )

        // Validate and normalize platform
        const validPlatforms = [
          'amazon',
          'shopify',
          'etsy',
          'instagram',
          'ebay',
        ]
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
            else if (platformLower.includes('ebay')) normalizedPlatform = 'ebay'
          }
        }

        // 🚀 ENHANCED: Create optimized prompt based on platform AND selected sections
        const prompt = createBulkPrompt(
          productName,
          features || 'Not specified',
          normalizedPlatform,
          contentSections
        )

        // Use faster GPT-3.5-turbo for bulk processing with optimized tokens
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert e-commerce copywriter. Create compelling, concise product content efficiently. Focus only on the requested sections and follow the exact format specified.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxTokensPerProduct,
          temperature: 0.7,
        })

        const generatedContent =
          completion.choices[0]?.message?.content ||
          'Failed to generate content'

        // 🚀 FIXED: Save to correct table with proper field name
        const { error: saveError } = await supabaseAdmin
          .from('product_contents')
          .insert({
            user_id: user.id,
            product_name: productName,
            platform: normalizedPlatform,
            features: features || 'Not specified',
            generated_content: generatedContent,
            // 🚀 FIXED: Use correct field name to match main generate API
            selected_sections: contentSections,
            has_images: false,
            is_background_job: false,
            created_at: new Date().toISOString(),
          })

        if (saveError) {
          console.error('Error saving content:', saveError)
        }

        results.push({
          ...product,
          content: generatedContent,
          platform: normalizedPlatform,
          // 🚀 NEW: Include section info in response
          contentInfo: {
            selectedSections: contentSections,
            sectionsCount: selectedSectionCount,
            tokensUsed: maxTokensPerProduct,
          },
          status: 'completed',
        })

        console.log(
          `✅ Generated content for: ${productName} (${normalizedPlatform}) [${selectedSectionCount} sections]`
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
    return NextResponse.json({
      results,
      // 🚀 NEW: Include bulk processing metadata
      bulkInfo: {
        totalProducts: products.length,
        selectedSections: contentSections,
        sectionsCount: selectedSectionCount,
        tokensPerProduct: maxTokensPerProduct,
        completed: results.filter((r) => r.status === 'completed').length,
        failed: results.filter((r) => r.status === 'failed').length,
      },
    })
  } catch (error) {
    console.error('Bulk generate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 🚀 ENHANCED: Create optimized bulk prompt with proper content section filtering
function createBulkPrompt(
  productName: string,
  features: string,
  platform: string,
  selectedSections: ContentSections
): string {
  const platformPrompts = {
    amazon: {
      base: `Create Amazon product content for "${productName}". Features: ${features}.`,
      instructions: 'Focus on SEO, benefits, and conversion.',
    },
    ebay: {
      base: `Create eBay listing content for "${productName}". Features: ${features}.`,
      instructions:
        'Focus on competitive pricing, condition, value proposition, and buyer confidence.',
    },
    shopify: {
      base: `Create Shopify product content for "${productName}". Features: ${features}.`,
      instructions: 'Focus on professional presentation and benefits.',
    },
    etsy: {
      base: `Create Etsy listing content for "${productName}". Features: ${features}.`,
      instructions: 'Focus on story, craftsmanship, and emotional connection.',
    },
    instagram: {
      base: `Create Instagram content for "${productName}". Features: ${features}.`,
      instructions: 'Focus on engagement, hashtags, and social appeal.',
    },
  }

  const config =
    platformPrompts[platform as keyof typeof platformPrompts] ||
    platformPrompts.amazon

  // 🚀 ENHANCED: Build detailed prompt sections based on selections
  const selectedSectionsList: string[] = []
  const promptSections: string[] = []

  const sectionLabels: Record<keyof ContentSections, string> = {
    title: 'Product Title',
    sellingPoints: 'Key Selling Points',
    description: 'Product Description',
    instagramCaption: 'Instagram Caption',
    blogIntro: 'Blog Introduction',
    callToAction: 'Call-to-Action',
  }

  // 🚀 BUILD PROMPT BASED ON SELECTED SECTIONS ONLY
  if (selectedSections.title) {
    selectedSectionsList.push(sectionLabels.title)
    promptSections.push(
      '1. PRODUCT TITLE: Create a compelling, SEO-optimized product title (recommended length: 60-80 characters for most platforms)'
    )
  }

  if (selectedSections.sellingPoints) {
    selectedSectionsList.push(sectionLabels.sellingPoints)
    promptSections.push(
      '2. KEY SELLING POINTS: List 5-7 compelling bullet points highlighting main benefits and features'
    )
  }

  if (selectedSections.description) {
    selectedSectionsList.push(sectionLabels.description)
    promptSections.push(
      '3. PRODUCT DESCRIPTION: Write a comprehensive product description that persuades and informs'
    )
  }

  if (selectedSections.instagramCaption) {
    selectedSectionsList.push(sectionLabels.instagramCaption)
    promptSections.push(
      '4. INSTAGRAM CAPTION: Create an engaging social media caption with relevant hashtags and emojis'
    )
  }

  if (selectedSections.blogIntro) {
    selectedSectionsList.push(sectionLabels.blogIntro)
    promptSections.push(
      '5. BLOG INTRODUCTION: Write a compelling blog post introduction that hooks readers'
    )
  }

  if (selectedSections.callToAction) {
    selectedSectionsList.push(sectionLabels.callToAction)
    promptSections.push(
      '6. CALL-TO-ACTION: Create persuasive call-to-action text that drives conversions'
    )
  }

  const sectionCount = selectedSectionsList.length
  const isCustomSelection = sectionCount < 6

  return `${config.base}

Platform: ${platform}
Target Sections: ${selectedSectionsList.join(', ')}
${isCustomSelection ? `Custom Selection: ${sectionCount}/6 sections requested` : 'Complete Package: All 6 sections requested'}

${config.instructions}

IMPORTANT: Please provide ONLY the following ${promptSections.length} sections that were specifically requested:

${promptSections.join('\n\n')}

Format your response with clear section headers (e.g., "## PRODUCT TITLE", "## KEY SELLING POINTS", etc.) and provide high-quality, professional content for ONLY the ${promptSections.length} requested sections above. Do not include any sections that were not specifically requested.

${
  isCustomSelection
    ? `This is a custom bulk selection of ${sectionCount} sections. Focus your efforts on creating exceptional content for these specific sections only.`
    : 'This is a complete content package. Ensure all sections work together cohesively.'
}

Keep content concise but compelling, optimized for ${platform} platform requirements and user expectations.`
}
