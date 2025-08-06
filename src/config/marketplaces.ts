// src/config/marketplaces.ts
export interface MarketplaceConfig {
  id: string
  name: string
  displayName: string
  icon?: string
  supportedLanguages: string[] | 'all'
  defaultLanguage: string
  requiresSpecificLanguage?: boolean
  languageValidation?: 'strict' | 'flexible'
  region?: string
  languageRecommendations?: Record<string, string[]> // Recommended languages by country
}

export const MARKETPLACE_CONFIGS: Record<string, MarketplaceConfig> = {
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    displayName: '🛒 Amazon',
    supportedLanguages: [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'ja',
      'zh',
      'pt',
      'nl',
      'pl',
      'tr',
      'ar',
      'sv',
      'hi',
    ],
    defaultLanguage: 'en',
    languageValidation: 'flexible',
    languageRecommendations: {
      US: ['en', 'es'],
      UK: ['en'],
      DE: ['de'],
      FR: ['fr'],
      IT: ['it'],
      ES: ['es', 'ca'],
      JP: ['ja'],
      IN: ['en', 'hi', 'te', 'ta', 'bn', 'mr'],
      BR: ['pt'],
      MX: ['es'],
      CA: ['en', 'fr'],
    },
  },
  'amazon-es': {
    id: 'amazon-es',
    name: 'Amazon Spain',
    displayName: '🛒 Amazon ES',
    supportedLanguages: ['es', 'ca', 'eu', 'gl'],
    defaultLanguage: 'es',
    requiresSpecificLanguage: true,
    region: 'spain',
    languageValidation: 'strict',
  },
  'amazon-fr': {
    id: 'amazon-fr',
    name: 'Amazon France',
    displayName: '🛒 Amazon FR',
    supportedLanguages: ['fr'],
    defaultLanguage: 'fr',
    requiresSpecificLanguage: true,
    region: 'france',
    languageValidation: 'strict',
  },
  'amazon-de': {
    id: 'amazon-de',
    name: 'Amazon Germany',
    displayName: '🛒 Amazon DE',
    supportedLanguages: ['de'],
    defaultLanguage: 'de',
    requiresSpecificLanguage: true,
    region: 'germany',
    languageValidation: 'strict',
  },
  'amazon-it': {
    id: 'amazon-it',
    name: 'Amazon Italy',
    displayName: '🛒 Amazon IT',
    supportedLanguages: ['it'],
    defaultLanguage: 'it',
    requiresSpecificLanguage: true,
    region: 'italy',
    languageValidation: 'strict',
  },
  'amazon-jp': {
    id: 'amazon-jp',
    name: 'Amazon Japan',
    displayName: '🛒 Amazon JP',
    supportedLanguages: ['ja'],
    defaultLanguage: 'ja',
    requiresSpecificLanguage: true,
    region: 'japan',
    languageValidation: 'strict',
  },
  'amazon-in': {
    id: 'amazon-in',
    name: 'Amazon India',
    displayName: '🛒 Amazon IN',
    supportedLanguages: [
      'en',
      'hi',
      'te',
      'ta',
      'kn',
      'ml',
      'mr',
      'bn',
      'gu',
      'pa',
    ],
    defaultLanguage: 'en',
    region: 'india',
    languageValidation: 'flexible',
  },
  ebay: {
    id: 'ebay',
    name: 'eBay',
    displayName: '🏷️ eBay',
    supportedLanguages: [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'zh',
      'ja',
      'ko',
      'pt',
      'nl',
      'pl',
      'ru',
    ],
    defaultLanguage: 'en',
    languageValidation: 'flexible',
  },
  etsy: {
    id: 'etsy',
    name: 'Etsy',
    displayName: '🎨 Etsy',
    supportedLanguages: [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'ja',
      'nl',
      'pl',
      'pt',
      'ru',
    ],
    defaultLanguage: 'en',
    languageValidation: 'flexible',
  },
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    displayName: '🏪 Shopify',
    supportedLanguages: 'all', // Supports all languages
    defaultLanguage: 'en',
    languageValidation: 'flexible',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    displayName: '📱 Instagram',
    supportedLanguages: 'all', // Supports all languages
    defaultLanguage: 'en',
    languageValidation: 'flexible',
  },
  walmart: {
    id: 'walmart',
    name: 'Walmart',
    displayName: '🏬 Walmart',
    supportedLanguages: ['en', 'es'],
    defaultLanguage: 'en',
    region: 'north-america',
    languageValidation: 'strict',
  },
  custom: {
    id: 'custom',
    name: 'Custom Platform',
    displayName: '⚙️ Custom',
    supportedLanguages: 'all',
    defaultLanguage: 'en',
    languageValidation: 'flexible',
  },
}

// Helper functions
export const getMarketplaceConfig = (
  marketplaceId: string
): MarketplaceConfig | null => {
  return MARKETPLACE_CONFIGS[marketplaceId] || null
}

export const isLanguageSupportedByMarketplace = (
  marketplaceId: string,
  languageCode: string
): boolean => {
  const config = getMarketplaceConfig(marketplaceId)
  if (!config) return false

  if (config.supportedLanguages === 'all') return true
  if (Array.isArray(config.supportedLanguages)) {
    return config.supportedLanguages.includes(languageCode)
  }

  return false
}

export const getDefaultLanguageForMarketplace = (
  marketplaceId: string
): string => {
  const config = getMarketplaceConfig(marketplaceId)
  return config?.defaultLanguage || 'en'
}

export const getMarketplacesByLanguage = (languageCode: string): string[] => {
  return Object.entries(MARKETPLACE_CONFIGS)
    .filter(
      ([_, config]) =>
        config.supportedLanguages === 'all' ||
        (Array.isArray(config.supportedLanguages) &&
          config.supportedLanguages.includes(languageCode))
    )
    .map(([id]) => id)
}

export const getRecommendedLanguagesForMarketplace = (
  marketplaceId: string,
  countryCode?: string
): string[] => {
  const config = getMarketplaceConfig(marketplaceId)
  if (!config) return ['en']

  // If country-specific recommendations exist
  if (countryCode && config.languageRecommendations?.[countryCode]) {
    return config.languageRecommendations[countryCode]
  }

  // Return all supported languages or default
  if (config.supportedLanguages === 'all') {
    return ['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt']
  }

  return Array.isArray(config.supportedLanguages)
    ? config.supportedLanguages.slice(0, 5)
    : [config.defaultLanguage]
}

export const getMarketplaceValidationLevel = (
  marketplaceId: string
): 'strict' | 'flexible' => {
  const config = getMarketplaceConfig(marketplaceId)
  return config?.languageValidation || 'flexible'
}

// Get all marketplace IDs
export const getAllMarketplaceIds = (): string[] => {
  return Object.keys(MARKETPLACE_CONFIGS)
}

// Get marketplaces by region
export const getMarketplacesByRegion = (
  region: string
): MarketplaceConfig[] => {
  return Object.values(MARKETPLACE_CONFIGS).filter(
    (config) => config.region === region
  )
}

// Check if marketplace requires specific language
export const marketplaceRequiresSpecificLanguage = (
  marketplaceId: string
): boolean => {
  const config = getMarketplaceConfig(marketplaceId)
  return config?.requiresSpecificLanguage || false
}
