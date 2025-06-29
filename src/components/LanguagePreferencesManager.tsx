// src/components/LanguagePreferencesManager.tsx
import React, { useState, useEffect } from 'react'
import { Globe, Save, TrendingUp, BarChart3 } from 'lucide-react'
import { useLanguagePreferences } from '@/hooks/useLanguagePreferences'

const SUPPORTED_LANGUAGES = {
  auto: { name: 'Auto-detect', flag: '🌍' },
  en: { name: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  de: { name: 'German', flag: '🇩🇪' },
  it: { name: 'Italian', flag: '🇮🇹' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
  ja: { name: 'Japanese', flag: '🇯🇵' },
  ko: { name: 'Korean', flag: '🇰🇷' },
  ar: { name: 'Arabic', flag: '🇸🇦' },
  hi: { name: 'Hindi', flag: '🇮🇳' },
  ru: { name: 'Russian', flag: '🇷🇺' },
}

interface LanguagePreferencesManagerProps {
  selectedPlatform?: string
  onPreferencesChange?: (inputLang: string, outputLang: string) => void
}

export const LanguagePreferencesManager: React.FC<
  LanguagePreferencesManagerProps
> = ({ selectedPlatform, onPreferencesChange }) => {
  const {
    preferences,
    loading,
    savePreferences,
    getLanguageForPlatform,
    getMostUsedLanguagePair,
  } = useLanguagePreferences()

  const [inputLanguage, setInputLanguage] = useState('auto')
  const [outputLanguage, setOutputLanguage] = useState('en')
  const [saving, setSaving] = useState(false)
  const [showStats, setShowStats] = useState(false)

  // Initialize languages from preferences
  useEffect(() => {
    if (preferences) {
      const platformLang = selectedPlatform
        ? getLanguageForPlatform(selectedPlatform)
        : preferences.preferred_output_language

      setInputLanguage(preferences.preferred_input_language)
      setOutputLanguage(platformLang)
    }
  }, [preferences, selectedPlatform])

  // Notify parent of changes
  useEffect(() => {
    onPreferencesChange?.(inputLanguage, outputLanguage)
  }, [inputLanguage, outputLanguage])

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      await savePreferences({
        preferred_input_language: inputLanguage,
        preferred_output_language: outputLanguage,
        platform_language_map: {
          ...preferences?.platform_language_map,
          [selectedPlatform || 'default']: outputLanguage,
        },
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const getLanguageInfo = (langKey: string) => {
    return (
      SUPPORTED_LANGUAGES[langKey as keyof typeof SUPPORTED_LANGUAGES] || {
        name: langKey,
        flag: '🌍',
      }
    )
  }

  const mostUsedPair = getMostUsedLanguagePair()

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              Language Preferences
            </h3>
            <p className="text-sm text-gray-600">
              Customize your voice input and content output
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowStats(!showStats)}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          <BarChart3 className="h-5 w-5" />
        </button>
      </div>

      {/* Language Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Input Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🎤 Voice Input Language
          </label>
          <select
            value={inputLanguage}
            onChange={(e) => setInputLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => (
              <option key={key} value={key}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Output Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 Content Output Language
            {selectedPlatform && (
              <span className="text-xs text-gray-500 ml-1">
                (for {selectedPlatform})
              </span>
            )}
          </label>
          <select
            value={outputLanguage}
            onChange={(e) => setOutputLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(SUPPORTED_LANGUAGES)
              .filter(([key]) => key !== 'auto')
              .map(([key, lang]) => (
                <option key={key} value={key}>
                  {lang.flag} {lang.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Smart Suggestions */}
      {mostUsedPair && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 text-sm">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-blue-900">
              Most used:{' '}
              <strong>
                {getLanguageInfo(mostUsedPair.input).flag}{' '}
                {getLanguageInfo(mostUsedPair.input).name}
              </strong>{' '}
              →
              <strong>
                {' '}
                {getLanguageInfo(mostUsedPair.output).flag}{' '}
                {getLanguageInfo(mostUsedPair.output).name}
              </strong>
            </span>
            <button
              onClick={() => {
                setInputLanguage(mostUsedPair.input)
                setOutputLanguage(mostUsedPair.output)
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Use this
            </button>
          </div>
        </div>
      )}

      {/* Current Selection Preview */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Current setting:</span> Will record in{' '}
          <strong>
            {getLanguageInfo(inputLanguage).flag}{' '}
            {getLanguageInfo(inputLanguage).name}
          </strong>
          {inputLanguage !== outputLanguage && (
            <span>
              {' '}
              and generate content in{' '}
              <strong>
                {getLanguageInfo(outputLanguage).flag}{' '}
                {getLanguageInfo(outputLanguage).name}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      {showStats && preferences && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            📊 Your Usage Statistics
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total generations:</span>
              <span className="font-medium ml-2">
                {preferences.content_generation_stats.total_generations}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Multilingual:</span>
              <span className="font-medium ml-2">
                {preferences.content_generation_stats.multilingual_generations}
              </span>
            </div>
          </div>

          {Object.keys(preferences.frequent_language_pairs).length > 0 && (
            <div className="mt-3">
              <span className="text-gray-600 text-sm">
                Language pairs used:
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(preferences.frequent_language_pairs).map(
                  ([pair, count]) => {
                    const [input, output] = pair.split('->')
                    return (
                      <span
                        key={pair}
                        className="px-2 py-1 bg-white rounded text-xs border"
                      >
                        {getLanguageInfo(input).flag}→
                        {getLanguageInfo(output).flag} ({count})
                      </span>
                    )
                  }
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSavePreferences}
        disabled={saving}
        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {saving ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          <Save className="h-4 w-4" />
        )}
        <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
      </button>
    </div>
  )
}
