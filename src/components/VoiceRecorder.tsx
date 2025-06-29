// src/components/VoiceRecorder.tsx - Fixed Audio Constraints
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
  supabase?: any // Add supabase as a prop
  sessionToken?: string // Add session token as alternative
  contentType?: string // <-- RESTORED: allow contentType prop
  onReRecord?: () => void // Optional callback for re-recording
  showReRecordButton?: boolean // Show re-record button instead of reset
  onProcessingChange?: (isProcessing: boolean) => void // Notifies parent when processing starts/ends
}

export default function MultilingualVoiceRecorder({
  onContentGenerated,
  onTranscriptionComplete,
  supabase,
  sessionToken,
  contentType = 'product', // <-- default to product if not provided
  onReRecord,
  showReRecordButton = false,
  onProcessingChange,
}: MultilingualVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const isProcessingRef = useRef(false)
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [audioUrl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    // Always reset all state before starting a new recording
    resetRecording()
    try {
      console.log('📱 Starting multilingual recording...')

      // Check for HTTPS requirement
      if (
        location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1'
      ) {
        throw new Error(
          'Microphone access requires HTTPS. Please use a secure connection.'
        )
      }

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Your browser does not support microphone access. Please use a modern browser.'
        )
      }

      // 🔧 FIX: Use progressive audio constraints - start simple, add features if supported
      const tryGetUserMedia = async (constraints: MediaStreamConstraints) => {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints)
        } catch (error) {
          console.log('⚠️ Constraint failed, trying simpler version...', error)
          throw error
        }
      }

      let stream: MediaStream | null = null

      // Try progressively simpler constraints
      const constraintOptions = [
        // Ideal constraints with audio enhancements
        {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1,
          },
        },
        // Good quality but flexible
        {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
        // Basic quality with minimal constraints
        {
          audio: {
            echoCancellation: true,
          },
        },
        // Minimal - just audio
        {
          audio: true,
        },
      ]

      for (const constraints of constraintOptions) {
        try {
          console.log('🎤 Trying audio constraints:', constraints)
          stream = await tryGetUserMedia(constraints)
          console.log('✅ Audio constraints successful:', constraints)
          break
        } catch (error) {
          console.log('❌ Constraints failed, trying next option...')
          continue
        }
      }

      if (!stream) {
        throw new Error(
          'Unable to access microphone with any configuration. Please check your microphone settings.'
        )
      }

      streamRef.current = stream

      // 🔧 FIX: Use progressive MediaRecorder options
      let mediaRecorder: MediaRecorder | null = null
      const mimeTypeOptions = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ]

      for (const mimeType of mimeTypeOptions) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          try {
            console.log('🎵 Trying MIME type:', mimeType)
            mediaRecorder = new MediaRecorder(stream, {
              mimeType,
              audioBitsPerSecond: 64000,
            })
            console.log('✅ MediaRecorder created with:', mimeType)
            break
          } catch (error) {
            console.log('❌ MediaRecorder failed for:', mimeType)
            continue
          }
        }
      }

      // Fallback: try without bitrate specification
      if (!mediaRecorder) {
        for (const mimeType of mimeTypeOptions) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            try {
              console.log('🎵 Trying MIME type without bitrate:', mimeType)
              mediaRecorder = new MediaRecorder(stream, { mimeType })
              console.log('✅ MediaRecorder created (no bitrate):', mimeType)
              break
            } catch (error) {
              continue
            }
          }
        }
      }

      // Final fallback: basic MediaRecorder
      if (!mediaRecorder) {
        console.log('🎵 Using basic MediaRecorder...')
        mediaRecorder = new MediaRecorder(stream)
      }

      if (!mediaRecorder) {
        throw new Error(
          'Unable to create MediaRecorder. Your browser may not support audio recording.'
        )
      }

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Always set up event handlers for the new mediaRecorder instance
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder?.mimeType || 'audio/webm',
        })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        // Always process voice after recording stops
        if (blob) {
          processVoiceToContent(blob)
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error('📱 MediaRecorder error:', event)
        throw new Error('Recording failed. Please try again.')
      }

      // Start recording
      mediaRecorder.start(500) // Capture data every 500ms
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)

      console.log('✅ Recording started successfully')
    } catch (error) {
      console.error('📱 Recording error:', error)

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      setIsRecording(false)

      // User-friendly error messages
      let errorMessage =
        'Failed to access microphone. Please check permissions.'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage =
            'Microphone access denied. Please allow microphone permissions and try again.'
        } else if (error.name === 'NotFoundError') {
          errorMessage =
            'No microphone found. Please connect a microphone and try again.'
        } else if (error.name === 'NotReadableError') {
          errorMessage =
            'Microphone is busy. Please close other apps using the microphone and try again.'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage =
            'Microphone configuration issue. Please try again or use a different microphone.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage =
            'Your browser does not support audio recording. Please try a different browser.'
        } else if (error.message) {
          errorMessage = error.message
        }
      }

      alert(errorMessage)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const resetRecording = () => {
    // Clear all audio state
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setTranscription('')
    setDetectionResult(null)
    setIsProcessing(false) // 🔧 FIX: Reset processing state
    isProcessingRef.current = false

    // Clear media recorder ref to avoid stale event handlers
    mediaRecorderRef.current = null

    // Also clear any pending timeouts or intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Clean up audio element
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear any pending chunks
    if (chunksRef.current) {
      chunksRef.current = []
    }
  }

  const processVoiceToContent = async (blobArg?: Blob) => {
    const blobToProcess = blobArg || audioBlob
    if (!blobToProcess) return

    setIsProcessing(true)
    isProcessingRef.current = true
    if (onProcessingChange) onProcessingChange(true)
    // Optional: Timeout for auto-cancel (e.g., 45s)
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      setIsProcessing(false)
      isProcessingRef.current = false
      if (onProcessingChange) onProcessingChange(false)
      alert('Voice processing timed out. Please try again.')
    }, 45000)

    const startTime = Date.now()
    try {
      const formData = new FormData()
      formData.append('audio', blobToProcess, 'recording.webm')
      if (contentType) {
        formData.append('contentType', contentType)
      }
      let headers: HeadersInit = {}

      if (supabase) {
        let session, accessToken
        try {
          const sessionResult = await supabase.auth.getSession()
          session = sessionResult?.data?.session
          accessToken = session?.access_token
        } catch (authError) {
          console.log('⚠️ Auth error:', authError)
        }
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
          console.log('✅ Auth token added to voice request')
        } else {
          alert(
            'Authentication failed. Please log in again or refresh the page.'
          )
          setIsProcessing(false)
          isProcessingRef.current = false
          return
        }
      } else {
        console.log('⚠️ No supabase instance provided to voice recorder')
        alert('Internal error: Supabase client not available.')
        setIsProcessing(false)
        isProcessingRef.current = false
        return
      }

      const response = await fetch('/api/voice-to-form', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process voice')
      }

      const result = await response.json()
      const processingTime = Math.round((Date.now() - startTime) / 1000)

      // Handle multilingual results
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

      // Call the callback with all results
      onContentGenerated({
        transcription: result.transcription,
        detectedLanguage: result.detectedLanguage,
        targetLanguage: result.targetLanguage,
        wasTranslated: result.wasTranslated,
        confidence: result.confidence,
        productName: result.productName,
        generatedContent: result.generatedContent,
      })

      console.log(`✅ Voice processed in ${processingTime}s`)
    } catch (error) {
      console.error('❌ Voice processing error:', error)

      let errorMessage = 'Failed to process voice'

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage =
            'Voice processing timed out (45s). Please try a shorter recording or check your internet connection.'
        } else {
          errorMessage = error.message
        }
      }

      alert(`Voice processing failed: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
      isProcessingRef.current = false
      if (onProcessingChange) onProcessingChange(false)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎤 Multilingual Voice Recorder
          </h3>
          <p className="text-sm text-gray-600">
            Record in any language - we'll detect and process it automatically
          </p>
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 rounded-lg p-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* Language Detection Results */}
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

        {/* Transcription Display */}
        {transcription && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">
              📝 Transcription
            </h4>
            <p className="text-gray-700 italic">"{transcription}"</p>
          </div>
        )}

        {/* Main Controls */}
        <div className="flex justify-center items-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg font-medium"
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

          {audioBlob && !isRecording && (
            <>
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                disabled={isProcessing}
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
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Re-record</span>
                </button>
              ) : (
                <button
                  onClick={resetRecording}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Process Button - removed, voice is processed automatically after stop */}
        {/* No manual process button, UX is now automatic */}

        {/* Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>💡 Tip: Speak clearly about your product in any language</p>
          <p>🌍 Supports 99+ languages with automatic detection</p>
        </div>
      </div>
    </div>
  )
}
