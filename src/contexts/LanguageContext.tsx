// src/contexts/LanguageContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import {
  SUPPORTED_LANGUAGES,
  LanguageConfig,
  isValidLanguageCode,
} from '@/config/languages'
import {
  getDefaultLanguageForMarketplace,
  isLanguageSupportedByMarketplace,
} from '@/config/marketplaces'
import { useLanguagePreferences } from '@/hooks/useLanguagePreferences'

interface VoiceIntent {
  detectedLanguage: string
  requestedLanguage: string
  confidence: number
  timestamp: Date
}

interface LanguageContextType {
  // Current language settings
  inputLanguage: string
  outputLanguage: string

  // Voice intent
  voiceIntent: VoiceIntent | null

  // Platform-specific languages
  platformLanguages: Record<string, string>

  // Current platform
  currentPlatform: string | null

  // Methods
  setInputLanguage: (lang: string) => void
  setOutputLanguage: (lang: string) => void
  setVoiceIntent: (intent: VoiceIntent | null) => void
  setPlatformLanguage: (platform: string, language: string) => void
  setCurrentPlatform: (platform: string | null) => void

  // Preferences integration
  loadUserPreferences: () => Promise<void>
  saveUserPreferences: () => Promise<void>
  autoSaveEnabled: boolean
  setAutoSaveEnabled: (enabled: boolean) => void

  // Helpers
  getLanguageForPlatform: (platform: string) => string
  getEffectiveOutputLanguage: () => string
  resetToDefaults: () => void
  applyVoiceIntent: () => void

  // State
  isLoading: boolean
  error: string | null
  isDirty: boolean
  lastSaved: Date | null

  // All supported languages
  supportedLanguages: typeof SUPPORTED_LANGUAGES

  // Recent and favorite languages
  recentLanguages: string[]
  favoriteLanguages: string[]
  addToFavorites: (lang: string) => void
  removeFromFavorites: (lang: string) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // State
  const [inputLanguage, setInputLanguage] = useState('auto')
  const [outputLanguage, setOutputLanguage] = useState('en')
  const [voiceIntent, setVoiceIntent] = useState<VoiceIntent | null>(null)
  const [platformLanguages, setPlatformLanguages] = useState<
    Record<string, string>
  >({})
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false) // 🔧 DISABLED by default
  const [recentLanguages, setRecentLanguages] = useState<string[]>([])
  const [favoriteLanguages, setFavoriteLanguages] = useState<string[]>([])

  // Integration with existing hook
  const {
    preferences,
    savePreferences,
    loading: prefsLoading,
    error: prefsError,
    refreshPreferences,
  } = useLanguagePreferences()

  // Initialize from preferences
  useEffect(() => {
    if (preferences && !prefsLoading) {
      setInputLanguage(preferences.preferred_input_language || 'auto')
      setOutputLanguage(preferences.preferred_output_language || 'en')
      setPlatformLanguages(preferences.platform_language_map || {})

      // Load recent languages from frequent pairs
      if (preferences.frequent_language_pairs) {
        const pairs = Object.keys(preferences.frequent_language_pairs)
        const recent = pairs
          .map((pair) => pair.split('->')[1])
          .filter((lang, index, self) => self.indexOf(lang) === index)
          .slice(0, 5)
        setRecentLanguages(recent)
      }

      setIsLoading(false)
    } else if (!prefsLoading) {
      // Set defaults if no preferences
      setIsLoading(false)
    }
  }, [preferences, prefsLoading])

  // Load favorites from local storage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteLanguages')
    if (savedFavorites) {
      try {
        const favorites = JSON.parse(savedFavorites)
        setFavoriteLanguages(
          favorites.filter((lang: string) => isValidLanguageCode(lang))
        )
      } catch (e) {
        console.error('Failed to load favorite languages:', e)
      }
    }
  }, [])

  // Load state from local storage as fallback
  useEffect(() => {
    const savedState = localStorage.getItem('languageState')
    if (savedState && !preferences) {
      try {
        const parsed = JSON.parse(savedState)
        if (parsed.inputLanguage && isValidLanguageCode(parsed.inputLanguage)) {
          setInputLanguage(parsed.inputLanguage)
        }
        if (
          parsed.outputLanguage &&
          isValidLanguageCode(parsed.outputLanguage)
        ) {
          setOutputLanguage(parsed.outputLanguage)
        }
        if (parsed.platformLanguages) {
          setPlatformLanguages(parsed.platformLanguages)
        }
        if (parsed.currentPlatform) {
          setCurrentPlatform(parsed.currentPlatform)
        }
      } catch (e) {
        console.error('Failed to parse saved language state:', e)
      }
    }
  }, [preferences])

  // Save to local storage on change
  useEffect(() => {
    const state = {
      inputLanguage,
      outputLanguage,
      platformLanguages,
      currentPlatform,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem('languageState', JSON.stringify(state))
    setIsDirty(true)
  }, [inputLanguage, outputLanguage, platformLanguages, currentPlatform])

  // 🔧 DISABLED: Auto-save functionality (this was causing the conflicts)
  // This useEffect was automatically saving old preferences every 2 seconds
  // which was overriding user's manual language selections
  /*
  useEffect(() => {
    if (autoSaveEnabled && isDirty && !isLoading) {
      const timer = setTimeout(() => {
        saveUserPreferences()
      }, 2000) // 2 second debounce

      return () => clearTimeout(timer)
    }
  }, [isDirty, autoSaveEnabled, isLoading])
  */

  // Methods
  const loadUserPreferences = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await refreshPreferences()
    } catch (err) {
      setError('Failed to load language preferences')
      console.error('Error loading preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [refreshPreferences])

  const saveUserPreferences = useCallback(async () => {
    if (!isDirty) return

    setError(null)
    try {
      await savePreferences({
        preferred_input_language: inputLanguage,
        preferred_output_language: outputLanguage,
        platform_language_map: platformLanguages,
      })
      setIsDirty(false)
      setLastSaved(new Date())
    } catch (err) {
      setError('Failed to save language preferences')
      console.error('Error saving preferences:', err)
      throw err
    }
  }, [
    inputLanguage,
    outputLanguage,
    platformLanguages,
    savePreferences,
    isDirty,
  ])

  const setPlatformLanguage = useCallback(
    (platform: string, language: string) => {
      if (isValidLanguageCode(language)) {
        setPlatformLanguages((prev) => ({
          ...prev,
          [platform]: language,
        }))
      }
    },
    []
  )

  const getLanguageForPlatform = useCallback(
    (platform: string): string => {
      // First check user preferences
      const userPreference = platformLanguages[platform]
      if (userPreference) return userPreference

      // Then check marketplace defaults
      const marketplaceDefault = getDefaultLanguageForMarketplace(platform)
      if (marketplaceDefault) return marketplaceDefault

      // Finally fallback to output language or 'en'
      return outputLanguage || 'en'
    },
    [platformLanguages, outputLanguage]
  )

  const getEffectiveOutputLanguage = useCallback((): string => {
    // Priority: Voice intent > Platform-specific > User preference > Default
    if (voiceIntent?.requestedLanguage && voiceIntent.confidence > 0.7) {
      return voiceIntent.requestedLanguage
    }

    if (currentPlatform) {
      return getLanguageForPlatform(currentPlatform)
    }

    return outputLanguage
  }, [voiceIntent, currentPlatform, outputLanguage, getLanguageForPlatform])

  const resetToDefaults = useCallback(() => {
    setInputLanguage('auto')
    setOutputLanguage('en')
    setPlatformLanguages({})
    setVoiceIntent(null)
    setCurrentPlatform(null)
    setError(null)
    setIsDirty(false)
  }, [])

  // Voice intent handling
  const handleSetVoiceIntent = useCallback(
    (intent: VoiceIntent | null) => {
      setVoiceIntent(intent)

      // Add to recent languages if new
      if (
        intent?.requestedLanguage &&
        !recentLanguages.includes(intent.requestedLanguage)
      ) {
        setRecentLanguages((prev) => [
          intent.requestedLanguage,
          ...prev.slice(0, 4),
        ])
      }
    },
    [recentLanguages]
  )

  const applyVoiceIntent = useCallback(() => {
    if (voiceIntent?.requestedLanguage && voiceIntent.confidence > 0.7) {
      setOutputLanguage(voiceIntent.requestedLanguage)

      // Also set for current platform if applicable
      if (
        currentPlatform &&
        isLanguageSupportedByMarketplace(
          currentPlatform,
          voiceIntent.requestedLanguage
        )
      ) {
        setPlatformLanguage(currentPlatform, voiceIntent.requestedLanguage)
      }
    }
  }, [voiceIntent, currentPlatform, setPlatformLanguage])

  // Validate language codes
  const handleSetInputLanguage = useCallback((lang: string) => {
    if (isValidLanguageCode(lang)) {
      setInputLanguage(lang)
    } else {
      console.warn(`Invalid input language code: ${lang}`)
      setError(`Invalid language code: ${lang}`)
    }
  }, [])

  const handleSetOutputLanguage = useCallback(
    (lang: string) => {
      if (isValidLanguageCode(lang)) {
        console.log('🔄 LanguageContext: Setting output language to:', lang)
        setOutputLanguage(lang)

        // Add to recent if not already there
        if (!recentLanguages.includes(lang) && lang !== 'auto') {
          setRecentLanguages((prev) =>
            [lang, ...prev.filter((l) => l !== lang)].slice(0, 5)
          )
        }
      } else {
        console.warn(`Invalid output language code: ${lang}`)
        setError(`Invalid language code: ${lang}`)
      }
    },
    [recentLanguages]
  )

  // Favorite languages management
  const addToFavorites = useCallback(
    (lang: string) => {
      if (isValidLanguageCode(lang) && !favoriteLanguages.includes(lang)) {
        const newFavorites = [...favoriteLanguages, lang]
        setFavoriteLanguages(newFavorites)
        localStorage.setItem('favoriteLanguages', JSON.stringify(newFavorites))
      }
    },
    [favoriteLanguages]
  )

  const removeFromFavorites = useCallback(
    (lang: string) => {
      const newFavorites = favoriteLanguages.filter((l) => l !== lang)
      setFavoriteLanguages(newFavorites)
      localStorage.setItem('favoriteLanguages', JSON.stringify(newFavorites))
    },
    [favoriteLanguages]
  )

  // Error auto-clear
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const value: LanguageContextType = {
    // State
    inputLanguage,
    outputLanguage,
    voiceIntent,
    platformLanguages,
    currentPlatform,

    // Methods
    setInputLanguage: handleSetInputLanguage,
    setOutputLanguage: handleSetOutputLanguage,
    setVoiceIntent: handleSetVoiceIntent,
    setPlatformLanguage,
    setCurrentPlatform,

    // Preferences
    loadUserPreferences,
    saveUserPreferences,
    autoSaveEnabled,
    setAutoSaveEnabled,

    // Helpers
    getLanguageForPlatform,
    getEffectiveOutputLanguage,
    resetToDefaults,
    applyVoiceIntent,

    // State flags
    isLoading,
    error,
    isDirty,
    lastSaved,

    // Languages
    supportedLanguages: SUPPORTED_LANGUAGES,
    recentLanguages,
    favoriteLanguages,
    addToFavorites,
    removeFromFavorites,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Hook for voice intent specifically
export const useVoiceLanguageIntent = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error(
      'useVoiceLanguageIntent must be used within a LanguageProvider'
    )
  }

  return {
    voiceIntent: context.voiceIntent,
    setVoiceIntent: context.setVoiceIntent,
    outputLanguage: context.outputLanguage,
    setOutputLanguage: context.setOutputLanguage,
    clearVoiceIntent: () => context.setVoiceIntent(null),
    applyVoiceIntent: context.applyVoiceIntent,
    effectiveOutputLanguage: context.getEffectiveOutputLanguage(),
  }
}

// Hook for platform-specific language management
export const usePlatformLanguage = (platform?: string) => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error(
      'usePlatformLanguage must be used within a LanguageProvider'
    )
  }

  const activePlatform = platform || context.currentPlatform

  return {
    currentLanguage: activePlatform
      ? context.getLanguageForPlatform(activePlatform)
      : context.outputLanguage,
    setLanguage: (lang: string) => {
      if (activePlatform) {
        context.setPlatformLanguage(activePlatform, lang)
      } else {
        context.setOutputLanguage(lang)
      }
    },
    platform: activePlatform,
    isSupported: (lang: string) =>
      activePlatform
        ? isLanguageSupportedByMarketplace(activePlatform, lang)
        : true,
  }
}
