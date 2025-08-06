// src/app/api/voice-to-content/route.ts - MULTILINGUAL ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import OpenAI from 'openai'
import { SUPPORTED_LANGUAGES } from '@/config/languages'
import { normalizeLanguageCode } from '@/utils/languageDetection'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Multilingual Voice to Content API called')
    const startTime = Date.now()

    // OPTIMIZATION 1: Parallel auth and form data parsing
    const [authResult, formDataResult] = await Promise.all([
      getAuthUser(request),
      request.formData(),
    ])

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    const audioFile = formDataResult.get('audio') as File
    const contentType =
      (formDataResult.get('contentType') as string) || 'product'

    // 🌍 NEW: Get language preference from form data
    const selectedLanguage =
      (formDataResult.get('language') as string) || 'auto'
    const targetLanguage =
      (formDataResult.get('targetLanguage') as string) || 'en'
    // Normalize target language
    const normalizedLang = normalizeLanguageCode(targetLanguage) || 'en'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    console.log('✅ User authenticated:', user.id, '- Audio received:', {
      size: audioFile.size,
      type: audioFile.type,
      contentType,
      selectedLanguage,
      targetLanguage,
    })

    // OPTIMIZATION 2: Optimized audio processing
    const optimizedAudioFile = await optimizeAudioFile(audioFile)

    console.log('🔄 Starting multilingual processing...')

    // 🌍 ENHANCED: Multilingual transcription with language detection
    const transcriptionPromise = transcribeAudioMultilingual(
      optimizedAudioFile,
      selectedLanguage,
      targetLanguage
    )
    const contentPromptTemplate = generateContentPromptTemplate(
      contentType,
      targetLanguage
    )

    // Wait for transcription
    const transcriptionResult = await transcriptionPromise
    console.log('✅ Multilingual transcription completed:', {
      detectedLanguage: transcriptionResult.detectedLanguage,
      confidence: transcriptionResult.confidence,
      textLength: transcriptionResult.text.length,
      wasTranslated: transcriptionResult.wasTranslated,
    })

    // OPTIMIZATION 4: Parallel content generation and product name extraction
    const [generatedContent, productName] = await Promise.all([
      generateContentMultilingual(
        transcriptionResult.text,
        contentPromptTemplate,
        targetLanguage,
        transcriptionResult.detectedLanguage
      ),
      extractProductNameOptimized(transcriptionResult.text),
    ])

    console.log('✅ Multilingual content generated successfully')

    const endTime = Date.now()
    console.log(`⚡ Total processing time: ${endTime - startTime}ms`)

    return NextResponse.json({
      success: true,
      transcription: transcriptionResult.text,
      detectedLanguage: transcriptionResult.detectedLanguage,
      confidence: transcriptionResult.confidence,
      wasTranslated: transcriptionResult.wasTranslated,
      targetLanguage: targetLanguage,
      generatedContent,
      productName,
      // ADD THESE:
      language: normalizedLang,
      languageInfo: {
        target: normalizedLang,
        languageName:
          SUPPORTED_LANGUAGES[normalizedLang]?.name || normalizedLang,
      },
      message: `Voice successfully converted to content! ${
        transcriptionResult.wasTranslated
          ? `(Translated from ${transcriptionResult.detectedLanguage} to ${targetLanguage})`
          : ''
      }`,
      processingTime: endTime - startTime,
      multilingualInfo: {
        supportedLanguages: Object.keys(SUPPORTED_LANGUAGES),
        selectedLanguage,
        targetLanguage,
        detectedLanguage: transcriptionResult.detectedLanguage,
      },
    })
  } catch (error) {
    console.error('❌ Multilingual Voice to Content API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process voice content',
        isMultilingualError:
          error instanceof Error && error.message.includes('language'),
      },
      { status: 500 }
    )
  }
}

// 🌍 ENHANCED: Multilingual transcription function
async function transcribeAudioMultilingual(
  audioFile: File,
  selectedLanguage: string = 'auto',
  targetLanguage: string = 'en'
) {
  try {
    console.log('🎙️ Starting multilingual transcription:', {
      selectedLanguage,
      targetLanguage,
      fileSize: audioFile.size,
    })

    // Prepare transcription parameters
    const transcriptionParams: any = {
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json', // 🌍 CHANGED: Get detailed response with language detection
      temperature: 0.2,
    }

    // 🌍 NEW: Only set language if not auto-detect
    if (
      selectedLanguage !== 'auto' &&
      SUPPORTED_LANGUAGES[selectedLanguage as keyof typeof SUPPORTED_LANGUAGES]
    ) {
      const langConfig =
        SUPPORTED_LANGUAGES[
          selectedLanguage as keyof typeof SUPPORTED_LANGUAGES
        ]
      if (langConfig.code) {
        transcriptionParams.language = langConfig.code
      }
    }

    console.log('🔄 Calling Whisper API with params:', transcriptionParams)

    // Call Whisper API
    const transcription =
      await openai.audio.transcriptions.create(transcriptionParams)

    console.log('✅ Whisper response received:', {
      detectedLanguage: (transcription as any).language,
      textLength: transcription.text?.length || 0,
    })

    let finalText = transcription.text
    let wasTranslated = false
    let detectedLanguage = (transcription as any).language || 'unknown'

    // 🌍 NEW: Translate if detected language != target language
    if (detectedLanguage !== targetLanguage && targetLanguage !== 'auto') {
      try {
        console.log(
          `🔄 Translating from ${detectedLanguage} to ${targetLanguage}...`
        )

        const translationResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text from ${detectedLanguage} to ${targetLanguage}. Maintain the original meaning and tone, especially for product descriptions. Return only the translated text without any additional comments.`,
            },
            {
              role: 'user',
              content: finalText,
            },
          ],
          max_tokens: 1000,
          temperature: 0.1,
        })

        const translatedText = translationResponse.choices[0]?.message?.content
        if (translatedText) {
          finalText = translatedText
          wasTranslated = true
          console.log('✅ Translation completed successfully')
        }
      } catch (translationError) {
        console.warn(
          '⚠️ Translation failed, using original text:',
          translationError
        )
        // Continue with original text if translation fails
      }
    }

    return {
      text: finalText,
      detectedLanguage,
      confidence: (transcription as any).language ? 0.95 : 0.8, // Estimate confidence
      wasTranslated,
    }
  } catch (error) {
    console.error('❌ Multilingual transcription failed:', error)

    // Enhanced error handling for multilingual scenarios
    if (error instanceof Error) {
      if (error.message.includes('language not supported')) {
        throw new Error(
          `Language not supported. Please try again with a supported language or use auto-detect.`
        )
      } else if (error.message.includes('Invalid file format')) {
        throw new Error(
          'Audio format not supported. Please try again with a different recording.'
        )
      } else if (error.message.includes('File too large')) {
        throw new Error(
          'Audio file too large. Please record a shorter message.'
        )
      }
    }

    throw new Error('Failed to transcribe audio. Please try recording again.')
  }
}

// 🌍 ENHANCED: Multilingual content generation
async function generateContentMultilingual(
  transcription: string,
  promptTemplate: string,
  targetLanguage: string = 'en',
  detectedLanguage?: string
): Promise<string> {
  // 🌍 NEW: Language-specific system prompt
  const languageInstruction =
    targetLanguage === 'en'
      ? 'Create compelling, conversion-focused content in English.'
      : `Create compelling, conversion-focused content in ${getLanguageName(targetLanguage)}. Use natural, native-speaking tone and cultural context appropriate for ${targetLanguage} markets.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert copywriter specializing in e-commerce content creation${
          targetLanguage && targetLanguage !== 'en'
            ? ` in ${SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage}`
            : ''
        }. Create compelling, conversion-focused content based on voice descriptions. ${
          detectedLanguage && detectedLanguage !== targetLanguage
            ? `The original input was in ${detectedLanguage} but has been translated.`
            : ''
        }`,
      },
      {
        role: 'user',
        content: `Voice Input: "${transcription}"\n\n${promptTemplate}`,
      },
    ],
    max_tokens: 1500,
    temperature: 0.7,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
  })

  return completion.choices[0]?.message?.content || ''
}

// 🌍 HELPER: Get language name from code
function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code]?.name || code
}

// 🌍 ENHANCED: Multilingual content prompt templates
function generateContentPromptTemplate(
  contentType: string,
  targetLanguage: string = 'en'
): string {
  const baseTemplates = {
    product: `Transform this voice input into professional product content with:
• Compelling title with key features
• 4-6 selling points (benefits over features)  
• 2-3 paragraph description with story and CTA
• Platform optimization for Amazon/eBay/Shopify/Etsy/Instagram
• 8-10 SEO keywords

Make it conversion-focused and ready for immediate use.`,

    service: `Transform this voice input into professional service content with:
• Service headline emphasizing outcomes
• Core benefits and methodology
• Credibility and process details
• Client-focused messaging
• Service packages overview

Focus on expertise, results, and client success.`,

    listing: `Transform this voice input into marketplace listing content with:
• Descriptive title with condition/features
• Detailed condition assessment
• Authenticity and value details
• Collector/resale appeal
• Competitive positioning

Emphasize condition, authenticity, and value proposition.`,
  }

  const template =
    baseTemplates[contentType as keyof typeof baseTemplates] ||
    baseTemplates.product

  // 🌍 NEW: Add language-specific instructions
  if (targetLanguage !== 'en') {
    return `${template}\n\nIMPORTANT: Write all content in ${getLanguageName(targetLanguage)} using natural, native-speaking language and cultural context appropriate for ${targetLanguage} markets.`
  }

  return template
}

// EXISTING HELPER FUNCTIONS (unchanged)
async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return { success: false, error: 'Authorization header required' }
  }

  const supabaseAdmin = createServiceRoleClient()
  const token = authHeader.replace('Bearer ', '')
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return { success: false, error: 'Invalid token' }
  }

  return { success: true, user }
}

async function optimizeAudioFile(audioFile: File): Promise<File> {
  if (audioFile.size > 5 * 1024 * 1024) {
    console.log('🗜️ Compressing large audio file...')
  }

  const arrayBuffer = await audioFile.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new File([buffer], audioFile.name || 'audio.webm', {
    type: audioFile.type || 'audio/webm',
  })
}

function extractProductNameOptimized(transcription: string): string {
  const words = transcription.split(/\s+/).slice(0, 15)
  const productIndicators = ['this', 'the', 'a', 'an', 'my', 'our']
  const skipWords = new Set([
    'and',
    'the',
    'for',
    'with',
    'this',
    'that',
    'have',
    'will',
    'can',
    'are',
    'is',
    'it',
    'in',
    'on',
    'at',
    'to',
    'of',
    'or',
    'but',
  ])

  let startIndex = 0
  for (let i = 0; i < Math.min(5, words.length); i++) {
    if (productIndicators.includes(words[i].toLowerCase())) {
      startIndex = i + 1
      break
    }
  }

  const productWords = words
    .slice(startIndex)
    .filter(
      (word) =>
        word.length > 2 &&
        !skipWords.has(word.toLowerCase()) &&
        !/^\d+$/.test(word)
    )
    .slice(0, 4)

  return productWords.length > 0
    ? productWords.join(' ')
    : 'Voice Generated Product'
}
