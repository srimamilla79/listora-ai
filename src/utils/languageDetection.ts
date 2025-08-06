// src/utils/languageDetection.ts
import {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  isValidLanguageCode,
} from '@/config/languages'
import { LANGUAGE_PATTERNS } from './languagePatterns'

export interface LanguageIntent {
  requestedLanguage: string | null
  confidence: number
  matchedPattern?: string
  cleanedText: string
}

export interface LanguageDetectionResult {
  detectedLanguage: string
  confidence: number
  alternativeLanguages?: { language: string; confidence: number }[]
}

/**
 * Detect if user is requesting output in a specific language
 */
export async function detectLanguageIntent(
  transcription: string,
  openAIClient?: any
): Promise<LanguageIntent> {
  // First try pattern matching (faster)
  const patternResult = detectLanguageFromPatterns(transcription)
  if (patternResult.requestedLanguage && patternResult.confidence > 0.7) {
    return patternResult
  }

  // If pattern matching isn't confident and OpenAI is available, use AI
  if (openAIClient && patternResult.confidence < 0.7) {
    try {
      const aiResult = await detectLanguageWithAI(transcription, openAIClient)
      // Prefer AI result if more confident
      if (aiResult.confidence > patternResult.confidence) {
        return aiResult
      }
    } catch (error) {
      console.warn(
        'AI language detection failed, using pattern matching:',
        error
      )
    }
  }

  return patternResult
}

/**
 * Pattern-based language intent detection
 */
function detectLanguageFromPatterns(text: string): LanguageIntent {
  const lowerText = text.toLowerCase().trim()
  let bestMatch: LanguageIntent = {
    requestedLanguage: null,
    confidence: 0,
    cleanedText: text,
  }

  // Check each language's patterns
  for (const [langCode, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex, 'gi')
      const match = regex.exec(lowerText)

      if (match) {
        // Calculate confidence based on pattern type and match quality
        let confidence = pattern.confidence || 0.8

        // Boost confidence for exact language name matches
        if (pattern.type === 'exact') {
          confidence = Math.min(confidence + 0.1, 1.0)
        }

        // Check if this is a better match
        if (confidence > bestMatch.confidence) {
          // Clean the text by removing the language instruction
          let cleanedText = text
          if (pattern.removePattern) {
            cleanedText = text
              .replace(new RegExp(pattern.removePattern, 'gi'), '')
              .trim()
          } else {
            cleanedText = text.replace(regex, '').trim()
          }

          bestMatch = {
            requestedLanguage: langCode,
            confidence,
            matchedPattern: pattern.regex,
            cleanedText,
          }
        }
      }
    }
  }

  return bestMatch
}

/**
 * AI-based language intent detection
 */
async function detectLanguageWithAI(
  transcription: string,
  openAIClient: any
): Promise<LanguageIntent> {
  const response = await openAIClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a language intent detector. Analyze if the user is requesting content in a specific language.
        
Return JSON with:
- requestedLanguage: ISO 639-1 code (e.g., 'te' for Telugu, 'ta' for Tamil) or null
- confidence: 0-1 score
- cleanedText: The original text with language instructions removed

Supported languages: ${Object.entries(SUPPORTED_LANGUAGES)
          .filter(([code]) => code !== 'auto')
          .map(([code, config]) => `${code}:${config.name}`)
          .join(', ')}

Examples:
"This is my product, convert to Telugu" → {requestedLanguage: "te", confidence: 0.95, cleanedText: "This is my product"}
"Generate in Spanish please" → {requestedLanguage: "es", confidence: 0.9, cleanedText: ""}
"मेरा प्रोडक्ट है, इसे Tamil में बनाएं" → {requestedLanguage: "ta", confidence: 0.95, cleanedText: "मेरा प्रोडक्ट है"}`,
      },
      {
        role: 'user',
        content: transcription,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0.1,
  })

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || '{}')

    // Validate the language code
    if (
      result.requestedLanguage &&
      !isValidLanguageCode(result.requestedLanguage)
    ) {
      console.warn(`Invalid language code from AI: ${result.requestedLanguage}`)
      result.requestedLanguage = null
      result.confidence = 0
    }

    return {
      requestedLanguage: result.requestedLanguage || null,
      confidence: result.confidence || 0,
      cleanedText: result.cleanedText || transcription,
    }
  } catch (error) {
    console.error('Failed to parse AI language detection response:', error)
    return {
      requestedLanguage: null,
      confidence: 0,
      cleanedText: transcription,
    }
  }
}

/**
 * Extract product information after removing language instructions
 */
export function extractProductInfoWithoutLanguageInstructions(
  transcription: string,
  detectedIntent?: LanguageIntent
): {
  cleanedText: string
  productName: string
  hasLanguageInstruction: boolean
} {
  // Use cleaned text from intent detection if available
  let cleanedText = detectedIntent?.cleanedText || transcription

  // Additional cleanup for common patterns not caught by intent detection
  const additionalPatterns = [
    /please\s+(convert|translate|generate)\s+(this\s+)?(to|in)\s+\w+/gi,
    /convert\s+(this\s+)?(to|in)\s+\w+\s*$/gi,
    /in\s+\w+\s+language\s*$/gi,
    /generate\s+in\s+\w+/gi,
  ]

  for (const pattern of additionalPatterns) {
    cleanedText = cleanedText.replace(pattern, '').trim()
  }

  // Extract product name
  const productName = extractProductName(cleanedText)

  return {
    cleanedText,
    productName,
    hasLanguageInstruction: cleanedText !== transcription,
  }
}

/**
 * Simple product name extraction
 */
function extractProductName(text: string): string {
  const words = text.split(/\s+/).slice(0, 15)
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

/**
 * Validate and normalize language code
 */
export function normalizeLanguageCode(code: string): string | null {
  if (!code) return null

  const normalized = code.toLowerCase().trim()

  // Direct match
  if (isValidLanguageCode(normalized)) {
    return normalized
  }

  // Try to find by language name
  const byName = Object.entries(SUPPORTED_LANGUAGES).find(
    ([_, config]) =>
      config.name.toLowerCase() === normalized ||
      config.nativeName.toLowerCase() === normalized
  )

  if (byName) {
    return byName[0]
  }

  // Common aliases
  const aliases: Record<string, string> = {
    chinese: 'zh',
    mandarin: 'zh',
    cantonese: 'zh',
    spanish: 'es',
    english: 'en',
    french: 'fr',
    german: 'de',
    italian: 'it',
    portuguese: 'pt',
    russian: 'ru',
    japanese: 'ja',
    korean: 'ko',
    arabic: 'ar',
    hindi: 'hi',
    telugu: 'te',
    tamil: 'ta',
  }

  return aliases[normalized] || null
}

/**
 * Get confidence-based language detection from text
 */
export function detectLanguageFromText(text: string): LanguageDetectionResult {
  // This is a simplified version - in production, you might want to use
  // a proper language detection library or API

  // For now, return a simple result
  return {
    detectedLanguage: 'unknown',
    confidence: 0,
    alternativeLanguages: [],
  }
}
