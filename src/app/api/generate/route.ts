import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getServerStripe } from '@/lib/supabase'
import OpenAI from 'openai'
import { normalizeLanguageCode } from '@/utils/languageDetection'
import { SUPPORTED_LANGUAGES } from '@/config/languages'

// 🚀 OPTIMIZED: Enhanced OpenAI configuration for better performance and reliability
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 second timeout instead of 30s
  maxRetries: 2, // Increase retries for reliability
})

import { createServiceRoleClient } from '@/lib/supabase-server'

// 🚀 NEW: Content sections interface for type safety
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
  // 🚀 PERFORMANCE TRACKING: Monitor where time is spent
  const startTime = Date.now()
  const performanceLog = {
    auth: 0,
    usageCheck: 0,
    generation: 0,
    dbSave: 0,
    total: 0,
    checkpoints: [] as { label: string; ms: number }[],
  }

  function logCheckpoint(label: string) {
    const ms = Date.now() - startTime
    performanceLog.checkpoints.push({ label, ms })
    console.log(`[TIMING] ${label}: ${ms}ms`)
  }

  console.log('=== GENERATE API START ===')
  logCheckpoint('start')

  try {
    // 🔍 ADD THIS SECTION FOR DEBUGGING:
    const requestBody = await req.json()
    logCheckpoint('parsed request body')
    // Enhanced request body parsing to include voice parameters AND background job support AND content sections
    const {
      productName,
      features,
      platform,
      imageAnalysis,
      hasImages,
      hasProcessedImages,
      // Voice integration parameters
      voiceTranscription,
      existingContent,
      // Background job support
      isBackgroundJob,
      userId: backgroundUserId,
      // 🚀 NEW: Content section selection
      selectedSections,
    } = requestBody

    // ADD HERE - Language parameters
    const targetLanguage = requestBody.targetLanguage || 'en'
    const sourceLanguage = requestBody.sourceLanguage || 'auto'

    // Validate and normalize language codes
    const normalizedTargetLang = normalizeLanguageCode(targetLanguage) || 'en'

    console.log('1. Request data:', {
      productName,
      features,
      platform,
      hasImages,
      hasProcessedImages,
      hasVoiceInput: !!voiceTranscription,
      hasExistingContent: !!existingContent,
      isBackgroundJob: !!isBackgroundJob,
      backgroundUserId: backgroundUserId || 'none',
      selectedSections: selectedSections || 'using defaults',
    })

    // 🚀 NEW: Ensure we have valid content sections (backward compatibility)
    const contentSections: ContentSections =
      selectedSections || DEFAULT_CONTENT_SECTIONS
    const selectedSectionCount =
      Object.values(contentSections).filter(Boolean).length

    logCheckpoint('validated content sections')
    console.log('2. Content sections:', {
      sections: contentSections,
      selectedCount: selectedSectionCount,
      isFullPackage: selectedSectionCount === 6,
    })

    // Validate that at least one section is selected
    if (selectedSectionCount === 0) {
      console.log('❌ No content sections selected')
      return NextResponse.json(
        { error: 'Please select at least one content section to generate' },
        { status: 400 }
      )
    }

    let authenticatedUser

    // 🚀 OPTIMIZED: Faster authentication with performance tracking
    const authStart = Date.now()
    logCheckpoint('auth start')

    // Handle background job authentication differently
    if (isBackgroundJob && backgroundUserId) {
      logCheckpoint('background job detected')
      console.log('3. Background job detected, using service role auth')
      authenticatedUser = { id: backgroundUserId, email: 'background@job' }
      console.log('4. Background job user:', authenticatedUser.id)
    } else {
      // Standard user authentication flow
      const cookieStore = await cookies()
      logCheckpoint('got cookies')
      console.log('3. Getting cookies...')

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
      logCheckpoint('supabase.auth.getUser complete')
      console.log('4. Auth result:', user ? `Success - ${user.id}` : 'Failed')

      if (authError || !user) {
        console.log('5. Authentication failed, trying Authorization header...')

        const authHeader = req.headers.get('authorization')
        logCheckpoint('no cookie auth, checking authorization header')
        if (!authHeader) {
          console.log('5. No authorization header either')
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }

        const accessToken = authHeader.replace('Bearer ', '')
        console.log('5. Access token found in header')

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
        logCheckpoint('tokenSupabase.auth.setSession complete')

        const {
          data: { user: tokenUser },
          error: tokenError,
        } = await tokenSupabase.auth.getUser()
        logCheckpoint('tokenSupabase.auth.getUser complete')

        if (tokenError || !tokenUser) {
          console.log('5. Token authentication also failed:', tokenError)
          return NextResponse.json(
            { error: 'Invalid authentication' },
            { status: 401 }
          )
        }

        console.log('5. Token authentication successful:', tokenUser.id)
        authenticatedUser = tokenUser
      } else {
        console.log('4. Cookie authentication successful:', user.id)
        authenticatedUser = user
      }
    }

    logCheckpoint('authentication complete')
    console.log(
      '6. Final authenticated user:',
      authenticatedUser.id,
      authenticatedUser.email
    )

    // 🚀 OPTIMIZED: Admin check with performance tracking
    const serviceSupabase = createServiceRoleClient()
    const { data: isAdmin, error: adminError } = await serviceSupabase.rpc(
      'is_admin',
      {
        user_uuid: authenticatedUser.id,
      }
    )

    performanceLog.auth = Date.now() - authStart
    logCheckpoint('admin check complete')
    console.log(`⚡ Auth completed in ${performanceLog.auth}ms`)

    if (isAdmin) {
      console.log('7. 👑 ADMIN/OWNER DETECTED - Bypassing all usage limits')

      // Skip usage tracking for admins, go directly to content generation
      console.log('8. Admin privilege: Unlimited generations enabled')

      // 🚀 OPTIMIZED: Faster content generation for admins
      const generationStart = Date.now()

      const prompt = createPrompt(
        productName,
        features,
        platform,
        contentSections, // 🚀 NEW: Pass content sections
        imageAnalysis,
        hasImages,
        hasProcessedImages,
        voiceTranscription,
        existingContent,
        normalizedTargetLang
      )

      const isVoiceEnhancement = !!existingContent && !!voiceTranscription
      console.log(
        '9. Generating content with OpenAI... (ADMIN MODE)',
        isVoiceEnhancement ? '(Voice Enhancement Mode)' : '(New Generation)',
        isBackgroundJob ? '[BACKGROUND JOB]' : '[FOREGROUND JOB]',
        `[${selectedSectionCount} sections selected]`
      )

      // 🚀 OPTIMIZED: Faster generation settings with dynamic token adjustment
      const maxTokens = calculateTokensForSections(
        contentSections,
        isVoiceEnhancement
      )

      console.log('🚀 Starting OpenAI generation with optimized settings...')

      // 🔧 FIX: Add timeout wrapper and use faster model
      const completion = (await Promise.race([
        openai.chat.completions.create({
          model: 'gpt-4o', // ⚡ MUCH FASTER MODEL
          messages: [
            {
              role: 'system',
              content: isVoiceEnhancement
                ? `You are an expert copywriter specializing in enhancing voice-generated content for e-commerce platforms${
                    normalizedTargetLang !== 'en'
                      ? ` in ${SUPPORTED_LANGUAGES[normalizedTargetLang]?.name || normalizedTargetLang}`
                      : ''
                  }. Create compelling, conversion-focused content efficiently.`
                : `You are an expert copywriter specializing in e-commerce content optimization${
                    normalizedTargetLang !== 'en'
                      ? ` in ${SUPPORTED_LANGUAGES[normalizedTargetLang]?.name || normalizedTargetLang}`
                      : ''
                  }. Create compelling, conversion-focused content efficiently.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: Math.min(maxTokens, 4000), // ⚡ REDUCED MAX TOKENS for speed
          temperature: isVoiceEnhancement ? 0.6 : 0.7,
          stream: false,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('OpenAI request timeout after 60 seconds')),
            60000
          )
        ),
      ])) as any

      performanceLog.generation = Date.now() - generationStart
      console.log(`⚡ Generation completed in ${performanceLog.generation}ms`)

      const generatedContent =
        completion.choices[0]?.message?.content ||
        'Content generated successfully!'
      console.log('10. Content generated successfully (ADMIN MODE)')

      // 🚀 OPTIMIZED: Smart database handling for admins
      const dbStart = Date.now()

      const dbSavePromise = serviceSupabase
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
          // 🚀 FIX: Change field name to match database
          selected_sections: contentSections, // ✅ CORRECT FIELD NAME
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      // For background jobs, wait for DB save. For real-time, optionally save in background
      if (isBackgroundJob) {
        const { data: savedContent, error: saveError } = await dbSavePromise
        performanceLog.dbSave = Date.now() - dbStart
        performanceLog.total = Date.now() - startTime

        console.log(
          `⚡ Performance: Auth:${performanceLog.auth}ms, Gen:${performanceLog.generation}ms, DB:${performanceLog.dbSave}ms, Total:${performanceLog.total}ms`
        )

        if (saveError) {
          console.log('11. Warning: Failed to save content:', saveError)
        } else {
          console.log('11. Content saved to database (ADMIN MODE)')
        }

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
          // 🚀 NEW: Content section info
          contentInfo: {
            selectedSections: contentSections,
            sectionsCount: selectedSectionCount,
            isFullPackage: selectedSectionCount === 6,
          },
          // ADD THESE LANGUAGE FIELDS:
          language: normalizedTargetLang,
          wasMultilingual: normalizedTargetLang !== 'en',
          languageInfo: {
            source: sourceLanguage,
            target: normalizedTargetLang,
            languageName:
              SUPPORTED_LANGUAGES[normalizedTargetLang]?.name ||
              normalizedTargetLang,
          },
          jobInfo: {
            isBackgroundJob: !!isBackgroundJob,
            processedBy: 'background-processor',
          },
          adminInfo: {
            isAdmin: true,
            hasUnlimitedAccess: true,
          },
          performance: performanceLog,
        })
      } else {
        // For real-time admin requests, return immediately and save in background
        dbSavePromise.then(({ data: savedContent, error: saveError }) => {
          if (saveError) {
            console.log('11. Background save failed:', saveError)
          } else {
            console.log('11. Background save completed for admin')
          }
        })

        performanceLog.total = Date.now() - startTime
        console.log(
          `⚡ Performance: Auth:${performanceLog.auth}ms, Gen:${performanceLog.generation}ms, Total:${performanceLog.total}ms (DB saving in background)`
        )

        return NextResponse.json({
          result: generatedContent,
          contentId: 'saving',
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
          // 🚀 NEW: Content section info
          contentInfo: {
            selectedSections: contentSections,
            sectionsCount: selectedSectionCount,
            isFullPackage: selectedSectionCount === 6,
          },
          language: normalizedTargetLang,
          wasMultilingual: normalizedTargetLang !== 'en',
          languageInfo: {
            source: sourceLanguage,
            target: normalizedTargetLang,
            languageName:
              SUPPORTED_LANGUAGES[normalizedTargetLang]?.name ||
              normalizedTargetLang,
          },
          jobInfo: {
            isBackgroundJob: !!isBackgroundJob,
            processedBy: 'admin-request',
          },
          adminInfo: {
            isAdmin: true,
            hasUnlimitedAccess: true,
          },
          performance: performanceLog,
        })
      }
    }

    // 🚀 OPTIMIZED: Parallel usage and plan checks for regular users
    const usageStart = Date.now()
    logCheckpoint('usage check start')

    const currentMonth = new Date().toISOString().slice(0, 7)
    console.log('7. Checking usage for month:', currentMonth)

    const [usageResult, planResult] = await Promise.all([
      serviceSupabase
        .from('user_usage_tracking')
        .select('usage_count')
        .eq('user_id', authenticatedUser.id)
        .eq('month_year', currentMonth)
        .single(),
      serviceSupabase
        .from('user_plans')
        .select('plan_type')
        .eq('user_id', authenticatedUser.id)
        .eq('is_active', true)
        .single(),
    ])

    performanceLog.usageCheck = Date.now() - usageStart
    logCheckpoint('usage check complete')
    console.log(`⚡ Usage check completed in ${performanceLog.usageCheck}ms`)

    const { data: usage, error: usageError } = usageResult
    const { data: planData, error: planError } = planResult

    if (usageError && usageError.code !== 'PGRST116') {
      console.log('8. Usage check error:', usageError)
      return NextResponse.json(
        { error: 'Failed to check usage limits' },
        { status: 500 }
      )
    }

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

    // For background jobs, we still check limits but don't block (job was already approved)
    if (!isBackgroundJob && currentUsage >= limit) {
      console.log('8. Usage limit exceeded:', currentUsage, 'of', limit)
      return NextResponse.json(
        {
          error:
            'Usage limit exceeded. Please upgrade your plan to continue generating content.',
        },
        { status: 403 }
      )
    }

    console.log('8. Usage check passed:', currentUsage, 'of', limit)

    // 🚀 OPTIMIZED: Faster content generation
    const generationStart = Date.now()
    logCheckpoint('user generation start')

    const prompt = createPrompt(
      productName,
      features,
      platform,
      contentSections, // 🚀 NEW: Pass content sections
      imageAnalysis,
      hasImages,
      hasProcessedImages,
      voiceTranscription,
      existingContent,
      normalizedTargetLang
    )

    const isVoiceEnhancement = !!existingContent && !!voiceTranscription
    console.log(
      '9. Generating content with OpenAI...',
      isVoiceEnhancement ? '(Voice Enhancement Mode)' : '(New Generation)',
      isBackgroundJob ? '[BACKGROUND JOB]' : '[FOREGROUND JOB]',
      `[${selectedSectionCount} sections selected]`
    )

    // 🚀 OPTIMIZED: Dynamic token calculation based on selected sections
    const maxTokens = calculateTokensForSections(
      contentSections,
      isVoiceEnhancement
    )

    console.log(
      '🚀 Starting OpenAI generation with gpt-4o for faster response...'
    )

    // 🔧 FIX: Add timeout wrapper and use faster model for regular users too
    const completion = (await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o', // ⚡ MUCH FASTER MODEL
        messages: [
          {
            role: 'system',
            content: isVoiceEnhancement
              ? `You are an expert copywriter specializing in enhancing voice-generated content for e-commerce platforms${
                  normalizedTargetLang !== 'en'
                    ? ` in ${SUPPORTED_LANGUAGES[normalizedTargetLang]?.name || normalizedTargetLang}`
                    : ''
                }. Create compelling, conversion-focused content efficiently.`
              : `You are an expert copywriter specializing in e-commerce content optimization${
                  normalizedTargetLang !== 'en'
                    ? ` in ${SUPPORTED_LANGUAGES[normalizedTargetLang]?.name || normalizedTargetLang}`
                    : ''
                }. Create compelling, conversion-focused content efficiently.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: Math.min(maxTokens, 4000), // ⚡ REDUCED MAX TOKENS for speed
        temperature: isVoiceEnhancement ? 0.6 : 0.7,
        stream: false,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('OpenAI request timeout after 60 seconds')),
          60000
        )
      ),
    ])) as any

    performanceLog.generation = Date.now() - generationStart
    logCheckpoint('user OpenAI generation complete')
    console.log(`⚡ Generation completed in ${performanceLog.generation}ms`)

    const generatedContent =
      completion.choices[0]?.message?.content ||
      'Content generated successfully!'
    console.log('10. Content generated successfully')

    // 🚀 OPTIMIZED: Parallel usage update and database save
    const dbStart = Date.now()
    logCheckpoint('user db save start')

    const [usageUpdateResult, dbSaveResult] = await Promise.all([
      serviceSupabase.rpc('increment_user_usage', {
        p_user_id: authenticatedUser.id,
        p_increment_by: 1,
        p_month_year: currentMonth,
      }),
      serviceSupabase
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
          // 🚀 FIX: Change field name to match database
          selected_sections: contentSections, // ✅ CORRECT FIELD NAME
          created_at: new Date().toISOString(),
        })
        .select()
        .single(),
    ])

    performanceLog.dbSave = Date.now() - dbStart
    performanceLog.total = Date.now() - startTime
    logCheckpoint('user db save complete')

    console.log(
      `⚡ Performance: Auth:${performanceLog.auth}ms, Usage:${performanceLog.usageCheck}ms, Gen:${performanceLog.generation}ms, DB:${performanceLog.dbSave}ms, Total:${performanceLog.total}ms`
    )

    const { data: usageUpdateData, error: updateError } = usageUpdateResult
    const { data: savedContent, error: saveError } = dbSaveResult

    if (updateError) {
      console.log('11. Warning: Failed to update usage count:', updateError)
      if (!isBackgroundJob) {
        return NextResponse.json(
          { error: 'Failed to update usage tracking' },
          { status: 500 }
        )
      }
    } else {
      console.log(
        '11. Usage count updated via RPC:',
        usageUpdateData?.usage_count || currentUsage + 1
      )
    }

    if (saveError) {
      console.log('12. Warning: Failed to save content:', saveError)
    } else {
      console.log(
        '12. Content saved to database with voice, image, sections, and background job metadata'
      )
    }

    // Enhanced response with performance metrics and content section info
    logCheckpoint('user response sent')
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
      // 🚀 NEW: Content section info
      contentInfo: {
        selectedSections: contentSections,
        sectionsCount: selectedSectionCount,
        isFullPackage: selectedSectionCount === 6,
        tokensUsed: maxTokens,
      },
      // ADD THESE LANGUAGE FIELDS:
      language: normalizedTargetLang,
      wasMultilingual: normalizedTargetLang !== 'en',
      languageInfo: {
        source: sourceLanguage,
        target: normalizedTargetLang,
        languageName:
          SUPPORTED_LANGUAGES[normalizedTargetLang]?.name ||
          normalizedTargetLang,
      },
      jobInfo: {
        isBackgroundJob: !!isBackgroundJob,
        processedBy: isBackgroundJob ? 'background-processor' : 'user-request',
      },
      // 🚀 NEW: Performance metrics
      performance: performanceLog,
    })
  } catch (error) {
    const errorTime = Date.now() - startTime
    console.error(`=== GENERATE API ERROR after ${errorTime}ms ===`)
    console.error('Error details:', error)
    if (typeof logCheckpoint === 'function') logCheckpoint('error thrown')
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        performance: { total: errorTime },
      },
      { status: 500 }
    )
  }
}

// 🚀 NEW: Calculate optimal tokens based on selected sections
function calculateTokensForSections(
  contentSections: ContentSections,
  isVoiceEnhancement: boolean = false
): number {
  const baseTokens = isVoiceEnhancement ? 800 : 1000
  const sectionTokens = {
    title: 100,
    sellingPoints: 200,
    description: 300,
    instagramCaption: 250,
    blogIntro: 300,
    callToAction: 100,
  }

  let totalTokens = 100 // Base overhead

  Object.entries(contentSections).forEach(([section, enabled]) => {
    if (enabled) {
      totalTokens += sectionTokens[section as keyof typeof sectionTokens] || 150
    }
  })

  // Ensure minimum viable tokens but cap for efficiency
  return Math.min(Math.max(totalTokens, 400), 1500)
}

// 🚀 ENHANCED: Enhanced prompt creation function with content section selection
function createPrompt(
  productName: string,
  features: string,
  platform: string,
  selectedSections: ContentSections, // 🚀 NEW: Content sections parameter
  imageAnalysis?: string,
  hasImages?: boolean,
  hasProcessedImages?: boolean,
  voiceTranscription?: string,
  existingContent?: string,
  targetLanguage?: string
): string {
  const platformInstructions = {
    amazon: {
      title: 'Amazon Product Listing Package',
      instructions:
        'Create a complete Amazon-optimized content package with SEO-friendly title, bullet points, description, Instagram caption, and blog intro. Focus on keywords, benefits, and conversion.',
    },
    ebay: {
      title: 'eBay Listing Package',
      instructions:
        'Create eBay-optimized content with competitive pricing focus, condition details, shipping info, and buyer confidence elements. Emphasize value, authenticity, and quick purchase incentives.',
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
    walmart: {
      title: 'Walmart Marketplace Listing Package',
      instructions:
        'Create Walmart-optimized content emphasizing value, competitive pricing, and practical benefits. Include clear product specifications, everyday low price messaging, and family-friendly appeal. Focus on bulk options, fast shipping, and trusted quality at affordable prices.',
    },
    meta: {
      // ADD THIS ENTRY
      title: 'Meta (Facebook & Instagram) Content Package',
      instructions:
        'Create engaging social commerce content optimized for Facebook and Instagram. Focus on visual storytelling, lifestyle benefits, and social proof. Include compelling captions with emojis, strategic hashtags, and clear CTAs for both platforms. Emphasize shareability, engagement, and community building.',
    },
    custom: {
      title: 'Universal Product Content Package',
      instructions:
        'Create versatile, platform-agnostic content that works across any e-commerce platform. Use professional language without platform-specific requirements. Focus on clear benefits, technical specifications, and universal value propositions suitable for both B2B and B2C contexts.',
    },
  }

  const config =
    platformInstructions[platform as keyof typeof platformInstructions] ||
    platformInstructions.amazon

  // 🚀 NEW: Build section list based on selections
  const selectedSectionsList: string[] = []
  const sectionLabels: Record<keyof ContentSections, string> = {
    title: 'PRODUCT TITLE/HEADLINE',
    sellingPoints: 'KEY SELLING POINTS',
    description: 'DETAILED PRODUCT DESCRIPTION',
    instagramCaption: 'INSTAGRAM CAPTION',
    blogIntro: 'BLOG INTRO',
    callToAction: 'CALL-TO-ACTION',
  }

  Object.entries(selectedSections).forEach(([section, enabled]) => {
    if (enabled) {
      selectedSectionsList.push(
        sectionLabels[section as keyof typeof sectionLabels]
      )
    }
  })

  const sectionCount = selectedSectionsList.length
  const isCustomSelection = sectionCount < 6

  // Voice enhancement mode
  if (existingContent && voiceTranscription) {
    let prompt = `VOICE ENHANCEMENT MODE: Refine and enhance the following voice-generated content for ${platform}:

=== EXISTING CONTENT TO ENHANCE ===
${existingContent}

=== ORIGINAL VOICE INPUT ===
"${voiceTranscription}"

=== PRODUCT DETAILS ===
Product Name: ${productName}
Key Features: ${features}${
      targetLanguage && targetLanguage !== 'en'
        ? `\n\n🌍 IMPORTANT: Generate ALL enhanced content in ${SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage}. Every section must be written in this language.`
        : ''
    }`

    if (hasImages && imageAnalysis) {
      prompt += `

Visual Analysis: ${imageAnalysis}`

      if (hasProcessedImages) {
        prompt += `

🎨 PROFESSIONAL IMAGES: This product has processed images with clean background removal, creating premium presentation.`
      }
    }

    // AFTER:
    prompt += `

=== ENHANCEMENT INSTRUCTIONS ===
Please enhance the existing content while:
1. Preserving all key details and benefits from the original voice input
2. Maintaining the authentic tone and intent of the speaker
3. Improving structure, grammar, and professional presentation
4. Optimizing for ${platform} best practices
5. ${isCustomSelection ? `Focusing ONLY on these ${sectionCount} sections: ${selectedSectionsList.join(', ')}` : 'Adding any missing elements for a complete content package'}${
      hasProcessedImages
        ? '\n6. Emphasizing the professional image quality where appropriate'
        : ''
    }
7. IMPORTANT: Remove any generic marketing phrases like "Elevate Your", "Transform Your", etc. from titles - start with the actual product name instead

${
  isCustomSelection
    ? `Provide the enhanced content for ONLY these ${sectionCount} selected sections:`
    : 'Provide the enhanced content in this exact structure:'
}

${
  selectedSections.title
    ? `**1. ENHANCED PRODUCT TITLE/HEADLINE:**
- Refined SEO-optimized title for ${platform}

`
    : ''
}${
      selectedSections.sellingPoints
        ? `**${selectedSections.title ? '2' : '1'}. REFINED KEY SELLING POINTS:**
- 5-7 polished bullet points from voice input

`
        : ''
    }${
      selectedSections.description
        ? `**${[selectedSections.title, selectedSections.sellingPoints].filter(Boolean).length + 1}. ENHANCED PRODUCT DESCRIPTION:**
- Professional version of the voice description
- Maintains original intent but improves clarity

`
        : ''
    }${
      selectedSections.instagramCaption
        ? `**${[selectedSections.title, selectedSections.sellingPoints, selectedSections.description].filter(Boolean).length + 1}. ENHANCED INSTAGRAM CAPTION:**
- Refined social media version (150-300 words)
- Relevant emojis and 15-20 hashtags
- Clear call-to-action

`
        : ''
    }${
      selectedSections.blogIntro
        ? `**${[selectedSections.title, selectedSections.sellingPoints, selectedSections.description, selectedSections.instagramCaption].filter(Boolean).length + 1}. ENHANCED BLOG INTRO:**
- Professional blog introduction (200-400 words)
- Preserves voice input insights
- SEO-optimized structure

`
        : ''
    }${
      selectedSections.callToAction
        ? `**${selectedSectionsList.length}. ENHANCED CALL-TO-ACTION:**
- Platform-optimized conversion focus

`
        : ''
    }Make all enhancements feel natural and maintain the speaker's original passion and knowledge about the product.`

    return prompt
  }

  // Standard generation mode
  let prompt = `Create content for the following product:

Product Name: ${productName}
Key Features: ${features}${
    targetLanguage && targetLanguage !== 'en'
      ? `\n\n🌍 IMPORTANT: Generate ALL content in ${SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage}. Every section must be written in this language.`
      : ''
  }`

  if (voiceTranscription && !existingContent) {
    prompt += `

Voice Input Context: "${voiceTranscription}"
Note: The user provided additional context through voice input. Use this natural language description to add authentic details and passion to the content.`
  }

  if (hasImages && imageAnalysis) {
    // Replace the same section with this:
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

  // ADD THIS NEW SECTION - TITLE GUIDELINES
  prompt += `

🚫 CRITICAL TITLE RULES:
1. NEVER start titles with these generic phrases:
   - "Elevate Your..."
   - "Transform Your..."
   - "Discover..."
   - "Experience..."
   - "Unlock..."
   - "Unleash..."
   - "Enhance Your..."
   - "Revolutionize Your..."

2. ALWAYS start titles with:
   - The actual product/brand name (e.g., "Barraid WHI010 Whiskey Glass Set")
   - A specific product descriptor (e.g., "Premium 300ML Crystal Whiskey Glasses")
   - The key product category (e.g., "Professional Whiskey Glass Set")

3. Good title examples:
   - "Barraid WHI010 Whiskey Glass Set - 300ML Premium Crystal"
   - "Nike Air Max 270 Running Shoes - Men's Athletic Footwear"
   - "Professional Wireless Headphones with Active Noise Cancellation"

4. Bad title examples to avoid:
   - "Elevate Your Drinking Experience with..."
   - "Transform Your Workout with..."
   - "Discover the Perfect Solution for..."`

  if (voiceTranscription) {
    prompt += ` Incorporate the natural, authentic details from the voice input to make the content more genuine and compelling.`
  }

  // Platform-specific enhancements for Walmart and Custom
  if (platform === 'walmart') {
    prompt += `

WALMART-SPECIFIC REQUIREMENTS:
- Emphasize everyday low prices and value for money
- Include family-friendly language and practical benefits
- Mention bulk buying options if applicable
- Use terms like "Great Value", "Rollback", or "Everyday Low Price" where appropriate
- Focus on quantity, practicality, and cost-effectiveness
- Compare favorably against competitors on price
- Highlight fast, free shipping options`
  }

  if (platform === 'meta') {
    // ADD THIS ENTIRE BLOCK
    prompt += `

META (FACEBOOK & INSTAGRAM) SPECIFIC REQUIREMENTS:
- Create content that works seamlessly on both Facebook and Instagram
- Use conversational, engaging tone that encourages interaction
- Include relevant emojis throughout the content
- Focus on lifestyle benefits and visual appeal
- Create shareable content that encourages user-generated content
- Include Instagram-specific hashtags (20-30) and Facebook-friendly tags (5-10)
- Emphasize social proof and community aspects
- Use storytelling to connect emotionally with audience
- Include clear CTAs for both shopping and engagement`
  }

  if (platform === 'custom') {
    prompt += `

UNIVERSAL CONTENT REQUIREMENTS:
- Avoid platform-specific terminology or branding
- Use neutral, professional language suitable for any marketplace
- Include comprehensive technical specifications
- Provide content in easily adaptable sections
- Balance B2B and B2C appeal
- Focus on product quality and universal benefits
- Make content modular for easy customization`
  }

  // 🚀 NEW: Custom section selection
  if (isCustomSelection) {
    prompt += `

🎯 IMPORTANT: Generate ONLY the following ${sectionCount} content sections (skip others):
${selectedSectionsList.map((section, index) => `${index + 1}. ${section}`).join('\n')}

Please provide a focused content package with ONLY these ${sectionCount} sections:`
  } else {
    prompt += `

Please provide a comprehensive content package with ALL of the following sections:`
  }

  // 🚀 NEW: Dynamic section generation based on selection
  let sectionNumber = 1

  if (selectedSections.title) {
    prompt += `

**${sectionNumber}. PRODUCT TITLE/HEADLINE:**
- SEO-optimized main title for ${platform}${
      hasProcessedImages
        ? '\n- Emphasize premium/professional quality where appropriate'
        : ''
    }${voiceTranscription ? '\n- Incorporate key elements from voice input' : ''}`

    if (platform === 'walmart') {
      prompt +=
        '\n- Include value-focused keywords like "affordable", "value pack", or "family size"'
    } else if (platform === 'custom') {
      prompt += '\n- Keep title versatile and platform-neutral'
    }

    sectionNumber++
  }

  if (selectedSections.sellingPoints) {
    prompt += `

**${sectionNumber}. KEY SELLING POINTS:**
- 5-7 bullet points highlighting main benefits${
      hasProcessedImages
        ? '\n- Include professional presentation as a quality indicator'
        : ''
    }${
      voiceTranscription
        ? '\n- Use authentic language from voice description'
        : ''
    }`

    if (platform === 'walmart') {
      prompt += '\n- Emphasize value, savings, and practical everyday benefits'
      prompt += '\n- Include family-friendly features and bulk options'
    } else if (platform === 'custom') {
      prompt += '\n- Use universally appealing benefit statements'
      prompt += '\n- Avoid marketplace-specific claims'
    }

    sectionNumber++
  }

  if (selectedSections.description) {
    prompt += `

**${sectionNumber}. DETAILED PRODUCT DESCRIPTION:**
- Comprehensive description optimized for ${platform}
- Focus on benefits, features, and value proposition${
      hasProcessedImages
        ? '\n- Subtly reference professional quality and presentation'
        : ''
    }${
      voiceTranscription
        ? '\n- Weave in natural product insights from voice input'
        : ''
    }`

    if (platform === 'walmart') {
      prompt += '\n- Emphasize affordability and everyday use cases'
      prompt += '\n- Include comparison with similar products on value'
      prompt += '\n- Mention warranty, returns, and customer satisfaction'
    } else if (platform === 'custom') {
      prompt += '\n- Structure content in modular paragraphs'
      prompt += '\n- Include technical specifications section'
      prompt += '\n- Provide both feature and benefit explanations'
    }

    sectionNumber++
  }

  if (selectedSections.instagramCaption) {
    prompt += `

**${sectionNumber}. INSTAGRAM CAPTION:**
- Engaging social media caption (150-300 words)
- Include relevant emojis
- Add 15-20 strategic hashtags
- Call-to-action for engagement${
      hasProcessedImages ? '\n- Use visual appeal as a hook' : ''
    }${voiceTranscription ? '\n- Capture the enthusiasm from voice input' : ''}`

    if (platform === 'walmart') {
      prompt +=
        '\n- Include hashtags like #WalmartFinds #GreatValue #FamilySavings'
      prompt += '\n- Focus on practical lifestyle benefits'
    } else if (platform === 'custom') {
      prompt += '\n- Use generic, widely applicable hashtags'
      prompt += '\n- Keep brand mentions neutral'
    }

    sectionNumber++
  }

  if (selectedSections.blogIntro) {
    prompt += `

**${sectionNumber}. BLOG INTRO:**
- Compelling blog post introduction (200-400 words)
- Hook readers with an interesting opening
- Set up the problem/solution narrative
- SEO-friendly and shareable content${
      voiceTranscription
        ? '\n- Use authentic insights from voice description'
        : ''
    }`

    if (platform === 'walmart') {
      prompt += '\n- Focus on budget-conscious lifestyle content'
      prompt += '\n- Include family and value-oriented themes'
    } else if (platform === 'custom') {
      prompt += '\n- Keep tone professional and adaptable'
      prompt += '\n- Avoid platform-specific references'
    }

    sectionNumber++
  }

  if (selectedSections.callToAction) {
    prompt += `

**${sectionNumber}. CALL-TO-ACTION:**
- Platform-specific conversion-focused CTA${
      hasProcessedImages
        ? '\n- Leverage professional presentation for trust-building'
        : ''
    }`

    if (platform === 'walmart') {
      prompt += '\n- Emphasize limited-time savings or rollback prices'
      prompt += '\n- Include "Add to Cart" and "Buy Now" language'
      prompt += '\n- Mention free shipping thresholds'
    } else if (platform === 'custom') {
      prompt += '\n- Provide multiple CTA options for different platforms'
      prompt += '\n- Include both soft and hard sell variations'
    }
  }

  prompt += `

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

  // 🚀 NEW: Add efficiency note for custom selections
  if (isCustomSelection) {
    prompt += `

🚀 EFFICIENCY NOTE: Focus only on the ${sectionCount} requested sections above. Do not generate content for sections not listed.`
  }

  return prompt
}
