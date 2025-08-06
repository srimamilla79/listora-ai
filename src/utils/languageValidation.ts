// src/utils/languageValidation.ts
import {
  SUPPORTED_LANGUAGES,
  isValidLanguageCode,
  getLanguageConfig,
} from '@/config/languages'
import {
  getMarketplaceConfig,
  isLanguageSupportedByMarketplace,
  getMarketplaceValidationLevel,
} from '@/config/marketplaces'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions?: string[]
}

export interface LanguagePair {
  source: string
  target: string
}

/**
 * Validate a language code
 */
export function validateLanguageCode(code: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (!code) {
    errors.push('Language code is required')
    return { isValid: false, errors, warnings }
  }

  if (!isValidLanguageCode(code)) {
    errors.push(`Invalid language code: ${code}`)

    // Suggest similar codes
    const similar = findSimilarLanguageCodes(code)
    if (similar.length > 0) {
      suggestions.push(...similar)
      warnings.push(`Did you mean: ${similar.join(', ')}?`)
    }
  }

  // Check for deprecated codes
  const deprecated: Record<string, string> = {
    iw: 'he', // Hebrew
    in: 'id', // Indonesian
    ji: 'yi', // Yiddish
    no: 'nb', // Norwegian Bokmål
  }

  if (deprecated[code]) {
    warnings.push(
      `Language code '${code}' is deprecated. Use '${deprecated[code]}' instead.`
    )
    suggestions.push(deprecated[code])
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}

/**
 * Validate a language pair for translation
 */
export function validateLanguagePair(pair: LanguagePair): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // Validate individual codes
  const sourceValidation = validateLanguageCode(pair.source)
  const targetValidation = validateLanguageCode(pair.target)

  errors.push(...sourceValidation.errors.map((e) => `Source: ${e}`))
  errors.push(...targetValidation.errors.map((e) => `Target: ${e}`))
  warnings.push(...sourceValidation.warnings.map((w) => `Source: ${w}`))
  warnings.push(...targetValidation.warnings.map((w) => `Target: ${w}`))

  if (sourceValidation.suggestions) {
    suggestions.push(...sourceValidation.suggestions.map((s) => `source:${s}`))
  }
  if (targetValidation.suggestions) {
    suggestions.push(...targetValidation.suggestions.map((s) => `target:${s}`))
  }

  // Check for same language
  if (pair.source === pair.target && pair.source !== 'auto') {
    warnings.push('Source and target languages are the same')
  }

  // Check for unsupported combinations
  const unsupportedPairs = getUnsupportedLanguagePairs()
  const pairKey = `${pair.source}-${pair.target}`
  if (unsupportedPairs.has(pairKey)) {
    warnings.push('This language pair may have limited translation quality')
  }

  // Check for recommended pairs
  const recommendedPairs = getRecommendedLanguagePairs()
  if (recommendedPairs.has(pairKey)) {
    warnings.push(`✓ This is a commonly used language pair with good support`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}

/**
 * Find similar language codes (for typo correction)
 */
function findSimilarLanguageCodes(code: string): string[] {
  const similar: string[] = []
  const lowerCode = code.toLowerCase()

  for (const supportedCode of Object.keys(SUPPORTED_LANGUAGES)) {
    if (supportedCode === 'auto') continue

    // Check for partial matches
    if (
      supportedCode.includes(lowerCode) ||
      lowerCode.includes(supportedCode)
    ) {
      similar.push(supportedCode)
      continue
    }

    // Check Levenshtein distance
    if (levenshteinDistance(lowerCode, supportedCode) <= 1) {
      similar.push(supportedCode)
    }

    // Check language names
    const config = getLanguageConfig(supportedCode)
    if (
      config.name.toLowerCase().startsWith(lowerCode) ||
      config.nativeName.toLowerCase().startsWith(lowerCode)
    ) {
      similar.push(supportedCode)
    }
  }

  // Remove duplicates and limit to top 3
  return [...new Set(similar)].slice(0, 3)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Get language pairs that may have quality issues
 */
function getUnsupportedLanguagePairs(): Set<string> {
  return new Set([
    'la-auto', // Latin to auto-detect doesn't make sense
    'eo-auto', // Esperanto to auto-detect
    'la-eo', // Latin to Esperanto
    'yi-haw', // Yiddish to Hawaiian
    // Add more as needed based on your translation service
  ])
}

/**
 * Get commonly used language pairs with good support
 */
function getRecommendedLanguagePairs(): Set<string> {
  return new Set([
    'en-es',
    'es-en',
    'en-fr',
    'fr-en',
    'en-de',
    'de-en',
    'en-zh',
    'zh-en',
    'en-ja',
    'ja-en',
    'en-ko',
    'ko-en',
    'en-pt',
    'pt-en',
    'en-it',
    'it-en',
    'en-ru',
    'ru-en',
    'en-ar',
    'ar-en',
    'en-hi',
    'hi-en',
    'en-te',
    'te-en',
    'auto-en',
    'auto-es',
    'auto-fr',
    'auto-de',
    'auto-zh',
  ])
}

/**
 * Validate language selection for a platform using marketplace config
 */
export function validatePlatformLanguage(
  platform: string,
  language: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // Basic language validation
  const langValidation = validateLanguageCode(language)
  errors.push(...langValidation.errors)
  warnings.push(...langValidation.warnings)
  if (langValidation.suggestions) {
    suggestions.push(...langValidation.suggestions)
  }

  // Get marketplace configuration
  const marketplaceConfig = getMarketplaceConfig(platform)

  if (!marketplaceConfig) {
    warnings.push(`Unknown marketplace: ${platform}. Using default validation.`)
    return { isValid: errors.length === 0, errors, warnings, suggestions }
  }

  // Check if language is supported by marketplace
  const isSupported = isLanguageSupportedByMarketplace(platform, language)
  const validationLevel = getMarketplaceValidationLevel(platform)

  if (!isSupported) {
    const langName = getLanguageConfig(language).name

    if (marketplaceConfig.supportedLanguages === 'all') {
      // This shouldn't happen, but just in case
      warnings.push(`${marketplaceConfig.name} supports all languages.`)
    } else if (Array.isArray(marketplaceConfig.supportedLanguages)) {
      const supportedNames = marketplaceConfig.supportedLanguages
        .slice(0, 5)
        .map((code) => getLanguageConfig(code).name)
        .join(', ')

      const message = `${marketplaceConfig.name} officially supports: ${supportedNames}${
        marketplaceConfig.supportedLanguages.length > 5 ? ', and more' : ''
      }`

      if (
        validationLevel === 'strict' ||
        marketplaceConfig.requiresSpecificLanguage
      ) {
        errors.push(message + `. Content must be in one of these languages.`)
        suggestions.push(...marketplaceConfig.supportedLanguages.slice(0, 3))
      } else {
        warnings.push(message + `. Content in ${langName} may need review.`)
      }
    }
  }

  // Add marketplace-specific recommendations
  if (marketplaceConfig.region && isSupported) {
    const regionLanguages = getLanguagesByMarketplaceRegion(
      marketplaceConfig.region
    )
    if (regionLanguages.length > 0 && !regionLanguages.includes(language)) {
      warnings.push(
        `For ${marketplaceConfig.region} region, consider also using: ${regionLanguages
          .slice(0, 3)
          .map((code) => getLanguageConfig(code).name)
          .join(', ')}`
      )
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}

/**
 * Get languages commonly used in a marketplace region
 */
function getLanguagesByMarketplaceRegion(region: string): string[] {
  const regionLanguages: Record<string, string[]> = {
    'north-america': ['en', 'es', 'fr'],
    europe: ['en', 'de', 'fr', 'it', 'es', 'pl', 'nl'],
    asia: ['zh', 'ja', 'ko', 'en', 'hi', 'id', 'th'],
    india: ['en', 'hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa'],
    spain: ['es', 'ca', 'eu', 'gl'],
    france: ['fr'],
    germany: ['de'],
    italy: ['it'],
    japan: ['ja'],
    'latin-america': ['es', 'pt', 'en'],
    'middle-east': ['ar', 'he', 'fa', 'tr', 'en'],
    africa: ['en', 'fr', 'ar', 'sw', 'zu', 'yo', 'am'],
  }

  return regionLanguages[region] || []
}

/**
 * Check if a language requires special handling
 */
export function getLanguageRequirements(code: string): {
  requiresSpecialFont?: boolean
  isRTL?: boolean
  requiresIME?: boolean
  scriptType?: string
  writingDirection?: 'ltr' | 'rtl' | 'ttb'
} {
  const config = getLanguageConfig(code)

  const requirements: any = {
    isRTL: config.rtl || false,
    writingDirection: config.rtl ? 'rtl' : 'ltr',
  }

  // Languages that might need special fonts
  const specialFontLanguages = new Set([
    'ar',
    'he',
    'fa',
    'ur',
    'ps',
    'ug', // RTL scripts
    'hi',
    'te',
    'ta',
    'mr',
    'bn',
    'gu',
    'kn',
    'ml',
    'pa', // Indic scripts
    'th',
    'my',
    'km',
    'lo', // Southeast Asian scripts
    'zh',
    'ja',
    'ko', // CJK
    'am',
    'ka',
    'hy', // Other unique scripts
    'si',
    'dv',
    'ti', // Additional South Asian
  ])

  if (specialFontLanguages.has(code)) {
    requirements.requiresSpecialFont = true
  }

  // Languages that typically need IME (Input Method Editor)
  const imeLanguages = new Set(['zh', 'ja', 'ko', 'vi'])
  if (imeLanguages.has(code)) {
    requirements.requiresIME = true
  }

  // Script types for better categorization
  const scriptTypes: Record<string, string> = {
    ar: 'Arabic',
    he: 'Hebrew',
    hi: 'Devanagari',
    bn: 'Bengali',
    pa: 'Gurmukhi',
    gu: 'Gujarati',
    or: 'Oriya',
    ta: 'Tamil',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    si: 'Sinhala',
    th: 'Thai',
    lo: 'Lao',
    my: 'Myanmar',
    ka: 'Georgian',
    km: 'Khmer',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Cyrillic',
    el: 'Greek',
    hy: 'Armenian',
    am: 'Ethiopic',
  }

  requirements.scriptType = scriptTypes[code] || 'Latin'

  return requirements
}

/**
 * Validate text content for a specific language
 */
export function validateContentForLanguage(
  content: string,
  languageCode: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!content) {
    errors.push('Content is empty')
    return { isValid: false, errors, warnings }
  }

  const requirements = getLanguageRequirements(languageCode)

  // Check for mixed scripts (potential issue)
  const mixedScriptResult = checkMixedScripts(content, languageCode)
  if (mixedScriptResult.hasMixedScripts) {
    warnings.push(
      `Content contains mixed scripts (${mixedScriptResult.scripts.join(', ')}). ` +
        `This may indicate translation or encoding issues.`
    )
  }

  // Check for RTL/LTR mixing
  if (requirements.isRTL && hasSignificantLTRContent(content)) {
    warnings.push(
      'RTL language content contains significant LTR text. ' +
        'This may affect display and readability.'
    )
  }

  // Check for proper language characteristics
  const langCharacteristics = checkLanguageCharacteristics(
    content,
    languageCode
  )
  if (!langCharacteristics.isValid) {
    warnings.push(...langCharacteristics.warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Check if content has mixed scripts
 */
function checkMixedScripts(
  content: string,
  primaryLanguage: string
): {
  hasMixedScripts: boolean
  scripts: string[]
  percentages: Record<string, number>
} {
  const scripts = new Map<string, number>()
  const totalChars = content.length

  // Define script patterns
  const scriptPatterns: Array<{ pattern: RegExp; script: string }> = [
    { pattern: /[\u0600-\u06FF\u0750-\u077F]/g, script: 'Arabic' },
    { pattern: /[\u0590-\u05FF]/g, script: 'Hebrew' },
    { pattern: /[\u0900-\u097F]/g, script: 'Devanagari' },
    { pattern: /[\u0980-\u09FF]/g, script: 'Bengali' },
    { pattern: /[\u0A00-\u0A7F]/g, script: 'Gurmukhi' },
    { pattern: /[\u0A80-\u0AFF]/g, script: 'Gujarati' },
    { pattern: /[\u0B00-\u0B7F]/g, script: 'Oriya' },
    { pattern: /[\u0B80-\u0BFF]/g, script: 'Tamil' },
    { pattern: /[\u0C00-\u0C7F]/g, script: 'Telugu' },
    { pattern: /[\u0C80-\u0CFF]/g, script: 'Kannada' },
    { pattern: /[\u0D00-\u0D7F]/g, script: 'Malayalam' },
    { pattern: /[\u0D80-\u0DFF]/g, script: 'Sinhala' },
    { pattern: /[\u0E00-\u0E7F]/g, script: 'Thai' },
    { pattern: /[\u0E80-\u0EFF]/g, script: 'Lao' },
    { pattern: /[\u1000-\u109F]/g, script: 'Myanmar' },
    { pattern: /[\u10A0-\u10FF]/g, script: 'Georgian' },
    { pattern: /[\u1780-\u17FF]/g, script: 'Khmer' },
    { pattern: /[\u4E00-\u9FFF]/g, script: 'CJK' },
    { pattern: /[\u3040-\u309F\u30A0-\u30FF]/g, script: 'Japanese' },
    { pattern: /[\uAC00-\uD7AF]/g, script: 'Korean' },
    { pattern: /[\u0400-\u04FF]/g, script: 'Cyrillic' },
    { pattern: /[\u0370-\u03FF]/g, script: 'Greek' },
    { pattern: /[\u0530-\u058F]/g, script: 'Armenian' },
    { pattern: /[\u1200-\u137F]/g, script: 'Ethiopic' },
    { pattern: /[A-Za-z]/g, script: 'Latin' },
  ]

  // Count characters by script
  for (const { pattern, script } of scriptPatterns) {
    const matches = content.match(pattern)
    if (matches) {
      scripts.set(script, matches.join('').length)
    }
  }

  // Calculate percentages
  const percentages: Record<string, number> = {}
  scripts.forEach((count, script) => {
    percentages[script] = (count / totalChars) * 100
  })

  // Determine if mixed (more than one significant script)
  const significantScripts = Array.from(scripts.entries())
    .filter(([_, count]) => count / totalChars > 0.1) // More than 10%
    .map(([script]) => script)

  // Get expected script for the language
  const expectedScript =
    getLanguageRequirements(primaryLanguage).scriptType || 'Latin'

  // Allow Latin mixed with one other script (common for technical terms)
  const nonLatinScripts = significantScripts.filter((s) => s !== 'Latin')
  const hasMixedScripts =
    nonLatinScripts.length > 1 ||
    (nonLatinScripts.length === 1 && nonLatinScripts[0] !== expectedScript)

  return {
    hasMixedScripts,
    scripts: Array.from(scripts.keys()),
    percentages,
  }
}

/**
 * Check if RTL content has significant LTR text
 */
function hasSignificantLTRContent(content: string): boolean {
  const latinMatches = content.match(/[A-Za-z]+/g) || []
  const totalLatinChars = latinMatches.join('').length
  const contentLength = content.replace(/\s/g, '').length // Exclude whitespace

  // More than 30% Latin characters is significant
  return contentLength > 0 && totalLatinChars / contentLength > 0.3
}

/**
 * Check language-specific characteristics
 */
function checkLanguageCharacteristics(
  content: string,
  languageCode: string
): {
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  let isValid = true

  // Language-specific checks
  switch (languageCode) {
    case 'zh':
      // Chinese should have Chinese characters
      if (!/[\u4E00-\u9FFF]/.test(content)) {
        warnings.push(
          'Content marked as Chinese but contains no Chinese characters'
        )
        isValid = false
      }
      break

    case 'ja':
      // Japanese should have Hiragana, Katakana, or Kanji
      if (!/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(content)) {
        warnings.push(
          'Content marked as Japanese but contains no Japanese characters'
        )
        isValid = false
      }
      break

    case 'ko':
      // Korean should have Hangul
      if (!/[\uAC00-\uD7AF]/.test(content)) {
        warnings.push(
          'Content marked as Korean but contains no Hangul characters'
        )
        isValid = false
      }
      break

    case 'ar':
    case 'fa':
    case 'ur':
      // Arabic script languages
      if (!/[\u0600-\u06FF]/.test(content)) {
        warnings.push(
          `Content marked as ${getLanguageConfig(languageCode).name} but contains no Arabic script`
        )
        isValid = false
      }
      break

    case 'hi':
    case 'mr':
    case 'ne':
      // Devanagari script languages
      if (!/[\u0900-\u097F]/.test(content)) {
        warnings.push(
          `Content marked as ${getLanguageConfig(languageCode).name} but contains no Devanagari script`
        )
        isValid = false
      }
      break

    case 'te':
      // Telugu
      if (!/[\u0C00-\u0C7F]/.test(content)) {
        warnings.push('Content marked as Telugu but contains no Telugu script')
        isValid = false
      }
      break

    case 'ta':
      // Tamil
      if (!/[\u0B80-\u0BFF]/.test(content)) {
        warnings.push('Content marked as Tamil but contains no Tamil script')
        isValid = false
      }
      break
  }

  return { isValid, warnings }
}

/**
 * Get validation summary for multiple languages
 */
export function validateMultipleLanguages(languages: string[]): {
  valid: string[]
  invalid: string[]
  deprecated: string[]
  suggestions: Record<string, string[]>
} {
  const valid: string[] = []
  const invalid: string[] = []
  const deprecated: string[] = []
  const suggestions: Record<string, string[]> = {}

  languages.forEach((lang) => {
    const validation = validateLanguageCode(lang)

    if (validation.isValid) {
      if (validation.warnings.some((w) => w.includes('deprecated'))) {
        deprecated.push(lang)
      } else {
        valid.push(lang)
      }
    } else {
      invalid.push(lang)
    }

    if (validation.suggestions && validation.suggestions.length > 0) {
      suggestions[lang] = validation.suggestions
    }
  })

  return { valid, invalid, deprecated, suggestions }
}

/**
 * Suggest alternative languages based on similarity or region
 */
export function suggestAlternativeLanguages(
  languageCode: string,
  count: number = 5
): string[] {
  const suggestions = new Set<string>()
  const config = getLanguageConfig(languageCode)

  // Similar script languages
  const scriptGroups: Record<string, string[]> = {
    Devanagari: ['hi', 'mr', 'ne', 'sa'],
    Arabic: ['ar', 'fa', 'ur', 'ps'],
    Latin: ['en', 'es', 'fr', 'de', 'it', 'pt'],
    Cyrillic: ['ru', 'uk', 'bg', 'sr', 'mk'],
    Chinese: ['zh', 'ja'],
    Tamil: ['ta', 'si'],
    Telugu: ['te', 'kn'],
  }

  // Find languages with same script
  for (const [script, langs] of Object.entries(scriptGroups)) {
    if (langs.includes(languageCode)) {
      langs.forEach((lang) => {
        if (lang !== languageCode) suggestions.add(lang)
      })
    }
  }

  // Geographic proximity
  const geographicGroups: Record<string, string[]> = {
    'south-asia': [
      'hi',
      'ur',
      'bn',
      'pa',
      'te',
      'ta',
      'mr',
      'gu',
      'kn',
      'ml',
      'ne',
      'si',
    ],
    'east-asia': ['zh', 'ja', 'ko'],
    'southeast-asia': ['th', 'vi', 'id', 'ms', 'tl', 'my', 'km', 'lo'],
    'middle-east': ['ar', 'he', 'fa', 'tr'],
    'europe-latin': ['es', 'fr', 'it', 'pt', 'ro', 'ca', 'gl'],
    'europe-germanic': ['de', 'nl', 'sv', 'no', 'da', 'is'],
    'europe-slavic': ['ru', 'pl', 'cs', 'sk', 'uk', 'bg', 'hr', 'sr', 'sl'],
  }

  for (const [region, langs] of Object.entries(geographicGroups)) {
    if (langs.includes(languageCode)) {
      langs.forEach((lang) => {
        if (lang !== languageCode) suggestions.add(lang)
      })
    }
  }

  return Array.from(suggestions).slice(0, count)
}
