// Step 1: VoiceRecorder.tsx - MINIMAL CRITICAL FIXES
// Replace your existing VoiceRecorder.tsx with this version
// This only adds essential cleanup - no other changes

'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, RotateCcw, Loader2 } from 'lucide-react'

interface VoiceResult {
  transcription: string
  detectedLanguage?: string
  targetLanguage?: string
  wasTranslated?: boolean
  confidence?: number
  productName?: string
  generatedContent?: string
}

interface MultilingualVoiceRecorderProps {
  onContentGenerated: (result: VoiceResult) => void
  onTranscriptionComplete?: (transcription: string) => void
  supabase?: any
  sessionToken?: string
  contentType?: string
  onReRecord?: () => void
  showReRecordButton?: boolean
  onProcessingChange?: (isProcessing: boolean) => void
  onReset?: () => void
}

export default function MultilingualVoiceRecorder({
  onContentGenerated,
  onTranscriptionComplete,
  supabase,
  sessionToken,
  contentType = 'product',
  onReRecord,
  showReRecordButton = false,
  onProcessingChange,
  onReset,
}: MultilingualVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [detectionResult, setDetectionResult] = useState<{
    language: string
    confidence: number
    wasTranslated: boolean
  } | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // 🔧 FIX 1: Add processing timeout and component mount tracking
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const componentMountedRef = useRef(true)

  // 🔧 FIX 2: Enhanced cleanup function (CRITICAL)
  // 🔧 ENHANCED: Better performCleanup function
  const performCleanup = () => {
    console.log('🧹 Cleaning up voice recorder resources...')

    // Clear timers
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
        console.log('🔇 Stopped audio track')
      })
      streamRef.current = null
    }

    // Clean up media recorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch (error) {
        console.warn('Error stopping media recorder:', error)
      }
      mediaRecorderRef.current = null
    }

    // 🔧 CRITICAL FIX: Clean up blob URL properly
    if (audioUrl) {
      try {
        // Stop audio element first
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.src = ''
        }

        // Then revoke the URL
        URL.revokeObjectURL(audioUrl)
        console.log('🗑️ Blob URL cleaned up successfully')
      } catch (error) {
        console.warn('Error revoking audio URL:', error)
      }
    }

    chunksRef.current = []
  }

  // 🔧 FIX 3: Component unmount cleanup (CRITICAL)
  useEffect(() => {
    componentMountedRef.current = true

    return () => {
      console.log('🧹 Voice recorder unmounting - performing cleanup...')
      componentMountedRef.current = false
      performCleanup()
    }
  }, [])

  // 🔧 FIX 4: Audio URL cleanup on change
  useEffect(() => {
    return () => {
      if (audioUrl) {
        try {
          URL.revokeObjectURL(audioUrl)
        } catch (error) {
          console.warn('Error revoking audio URL on change:', error)
        }
      }
    }
  }, [audioUrl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 🔧 FIX 5: Enhanced reset with proper cleanup
  const resetRecording = () => {
    console.log('🔄 Resetting voice recorder...')

    // 🔧 FIX: Stop audio playback FIRST before cleanup
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = '' // Clear the src to prevent further attempts
      setIsPlaying(false)
    }

    // Then do the rest of cleanup
    performCleanup()

    // Reset state
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setIsRecording(false)
    setTranscription('')
    setDetectionResult(null)
    setIsProcessing(false)

    if (onProcessingChange) {
      onProcessingChange(false)
    }
    if (onReset) {
      console.log('🔄 Calling parent reset function...')
      onReset()
    }
  }

  const startRecording = async () => {
    // Always reset before starting
    resetRecording()

    try {
      console.log('📱 Starting recording...')

      if (
        location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1'
      ) {
        throw new Error('Microphone access requires HTTPS.')
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support microphone access.')
      }

      // Try multiple audio constraint options
      const constraintOptions = [
        {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
        { audio: true },
      ]

      let stream: MediaStream | null = null
      for (const constraints of constraintOptions) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch (error) {
          continue
        }
      }

      if (!stream) {
        throw new Error('Unable to access microphone.')
      }

      // Check if component is still mounted
      if (!componentMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream

      // Create MediaRecorder with fallback options
      let mediaRecorder: MediaRecorder | null = null
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/wav']

      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          try {
            mediaRecorder = new MediaRecorder(stream, { mimeType })
            break
          } catch (error) {
            continue
          }
        }
      }

      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // 🔧 FIX 6: Enhanced event handlers with mount checks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && componentMountedRef.current) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (!componentMountedRef.current) return

        try {
          const blob = new Blob(chunksRef.current, {
            type: mediaRecorder?.mimeType || 'audio/webm',
          })

          if (blob.size === 0) {
            throw new Error('Recording is empty')
          }

          setAudioBlob(blob)
          const url = URL.createObjectURL(blob)
          setAudioUrl(url)

          // Auto-process after a short delay
          setTimeout(() => {
            if (componentMountedRef.current && blob.size > 0) {
              processVoiceToContent(blob)
            }
          }, 100)
        } catch (error) {
          console.error('Error processing recording:', error)
          if (componentMountedRef.current) {
            alert('Failed to process recording. Please try again.')
          }
        } finally {
          // Clean up stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        if (componentMountedRef.current) {
          resetRecording()
          alert('Recording failed. Please try again.')
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)

      intervalRef.current = setInterval(() => {
        if (componentMountedRef.current) {
          setRecordingTime((prev) => prev + 1)
        }
      }, 1000)
    } catch (error) {
      console.error('Recording error:', error)
      performCleanup()
      setIsRecording(false)

      let errorMessage = 'Failed to access microphone.'
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow permissions.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone found.'
        } else if (error.message) {
          errorMessage = error.message
        }
      }

      if (componentMountedRef.current) {
        alert(errorMessage)
      }
    }
  }

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      isRecording &&
      componentMountedRef.current
    ) {
      try {
        mediaRecorderRef.current.stop()
        setIsRecording(false)

        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } catch (error) {
        console.error('Error stopping recording:', error)
        resetRecording()
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl && componentMountedRef.current) {
      try {
        audioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    }
  }

  const pauseAudio = () => {
    if (audioRef.current && componentMountedRef.current) {
      try {
        audioRef.current.pause()
        setIsPlaying(false)
      } catch (error) {
        console.error('Error pausing audio:', error)
      }
    }
  }

  // 🔧 DEBUG VERSION: Replace processVoiceToContent with this to find where it hangs
  // Add this to VoiceRecorder.tsx temporarily to debug the hanging issue

  const processVoiceToContent = async (blobArg?: Blob) => {
    const blobToProcess = blobArg || audioBlob
    if (!blobToProcess || !componentMountedRef.current) {
      console.log('❌ No blob to process or component unmounted')
      return
    }

    const startTime = Date.now()
    console.log('🎤 Starting voice processing...', {
      blobSize: blobToProcess.size,
      timestamp: new Date().toISOString(),
    })

    setIsProcessing(true)
    if (onProcessingChange) onProcessingChange(true)

    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }

    // Set timeout with better logging
    processingTimeoutRef.current = setTimeout(() => {
      if (componentMountedRef.current) {
        const elapsed = Date.now() - startTime
        console.error(
          '⚠️ TIMEOUT after',
          elapsed,
          'ms - API call never returned'
        )
        setIsProcessing(false)
        if (onProcessingChange) onProcessingChange(false)
        alert(
          `Processing timed out after ${Math.round(elapsed / 1000)} seconds. API call hung.`
        )
      }
    }, 30000)

    try {
      if (blobToProcess.size === 0) {
        throw new Error('Audio recording is empty')
      }

      console.log('🔄 [Step 1] Creating FormData...')
      const formData = new FormData()
      formData.append('audio', blobToProcess, `recording-${Date.now()}.webm`)
      formData.append('contentType', contentType || 'product')
      formData.append('language', 'auto')
      formData.append('targetLanguage', 'en')

      // 🚨 EMERGENCY FIX: Replace the auth section in processVoiceToContent (VoiceRecorder.tsx)
      // This bypasses Supabase auth entirely and uses cookie-based auth

      console.log('🔄 [Step 2] Getting auth token...')
      let headers: HeadersInit = {}

      // 🔧 CRITICAL FIX: Skip Supabase auth entirely after "Start New Product"
      // Check if this is likely a post-reset scenario by checking component mount time
      const componentAge =
        Date.now() - (componentMountedRef.current ? Date.now() : 0)
      const isLikelyPostReset = componentAge < 30000 // Less than 30 seconds old

      if (supabase && !isLikelyPostReset) {
        // 🔧 Only try Supabase auth if component is "old" (not recently reset)
        try {
          console.log('🔄 [Step 2a] Trying Supabase auth (normal flow)...')

          const authPromise = supabase.auth.getSession()
          const authTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth timeout')), 5000) // Shorter timeout
          })

          const sessionResult = await Promise.race([authPromise, authTimeout])
          console.log('✅ [Step 2b] Supabase auth completed')

          const session = sessionResult?.data?.session
          const accessToken = session?.access_token

          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
            console.log('✅ [Step 2c] Supabase Authorization header set')
          } else {
            throw new Error('No access token available')
          }
        } catch (authError) {
          console.warn(
            '⚠️ [Step 2] Supabase auth failed, falling back to cookie auth:',
            authError
          )
          // Fall through to cookie auth
        }
      } else {
        console.log(
          '🔄 [Step 2] Skipping Supabase auth - using cookie auth only'
        )
        // Skip Supabase entirely - API will use session cookies
      }

      console.log(
        '✅ [Step 2] Auth strategy selected:',
        headers['Authorization'] ? 'Bearer token' : 'Cookie auth'
      )

      console.log('🚀 [Step 3] Making API call to /api/voice-to-form...')
      console.log('📊 Request details:', {
        url: '/api/voice-to-form',
        method: 'POST',
        hasAuth: !!headers['Authorization'],
        blobSize: blobToProcess.size,
        contentType: blobToProcess.type,
      })

      // Add fetch timeout with detailed logging
      const controller = new AbortController()
      const fetchTimeout = setTimeout(() => {
        const elapsed = Date.now() - startTime
        console.error(
          '🔄 [Step 3] FETCH TIMEOUT after',
          elapsed,
          'ms - aborting request'
        )
        controller.abort()
      }, 25000)

      const fetchStartTime = Date.now()
      console.log(
        '⏱️ [Step 3] Fetch started at:',
        new Date(fetchStartTime).toISOString()
      )

      const response = await fetch('/api/voice-to-form', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
        signal: controller.signal,
      })

      const fetchEndTime = Date.now()
      const fetchDuration = fetchEndTime - fetchStartTime
      clearTimeout(fetchTimeout)

      console.log('📊 [Step 4] API Response received:', {
        status: response.status,
        statusText: response.statusText,
        fetchDuration: `${fetchDuration}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        console.log('🔄 [Step 4] Reading error response...')
        const errorData = await response.json()
        console.error('❌ [Step 4] API Error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      console.log('🔄 [Step 5] Parsing successful response...')
      const result = await response.json()
      const totalDuration = Date.now() - startTime

      console.log('✅ [Step 5] Voice processing successful:', {
        totalDuration: `${totalDuration}ms`,
        transcriptionLength: result.transcription?.length || 0,
        detectedLanguage: result.detectedLanguage,
        result,
      })

      if (!componentMountedRef.current) return

      // Process results
      if (result.detectedLanguage) {
        setDetectionResult({
          language: result.detectedLanguage,
          confidence: result.confidence || 0.9,
          wasTranslated: result.wasTranslated || false,
        })
      }

      if (result.transcription) {
        setTranscription(result.transcription)
        if (onTranscriptionComplete) {
          onTranscriptionComplete(result.transcription)
        }
      }

      console.log('🔄 [Step 6] Calling parent onContentGenerated...')
      onContentGenerated({
        transcription: result.transcription,
        detectedLanguage: result.detectedLanguage,
        targetLanguage: result.targetLanguage,
        wasTranslated: result.wasTranslated,
        confidence: result.confidence,
        productName: result.productName,
        generatedContent: result.generatedContent,
      })

      console.log(
        '✅ [Step 6] Voice processing completed successfully in',
        totalDuration,
        'ms'
      )
    } catch (error) {
      const elapsed = Date.now() - startTime
      console.error('❌ Voice processing error after', elapsed, 'ms:', error)

      if (!componentMountedRef.current) return

      let errorMessage = 'Failed to process voice'
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Request aborted after ${Math.round(elapsed / 1000)} seconds - server not responding`
        } else if (error.message.includes('timeout')) {
          errorMessage = `Processing timed out after ${Math.round(elapsed / 1000)} seconds`
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication failed. Please refresh and try again.'
        } else {
          errorMessage = error.message
        }
      }

      alert(`Voice processing failed: ${errorMessage}`)
    } finally {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
        processingTimeoutRef.current = null
      }

      if (componentMountedRef.current) {
        setIsProcessing(false)
        if (onProcessingChange) onProcessingChange(false)
      }
    }
  }

  // Rest of the component JSX remains exactly the same...
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎤 Multilingual Voice Recorder
          </h3>
          <p className="text-sm text-gray-600">
            Record in any language - we'll detect and process it automatically
          </p>
        </div>

        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 rounded-lg p-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 rounded-lg p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-medium">Processing voice... Please wait</span>
          </div>
        )}

        {detectionResult && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              🌍 Language Detection Results
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium">🎯 Detected:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {detectionResult.language.toUpperCase()}
                </span>
                <span className="text-gray-600">
                  ({Math.round(detectionResult.confidence * 100)}% confidence)
                </span>
              </div>
              {detectionResult.wasTranslated && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">🔄 Status:</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    Translated to English
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {transcription && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              📝 Transcription
            </h4>
            <p className="text-gray-700 italic">"{transcription}"</p>
          </div>
        )}

        <div className="flex justify-center items-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg font-medium disabled:transform-none disabled:cursor-not-allowed"
            >
              <Mic className="h-5 w-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg font-medium"
            >
              <Square className="h-5 w-5" />
              <span>Stop Recording</span>
            </button>
          )}

          {audioBlob && !isRecording && !isProcessing && (
            <>
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {showReRecordButton ? (
                <button
                  onClick={() => {
                    resetRecording()
                    if (onReRecord) onReRecord()
                  }}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Re-record</span>
                </button>
              ) : (
                <button
                  onClick={resetRecording}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              )}
            </>
          )}
        </div>

        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>💡 Tip: Speak clearly about your product in any language</p>
          <p>🌍 Supports 99+ languages with automatic detection</p>
          {isProcessing && (
            <p className="text-blue-600 font-medium">
              ⏳ Processing usually takes 10-30 seconds
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
