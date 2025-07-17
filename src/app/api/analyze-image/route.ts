import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  const apiStart = Date.now()
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
    const reqParseStart = Date.now()
    const { imageData, imageCount, hasProcessedImages, productName } =
      await req.json()
    console.log('2. Request data:', {
      imageCount,
      hasProcessedImages,
      productName: productName || 'not provided',
      hasImageData: !!imageData,
      parseMs: Date.now() - reqParseStart,
    })

    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      )
    }

    // Validate base64 format
    if (!imageData.startsWith('data:image/')) {
      console.log('3. Invalid image format')
      return NextResponse.json({
        analysis: `${imageCount} high-quality product images${
          hasProcessedImages ? ' with professional background removal' : ''
        } showcase the product's key features and visual appeal.`,
        fallback: true,
        reason: 'Invalid image format',
      })
    }

    console.log('3. Starting OpenAI vision analysis...')
    const visionStart = Date.now()
    // Add a timeout for the OpenAI call (14s)
    function withTimeout(promise: Promise<any>, ms: number) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('OpenAI vision timed out')),
          ms
        )
        promise
          .then((val) => {
            clearTimeout(timer)
            resolve(val)
          })
          .catch((err) => {
            clearTimeout(timer)
            reject(err)
          })
      })
    }

    let completion: OpenAI.Chat.Completions.ChatCompletion
    try {
      completion = (await withTimeout(
        openai.chat.completions.create({
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
                    url: imageData,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
        14000
      )) as OpenAI.Chat.Completions.ChatCompletion
    } catch (openaiError) {
      console.error('4. OpenAI Vision API timed out or failed:', openaiError)
      // Fallback response if OpenAI is too slow or errors
      return NextResponse.json({
        analysis: `${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} available${
          hasProcessedImages ? ' with professional background removal' : ''
        }. Images showcase key product features and visual appeal for enhanced product presentations.`,
        fallback: true,
        reason:
          openaiError instanceof Error
            ? openaiError.message
            : 'OpenAI Vision failed',
        metadata: {
          imageCount,
          hasProcessedImages,
          visionMs: Date.now() - visionStart,
          totalMs: Date.now() - apiStart,
          timestamp: new Date().toISOString(),
        },
      })
    }

    const visionAnalysis =
      completion.choices[0]?.message?.content || 'Visual analysis unavailable'
    console.log('4. Vision analysis completed successfully', {
      visionMs: Date.now() - visionStart,
      totalMs: Date.now() - apiStart,
    })

    // Enhanced analysis combining vision with metadata
    const enhancedAnalysis = `${visionAnalysis}

TECHNICAL SPECS: ${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} provided${
      hasProcessedImages
        ? ' with professional background removal for clean, marketplace-ready presentation'
        : ''
    }. Visual content showcases product features and details suitable for professional e-commerce listings.`

    console.log('5. Enhanced analysis prepared')

    return NextResponse.json({
      analysis: enhancedAnalysis,
      visionAnalysis: visionAnalysis,
      metadata: {
        imageCount,
        hasProcessedImages,
        visionMs: Date.now() - visionStart,
        totalMs: Date.now() - apiStart,
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
    capabilities: [
      'OpenAI Vision',
      'Base64 image processing',
      'Graceful fallback',
    ],
    timestamp: new Date().toISOString(),
  })
}
