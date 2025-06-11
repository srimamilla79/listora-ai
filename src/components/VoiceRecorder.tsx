// src/components/VoiceRecorder.tsx
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

  const startRecording = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Stop all tracks to free up the microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to access microphone. Please check permissions.')
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
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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

        {/* Main Controls */}
        <div className="flex items-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <Mic className="h-5 w-5" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg"
            >
              <Square className="h-5 w-5" />
              <span>Stop Recording</span>
            </button>
          )}

          {/* Reset Button */}
          {(audioBlob || transcription) && (
            <button
              onClick={resetRecorder}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>

        {/* Audio Playback Controls */}
        {audioUrl && (
          <div className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4 w-full">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors"
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
              className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none"
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

      {/* Usage Tips */}
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
        </ul>
      </div>
    </div>
  )
}
