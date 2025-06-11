import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  console.log('=== IMAGE ANALYSIS API START ===')

  try {
    // Authentication (same pattern as generate route)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete(name)
          },
        },
      }
    )

    let authenticatedUser

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      // Try authorization header fallback
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const accessToken = authHeader.replace('Bearer ', '')
      const tokenSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: () => null,
            set: () => {},
            remove: () => {},
          },
        }
      )

      await tokenSupabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '',
      })

      const {
        data: { user: tokenUser },
        error: tokenError,
      } = await tokenSupabase.auth.getUser()

      if (tokenError || !tokenUser) {
        return NextResponse.json(
          { error: 'Invalid authentication' },
          { status: 401 }
        )
      }

      authenticatedUser = tokenUser
    } else {
      authenticatedUser = user
    }

    console.log('1. Authenticated user:', authenticatedUser.id)

    // Get request data
    const { imageUrl, imageCount, hasProcessedImages, productName } =
      await req.json()

    console.log('2. Request data:', {
      imageCount,
      hasProcessedImages,
      productName: productName || 'not provided',
      imageUrlLength: imageUrl?.length || 0,
    })

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      )
    }

    console.log('3. Starting OpenAI vision analysis...')

    // Convert blob URL to base64 if needed
    let imageDataUrl = imageUrl

    if (imageUrl.startsWith('blob:')) {
      console.log('4. Converting blob URL to base64...')

      // For blob URLs, we need to fetch and convert
      try {
        const response = await fetch(imageUrl)
        const arrayBuffer = await response.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Detect image type from the first few bytes
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4))
        let mimeType = 'image/jpeg' // default

        if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50) {
          mimeType = 'image/png'
        } else if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8) {
          mimeType = 'image/jpeg'
        } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49) {
          mimeType = 'image/gif'
        }

        imageDataUrl = `data:${mimeType};base64,${base64}`
        console.log('5. Blob converted successfully, mime type:', mimeType)
      } catch (conversionError) {
        console.error('6. Blob conversion failed:', conversionError)

        // Fallback to basic analysis
        return NextResponse.json({
          analysis: `${imageCount} high-quality product images${
            hasProcessedImages ? ' with professional background removal' : ''
          } showcase the product's key features and visual appeal.`,
          fallback: true,
          reason: 'Image conversion failed',
        })
      }
    }

    console.log('6. Calling OpenAI Vision API...')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this product image for e-commerce content generation. Describe:
              
1. VISUAL FEATURES: Colors, materials, design elements, style
2. BRAND IDENTIFICATION: Read any visible brand names, logos, model numbers, or text on the product - be specific about what text you can see
3. PRODUCT DETAILS: Size indicators, technical specs visible, key components
4. PRESENTATION: Professional quality, background, lighting, angle
5. SELLING POINTS: What makes this product appealing visually
6. TARGET AUDIENCE: Who would this appeal to based on design/style

IMPORTANT: Please identify any visible brand names, logos, or text on the product. If you can see brand markings like Nike swoosh, Apple logo, Samsung text, etc., please mention them specifically as they are important for accurate product descriptions.

Keep response focused and under 250 words. This will be used to enhance product descriptions.${
                productName ? ` Product name: "${productName}"` : ''
              }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    })

    const visionAnalysis =
      completion.choices[0]?.message?.content || 'Visual analysis unavailable'
    console.log('7. Vision analysis completed successfully')

    // Enhanced analysis combining vision with metadata
    const enhancedAnalysis = `${visionAnalysis}

TECHNICAL SPECS: ${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} provided${
      hasProcessedImages
        ? ' with professional background removal for clean, marketplace-ready presentation'
        : ''
    }. Visual content showcases product features and details suitable for professional e-commerce listings.`

    console.log('8. Enhanced analysis prepared')

    return NextResponse.json({
      analysis: enhancedAnalysis,
      visionAnalysis: visionAnalysis,
      metadata: {
        imageCount,
        hasProcessedImages,
        timestamp: new Date().toISOString(),
      },
      fallback: false,
    })
  } catch (error) {
    console.error('=== IMAGE ANALYSIS ERROR ===')
    console.error('Error details:', error)

    // Graceful fallback - return basic analysis so content generation doesn't fail
    const { imageCount = 1, hasProcessedImages = false } = await req
      .json()
      .catch(() => ({}))

    return NextResponse.json({
      analysis: `${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} available${
        hasProcessedImages ? ' with professional background removal' : ''
      }. Images showcase key product features and visual appeal for enhanced product presentations.`,
      fallback: true,
      reason: error instanceof Error ? error.message : 'Analysis failed',
      metadata: {
        imageCount,
        hasProcessedImages,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    service: 'Image Analysis API',
    capabilities: ['OpenAI Vision', 'Blob URL processing', 'Graceful fallback'],
    timestamp: new Date().toISOString(),
  })
}
