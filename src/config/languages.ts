// src/config/languages.ts
export interface LanguageConfig {
  name: string
  nativeName: string
  flag: string
  code: string
  whisperCode?: string // Some languages have different codes for Whisper
  rtl?: boolean // Right-to-left languages
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  // Special
  auto: {
    name: 'Auto-detect',
    nativeName: 'Auto-detect',
    flag: '🌍',
    code: 'auto',
  },

  // Major Languages
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸', code: 'en' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', code: 'es' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', code: 'fr' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', code: 'de' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', code: 'it' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', code: 'pt' },
  ru: { name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', code: 'ru' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', code: 'ja' },
  ko: { name: 'Korean', nativeName: '한국어', flag: '🇰🇷', code: 'ko' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳', code: 'zh' },

  // Indian Languages
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', code: 'hi' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', code: 'te' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', code: 'ta' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', code: 'mr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', code: 'bn' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', code: 'gu' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', code: 'kn' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', code: 'ml' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', code: 'pa' },
  ur: { name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', code: 'ur', rtl: true },

  // Middle Eastern
  ar: {
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    code: 'ar',
    rtl: true,
  },
  he: {
    name: 'Hebrew',
    nativeName: 'עברית',
    flag: '🇮🇱',
    code: 'he',
    rtl: true,
  },
  fa: {
    name: 'Persian',
    nativeName: 'فارسی',
    flag: '🇮🇷',
    code: 'fa',
    rtl: true,
  },
  tr: { name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', code: 'tr' },

  // European
  pl: { name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', code: 'pl' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', code: 'uk' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', code: 'nl' },
  sv: { name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', code: 'sv' },
  no: { name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', code: 'no' },
  da: { name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', code: 'da' },
  fi: { name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', code: 'fi' },
  cs: { name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', code: 'cs' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', code: 'sk' },
  hu: { name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', code: 'hu' },
  ro: { name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', code: 'ro' },
  bg: { name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', code: 'bg' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', code: 'el' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', code: 'hr' },
  sr: { name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', code: 'sr' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', code: 'sl' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', code: 'lt' },
  lv: { name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', code: 'lv' },
  et: { name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', code: 'et' },
  mk: { name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', code: 'mk' },
  sq: { name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', code: 'sq' },
  mt: { name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', code: 'mt' },
  is: { name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', code: 'is' },
  ga: { name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', code: 'ga' },
  cy: { name: 'Welsh', nativeName: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', code: 'cy' },
  eu: { name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', code: 'eu' },
  ca: { name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', code: 'ca' },
  gl: { name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', code: 'gl' },

  // Asian
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', code: 'th' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', code: 'vi' },
  id: {
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    flag: '🇮🇩',
    code: 'id',
  },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', code: 'ms' },
  tl: { name: 'Tagalog', nativeName: 'Tagalog', flag: '🇵🇭', code: 'tl' },
  my: { name: 'Myanmar', nativeName: 'မြန်မာဘာသာ', flag: '🇲🇲', code: 'my' },
  km: { name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', code: 'km' },
  lo: { name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', code: 'lo' },
  ka: { name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', code: 'ka' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', code: 'hy' },
  az: { name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', code: 'az' },
  kk: { name: 'Kazakh', nativeName: 'Қазақ', flag: '🇰🇿', code: 'kk' },
  uz: { name: 'Uzbek', nativeName: 'Oʻzbek', flag: '🇺🇿', code: 'uz' },
  ky: { name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', code: 'ky' },
  tg: { name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', code: 'tg' },
  tk: { name: 'Turkmen', nativeName: 'Türkmençe', flag: '🇹🇲', code: 'tk' },
  mn: { name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', code: 'mn' },
  ne: { name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', code: 'ne' },
  si: { name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', code: 'si' },

  // African
  af: { name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', code: 'af' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', code: 'am' },
  ha: { name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', code: 'ha' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬', code: 'yo' },
  zu: { name: 'Zulu', nativeName: 'IsiZulu', flag: '🇿🇦', code: 'zu' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', code: 'sw' },
  so: { name: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴', code: 'so' },

  // Others
  eo: { name: 'Esperanto', nativeName: 'Esperanto', flag: '🌍', code: 'eo' },
  la: { name: 'Latin', nativeName: 'Latina', flag: '🇻🇦', code: 'la' },
  yi: {
    name: 'Yiddish',
    nativeName: 'ייִדיש',
    flag: '🇮🇱',
    code: 'yi',
    rtl: true,
  },
  jw: { name: 'Javanese', nativeName: 'Basa Jawa', flag: '🇮🇩', code: 'jw' },
  su: { name: 'Sundanese', nativeName: 'Basa Sunda', flag: '🇮🇩', code: 'su' },
  mg: { name: 'Malagasy', nativeName: 'Malagasy', flag: '🇲🇬', code: 'mg' },
  mi: { name: 'Maori', nativeName: 'Te Reo Māori', flag: '🇳🇿', code: 'mi' },
  haw: {
    name: 'Hawaiian',
    nativeName: 'ʻŌlelo Hawaiʻi',
    flag: '🌺',
    code: 'haw',
  },
  sm: { name: 'Samoan', nativeName: 'Gagana Sāmoa', flag: '🇼🇸', code: 'sm' },
  lb: {
    name: 'Luxembourgish',
    nativeName: 'Lëtzebuergesch',
    flag: '🇱🇺',
    code: 'lb',
  },
  ht: {
    name: 'Haitian Creole',
    nativeName: 'Kreyòl ayisyen',
    flag: '🇭🇹',
    code: 'ht',
  },
  bs: { name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', code: 'bs' },
  be: { name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', code: 'be' },
  ps: { name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', code: 'ps', rtl: true },
  ug: {
    name: 'Uyghur',
    nativeName: 'ئۇيغۇرچە',
    flag: '🇨🇳',
    code: 'ug',
    rtl: true,
  },
  tt: { name: 'Tatar', nativeName: 'Татарча', flag: '🇷🇺', code: 'tt' },
  ba: { name: 'Bashkir', nativeName: 'Башҡортса', flag: '🇷🇺', code: 'ba' },
}

// Helper functions
export const getLanguageConfig = (code: string): LanguageConfig => {
  return (
    SUPPORTED_LANGUAGES[code] || {
      name: code,
      nativeName: code,
      flag: '🌐',
      code: code,
    }
  )
}

export const getLanguageName = (code: string): string => {
  return getLanguageConfig(code).name
}

export const getLanguageNativeName = (code: string): string => {
  return getLanguageConfig(code).nativeName
}

export const isRTL = (code: string): boolean => {
  return getLanguageConfig(code).rtl || false
}

export const getWhisperCode = (code: string): string => {
  const config = getLanguageConfig(code)
  return config.whisperCode || config.code
}

export const searchLanguages = (query: string): string[] => {
  if (!query) return Object.keys(SUPPORTED_LANGUAGES)

  const lowercaseQuery = query.toLowerCase()
  return Object.entries(SUPPORTED_LANGUAGES)
    .filter(
      ([code, config]) =>
        config.name.toLowerCase().includes(lowercaseQuery) ||
        config.nativeName.toLowerCase().includes(lowercaseQuery) ||
        code.toLowerCase().includes(lowercaseQuery)
    )
    .map(([code]) => code)
}

export const getLanguagesByRegion = () => {
  return {
    popular: [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'ja',
      'ko',
      'zh',
      'hi',
      'ar',
    ],
    indian: ['hi', 'te', 'ta', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa', 'ur'],
    european: ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ro', 'el'],
    asian: ['zh', 'ja', 'ko', 'th', 'vi', 'id', 'ms', 'tl', 'my', 'km'],
    middleEastern: ['ar', 'he', 'fa', 'tr', 'ur'],
    african: ['sw', 'ha', 'yo', 'zu', 'am', 'so', 'af'],
  }
}

// Validate language code
export const isValidLanguageCode = (code: string): boolean => {
  return code === 'auto' || code in SUPPORTED_LANGUAGES
}

// Get language pairs for common translations
export const getCommonLanguagePairs = () => {
  return [
    { from: 'en', to: 'es', label: 'English → Spanish' },
    { from: 'en', to: 'fr', label: 'English → French' },
    { from: 'en', to: 'de', label: 'English → German' },
    { from: 'en', to: 'zh', label: 'English → Chinese' },
    { from: 'en', to: 'ja', label: 'English → Japanese' },
    { from: 'en', to: 'hi', label: 'English → Hindi' },
    { from: 'en', to: 'te', label: 'English → Telugu' },
    { from: 'es', to: 'en', label: 'Spanish → English' },
    { from: 'fr', to: 'en', label: 'French → English' },
    { from: 'auto', to: 'en', label: 'Auto → English' },
  ]
}
