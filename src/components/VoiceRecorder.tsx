// src/components/VoiceRecorder.tsx - Mobile Optimized
'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Volume2,
  Upload,
  Wand2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface VoiceRecorderProps {
  onContentGenerated?: (content: any) => void
  onTranscriptionComplete?: (transcription: string) => void
}

export default function VoiceRecorder({
  onContentGenerated,
  onTranscriptionComplete,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [generatedContent, setGeneratedContent] = useState('')
  const [error, setError] = useState('')
  const [contentType, setContentType] = useState('product')

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // 📱 MOBILE-OPTIMIZED: Enhanced startRecording function
  const startRecording = async () => {
    try {
      setError('')
      console.log('📱 Starting mobile-optimized recording...')

      // Mobile-optimized audio constraints
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Mobile-friendly settings
          sampleRate: { ideal: 22050, min: 16000, max: 44100 },
          channelCount: 1,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Enhanced mobile browser compatibility for MediaRecorder
      const mimeTypes = [
        'audio/webm;codecs=opus', // Android Chrome, newer browsers
        'audio/mp4', // Safari, iOS
        'audio/webm', // Fallback Chrome
        'audio/ogg;codecs=opus', // Firefox
        'audio/wav', // Legacy fallback
        'audio/mpeg', // Another fallback
      ]

      let mimeType = 'audio/webm' // Default
      let supportedType = ''

      // Find the first supported MIME type
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          supportedType = type
          break
        }
      }

      console.log('📱 Using MIME type:', supportedType || 'default fallback')

      // Mobile-optimized MediaRecorder options
      const recorderOptions = {
        mimeType: supportedType || undefined,
        audioBitsPerSecond: 64000, // Good quality but not too heavy for mobile
      }

      // Only include mimeType if it's supported to avoid errors
      const mediaRecorder = supportedType
        ? new MediaRecorder(stream, recorderOptions)
        : new MediaRecorder(stream, { audioBitsPerSecond: 64000 })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          console.log('📱 Audio chunk received:', event.data.size, 'bytes')
        }
      }

      mediaRecorder.onstop = () => {
        console.log('📱 Recording stopped, processing audio...')

        const finalMimeType = supportedType || mimeType
        const blob = new Blob(chunksRef.current, { type: finalMimeType })

        console.log('📱 Final audio blob:', {
          size: blob.size,
          type: blob.type,
          chunks: chunksRef.current.length,
        })

        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Stop all tracks to free up the microphone
        stream.getTracks().forEach((track) => {
          track.stop()
          console.log('📱 Audio track stopped')
        })
      }

      mediaRecorder.onerror = (event) => {
        console.error('📱 MediaRecorder error:', event)
        setError('Recording error occurred. Please try again.')
      }

      // Start recording with mobile-optimized timeslice
      mediaRecorder.start(1000) // 1 second chunks for better mobile performance
      setIsRecording(true)
      setRecordingTime(0)

      console.log('📱 Recording started successfully')

      // Mobile-optimized timer with auto-stop
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1
          // Auto-stop after 2 minutes to prevent mobile issues
          if (newTime >= 120) {
            console.log('📱 Auto-stopping recording at 2 minutes')
            stopRecording()
          }
          return newTime
        })
      }, 1000)
    } catch (error) {
      console.error('📱 Mobile recording error:', error)

      let errorMessage = 'Failed to access microphone.'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage =
            'Microphone access denied. Please enable microphone permissions in your browser settings.'
        } else if (error.name === 'NotFoundError') {
          errorMessage =
            'No microphone found. Please ensure your device has a working microphone.'
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Audio recording not supported on this device/browser.'
        } else if (error.name === 'OverconstrainedError') {
          errorMessage =
            'Microphone constraints not supported. Trying with basic settings...'

          // Fallback: Try with minimal constraints
          try {
            console.log(
              '📱 Trying fallback recording with minimal constraints...'
            )
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              audio: true, // Minimal constraint
            })

            const fallbackRecorder = new MediaRecorder(fallbackStream)
            // Continue with fallback recorder setup...
            console.log('📱 Fallback recording setup successful')
          } catch (fallbackError) {
            console.error('📱 Fallback recording also failed:', fallbackError)
            errorMessage =
              'Unable to start recording on this device. Please try on a different device or browser.'
          }
        }
      }

      setError(errorMessage)
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
      setIsPaused(true)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const processVoiceToContent = async () => {
    if (!audioBlob) {
      setError('No audio recorded')
      return
    }

    if (!supabase) {
      setError('Please wait for the component to load')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Get session for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('Please log in to use voice features')
        return
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('contentType', contentType)

      const response = await fetch('/api/voice-to-content', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process voice')
      }

      const result = await response.json()

      setTranscription(result.transcription)
      setGeneratedContent(result.generatedContent)

      // Call parent callbacks
      onTranscriptionComplete?.(result.transcription)
      onContentGenerated?.(result)
    } catch (error) {
      console.error('Error processing voice:', error)
      setError(
        error instanceof Error ? error.message : 'Failed to process voice'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const resetRecorder = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setIsPaused(false)
    setTranscription('')
    setGeneratedContent('')
    setError('')
    chunksRef.current = []
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Voice to Content
            </h3>
            <p className="text-gray-600">
              Speak your product details, get professional content
            </p>
          </div>
        </div>

        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px]"
          style={{ touchAction: 'manipulation' }}
        >
          <option value="product">Product Content</option>
          <option value="service">Service Content</option>
          <option value="listing">Marketplace Listing</option>
        </select>
      </div>

      {/* Recording Controls */}
      <div className="flex flex-col items-center space-y-4">
        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center space-x-2 text-red-600">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium">
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {/* 📱 MOBILE-OPTIMIZED: Main Controls */}
        <div className="flex items-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800 text-white px-6 py-3 rounded-full transition-all transform active:scale-95 shadow-lg text-base font-medium min-h-[48px] min-w-[160px] justify-center"
              style={{
                minHeight: '48px',
                minWidth: '160px',
                touchAction: 'manipulation', // Prevents zoom on double-tap
              }}
            >
              <Mic className="h-5 w-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 active:from-gray-800 active:to-gray-900 text-white px-6 py-3 rounded-full transition-all transform active:scale-95 shadow-lg text-base font-medium min-h-[48px] min-w-[160px] justify-center"
              style={{
                minHeight: '48px',
                minWidth: '160px',
                touchAction: 'manipulation',
              }}
            >
              <Square className="h-5 w-5" />
              <span>Stop Recording</span>
            </button>
          )}

          {/* Reset Button - Mobile Optimized */}
          {(audioBlob || transcription) && (
            <button
              onClick={resetRecorder}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 rounded-lg transition-colors min-h-[48px]"
              style={{ touchAction: 'manipulation' }}
            >
              Reset
            </button>
          )}
        </div>

        {/* 📱 MOBILE-OPTIMIZED: Audio Playback Controls */}
        {audioUrl && (
          <div className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4 w-full">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <div className="flex-1 flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Recording: {formatTime(recordingTime)}
              </span>
            </div>

            <button
              onClick={processVoiceToContent}
              disabled={isProcessing}
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:from-indigo-800 active:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition-all transform active:scale-95 shadow-lg disabled:transform-none disabled:shadow-none min-h-[44px]"
              style={{ touchAction: 'manipulation' }}
            >
              <Wand2
                className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`}
              />
              <span>{isProcessing ? 'Processing...' : 'Generate Content'}</span>
            </button>
          </div>
        )}

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            className="hidden"
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Transcription:
          </h4>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-900">{transcription}</p>
          </div>
        </div>
      )}

      {/* Generated Content Display */}
      {generatedContent && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            Generated Content:
          </h4>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg max-h-96 overflow-y-auto">
            <pre className="text-green-900 whitespace-pre-wrap font-sans">
              {generatedContent}
            </pre>
          </div>
        </div>
      )}

      {/* 📱 MOBILE-OPTIMIZED: Usage Tips */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h5 className="font-semibold text-gray-900 mb-2">
          💡 Tips for better results:
        </h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Speak clearly and at a normal pace</li>
          <li>• Mention key product features, benefits, and target audience</li>
          <li>• Include pricing, dimensions, or technical specifications</li>
          <li>• Describe the problem your product solves</li>
          <li>• Mention target platforms (Amazon, eBay, Shopify, etc.)</li>
          <li className="text-blue-600 font-medium">
            📱 For mobile: Ensure microphone permissions are enabled
          </li>
        </ul>
      </div>
    </div>
  )
}
