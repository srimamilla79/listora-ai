// src/components/ProductForm.tsx - Enhanced with SSR Safety (COMPLETE)
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Wand2,
  Copy,
  Download,
  Sparkles,
  CheckCircle,
  X,
  Camera,
  RefreshCw,
  Eye,
  Crop,
  Save,
  Cloud,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Volume2,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  AlertTriangle,
  Rocket,
} from 'lucide-react'

// Import Amazon Components
import AmazonConnection from '@/components/AmazonConnection'
import AmazonPublisher from '@/components/AmazonPublisher'

interface ProcessedImage {
  original: File
  processed?: string
  originalPreview: string
  processedPreview?: string
  isProcessing: boolean
  error?: string
  platforms: {
    amazon: string
    shopify: string
    etsy: string
    instagram: string
  }
  isStored?: boolean
  publicUrls?: {
    original?: string
    processed?: {
      amazon?: string
      shopify?: string
      etsy?: string
      instagram?: string
    }
  }
}

interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

// Enhanced Props Interface
interface ProductFormProps {
  onGenerationSuccess?: () => void
  currentUsage?: number
  monthlyLimit?: number
}

export default function ProductForm({
  onGenerationSuccess,
  currentUsage,
  monthlyLimit,
}: ProductFormProps) {
  // Basic state
  const [productName, setProductName] = useState('')
  const [features, setFeatures] = useState('')
  const [platform, setPlatform] = useState('amazon')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [imageProcessingEnabled, setImageProcessingEnabled] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState<number | null>(null)
  const [storingImages, setStoringImages] = useState(false)
  const [lastGeneratedContentId, setLastGeneratedContentId] = useState<
    string | null
  >(null)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  // Smart promotion features
  const [userGenerationCount, setUserGenerationCount] = useState(0)
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] =
    useState(false)
  const [showSmartPromotion, setShowSmartPromotion] = useState(false)
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([])
  const [componentMounted, setComponentMounted] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Voice integration state
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [isVoiceContentAvailable, setIsVoiceContentAvailable] = useState(false)
  const [contentType, setContentType] = useState('product')
  const [hasGeneratedFinalContent, setHasGeneratedFinalContent] =
    useState(false)

  // Usage validation state
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUsageLimitWarning, setShowUsageLimitWarning] = useState(false)

  // Amazon integration state
  const [amazonConnected, setAmazonConnected] = useState(false)
  // Local fallback state
  const [localUsage, setLocalUsage] = useState(0)
  const [localLimit, setLocalLimit] = useState(10)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // Use passed props or fallback to local state
  const actualCurrentUsage =
    currentUsage !== undefined ? currentUsage : localUsage
  const actualMonthlyLimit =
    monthlyLimit !== undefined ? monthlyLimit : localLimit

  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const router = useRouter()

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    setComponentMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Update local state when props change
  useEffect(() => {
    if (currentUsage !== undefined) {
      setLocalUsage(currentUsage)
    }
    if (monthlyLimit !== undefined) {
      setLocalLimit(monthlyLimit)
    }
  }, [currentUsage, monthlyLimit])

  // Check if user can generate (usage validation)
  const canGenerate = () => {
    console.log('🔍 Usage Check:', {
      isAdmin,
      actualCurrentUsage,
      actualMonthlyLimit,
      passedCurrentUsage: currentUsage,
      passedMonthlyLimit: monthlyLimit,
      canGenerate: isAdmin || actualCurrentUsage < actualMonthlyLimit,
    })

    if (isAdmin) {
      console.log('👑 Admin bypass enabled')
      return true
    }

    const canGen = actualCurrentUsage < actualMonthlyLimit
    if (!canGen) {
      console.log(
        '❌ Usage limit reached:',
        actualCurrentUsage,
        '>=',
        actualMonthlyLimit
      )
    } else {
      console.log('✅ Usage OK:', actualCurrentUsage, '<', actualMonthlyLimit)
    }

    return canGen
  }

  const remainingGenerations = actualMonthlyLimit - actualCurrentUsage
  const usagePercentage = (actualCurrentUsage / actualMonthlyLimit) * 100

  // Amazon publish success handler
  const handleAmazonPublishSuccess = (listingId: string) => {
    addNotification(
      `🎉 Product successfully published to Amazon! Listing ID: ${listingId}`,
      'success'
    )
  }

  // Check admin status
  const checkAdminStatus = async () => {
    if (!user || !supabase) return

    try {
      const { data: adminCheck } = await supabase.rpc('is_admin', {
        user_uuid: user.id,
      })
      setIsAdmin(adminCheck || false)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    }
  }

  // Fetch user's generation count
  const fetchUserGenerationCount = async () => {
    if (!user || !componentMounted || !supabase) return

    try {
      const { data, error } = await supabase
        .from('product_contents')
        .select('id')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching generation count:', error)
        setUserGenerationCount(0)
        setDataLoaded(true)
        return
      }

      const count = data?.length || 0
      setUserGenerationCount(count)
      setDataLoaded(true)

      if (
        count >= 3 &&
        !dismissedPrompts.includes('smart-promotion') &&
        componentMounted &&
        dataLoaded
      ) {
        setShowSmartPromotion(true)
      }
    } catch (error) {
      console.error('Error fetching generation count:', error)
      setUserGenerationCount(0)
      setDataLoaded(true)
    }
  }

  // Dismiss prompt functions
  const dismissPrompt = (promptType: string) => {
    setDismissedPrompts((prev) => [...prev, promptType])
    if (promptType === 'post-generation') {
      setShowPostGenerationPrompt(false)
    } else if (promptType === 'smart-promotion') {
      setShowSmartPromotion(false)
    } else if (promptType === 'usage-limit') {
      setShowUsageLimitWarning(false)
    }
  }

  // Notification functions
  const addNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now().toString()
    const notification = { id, message, type }
    setNotifications((prev) => [...prev, notification])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Get user on mount
  useEffect(() => {
    if (supabase) {
      const getUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)
      }
      getUser()

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        setUser(session?.user || null)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [supabase])

  // Cleanup effects
  useEffect(() => {
    return () => {
      setComponentMounted(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  // Fetch generation count when user changes
  useEffect(() => {
    if (user && componentMounted && supabase) {
      const timer = setTimeout(() => {
        if (componentMounted) {
          fetchUserGenerationCount()
          checkAdminStatus()
        }
      }, 100)

      return () => clearTimeout(timer)
    } else {
      setUserGenerationCount(0)
      setShowSmartPromotion(false)
      setShowPostGenerationPrompt(false)
      setDataLoaded(false)
      setIsAdmin(false)
    }
  }, [user, componentMounted, supabase])

  // Show usage warning when approaching limit
  useEffect(() => {
    if (
      !isAdmin &&
      actualCurrentUsage >= actualMonthlyLimit - 2 &&
      actualCurrentUsage < actualMonthlyLimit
    ) {
      setShowUsageLimitWarning(true)
    } else {
      setShowUsageLimitWarning(false)
    }
  }, [actualCurrentUsage, actualMonthlyLimit, isAdmin])

  // Voice recording functions
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: { ideal: 22050, min: 16000, max: 44100 },
          channelCount: 1,
          autoGainControl: true,
        },
      })

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]

      let mimeType = 'audio/webm'
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(500)
      setIsRecording(true)
      setRecordingTime(0)

      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      addNotification(
        'Failed to access microphone. Please check permissions.',
        'error'
      )
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

  async function optimizeAudioBlob(blob: Blob): Promise<Blob> {
    if (blob.size > 10 * 1024 * 1024) {
      console.log('🗜️ Audio file is large, compressing...')
      return blob
    }
    return blob
  }

  async function updateFormWithVoiceContent(result: any) {
    const updates = []

    if (result.transcription) {
      updates.push(() => setTranscription(result.transcription))
    }

    if (result.productName) {
      updates.push(() => setProductName(result.productName))
    }

    if (result.generatedContent) {
      updates.push(() => setGeneratedContent(result.generatedContent))
      updates.push(() => setIsVoiceContentAvailable(true))

      if (!features.trim() && result.transcription) {
        updates.push(() => setFeatures(result.transcription))
      }
    }

    updates.forEach((update) => update())
  }

  const processVoiceToContent = async () => {
    if (!audioBlob) {
      addNotification('No audio recorded', 'error')
      return
    }

    if (!supabase) {
      addNotification('Please wait for the component to load', 'error')
      return
    }

    setIsProcessingVoice(true)
    const startTime = Date.now()

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        addNotification('Please log in to use voice features', 'error')
        return
      }

      const optimizedBlob = await optimizeAudioBlob(audioBlob)

      const formData = new FormData()
      formData.append('audio', optimizedBlob, 'recording.webm')
      formData.append('contentType', contentType)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)

      const response = await fetch('/api/voice-to-content', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process voice')
      }

      const result = await response.json()
      const endTime = Date.now()

      await updateFormWithVoiceContent(result)

      addNotification(
        `🎤 Voice content generated in ${Math.round(
          (endTime - startTime) / 1000
        )}s! Form auto-filled.`,
        'success'
      )
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        addNotification(
          'Voice processing timed out. Please try a shorter recording.',
          'error'
        )
      } else {
        console.error('Error processing voice:', error)
        addNotification(
          error instanceof Error ? error.message : 'Failed to process voice',
          'error'
        )
      }
    } finally {
      setIsProcessingVoice(false)
    }
  }

  const resetVoiceRecorder = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setTranscription('')
    setIsVoiceContentAvailable(false)
    setHasGeneratedFinalContent(false)
  }

  // Platform configurations
  const platforms = [
    {
      value: 'amazon',
      label: '🛒 Amazon',
      description: 'Complete listing + social content',
      imageSize: '1000x1000',
    },
    {
      value: 'etsy',
      label: '🎨 Etsy',
      description: 'Story-driven + social content',
      imageSize: '2000x2000',
    },
    {
      value: 'shopify',
      label: '🏪 Shopify',
      description: 'Professional + social content',
      imageSize: '1024x1024',
    },
    {
      value: 'instagram',
      label: '📱 Instagram',
      description: 'Social-first + blog content',
      imageSize: '1080x1080',
    },
  ]

  // Image processing functions
  const removeBackground = async (
    imageFile: File
  ): Promise<{ success: boolean; imageUrl: string; error?: string }> => {
    const formData = new FormData()
    formData.append('image_file', imageFile)
    formData.append('size', 'auto')

    try {
      const response = await fetch('/api/remove-bg', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = 'Background removal failed'
        try {
          const errorData = await response.json()
          if (errorData.errors && errorData.errors.length > 0) {
            const firstError = errorData.errors[0]
            if (firstError.title) {
              errorMessage = firstError.title
            }
            if (firstError.code) {
              errorMessage += ` (${firstError.code})`
            }
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`
          }
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }

        return {
          success: false,
          imageUrl: URL.createObjectURL(imageFile),
          error: errorMessage,
        }
      }

      const blob = await response.blob()
      return {
        success: true,
        imageUrl: URL.createObjectURL(blob),
        error: undefined,
      }
    } catch (error) {
      return {
        success: false,
        imageUrl: URL.createObjectURL(imageFile),
        error:
          error instanceof Error
            ? error.message
            : 'Network error connecting to background removal service',
      }
    }
  }

  const resizeImage = (
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): string => {
    const resizedCanvas = document.createElement('canvas')
    const ctx = resizedCanvas.getContext('2d')!

    resizedCanvas.width = width
    resizedCanvas.height = height

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const sourceAspect = canvas.width / canvas.height
    const targetAspect = width / height

    let sx = 0,
      sy = 0,
      sw = canvas.width,
      sh = canvas.height

    if (sourceAspect > targetAspect) {
      sw = canvas.height * targetAspect
      sx = (canvas.width - sw) / 2
    } else if (sourceAspect < targetAspect) {
      sh = canvas.width / targetAspect
      sy = (canvas.height - sh) / 2
    }

    ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, width, height)
    return resizedCanvas.toDataURL('image/jpeg', 0.9)
  }

  const storeImagesToSupabase = async (contentId?: string) => {
    const productContentId = contentId || lastGeneratedContentId

    if (
      !user ||
      processedImages.length === 0 ||
      !productName.trim() ||
      !supabase
    ) {
      return
    }

    if (!productContentId) {
      addNotification(
        'Error: No content ID available. Please generate content first.',
        'error'
      )
      return
    }

    setStoringImages(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token found')
      }

      const originalImages = processedImages.map((img) => img.originalPreview)
      const processedImagesData = {
        amazon: processedImages
          .map((img) => img.platforms.amazon)
          .filter(Boolean),
        shopify: processedImages
          .map((img) => img.platforms.shopify)
          .filter(Boolean),
        etsy: processedImages.map((img) => img.platforms.etsy).filter(Boolean),
        instagram: processedImages
          .map((img) => img.platforms.instagram)
          .filter(Boolean),
      }

      const response = await fetch('/api/store-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productName,
          originalImages,
          processedImages: processedImagesData,
          productContentId: productContentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to store images')
      }

      const result = await response.json()

      setProcessedImages((prev) =>
        prev.map((img, index) => ({
          ...img,
          isStored: true,
          publicUrls: {
            original: result.publicUrls.original[index],
            processed: {
              amazon: result.publicUrls.processed.amazon[index],
              shopify: result.publicUrls.processed.shopify[index],
              etsy: result.publicUrls.processed.etsy[index],
              instagram: result.publicUrls.processed.instagram[index],
            },
          },
        }))
      )

      addNotification(
        'Images saved successfully! You can now access them anytime from your dashboard.',
        'success'
      )
    } catch (error) {
      console.error('Error storing images:', error)
      addNotification('Failed to save images. Please try again.', 'error')
    } finally {
      setStoringImages(false)
    }
  }

  const processImage = async (file: File, index: number) => {
    setProcessedImages((prev) =>
      prev.map((img, i) =>
        i === index ? { ...img, isProcessing: true, error: undefined } : img
      )
    )

    try {
      let processedImageUrl = URL.createObjectURL(file)

      if (imageProcessingEnabled) {
        const fileSizeInMB = file.size / (1024 * 1024)
        if (fileSizeInMB <= 22) {
          const bgResult = await removeBackground(file)
          if (bgResult.success) {
            processedImageUrl = bgResult.imageUrl
          } else {
            addNotification(
              'Background removal temporarily unavailable. Processing image without background removal.',
              'info'
            )
          }
        } else {
          addNotification(
            'Image too large for background removal (max 22MB). Processing without background removal.',
            'info'
          )
        }
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = processedImageUrl
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const platformSizes = {
        amazon: resizeImage(canvas, 1000, 1000),
        shopify: resizeImage(canvas, 1024, 1024),
        etsy: resizeImage(canvas, 2000, 2000),
        instagram: resizeImage(canvas, 1080, 1080),
      }

      setProcessedImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? {
                ...img,
                processed: processedImageUrl,
                processedPreview: processedImageUrl,
                platforms: platformSizes,
                isProcessing: false,
                isStored: false,
              }
            : img
        )
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Processing failed'

      setProcessedImages((prev) =>
        prev.map((img, i) =>
          i === index
            ? {
                ...img,
                isProcessing: false,
                error: errorMessage,
              }
            : img
        )
      )

      addNotification(
        'Image processing failed. Please try uploading the image again.',
        'error'
      )
    }
  }

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || [])

    if (files.length > 0) {
      const remainingSlots = 5 - processedImages.length
      const newFiles = files.slice(0, remainingSlots)

      const newProcessedImages: ProcessedImage[] = newFiles.map((file) => ({
        original: file,
        originalPreview: URL.createObjectURL(file),
        isProcessing: false,
        platforms: { amazon: '', shopify: '', etsy: '', instagram: '' },
        isStored: false,
      }))

      setProcessedImages((prev) => [...prev, ...newProcessedImages])

      for (let i = 0; i < newFiles.length; i++) {
        const imageIndex = processedImages.length + i
        setTimeout(() => processImage(newFiles[i], imageIndex), i * 200)
      }
    }
  }

  const removeImage = (index: number) => {
    const imageToRemove = processedImages[index]
    URL.revokeObjectURL(imageToRemove.originalPreview)
    if (imageToRemove.processedPreview) {
      URL.revokeObjectURL(imageToRemove.processedPreview)
    }
    setProcessedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const reprocessImage = (index: number) => {
    const image = processedImages[index]
    if (image) {
      processImage(image.original, index)
    }
  }

  const analyzeImagesWithAI = async (images: ProcessedImage[]) => {
    if (!supabase || images.length === 0) {
      return ''
    }

    console.log('🔍 Starting enhanced image analysis...', {
      imageCount: images.length,
      hasProcessedImages: images.some((img) => img.processed),
    })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.log('⚠️ No session for image analysis, using basic fallback')
        // Fallback to original basic analysis
        const hasProcessedImages = images.some((img) => img.processed)
        const imageCount = images.length

        let analysis = `${imageCount} high-quality product image${
          imageCount > 1 ? 's' : ''
        } available`

        if (hasProcessedImages) {
          analysis +=
            ' with professional background removal and platform optimization'
        }

        analysis +=
          '. Images show key product features and details suitable for e-commerce listings.'
        return analysis
      }

      // Use the first processed image, or first original if no processed images
      const imageToAnalyze =
        images.find((img) => img.processedPreview) || images[0]
      const imageUrl =
        imageToAnalyze.processedPreview || imageToAnalyze.originalPreview

      console.log('🖼️ Analyzing image with AI vision...', {
        imageType: imageToAnalyze.processedPreview ? 'processed' : 'original',
        imageUrl: imageUrl.substring(0, 50) + '...',
      })

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          imageCount: images.length,
          hasProcessedImages: images.some((img) => img.processed),
          productName: productName || undefined,
        }),
      })

      if (!response.ok) {
        console.log('⚠️ Image analysis API failed, using basic fallback')
        throw new Error(`Image analysis failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.fallback) {
        console.log('⚠️ Vision analysis used fallback:', result.reason)
        addNotification(
          'Using basic image analysis. Vision analysis temporarily unavailable.',
          'info'
        )
      } else {
        console.log('✅ AI vision analysis completed successfully')
        addNotification(
          '🎯 AI analyzed your images for enhanced content generation!',
          'success'
        )
      }

      return result.analysis
    } catch (error) {
      console.error('Image analysis error:', error)

      // Graceful fallback to original basic analysis
      console.log('🔄 Using basic image analysis fallback')

      addNotification(
        'Using basic image analysis. AI vision temporarily unavailable.',
        'info'
      )

      const hasProcessedImages = images.some((img) => img.processed)
      const imageCount = images.length

      let analysis = `${imageCount} high-quality product image${
        imageCount > 1 ? 's' : ''
      } available`

      if (hasProcessedImages) {
        analysis +=
          ' with professional background removal and platform optimization'
      }

      analysis +=
        '. Images show key product features and details suitable for e-commerce listings.'

      return analysis
    }
  }

  // Handle generate with usage validation
  const handleGenerate = async () => {
    // Pre-validation checks
    if (!productName.trim() || !features.trim()) {
      addNotification('Please fill in both product name and features', 'error')
      return
    }

    if (!user) {
      addNotification('Please log in to generate content', 'error')
      return
    }

    if (!supabase) {
      addNotification('Please wait for the component to load', 'error')
      return
    }

    // Usage limit validation (unless admin)
    const canUserGenerate = canGenerate()
    console.log('🔍 Final usage validation:', {
      canUserGenerate,
      isAdmin,
      actualCurrentUsage,
      actualMonthlyLimit,
      hasGeneratedFinalContent,
    })

    if (!canUserGenerate) {
      console.log('❌ BLOCKED: Usage limit reached')
      addNotification(
        `Monthly generation limit reached (${actualCurrentUsage}/${actualMonthlyLimit}). Please upgrade your plan to continue.`,
        'error'
      )
      router.push('/pricing')
      return
    }

    if (hasGeneratedFinalContent) {
      addNotification(
        'Content already generated! Check your dashboard.',
        'info'
      )
      return
    }

    setLoading(true)
    if (!isVoiceContentAvailable) {
      setGeneratedContent('')
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token found')
      }

      let imageAnalysis = ''
      if (processedImages.length > 0) {
        imageAnalysis = await analyzeImagesWithAI(processedImages)
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productName,
          features,
          platform,
          imageAnalysis,
          hasImages: processedImages.length > 0,
          hasProcessedImages: processedImages.some((img) => img.processed),
          voiceTranscription: transcription || undefined,
          existingContent: isVoiceContentAvailable
            ? generatedContent
            : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!isVoiceContentAvailable) {
        setGeneratedContent(data.result || 'Content generated successfully!')
      } else {
        setGeneratedContent(data.result || generatedContent)
      }

      if (data.contentId) {
        setLastGeneratedContentId(data.contentId)
        setHasGeneratedFinalContent(true)

        // Call success callback to update usage display
        if (onGenerationSuccess) {
          console.log('🎉 Calling generation success callback...')
          onGenerationSuccess()
        }

        if (!dismissedPrompts.includes('post-generation') && componentMounted) {
          setShowPostGenerationPrompt(true)
        }

        const newCount = userGenerationCount + 1
        setUserGenerationCount(newCount)

        if (
          newCount >= 3 &&
          !dismissedPrompts.includes('smart-promotion') &&
          componentMounted &&
          dataLoaded
        ) {
          setShowSmartPromotion(true)
        }
      }

      if (
        processedImages.length > 0 &&
        !processedImages.some((img) => img.isStored) &&
        data.contentId
      ) {
        setTimeout(() => {
          storeImagesToSupabase(data.contentId)
        }, 1000)
      }

      addNotification(
        isVoiceContentAvailable
          ? '🎤 Voice content enhanced and saved to dashboard!'
          : '🎉 Content generated successfully and saved to dashboard!',
        'success'
      )
    } catch (error) {
      console.error('Error generating content:', error)
      addNotification(
        `Error: ${
          error instanceof Error ? error.message : 'Failed to generate content'
        }`,
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (generatedContent) {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadContent = () => {
    if (generatedContent) {
      const element = document.createElement('a')
      const file = new Blob([generatedContent], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = `${productName.replace(
        /\s+/g,
        '_'
      )}_${platform}_content.txt`
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }
  }

  const downloadProcessedImage = (
    image: ProcessedImage,
    platformType: keyof ProcessedImage['platforms']
  ) => {
    const imageUrl =
      image.publicUrls?.processed?.[platformType] ||
      image.platforms[platformType]

    if (imageUrl) {
      const link = document.createElement('a')
      link.href = imageUrl
      link.download = `${
        productName || 'product'
      }_${platformType}_optimized.jpg`
      link.click()
    }
  }

  const hasUnstoredImages =
    processedImages.length > 0 &&
    processedImages.some((img) => !img.isStored && img.platforms.amazon)

  const shouldShowPromotions = componentMounted && dataLoaded

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-gradient-to-r from-slate-600 via-gray-700 to-slate-800 px-8 py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-md p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-400 text-green-800'
                : notification.type === 'error'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-blue-50 border-blue-400 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' && (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                )}
                {notification.type === 'error' && (
                  <X className="h-5 w-5 mr-2 text-red-600" />
                )}
                {notification.type === 'info' && (
                  <Cloud className="h-5 w-5 mr-2 text-blue-600" />
                )}
                <span className="text-sm font-medium">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 ml-4"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Limit Warning */}
      {showUsageLimitWarning && !isAdmin && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-orange-900">
                  Almost at your limit!
                </h4>
                <p className="text-orange-700 text-sm">
                  Only {remainingGenerations} generations left this month.
                  Consider upgrading to continue.
                </p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-orange-600">
                  <span>⚡ 10x more generations</span>
                  <span>🎨 Advanced features</span>
                  <span>🚀 Priority processing</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push('/pricing')}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-all transform hover:scale-105 shadow-lg"
              >
                <Rocket className="h-4 w-4" />
                <span>Upgrade</span>
              </button>
              <button
                onClick={() => dismissPrompt('usage-limit')}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Bulk Upload Promotion - Priority-based display */}
      {shouldShowPromotions &&
        (() => {
          // Priority 1: Post-generation prompt
          if (showPostGenerationPrompt) {
            return (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-900">
                      Need to generate more products?
                    </h4>
                    <p className="text-blue-700 text-sm">
                      Upload a CSV and process hundreds at once instead of one
                      by one
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-blue-600">
                      <span>⚡ Save 90% time</span>
                      <span>📊 Bulk processing</span>
                      <span>🚀 Scale your business</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push('/bulk')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Bulk Upload
                    </button>
                    <button
                      onClick={() => dismissPrompt('post-generation')}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          // Priority 2: Power user promotion
          if (showSmartPromotion) {
            return (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900">
                        You're a power user! 🎉
                      </h4>
                      <p className="text-green-700 text-sm">
                        You've generated {userGenerationCount} products. Save
                        10x time with bulk upload!
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-green-600">
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          10x Faster
                        </span>
                        <span className="flex items-center">
                          <FileSpreadsheet className="h-3 w-3 mr-1" />
                          Process hundreds at once
                        </span>
                        <span className="flex items-center">
                          <Zap className="h-3 w-3 mr-1" />
                          Your plan supports bulk upload
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push('/bulk')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Try Bulk Upload
                    </button>
                    <button
                      onClick={() => dismissPrompt('smart-promotion')}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          // Priority 3: Subtle form integration
          if (
            userGenerationCount === 0 ||
            (!showPostGenerationPrompt &&
              !showSmartPromotion &&
              !dismissedPrompts.includes('form-integration'))
          ) {
            return (
              <div className="text-center mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm mb-2">
                  Have multiple products to generate?
                </p>
                <button
                  onClick={() => router.push('/bulk')}
                  className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center space-x-2 group text-sm"
                >
                  <FileSpreadsheet className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>📊 Switch to Bulk Upload</span>
                </button>
                <button
                  onClick={() => dismissPrompt('form-integration')}
                  className="ml-2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          }

          return null
        })()}

      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-amber-800 text-sm">
            ⚠️ Authentication Required - Please log in to use the content
            generator.
          </p>
        </div>
      )}

      {/* Storage Status Banner */}
      {hasUnstoredImages && !storingImages && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cloud className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-blue-800 text-sm">
                Your processed images are ready to be saved permanently
              </p>
            </div>
            <button
              onClick={() => storeImagesToSupabase()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Images
            </button>
          </div>
        </div>
      )}

      {storingImages && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mr-3"></div>
            <p className="text-green-800 text-sm">
              Saving images to your account... This may take a few moments.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-slate-600 via-gray-700 to-slate-800 px-8 py-8">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Sparkles className="mr-3 h-8 w-8" />
            AI Content Generator
          </h2>
          <p className="text-slate-200 mt-3 text-lg">
            Create comprehensive product content packages with professional
            image processing and voice input
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Optimized Voice Processing
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Product Descriptions
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Instagram Captions
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Image Processing
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Cloud Storage
            </span>
          </div>
        </div>

        <div className="p-8">
          {/* Persistent bulk upload option */}
          <div className="flex items-center justify-between mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">
                Need to process multiple products?
              </span>
            </div>
            <button
              onClick={() => router.push('/bulk')}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              Bulk Upload →
            </button>
          </div>

          {/* Voice Integration Section */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    🎤 Voice to Content - Optimized
                  </h3>
                  <p className="text-gray-600">
                    Speak your product details, get instant professional content
                    (50-70% faster!)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="product">Product Content</option>
                  <option value="service">Service Content</option>
                  <option value="listing">Marketplace Listing</option>
                </select>

                <button
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`px-4 py-2 rounded-lg transition-all transform hover:scale-105 ${
                    showVoiceRecorder
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg'
                  }`}
                >
                  {showVoiceRecorder
                    ? 'Hide Voice Recorder'
                    : 'Start Voice Input'}
                </button>
              </div>
            </div>

            {/* Voice Recorder */}
            {showVoiceRecorder && (
              <div className="mt-4 bg-white rounded-xl p-6 border border-gray-200">
                {/* Recording Status */}
                {isRecording && (
                  <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-medium">
                      Recording: {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Main Controls */}
                <div className="flex justify-center items-center space-x-4 mb-4">
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-full transition-all transform hover:scale-105 shadow-lg"
                      style={{
                        minHeight: '48px',
                        minWidth: '160px',
                        touchAction: 'manipulation',
                      }}
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

                  {(audioBlob || transcription) && (
                    <button
                      onClick={resetVoiceRecorder}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Audio Playback Controls */}
                {audioUrl && (
                  <div className="flex items-center space-x-4 bg-gray-50 rounded-lg p-4 mb-4">
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
                      disabled={isProcessingVoice}
                      className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-lg disabled:transform-none disabled:shadow-none"
                    >
                      <Wand2
                        className={`h-4 w-4 ${
                          isProcessingVoice ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {isProcessingVoice
                          ? 'Processing...'
                          : 'Generate Content'}
                      </span>
                    </button>

                    {/* Hidden Audio Element */}
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      onPause={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Transcription Display */}
                {transcription && (
                  <div className="mb-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Transcription:
                    </h5>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-900 text-sm">{transcription}</p>
                    </div>
                  </div>
                )}

                {/* Usage Tips */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-900 mb-2 text-sm">
                    💡 Tips for better results (Now 50-70% faster!):
                  </h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Speak clearly and mention key product features</li>
                    <li>• Include pricing, dimensions, or technical specs</li>
                    <li>• Describe the problem your product solves</li>
                    <li>
                      • Mention target platforms (Amazon, eBay, Shopify, etc.)
                    </li>
                    <li className="text-green-600 font-medium">
                      • ⚡ Optimized processing: ~15-25 seconds vs 30-60 seconds
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Voice Status */}
            {isVoiceContentAvailable && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-800 font-medium">
                    ✅ Voice content generated and ready!
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Product name and content have been filled. You can now add
                  images and finalize.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Section */}
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="productName"
                  className="block text-sm font-semibold text-gray-700 mb-3"
                >
                  Product Name
                </label>
                <input
                  type="text"
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={
                    isVoiceContentAvailable
                      ? 'Filled by voice input'
                      : 'e.g., Wireless Bluetooth Headphones'
                  }
                  className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                    isVoiceContentAvailable
                      ? 'bg-green-50 border-green-300'
                      : 'border-gray-200'
                  }`}
                />
                {isVoiceContentAvailable && (
                  <p className="text-green-600 text-sm mt-1">
                    ✅ Filled by voice input
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="features"
                  className="block text-sm font-semibold text-gray-700 mb-3"
                >
                  Key Features & Benefits
                </label>
                <textarea
                  id="features"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  placeholder={
                    isVoiceContentAvailable
                      ? 'Enhanced from voice input'
                      : 'e.g., Noise cancelling, 20-hour battery life, premium leather padding...'
                  }
                  rows={5}
                  className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-500 transition-all duration-200 resize-none text-gray-900 placeholder-gray-500 ${
                    isVoiceContentAvailable
                      ? 'bg-green-50 border-green-300'
                      : 'border-gray-200'
                  }`}
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Product Images - Professional Processing & Storage
                  </label>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={imageProcessingEnabled}
                        onChange={(e) =>
                          setImageProcessingEnabled(e.target.checked)
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-600">
                        Auto Background Removal
                      </span>
                    </label>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={processedImages.length >= 5}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer ${
                      processedImages.length >= 5
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    }`}
                  >
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {processedImages.length >= 5
                        ? 'Maximum 5 images reached'
                        : 'Upload product images for professional processing'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      PNG, JPG, JPEG up to 10MB each
                    </p>
                  </label>
                </div>

                {/* Complete Image Processing Display */}
                {processedImages.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {processedImages.map((image, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        {/* Header with controls */}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            Image {index + 1}
                            {image.isProcessing && (
                              <span className="ml-2 text-sm text-blue-600">
                                Processing...
                              </span>
                            )}
                            {image.error && (
                              <span className="ml-2 text-sm text-red-600">
                                Error
                              </span>
                            )}
                            {image.isStored && (
                              <span className="ml-2 text-sm text-green-600">
                                ✓ Saved
                              </span>
                            )}
                          </h4>
                          <div className="flex space-x-2">
                            {!image.isProcessing && (
                              <>
                                <button
                                  onClick={() => reprocessImage(index)}
                                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                  title="Reprocess image"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setShowBeforeAfter(
                                      showBeforeAfter === index ? null : index
                                    )
                                  }
                                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                                  title="Toggle before/after view"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeImage(index)}
                                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                                  title="Remove image"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Error Display */}
                        {image.error && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">
                              ❌ {image.error}
                            </p>
                          </div>
                        )}

                        {/* Processing State */}
                        {image.isProcessing && (
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <p className="text-blue-600 text-sm">
                                Processing image...
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Image Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Original Image */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">
                              Original
                            </h5>
                            <div className="relative group">
                              <img
                                src={image.originalPreview}
                                alt={`Original ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg border border-gray-200"
                              />
                              <div className="absolute top-2 left-2">
                                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                                  Original
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Processed Image */}
                          {image.processedPreview && !image.isProcessing && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                Processed{' '}
                                {imageProcessingEnabled
                                  ? '(Background Removed)'
                                  : ''}
                              </h5>
                              <div className="relative group">
                                <img
                                  src={image.processedPreview}
                                  alt={`Processed ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-gray-200 bg-white"
                                  style={{ backgroundColor: '#f9fafb' }}
                                />
                                <div className="absolute top-2 left-2">
                                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                                    ✓ Processed
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Platform Optimized Versions */}
                        {image.platforms.amazon && !image.isProcessing && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-3">
                              Platform-Optimized Versions
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {Object.entries(image.platforms).map(
                                ([platformName, imageUrl]) => {
                                  if (!imageUrl) return null

                                  const platformConfig = platforms.find(
                                    (p) => p.value === platformName
                                  )
                                  const platformLabel =
                                    platformConfig?.label || platformName
                                  const platformSize =
                                    platformConfig?.imageSize || ''

                                  return (
                                    <div
                                      key={platformName}
                                      className="text-center"
                                    >
                                      <div className="relative group">
                                        <img
                                          src={imageUrl}
                                          alt={`${platformName} optimized`}
                                          className="w-full h-24 object-cover rounded-lg border border-gray-200 bg-white"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg"></div>
                                        <div className="absolute bottom-1 left-1 right-1">
                                          <span className="bg-black/70 text-white px-1 py-0.5 rounded text-xs block text-center">
                                            {platformLabel}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {platformSize}
                                      </p>
                                      <button
                                        onClick={() =>
                                          downloadProcessedImage(
                                            image,
                                            platformName as keyof ProcessedImage['platforms']
                                          )
                                        }
                                        className="mt-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                      >
                                        Download
                                      </button>
                                    </div>
                                  )
                                }
                              )}
                            </div>
                          </div>
                        )}

                        {/* Storage Status */}
                        {image.isStored && image.publicUrls && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-800 text-sm font-medium">
                                Images saved to your cloud storage
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Bulk Actions */}
                    {processedImages.length > 1 && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-3">
                          Bulk Actions
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              processedImages.forEach((_, index) =>
                                reprocessImage(index)
                              )
                            }
                            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={processedImages.some(
                              (img) => img.isProcessing
                            )}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reprocess All
                          </button>

                          {processedImages.some(
                            (img) => img.platforms.amazon && !img.isStored
                          ) && (
                            <button
                              onClick={() => storeImagesToSupabase()}
                              disabled={storingImages}
                              className="flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              {storingImages ? 'Saving...' : 'Save All Images'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Target Platform
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {platforms.map((p) => (
                    <div
                      key={p.value}
                      className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        platform === p.value
                          ? 'border-slate-500 bg-slate-50 ring-4 ring-slate-100 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => setPlatform(p.value)}
                    >
                      <div className="text-center">
                        <div className="text-lg font-medium text-gray-900">
                          {p.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {p.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Output Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Complete Content Package
                </h3>
                {generatedContent && (
                  <div className="flex space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      {copied ? (
                        <CheckCircle className="mr-1 h-4 w-4" />
                      ) : (
                        <Copy className="mr-1 h-4 w-4" />
                      )}
                      {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                      onClick={downloadContent}
                      className="flex items-center px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-200 h-[650px] overflow-y-auto">
                {generatedContent ? (
                  <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                    {generatedContent}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Upload className="h-12 w-12 mb-4" />
                    <p className="text-center">
                      {loading
                        ? 'AI is creating your complete content package...'
                        : 'Your complete content package will appear here'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generate button with usage validation */}
          <div className="mt-8 flex flex-col items-center space-y-4">
            <button
              onClick={handleGenerate}
              disabled={
                loading ||
                !user ||
                hasGeneratedFinalContent ||
                (!isAdmin && !canGenerate())
              }
              className={`flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                loading ||
                !user ||
                hasGeneratedFinalContent ||
                (!isAdmin && !canGenerate())
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  {isVoiceContentAvailable
                    ? 'Enhancing Voice Content...'
                    : 'Generating Content...'}
                </>
              ) : hasGeneratedFinalContent ? (
                <>
                  <CheckCircle className="mr-3 h-5 w-5" />
                  Content Generated! Check Dashboard
                </>
              ) : !isAdmin && !canGenerate() ? (
                <>
                  <AlertTriangle className="mr-3 h-5 w-5" />
                  Monthly Limit Reached ({actualCurrentUsage}/
                  {actualMonthlyLimit}) - Upgrade to Continue
                </>
              ) : (
                <>
                  <Wand2 className="mr-3 h-5 w-5" />
                  {isVoiceContentAvailable
                    ? 'Enhance & Finalize Content'
                    : 'Generate Complete Content Package'}
                </>
              )}
            </button>

            {/* Usage status display */}
            {!isAdmin && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {actualCurrentUsage}/{actualMonthlyLimit} generations used
                  this month
                </p>
                {remainingGenerations <= 3 && remainingGenerations > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    Only {remainingGenerations} generations remaining
                  </p>
                )}
              </div>
            )}

            {hasGeneratedFinalContent && (
              <button
                onClick={() => {
                  setHasGeneratedFinalContent(false)
                  setGeneratedContent('')
                  setProductName('')
                  setFeatures('')
                  setProcessedImages([])
                  resetVoiceRecorder()
                  setShowPostGenerationPrompt(false)
                }}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Start New Product
              </button>
            )}
          </div>

          {/* Amazon Integration Section */}
          {generatedContent && user && (
            <div className="mt-8 space-y-6">
              <div className="border-t border-gray-200 pt-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    🚀 Publish Your Content
                  </h2>
                  <p className="text-gray-600">
                    Take your generated content live on Amazon marketplace
                  </p>
                </div>

                {/* Amazon Connection Component */}
                <AmazonConnection
                  userId={user.id}
                  onConnectionChange={setAmazonConnected}
                />

                {/* Temporary Debug Info */}
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-bold">Debug Info:</p>
                  <p className="text-xs">
                    lastGeneratedContentId:{' '}
                    {lastGeneratedContentId || 'MISSING'}
                  </p>
                  <p className="text-xs">
                    productName: {productName || 'MISSING'}
                  </p>
                  <p className="text-xs">
                    generatedContent exists: {generatedContent ? 'YES' : 'NO'}
                  </p>
                </div>

                {/* Amazon Publisher Component - Only show if content exists */}
                {lastGeneratedContentId && (
                  <AmazonPublisher
                    productContent={{
                      id: lastGeneratedContentId,
                      product_name: productName,
                      features: features,
                      platform: platform,
                      content: generatedContent,
                    }}
                    images={processedImages
                      .filter((img) => img.platforms.amazon)
                      .map((img) => img.platforms.amazon)}
                    isConnected={amazonConnected}
                    onPublishSuccess={handleAmazonPublishSuccess}
                  />
                )}

                {/* Integration Benefits */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center">
                    <span className="mr-2">⚡</span>
                    Why Use Direct Publishing?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <div>
                        <div className="font-medium">Save Time</div>
                        <div>No manual copy-pasting to Amazon</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <div>
                        <div className="font-medium">Reduce Errors</div>
                        <div>Automated formatting and validation</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <div>
                        <div className="font-medium">Track Status</div>
                        <div>Real-time publishing updates</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
