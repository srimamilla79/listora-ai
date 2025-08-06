// src/utils/languagePatterns.ts

export interface LanguagePattern {
  regex: string
  confidence: number
  type: 'command' | 'request' | 'exact'
  removePattern?: string
}

export const LANGUAGE_PATTERNS: Record<string, LanguagePattern[]> = {
  // English patterns
  en: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+english',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+english',
    },
    {
      regex: 'translate\\s*(this\\s*)?(to|into)\\s+english',
      confidence: 0.95,
      type: 'command',
      removePattern: 'translate\\s*(this\\s*)?(to|into)\\s+english',
    },
    {
      regex: 'in\\s+english\\s*(language)?',
      confidence: 0.9,
      type: 'request',
      removePattern: 'in\\s+english\\s*(language)?',
    },
    {
      regex: 'generate\\s+(in\\s+)?english',
      confidence: 0.9,
      type: 'command',
      removePattern: 'generate\\s+(in\\s+)?english',
    },
  ],

  // Spanish patterns
  es: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+spanish',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+spanish',
    },
    {
      regex: 'en\\s+español',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'en\\s+español',
    },
    {
      regex: 'traducir\\s*(al\\s+)?español',
      confidence: 0.95,
      type: 'command',
      removePattern: 'traducir\\s*(al\\s+)?español',
    },
    {
      regex: 'spanish\\s+version',
      confidence: 0.85,
      type: 'request',
      removePattern: 'spanish\\s+version',
    },
  ],

  // Telugu patterns
  te: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+telugu',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+telugu',
    },
    {
      regex: 'telugu\\s*(lo|లో)',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'telugu\\s*(lo|లో)',
    },
    {
      regex: 'తెలుగు\\s*లో',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'తెలుగు\\s*లో',
    },
    {
      regex: 'దీన్ని\\s*తెలుగు\\s*లోకి',
      confidence: 0.98,
      type: 'command',
      removePattern: 'దీన్ని\\s*తెలుగు\\s*లోకి',
    },
    {
      regex: 'generate\\s+(in\\s+)?telugu',
      confidence: 0.9,
      type: 'command',
      removePattern: 'generate\\s+(in\\s+)?telugu',
    },
  ],

  // Hindi patterns
  hi: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+hindi',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+hindi',
    },
    {
      regex: 'hindi\\s*(me|में)',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'hindi\\s*(me|में)',
    },
    {
      regex: 'हिंदी\\s*में',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'हिंदी\\s*में',
    },
    {
      regex: 'इसे\\s*हिंदी\\s*में',
      confidence: 0.98,
      type: 'command',
      removePattern: 'इसे\\s*हिंदी\\s*में',
    },
  ],

  // Tamil patterns
  ta: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+tamil',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+tamil',
    },
    {
      regex: 'tamil\\s*(il|இல்)',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'tamil\\s*(il|இல்)',
    },
    {
      regex: 'தமிழில்',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'தமிழில்',
    },
    {
      regex: 'இதை\\s*தமிழில்',
      confidence: 0.98,
      type: 'command',
      removePattern: 'இதை\\s*தமிழில்',
    },
  ],

  // French patterns
  fr: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+french',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+french',
    },
    {
      regex: 'en\\s+français',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'en\\s+français',
    },
    {
      regex: 'traduire\\s*(en\\s+)?français',
      confidence: 0.95,
      type: 'command',
      removePattern: 'traduire\\s*(en\\s+)?français',
    },
  ],

  // German patterns
  de: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+german',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+german',
    },
    {
      regex: 'auf\\s+deutsch',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'auf\\s+deutsch',
    },
    {
      regex: 'ins\\s+deutsche',
      confidence: 0.95,
      type: 'command',
      removePattern: 'ins\\s+deutsche',
    },
  ],

  // Chinese patterns
  zh: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+chinese',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+chinese',
    },
    {
      regex: '(translate|convert)\\s*(to|into)\\s+mandarin',
      confidence: 0.95,
      type: 'command',
      removePattern: '(translate|convert)\\s*(to|into)\\s+mandarin',
    },
    {
      regex: '中文',
      confidence: 0.98,
      type: 'exact',
      removePattern: '.*中文.*',
    },
    {
      regex: '翻译成中文',
      confidence: 0.98,
      type: 'command',
      removePattern: '翻译成中文',
    },
  ],

  // Japanese patterns
  ja: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+japanese',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+japanese',
    },
    {
      regex: '日本語で',
      confidence: 0.98,
      type: 'exact',
      removePattern: '日本語で',
    },
    {
      regex: '日本語に',
      confidence: 0.98,
      type: 'command',
      removePattern: '.*日本語に.*',
    },
  ],

  // Korean patterns
  ko: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+korean',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+korean',
    },
    {
      regex: '한국어로',
      confidence: 0.98,
      type: 'exact',
      removePattern: '한국어로',
    },
    {
      regex: '한글로',
      confidence: 0.95,
      type: 'exact',
      removePattern: '한글로',
    },
  ],

  // Arabic patterns
  ar: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+arabic',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+arabic',
    },
    {
      regex: 'بالعربية',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'بالعربية',
    },
    {
      regex: 'إلى\\s*العربية',
      confidence: 0.98,
      type: 'command',
      removePattern: 'إلى\\s*العربية',
    },
  ],

  // Portuguese patterns
  pt: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+portuguese',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+portuguese',
    },
    {
      regex: 'em\\s+português',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'em\\s+português',
    },
    {
      regex: 'para\\s+português',
      confidence: 0.95,
      type: 'command',
      removePattern: 'para\\s+português',
    },
  ],

  // Italian patterns
  it: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+italian',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+italian',
    },
    {
      regex: 'in\\s+italiano',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'in\\s+italiano',
    },
  ],

  // Russian patterns
  ru: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+russian',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+russian',
    },
    {
      regex: 'на\\s+русском',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'на\\s+русском',
    },
    {
      regex: 'по-русски',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'по-русски',
    },
  ],

  // Bengali patterns
  bn: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+bengali',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+bengali',
    },
    {
      regex: 'বাংলায়',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'বাংলায়',
    },
    {
      regex: 'bangla\\s*(te|তে)',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'bangla\\s*(te|তে)',
    },
  ],

  // Marathi patterns
  mr: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+marathi',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+marathi',
    },
    {
      regex: 'मराठीत',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'मराठीत',
    },
    {
      regex: 'marathi\\s*(madhe|मध्ये)',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'marathi\\s*(madhe|मध्ये)',
    },
  ],

  // Gujarati patterns
  gu: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+gujarati',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+gujarati',
    },
    {
      regex: 'ગુજરાતીમાં',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'ગુજરાતીમાં',
    },
  ],

  // Urdu patterns
  ur: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+urdu',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+urdu',
    },
    {
      regex: 'اردو\\s*میں',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'اردو\\s*میں',
    },
  ],

  // Thai patterns
  th: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+thai',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+thai',
    },
    {
      regex: 'เป็นภาษาไทย',
      confidence: 0.98,
      type: 'exact',
      removePattern: 'เป็นภาษาไทย',
    },
  ],

  // Vietnamese patterns
  vi: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+vietnamese',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+vietnamese',
    },
    {
      regex: 'tiếng\\s*việt',
      confidence: 0.95,
      type: 'exact',
      removePattern: '.*tiếng\\s*việt.*',
    },
  ],

  // Turkish patterns
  tr: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+turkish',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+turkish',
    },
    {
      regex: "türkçe\\s*(ye|'ye)",
      confidence: 0.95,
      type: 'exact',
      removePattern: "türkçe\\s*(ye|'ye)",
    },
  ],

  // Polish patterns
  pl: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+polish',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+polish',
    },
    {
      regex: 'po\\s+polsku',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'po\\s+polsku',
    },
  ],

  // Dutch patterns
  nl: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+dutch',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+dutch',
    },
    {
      regex: 'in\\s+het\\s+nederlands',
      confidence: 0.95,
      type: 'exact',
      removePattern: 'in\\s+het\\s+nederlands',
    },
  ],

  // Indonesian patterns
  id: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+indonesian',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+indonesian',
    },
    {
      regex: 'bahasa\\s+indonesia',
      confidence: 0.95,
      type: 'exact',
      removePattern: '.*bahasa\\s+indonesia.*',
    },
    {
      regex: 'dalam\\s+bahasa\\s+indonesia',
      confidence: 0.98,
      type: 'command',
      removePattern: 'dalam\\s+bahasa\\s+indonesia',
    },
  ],

  // Malay patterns
  ms: [
    {
      regex: 'convert\\s*(this\\s*)?(to|into)\\s+malay',
      confidence: 0.95,
      type: 'command',
      removePattern: 'convert\\s*(this\\s*)?(to|into)\\s+malay',
    },
    {
      regex: 'bahasa\\s+melayu',
      confidence: 0.95,
      type: 'exact',
      removePattern: '.*bahasa\\s+melayu.*',
    },
  ],
}

// Generic patterns that work across languages
export const GENERIC_LANGUAGE_PATTERNS: LanguagePattern[] = [
  {
    regex:
      'please\\s+(convert|translate|generate)\\s*(this\\s*)?(to|in|into)\\s+([a-z]+)',
    confidence: 0.8,
    type: 'command',
  },
  {
    regex:
      '(convert|translate|generate)\\s*(this\\s*)?(to|in|into)\\s+([a-z]+)\\s*(language)?',
    confidence: 0.8,
    type: 'command',
  },
  {
    regex: 'in\\s+([a-z]+)\\s+language',
    confidence: 0.7,
    type: 'request',
  },
  {
    regex: 'make\\s*(this\\s*)?in\\s+([a-z]+)',
    confidence: 0.7,
    type: 'command',
  },
  {
    regex: '([a-z]+)\\s+version',
    confidence: 0.6,
    type: 'request',
  },
]

// Common language name mappings for fuzzy matching
export const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  japanese: 'ja',
  korean: 'ko',
  chinese: 'zh',
  mandarin: 'zh',
  cantonese: 'zh',
  hindi: 'hi',
  telugu: 'te',
  tamil: 'ta',
  bengali: 'bn',
  marathi: 'mr',
  gujarati: 'gu',
  kannada: 'kn',
  malayalam: 'ml',
  punjabi: 'pa',
  urdu: 'ur',
  arabic: 'ar',
  hebrew: 'he',
  persian: 'fa',
  farsi: 'fa',
  turkish: 'tr',
  polish: 'pl',
  dutch: 'nl',
  swedish: 'sv',
  norwegian: 'no',
  danish: 'da',
  finnish: 'fi',
  thai: 'th',
  vietnamese: 'vi',
  indonesian: 'id',
  malay: 'ms',
  tagalog: 'tl',
  filipino: 'tl',
  burmese: 'my',
  myanmar: 'my',
  khmer: 'km',
  cambodian: 'km',
  lao: 'lo',
  laotian: 'lo',
  greek: 'el',
  ukrainian: 'uk',
  czech: 'cs',
  slovak: 'sk',
  hungarian: 'hu',
  romanian: 'ro',
  bulgarian: 'bg',
  croatian: 'hr',
  serbian: 'sr',
  slovenian: 'sl',
  lithuanian: 'lt',
  latvian: 'lv',
  estonian: 'et',
  georgian: 'ka',
  armenian: 'hy',
  azerbaijani: 'az',
  kazakh: 'kk',
  uzbek: 'uz',
  nepali: 'ne',
  sinhala: 'si',
  sinhalese: 'si',
  afrikaans: 'af',
  swahili: 'sw',
  amharic: 'am',
  hausa: 'ha',
  yoruba: 'yo',
  zulu: 'zu',
  somali: 'so',
  esperanto: 'eo',
  latin: 'la',
  yiddish: 'yi',
  welsh: 'cy',
  irish: 'ga',
  basque: 'eu',
  catalan: 'ca',
  galician: 'gl',
  icelandic: 'is',
  macedonian: 'mk',
  albanian: 'sq',
  maltese: 'mt',
}
