import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServerStripe } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  console.log('=== GENERATE API START ===')

  try {
    // Enhanced request body parsing to include voice parameters AND background job support
    const {
      productName,
      features,
      platform,
      imageAnalysis,
      hasImages,
      hasProcessedImages,
      // NEW: Voice integration parameters
      voiceTranscription,
      existingContent,
      // 🚀 NEW: Background job support
      isBackgroundJob,
      userId: backgroundUserId,
    } = await req.json()

    console.log('1. Request data:', {
      productName,
      features,
      platform,
      hasImages,
      hasProcessedImages,
      hasVoiceInput: !!voiceTranscription,
      hasExistingContent: !!existingContent,
      isBackgroundJob: !!isBackgroundJob, // NEW logging
      backgroundUserId: backgroundUserId || 'none', // NEW logging
    })

    let authenticatedUser

    // 🚀 NEW: Handle background job authentication differently
    if (isBackgroundJob && backgroundUserId) {
      console.log('2. Background job detected, using service role auth')

      // For background jobs, we trust the userId passed from the background processor
      authenticatedUser = { id: backgroundUserId, email: 'background@job' }
      console.log('3. Background job user:', authenticatedUser.id)
    } else {
      // Standard user authentication flow (existing code)
      const cookieStore = await cookies()
      console.log('2. Getting cookies...')

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      console.log('3. Auth result:', user ? `Success - ${user.id}` : 'Failed')

      if (authError || !user) {
        console.log('4. Authentication failed, trying Authorization header...')

        const authHeader = req.headers.get('authorization')
        if (!authHeader) {
          console.log('4. No authorization header either')
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        const accessToken = authHeader.replace('Bearer ', '')
        console.log('4. Access token found in header')

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
          console.log('4. Token authentication also failed:', tokenError)
          return NextResponse.json(
            { error: 'Invalid authentication' },
            { status: 401 }
          )
        }

        console.log('4. Token authentication successful:', tokenUser.id)
        authenticatedUser = tokenUser
      } else {
        console.log('3. Cookie authentication successful:', user.id)
        authenticatedUser = user
      }
    }

    console.log(
      '5. Final authenticated user:',
      authenticatedUser.id,
      authenticatedUser.email
    )

    // 🚀 NEW: Admin bypass check - Check if user is admin/owner first
    const serviceSupabase = createServiceRoleClient()
    const { data: isAdmin, error: adminError } = await serviceSupabase.rpc(
      'is_admin',
      {
        user_uuid: authenticatedUser.id,
      }
    )

    if (isAdmin) {
      console.log('6. 👑 ADMIN/OWNER DETECTED - Bypassing all usage limits')

      // Skip usage tracking for admins, go directly to content generation
      console.log('7. Admin privilege: Unlimited generations enabled')

      // Enhanced prompt creation with voice integration
      const prompt = createPrompt(
        productName,
        features,
        platform,
        imageAnalysis,
        hasImages,
        hasProcessedImages,
        voiceTranscription,
        existingContent
      )

      // Determine if this is voice enhancement or new generation
      const isVoiceEnhancement = !!existingContent && !!voiceTranscription
      console.log(
        '8. Generating content with OpenAI... (ADMIN MODE)',
        isVoiceEnhancement ? '(Voice Enhancement Mode)' : '(New Generation)',
        isBackgroundJob ? '[BACKGROUND JOB]' : '[FOREGROUND JOB]'
      )

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: isVoiceEnhancement
              ? 'You are an expert copywriter specializing in enhancing voice-generated content for e-commerce platforms. You take existing content generated from voice input and refine it for professional use while preserving the original intent and key details. You understand both text descriptions and image analysis to create compelling product content.'
              : 'You are an expert copywriter specializing in e-commerce content optimization for different platforms. You analyze both text descriptions and image analysis to create compelling product content. You understand when images have been professionally processed with background removal for enhanced presentation.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1200,
        temperature: isVoiceEnhancement ? 0.6 : 0.7,
      })

      const generatedContent =
        completion.choices[0]?.message?.content ||
        'Content generated successfully!'
      console.log('9. Content generated successfully (ADMIN MODE)')

      // Enhanced database save with voice metadata (Admin mode)
      const { data: savedContent, error: saveError } = await serviceSupabase
        .from('product_contents')
        .insert({
          user_id: authenticatedUser.id,
          product_name: productName,
          platform: platform,
          features: features,
          generated_content: generatedContent,
          has_images: hasImages || false,
          has_processed_images: hasProcessedImages || false,
          image_analysis: imageAnalysis || null,
          voice_transcription: voiceTranscription || null,
          is_voice_enhanced: isVoiceEnhancement,
          is_background_job: isBackgroundJob || false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (saveError) {
        console.log('10. Warning: Failed to save content:', saveError)
      } else {
        console.log('10. Content saved to database (ADMIN MODE)')
      }

      // Admin response with unlimited status
      return NextResponse.json({
        result: generatedContent,
        contentId: savedContent?.id || null,
        usage: {
          used: 'unlimited',
          limit: 'unlimited',
          isAdmin: true,
        },
        imageInfo: {
          hasImages,
          hasProcessedImages,
          imageAnalysis: imageAnalysis ? 'included' : 'none',
        },
        voiceInfo: {
          hasVoiceInput: !!voiceTranscription,
          isEnhancement: isVoiceEnhancement,
          transcriptionLength: voiceTranscription?.length || 0,
        },
        jobInfo: {
          isBackgroundJob: !!isBackgroundJob,
          processedBy: isBackgroundJob
            ? 'background-processor'
            : 'admin-request',
        },
        adminInfo: {
          isAdmin: true,
          hasUnlimitedAccess: true,
        },
      })
    }

    // Regular user flow (existing logic continues here)
    const currentMonth = new Date().toISOString().slice(0, 7)
    console.log('6. Checking usage for month:', currentMonth)

    // Check current usage using the same table as bulk upload
    const { data: usage, error: usageError } = await serviceSupabase
      .from('user_usage_tracking')
      .select('usage_count')
      .eq('user_id', authenticatedUser.id)
      .eq('month_year', currentMonth)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.log('7. Usage check error:', usageError)
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      )
    }

    // Get user plan for limits
    const { data: planData, error: planError } = await serviceSupabase
      .from('user_plans')
      .select('plan_type')
      .eq('user_id', authenticatedUser.id)
      .eq('is_active', true)
      .single()

    const planType = planData?.plan_type || 'starter'
    const planLimits = {
      starter: { monthlyGenerations: 10 },
      business: { monthlyGenerations: 250 },
      premium: { monthlyGenerations: 1000 },
      enterprise: { monthlyGenerations: 999999 },
    }

    const currentUsage = usage?.usage_count || 0
    const limit =
      planLimits[planType as keyof typeof planLimits]?.monthlyGenerations || 10

    // 🚀 NEW: For background jobs, we still check limits but don't block (job was already approved)
    if (!isBackgroundJob && currentUsage >= limit) {
      console.log('7. Usage limit exceeded:', currentUsage, 'of', limit)
      return NextResponse.json(
        {
          error:
            'Usage limit exceeded. Please upgrade your plan to continue generating content.',
        },
        { status: 403 }
      )
    }

    console.log('7. Usage check passed:', currentUsage, 'of', limit)

    // Enhanced prompt creation with voice integration
    const prompt = createPrompt(
      productName,
      features,
      platform,
      imageAnalysis,
      hasImages,
      hasProcessedImages,
      voiceTranscription,
      existingContent
    )

    // Determine if this is voice enhancement or new generation
    const isVoiceEnhancement = !!existingContent && !!voiceTranscription
    console.log(
      '8. Generating content with OpenAI...',
      isVoiceEnhancement ? '(Voice Enhancement Mode)' : '(New Generation)',
      isBackgroundJob ? '[BACKGROUND JOB]' : '[FOREGROUND JOB]' // NEW logging
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: isVoiceEnhancement
            ? 'You are an expert copywriter specializing in enhancing voice-generated content for e-commerce platforms. You take existing content generated from voice input and refine it for professional use while preserving the original intent and key details. You understand both text descriptions and image analysis to create compelling product content.'
            : 'You are an expert copywriter specializing in e-commerce content optimization for different platforms. You analyze both text descriptions and image analysis to create compelling product content. You understand when images have been professionally processed with background removal for enhanced presentation.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1200,
      temperature: isVoiceEnhancement ? 0.6 : 0.7,
    })

    const generatedContent =
      completion.choices[0]?.message?.content ||
      'Content generated successfully!'
    console.log('9. Content generated successfully')

    // 🚀 ENHANCED: Update usage tracking with better error handling for background jobs
    const { data: usageUpdateData, error: updateError } =
      await serviceSupabase.rpc('increment_user_usage', {
        p_user_id: authenticatedUser.id,
        p_increment_by: 1,
        p_month_year: currentMonth,
      })

    if (updateError) {
      console.log('10. Warning: Failed to update usage count:', updateError)
      // For background jobs, we continue anyway since the job was already approved
      if (!isBackgroundJob) {
        return NextResponse.json(
          { error: 'Failed to update usage tracking' },
          { status: 500 }
        )
      }
    } else {
      console.log(
        '10. Usage count updated via RPC:',
        usageUpdateData?.usage_count || currentUsage + 1
      )
    }

    // Enhanced database save with voice metadata
    const { data: savedContent, error: saveError } = await serviceSupabase
      .from('product_contents')
      .insert({
        user_id: authenticatedUser.id,
        product_name: productName,
        platform: platform,
        features: features,
        generated_content: generatedContent,
        has_images: hasImages || false,
        has_processed_images: hasProcessedImages || false,
        image_analysis: imageAnalysis || null,
        voice_transcription: voiceTranscription || null,
        is_voice_enhanced: isVoiceEnhancement,
        is_background_job: isBackgroundJob || false, // NEW: Track background jobs
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.log('11. Warning: Failed to save content:', saveError)
    } else {
      console.log(
        '11. Content saved to database with voice, image, and background job metadata'
      )
    }

    // Enhanced response with voice processing info
    return NextResponse.json({
      result: generatedContent,
      contentId: savedContent?.id || null,
      usage: {
        used: usageUpdateData?.usage_count || currentUsage + 1,
        limit: limit,
      },
      imageInfo: {
        hasImages,
        hasProcessedImages,
        imageAnalysis: imageAnalysis ? 'included' : 'none',
      },
      voiceInfo: {
        hasVoiceInput: !!voiceTranscription,
        isEnhancement: isVoiceEnhancement,
        transcriptionLength: voiceTranscription?.length || 0,
      },
      // 🚀 NEW: Background job info
      jobInfo: {
        isBackgroundJob: !!isBackgroundJob,
        processedBy: isBackgroundJob ? 'background-processor' : 'user-request',
      },
    })
  } catch (error) {
    console.error('=== GENERATE API ERROR ===')
    console.error('Error details:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

// Enhanced prompt creation function with voice integration (existing function - no changes needed)
function createPrompt(
  productName: string,
  features: string,
  platform: string,
  imageAnalysis?: string,
  hasImages?: boolean,
  hasProcessedImages?: boolean,
  voiceTranscription?: string,
  existingContent?: string
): string {
  const platformInstructions = {
    amazon: {
      title: 'Amazon Product Listing Package',
      instructions:
        'Create a complete Amazon-optimized content package with SEO-friendly title, bullet points, description, Instagram caption, and blog intro. Focus on keywords, benefits, and conversion.',
    },
    etsy: {
      title: 'Etsy Product Listing Package',
      instructions:
        'Create a complete Etsy-style content package that tells a story, emphasizes handmade/vintage qualities, and connects emotionally with buyers. Include listing description, Instagram caption, and blog intro.',
    },
    shopify: {
      title: 'Shopify Product Content Package',
      instructions:
        'Create a complete e-commerce content package with professional product description, compelling Instagram caption, and engaging blog intro with clear benefits and call-to-action.',
    },
    instagram: {
      title: 'Instagram Content Package',
      instructions:
        'Create a comprehensive Instagram content package with engaging caption, hashtags, and complementary blog intro for cross-platform marketing.',
    },
  }

  const config =
    platformInstructions[platform as keyof typeof platformInstructions] ||
    platformInstructions.amazon

  // Voice enhancement mode
  if (existingContent && voiceTranscription) {
    let prompt = `VOICE ENHANCEMENT MODE: Refine and enhance the following voice-generated content for ${platform}:

=== EXISTING CONTENT TO ENHANCE ===
${existingContent}

=== ORIGINAL VOICE INPUT ===
"${voiceTranscription}"

=== PRODUCT DETAILS ===
Product Name: ${productName}
Key Features: ${features}`

    if (hasImages && imageAnalysis) {
      prompt += `

Visual Analysis: ${imageAnalysis}`

      if (hasProcessedImages) {
        prompt += `

🎨 PROFESSIONAL IMAGES: This product has processed images with clean background removal, creating premium presentation.`
      }
    }

    prompt += `

=== ENHANCEMENT INSTRUCTIONS ===
Please enhance the existing content while:
1. Preserving all key details and benefits from the original voice input
2. Maintaining the authentic tone and intent of the speaker
3. Improving structure, grammar, and professional presentation
4. Optimizing for ${platform} best practices
5. Adding any missing elements for a complete content package${
      hasProcessedImages
        ? '\n6. Emphasizing the professional image quality where appropriate'
        : ''
    }

Provide the enhanced content in this exact structure:

**1. ENHANCED PRODUCT TITLE/HEADLINE:**
- Refined SEO-optimized title for ${platform}

**2. REFINED KEY SELLING POINTS:**
- 5-7 polished bullet points from voice input

**3. ENHANCED PRODUCT DESCRIPTION:**
- Professional version of the voice description
- Maintains original intent but improves clarity

**4. ENHANCED INSTAGRAM CAPTION:**
- Refined social media version (150-300 words)
- Relevant emojis and 15-20 hashtags
- Clear call-to-action

**5. ENHANCED BLOG INTRO:**
- Professional blog introduction (200-400 words)
- Preserves voice input insights
- SEO-optimized structure

**6. ENHANCED CALL-TO-ACTION:**
- Platform-optimized conversion focus

Make all enhancements feel natural and maintain the speaker's original passion and knowledge about the product.`

    return prompt
  }

  // Standard generation mode
  let prompt = `Create a ${config.title} for the following product:

Product Name: ${productName}
Key Features: ${features}`

  if (voiceTranscription && !existingContent) {
    prompt += `

Voice Input Context: "${voiceTranscription}"
Note: The user provided additional context through voice input. Use this natural language description to add authentic details and passion to the content.`
  }

  if (hasImages && imageAnalysis) {
    prompt += `

Visual Analysis: ${imageAnalysis}`

    if (hasProcessedImages) {
      prompt += `

🎨 SPECIAL NOTE: This product has professional processed images with clean background removal, creating a premium, professional presentation that enhances product appeal and trust.`
    }

    prompt += `

Instructions: ${
      config.instructions
    } Use both the text description and visual analysis to create compelling content that highlights what customers can see in the images.${
      hasProcessedImages
        ? ' Emphasize the professional, clean presentation that the processed images provide.'
        : ''
    }`
  } else {
    prompt += `

Instructions: ${config.instructions}`
  }

  if (voiceTranscription) {
    prompt += ` Incorporate the natural, authentic details from the voice input to make the content more genuine and compelling.`
  }

  prompt += `

Please provide a comprehensive content package with ALL of the following sections:

**1. PRODUCT TITLE/HEADLINE:**
- SEO-optimized main title for ${platform}${
    hasProcessedImages
      ? '\n- Emphasize premium/professional quality where appropriate'
      : ''
  }${voiceTranscription ? '\n- Incorporate key elements from voice input' : ''}

**2. KEY SELLING POINTS:**
- 5-7 bullet points highlighting main benefits${
    hasProcessedImages
      ? '\n- Include professional presentation as a quality indicator'
      : ''
  }${
    voiceTranscription
      ? '\n- Use authentic language from voice description'
      : ''
  }

**3. DETAILED PRODUCT DESCRIPTION:**
- Comprehensive description optimized for ${platform}
- Focus on benefits, features, and value proposition${
    hasProcessedImages
      ? '\n- Subtly reference professional quality and presentation'
      : ''
  }${
    voiceTranscription
      ? '\n- Weave in natural product insights from voice input'
      : ''
  }

**4. INSTAGRAM CAPTION:**
- Engaging social media caption (150-300 words)
- Include relevant emojis
- Add 15-20 strategic hashtags
- Call-to-action for engagement${
    hasProcessedImages ? '\n- Use visual appeal as a hook' : ''
  }${voiceTranscription ? '\n- Capture the enthusiasm from voice input' : ''}

**5. BLOG INTRO:**
- Compelling blog post introduction (200-400 words)
- Hook readers with an interesting opening
- Set up the problem/solution narrative
- SEO-friendly and shareable content${
    voiceTranscription
      ? '\n- Use authentic insights from voice description'
      : ''
  }

**6. CALL-TO-ACTION:**
- Platform-specific conversion-focused CTA${
    hasProcessedImages
      ? '\n- Leverage professional presentation for trust-building'
      : ''
  }

Make all content compelling, professional, and optimized for ${platform} while ensuring each section works together as a cohesive content strategy.${
    voiceTranscription
      ? ' Maintain the authentic passion and expertise evident in the voice input.'
      : ''
  }`

  if (hasImages) {
    prompt += ` Incorporate visual elements and details that would be apparent from the product images throughout all content sections.`

    if (hasProcessedImages) {
      prompt += ` Highlight the clean, professional presentation that comes from expertly processed product photography.`
    }
  }

  return prompt
}
