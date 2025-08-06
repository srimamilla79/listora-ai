// src/hooks/useVoiceLanguageIntent.ts
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { detectLanguageIntent, LanguageIntent } from '@/utils/languageDetection'

interface UseVoiceLanguageIntentOptions {
  autoApplyIntent?: boolean
  confidenceThreshold?: number
  persistIntent?: boolean
}

interface VoiceLanguageIntentState {
  intent: LanguageIntent | null
  isProcessing: boolean
  error: string | null
  appliedLanguage: string | null
}

export function useVoiceLanguageIntent(
  options: UseVoiceLanguageIntentOptions = {}
) {
  const {
    autoApplyIntent = true,
    confidenceThreshold = 0.7,
    persistIntent = true,
  } = options

  const { setOutputLanguage, outputLanguage, setVoiceIntent } = useLanguage()

  const [state, setState] = useState<VoiceLanguageIntentState>({
    intent: null,
    isProcessing: false,
    error: null,
    appliedLanguage: null,
  })

  // Load persisted intent on mount
  useEffect(() => {
    if (persistIntent && typeof window !== 'undefined') {
      const saved = localStorage.getItem('voiceLanguageIntent')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
            // 1 hour
            setState((prev) => ({ ...prev, intent: parsed.intent }))
          }
        } catch (e) {
          console.error('Failed to load persisted intent:', e)
        }
      }
    }
  }, [persistIntent])

  // Detect language intent from transcription
  const detectIntent = useCallback(
    async (
      transcription: string,
      openAIClient?: any
    ): Promise<LanguageIntent | null> => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }))

      try {
        const intent = await detectLanguageIntent(transcription, openAIClient)

        // Update state
        setState((prev) => ({
          ...prev,
          intent,
          isProcessing: false,
          appliedLanguage: null,
        }))

        // Persist if enabled
        if (persistIntent && intent.requestedLanguage) {
          localStorage.setItem(
            'voiceLanguageIntent',
            JSON.stringify({
              intent,
              timestamp: Date.now(),
            })
          )
        }

        // Update context
        if (
          intent.requestedLanguage &&
          intent.confidence >= confidenceThreshold
        ) {
          setVoiceIntent({
            detectedLanguage: 'unknown', // Will be filled by actual detection
            requestedLanguage: intent.requestedLanguage,
            confidence: intent.confidence,
            timestamp: new Date(),
          })

          // Auto-apply if enabled
          if (autoApplyIntent) {
            setOutputLanguage(intent.requestedLanguage)
            setState((prev) => ({
              ...prev,
              appliedLanguage: intent.requestedLanguage,
            }))
          }
        }

        return intent
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to detect language intent'
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isProcessing: false,
        }))
        return null
      }
    },
    [
      autoApplyIntent,
      confidenceThreshold,
      persistIntent,
      setOutputLanguage,
      setVoiceIntent,
    ]
  )

  // Apply detected intent manually
  const applyIntent = useCallback(() => {
    if (state.intent?.requestedLanguage) {
      setOutputLanguage(state.intent.requestedLanguage)
      setState((prev) => ({
        ...prev,
        appliedLanguage: state.intent!.requestedLanguage,
      }))

      // Update context
      setVoiceIntent({
        detectedLanguage: 'unknown',
        requestedLanguage: state.intent.requestedLanguage,
        confidence: state.intent.confidence,
        timestamp: new Date(),
      })
    }
  }, [state.intent, setOutputLanguage, setVoiceIntent])

  // Clear intent
  const clearIntent = useCallback(() => {
    setState({
      intent: null,
      isProcessing: false,
      error: null,
      appliedLanguage: null,
    })

    if (persistIntent) {
      localStorage.removeItem('voiceLanguageIntent')
    }

    setVoiceIntent(null)
  }, [persistIntent, setVoiceIntent])

  // Check if intent should be applied
  const shouldApplyIntent = useCallback((): boolean => {
    return !!(
      state.intent?.requestedLanguage &&
      state.intent.confidence >= confidenceThreshold &&
      state.intent.requestedLanguage !== outputLanguage &&
      !state.appliedLanguage
    )
  }, [state.intent, confidenceThreshold, outputLanguage, state.appliedLanguage])

  // Get clean text without language instructions
  const getCleanText = useCallback((): string => {
    return state.intent?.cleanedText || ''
  }, [state.intent])

  return {
    // State
    intent: state.intent,
    isProcessing: state.isProcessing,
    error: state.error,
    appliedLanguage: state.appliedLanguage,

    // Methods
    detectIntent,
    applyIntent,
    clearIntent,
    shouldApplyIntent,
    getCleanText,

    // Derived state
    hasIntent: !!state.intent?.requestedLanguage,
    isHighConfidence: (state.intent?.confidence || 0) >= confidenceThreshold,
    canApply: shouldApplyIntent(),
  }
}

// Hook for managing voice language preferences
export function useVoiceLanguagePreferences() {
  const [preferences, setPreferences] = useState({
    autoDetectIntent: true,
    confidenceThreshold: 0.7,
    showIntentNotification: true,
    persistIntentAcrossSessions: false,
    preferredVoiceLanguage: 'auto',
  })

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem('voiceLanguagePreferences')
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load voice preferences:', e)
      }
    }
  }, [])

  // Save preferences
  const savePreferences = useCallback(
    (updates: Partial<typeof preferences>) => {
      const newPrefs = { ...preferences, ...updates }
      setPreferences(newPrefs)
      localStorage.setItem('voiceLanguagePreferences', JSON.stringify(newPrefs))
    },
    [preferences]
  )

  return {
    preferences,
    updatePreference: savePreferences,
  }
}
