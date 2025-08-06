// src/hooks/useLanguagePreferences.ts
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { isValidLanguageCode, SUPPORTED_LANGUAGES } from '@/config/languages'
import { getMarketplaceConfig } from '@/config/marketplaces'

interface LanguagePreferences {
  preferred_input_language: string
  preferred_output_language: string
  platform_language_map: Record<string, string>
  content_generation_stats: {
    total_generations: number
    multilingual_generations: number
    most_used_input: string
    most_used_output: string
  }
  frequent_language_pairs: Record<string, number>
}

interface LanguageSuggestion {
  suggested_input: string
  suggested_output: string
  reason: string
  confidence: number
}

export const useLanguagePreferences = () => {
  const [preferences, setPreferences] = useState<LanguagePreferences | null>(
    null
  )
  const [suggestions, setSuggestions] = useState<LanguageSuggestion | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  // Load user preferences
  const loadPreferences = async () => {
    try {
      setLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('No authentication session')
        return
      }

      const response = await fetch('/api/user-language-preferences', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to load preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences)
      setError(null)
    } catch (err) {
      console.error('Error loading language preferences:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load preferences'
      )

      // Set defaults if loading fails
      // Set defaults if loading fails
      setPreferences({
        preferred_input_language: 'auto',
        preferred_output_language: 'en',
        platform_language_map: {
          amazon: 'en',
          'amazon-es': 'es',
          'amazon-fr': 'fr',
          'amazon-de': 'de',
          'amazon-it': 'it',
          'amazon-jp': 'ja',
          'amazon-in': 'en',
          ebay: 'en',
          etsy: 'en',
          shopify: 'en',
          instagram: 'en',
          walmart: 'en',
          custom: 'en',
        },
        content_generation_stats: {
          total_generations: 0,
          multilingual_generations: 0,
          most_used_input: 'auto',
          most_used_output: 'en',
        },
        frequent_language_pairs: {},
      })
    } finally {
      setLoading(false)
    }
  }

  // Save preferences
  const savePreferences = async (updates: Partial<LanguagePreferences>) => {
    try {
      // Validate language codes before saving
      if (
        updates.preferred_input_language &&
        !isValidLanguageCode(updates.preferred_input_language)
      ) {
        throw new Error(
          `Invalid input language code: ${updates.preferred_input_language}`
        )
      }

      if (
        updates.preferred_output_language &&
        !isValidLanguageCode(updates.preferred_output_language)
      ) {
        throw new Error(
          `Invalid output language code: ${updates.preferred_output_language}`
        )
      }

      if (updates.platform_language_map) {
        for (const [platform, language] of Object.entries(
          updates.platform_language_map
        )) {
          if (!isValidLanguageCode(language)) {
            throw new Error(
              `Invalid language code for ${platform}: ${language}`
            )
          }
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication session')
      }

      const response = await fetch('/api/user-language-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...updates,
          update_type: 'manual',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences)

      console.log('✅ Preferences saved successfully')
      return data.preferences
    } catch (err) {
      console.error('Error saving preferences:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to save preferences'
      )
      throw err
    }
  }

  // Update usage statistics after voice processing
  const updateUsageStats = async (
    detectedLanguage: string,
    outputLanguage: string,
    wasTranslated: boolean,
    platform?: string
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.warn('No session for usage stats update')
        return
      }

      await fetch('/api/user-language-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          detected_language: detectedLanguage,
          output_language: outputLanguage,
          was_translated: wasTranslated,
          platform,
        }),
      })

      console.log('✅ Usage statistics updated')

      // Reload preferences to get updated stats
      await loadPreferences()
    } catch (err) {
      console.error('Error updating usage stats:', err)
      // Don't throw error for usage stats - it's not critical
    }
  }

  // Get smart language suggestions
  const getLanguageSuggestions = async (platform?: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return null
      }

      const url = platform
        ? `/api/language-suggestions?platform=${platform}`
        : '/api/language-suggestions'

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestion)
      return data.suggestion
    } catch (err) {
      console.error('Error getting language suggestions:', err)
      return null
    }
  }

  // Get language for specific platform
  const getLanguageForPlatform = (platform: string): string => {
    if (!preferences) return 'en'

    return (
      preferences.platform_language_map[platform] ||
      preferences.preferred_output_language ||
      'en'
    )
  }

  // Check if user frequently uses a language pair
  const getMostUsedLanguagePair = (): {
    input: string
    output: string
  } | null => {
    if (!preferences?.frequent_language_pairs) return null

    const pairs = Object.entries(preferences.frequent_language_pairs)
    if (pairs.length === 0) return null

    const mostUsed = pairs.reduce((max, current) =>
      current[1] > max[1] ? current : max
    )

    const [input, output] = mostUsed[0].split('->')
    return { input, output }
  }
  // Get supported languages for a platform
  const getSupportedLanguagesForPlatform = (platform: string): string[] => {
    const config = getMarketplaceConfig(platform)
    if (!config) return ['en']

    if (config.supportedLanguages === 'all') {
      return Object.keys(SUPPORTED_LANGUAGES).filter((code) => code !== 'auto')
    }

    return config.supportedLanguages as string[]
  }

  // Check if a language is supported by platform
  const isLanguageSupportedByPlatform = (
    platform: string,
    language: string
  ): boolean => {
    const supported = getSupportedLanguagesForPlatform(platform)
    return supported.includes(language)
  }

  // Get platform-specific language or fall back to default
  const getEffectiveLanguageForPlatform = (platform: string): string => {
    const platformLang = getLanguageForPlatform(platform)

    // Validate if the language is still supported by the platform
    if (isLanguageSupportedByPlatform(platform, platformLang)) {
      return platformLang
    }

    // Fall back to platform default
    const config = getMarketplaceConfig(platform)
    return config?.defaultLanguage || 'en'
  }

  // Initialize on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  return {
    preferences,
    suggestions,
    loading,
    error,
    savePreferences,
    updateUsageStats,
    getLanguageSuggestions,
    getLanguageForPlatform,
    getMostUsedLanguagePair,
    refreshPreferences: loadPreferences,
    getSupportedLanguagesForPlatform,
    isLanguageSupportedByPlatform,
    getEffectiveLanguageForPlatform,
  }
}
