// src/components/ProductForm.tsx - Enhanced with Multilingual Voice Integration
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { LanguagePreferencesManager } from '@/components/LanguagePreferencesManager'
import { useLanguagePreferences } from '@/hooks/useLanguagePreferences'

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
  Settings,
  FileText,
  MessageSquare,
  Share2,
  Target,
} from 'lucide-react'

// Import Amazon Components
import MarketplaceConnections from '@/components/MarketplaceConnections'
import UnifiedPublisher from '@/components/UnifiedPublisher'
import MultilingualVoiceRecorder from '@/components/VoiceRecorder'

// 🧠 FINAL FIX: Base64 conversion utility added here
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      if (!result || !result.startsWith('data:image')) {
        reject('Invalid base64 image')
      } else {
        resolve(result)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 🚀 NEW: Content sections interface
interface ContentSections {
  title: boolean
  sellingPoints: boolean
  description: boolean
  instagramCaption: boolean
  blogIntro: boolean
  callToAction: boolean
}

// 🚀 NEW: Default all sections enabled for backward compatibility
const DEFAULT_CONTENT_SECTIONS: ContentSections = {
  title: true,
  sellingPoints: true,
  description: true,
  instagramCaption: true,
  blogIntro: true,
  callToAction: true,
}

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
  user?: any
}

export default function ProductForm({
  onGenerationSuccess,
  currentUsage,
  monthlyLimit,
  user: userProp,
}: ProductFormProps) {
  // Basic state
  const [productName, setProductName] = useState('')
  const [features, setFeatures] = useState('')
  const [platform, setPlatform] = useState('amazon')
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const user = userProp
  const [copied, setCopied] = useState(false)
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [imageProcessingEnabled, setImageProcessingEnabled] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState<number | null>(null)
  const [storingImages, setStoringImages] = useState(false)
  const [lastGeneratedContentId, setLastGeneratedContentId] = useState<
    string | null
  >(null)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  // 🚀 NEW: Content section selection state
  const [selectedSections, setSelectedSections] = useState<ContentSections>(
    DEFAULT_CONTENT_SECTIONS
  )
  const [showContentSections, setShowContentSections] = useState(false)

  // Smart promotion features
  const [userGenerationCount, setUserGenerationCount] = useState(0)
  const [showPostGenerationPrompt, setShowPostGenerationPrompt] =
    useState(false)
  const [showSmartPromotion, setShowSmartPromotion] = useState(false)
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([])
  const [componentMounted, setComponentMounted] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  // Voice integration state - CLEANED UP VERSION
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [isVoiceContentAvailable, setIsVoiceContentAvailable] = useState(false)
  const [hasGeneratedFinalContent, setHasGeneratedFinalContent] =
    useState(false)

  // 🌍 NEW: Multilingual voice state
  const { updateUsageStats } = useLanguagePreferences()
  const [selectedLanguages, setSelectedLanguages] = useState({
    input: 'auto',
    output: 'en',
  })

  // 🔧 CRITICAL FIX: Add generation attempt counter to prevent infinite blocking
  const [generationAttempts, setGenerationAttempts] = useState(0)
  const [lastResetTime, setLastResetTime] = useState(Date.now())

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

  const router = useRouter()

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    setComponentMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)

    // 🔧 FIX: Make Supabase available globally for VoiceRecorder
    if (typeof window !== 'undefined') {
      ;(window as any).supabase = supabaseClient
    }
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

  // 🔧 CRITICAL FIX: Enhanced canGenerate with reset detection
  const canGenerate = () => {
    if (isAdmin) {
      console.log('👑 Admin bypass enabled')
      return true
    }

    // 🔧 FIX: If user recently reset (within 5 seconds), allow generation regardless of flags
    const timeSinceReset = Date.now() - lastResetTime
    if (timeSinceReset < 5000) {
      console.log('✅ Recent reset detected, allowing generation')
      return actualCurrentUsage < actualMonthlyLimit
    }

    // 🔧 FIX: If user has attempted multiple times, reset the blocking flag
    if (generationAttempts >= 2 && hasGeneratedFinalContent) {
      console.log('🔄 Multiple attempts detected, resetting final content flag')
      setHasGeneratedFinalContent(false)
      return actualCurrentUsage < actualMonthlyLimit
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // 🚀 NEW: Content section handlers
  const toggleSection = (section: keyof ContentSections) => {
    setSelectedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const toggleAllSections = () => {
    const allSelected = Object.values(selectedSections).every(Boolean)
    const newState = allSelected
      ? Object.keys(selectedSections).reduce(
          (acc, key) => ({ ...acc, [key]: false }),
          {} as ContentSections
        )
      : DEFAULT_CONTENT_SECTIONS
    setSelectedSections(newState)
  }

  const getSelectedSectionCount = () => {
    return Object.values(selectedSections).filter(Boolean).length
  }

  // Unified publish success handler
  const handlePublishSuccess = (result: any) => {
    const platform = result.platform || 'platform'
    const id = result.listingId || result.productId || result.id || 'N/A'

    addNotification(
      `🎉 Product successfully published to ${platform}! ID: ${id}`,
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
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const notification = { id, message, type }

    setNotifications((prev) => [...prev, notification])

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Cleanup effects - SIMPLIFIED
  useEffect(() => {
    return () => {
      setComponentMounted(false)
    }
  }, [])

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

  // 🌍 NEW: Enhanced voice content handler for multilingual results (Phase 1 only)
  async function updateFormWithVoiceContent(result: any) {
    const updates = []

    if (result.transcription) {
      updates.push(() => setTranscription(result.transcription))
      // 🎯 NEW: Use transcription as features if features field is empty

      updates.push(() => setFeatures(result.transcription))
    }

    if (result.productName) {
      updates.push(() => setProductName(result.productName))
    }

    // 🎯 IMPORTANT: Only set voice content available, NOT final content
    if (result.transcription || result.productName) {
      updates.push(() => setIsVoiceContentAvailable(true))
      // 🔧 CRITICAL FIX: Reset final content flag to ensure button works
      updates.push(() => setHasGeneratedFinalContent(false))
    }

    // 🚫 REMOVED: No generatedContent handling here - that's Phase 2

    // 🌍 Handle multilingual results
    if (result.detectedLanguage) {
      console.log('🌍 Detected language:', result.detectedLanguage)

      // Show language detection feedback
      if (result.wasTranslated) {
        addNotification(
          `🌍 Detected ${result.detectedLanguage.toUpperCase()} and translated to ${result.targetLanguage.toUpperCase()}!`,
          'success'
        )
      } else {
        addNotification(
          `🎯 Detected ${result.detectedLanguage.toUpperCase()} with ${Math.round((result.confidence || 0.9) * 100)}% confidence`,
          'info'
        )
      }
    }

    // 🎯 NEW: Show Phase 1 complete message
    addNotification(
      '🎤 Voice processed! Form filled successfully. Add images and generate content.',
      'success'
    )

    updates.forEach((update) => update())
  }

  // 🌍 SIMPLIFIED: Reset voice recorder function
  const resetVoiceRecorder = () => {
    setTranscription('')
    setIsVoiceContentAvailable(false)
    setHasGeneratedFinalContent(false)
    setProductName('')
    setFeatures('')
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
      value: 'ebay',
      label: '🏷️ eBay',
      description: 'Auction-style + competitive listing',
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
    console.log('💾 Starting automatic image storage...')

    const productContentId = contentId || lastGeneratedContentId

    if (!user || processedImages.length === 0 || !productName.trim()) {
      console.log('❌ Pre-check failed')
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
    const startTime = Date.now()

    try {
      console.log('🔄 Preparing image data for automatic save...')

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

      console.log(
        '🚀 Making API call with cookie authentication (no session call)...'
      )

      const response = await fetch('/api/store-images-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productName,
          originalImages,
          processedImages: processedImagesData,
          productContentId,
        }),
      })

      console.log('📊 API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.log('❌ API error:', errorData)

        if (response.status === 404) {
          console.log('🔄 Falling back to manual save approach...')
          throw new Error(
            'Automatic save not available - use manual save button'
          )
        }

        throw new Error(errorData.error || 'Failed to store images')
      }

      const result = await response.json()
      const duration = Math.round((Date.now() - startTime) / 1000)

      console.log('✅ Images stored automatically in', duration, 'seconds')

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
        `✅ Images saved automatically in ${duration}s!`,
        'success'
      )
    } catch (error) {
      const duration = Math.round((Date.now() - startTime) / 1000)
      console.error('❌ Automatic storage failed:', error)

      addNotification(
        '🎉 Content generated successfully! Click "Save Images" button to store your images.',
        'success'
      )
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
      hasProcessedImages: false,
    })

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.log('⚠️ No session for image analysis, using basic fallback')
        const hasProcessedImages = false
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

      const imageToAnalyze =
        images.find((img) => img.processedPreview) || images[0]
      const imageUrl =
        imageToAnalyze.processedPreview || imageToAnalyze.originalPreview

      console.log('🖼️ Converting image to base64 for AI analysis...', {
        imageType: imageToAnalyze.processedPreview ? 'processed' : 'original',
      })

      let imageBase64 = ''

      if (imageUrl.startsWith('blob:')) {
        try {
          console.log('🔄 Converting blob URL to base64...')

          const blobResp = await fetch(imageUrl)
          if (!blobResp.ok) {
            throw new Error(
              `Blob fetch failed: ${blobResp.status} ${blobResp.statusText}`
            )
          }

          const blob = await blobResp.blob()

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                resolve(reader.result)
              } else {
                reject(new Error('Failed to convert blob to base64'))
              }
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })

          imageBase64 = base64
          console.log('✅ Blob converted to base64 successfully')
        } catch (conversionError) {
          console.error('❌ Blob conversion failed:', conversionError)
          addNotification('Image analysis failed due to blob error.', 'error')
          return 'Fallback analysis: image info unavailable'
        }
      } else if (imageUrl.startsWith('data:')) {
        imageBase64 = imageUrl
      } else {
        throw new Error('Unsupported image format')
      }

      const apiResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageData: imageBase64,
          imageCount: images.length,
          hasProcessedImages: false,
          productName: productName || undefined,
        }),
      })

      if (!apiResponse.ok) {
        console.log('⚠️ Image analysis API failed, using basic fallback')
        throw new Error(`Image analysis failed: ${apiResponse.status}`)
      }

      const result = await apiResponse.json()

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

      console.log('🔄 Using basic image analysis fallback')

      addNotification(
        'Using basic image analysis. AI vision temporarily unavailable.',
        'info'
      )

      const hasProcessedImages = false
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

  // 🔧 FIXED: Enhanced handleGenerate with better state management
  const handleGenerate = async () => {
    const startTime = Date.now()
    console.log('🚀 Starting content generation process...')

    // 🔧 CRITICAL FIX: Increment generation attempts to help with blocking detection
    setGenerationAttempts((prev) => prev + 1)

    console.log('📊 Initial State Check:', {
      productName: productName.trim(),
      features: features.trim(),
      user: !!user,
      supabase: !!supabase,
      loading,
      hasGeneratedFinalContent,
      actualCurrentUsage,
      actualMonthlyLimit,
      isAdmin,
      generationAttempts: generationAttempts + 1,
      selectedSectionCount: getSelectedSectionCount(),
    })

    let hasSetLoadingToFalse = false
    const clearLoadingState = () => {
      if (!hasSetLoadingToFalse) {
        console.log('🔄 Clearing loading state...')
        setLoading(false)
        hasSetLoadingToFalse = true
      }
    }

    // 🛡 Timeout fallback (force UI reset if blocked)
    setTimeout(() => {
      if (!hasSetLoadingToFalse) {
        console.warn('⚠️ Timeout hit — forcing loading reset')
        clearLoadingState()
        addNotification('Response timeout. Try again or refresh.', 'error')
      }
    }, 45000) // 30 seconds hard limit

    try {
      // Pre-validation checks
      if (!productName.trim()) {
        console.log('❌ Validation failed: Missing product name')
        addNotification('Please enter a product name', 'error')
        return
      }

      if (!features.trim()) {
        console.log('❌ Validation failed: Missing features')
        addNotification('Please enter product features', 'error')
        return
      }

      if (!user) {
        console.log('❌ Validation failed: No user')
        addNotification('Please log in to generate content', 'error')
        return
      }

      if (!supabase) {
        console.log('❌ Validation failed: Supabase not initialized')
        addNotification('Please wait for the component to load', 'error')
        return
      }

      // 🚀 NEW: Validate that at least one section is selected
      if (getSelectedSectionCount() === 0) {
        console.log('❌ Validation failed: No content sections selected')
        addNotification(
          'Please select at least one content section to generate',
          'error'
        )
        return
      }

      // 🔧 FIXED: Fresh usage validation
      const freshCanGenerate = canGenerate()
      console.log('🔍 Fresh usage validation:', {
        isAdmin,
        actualCurrentUsage,
        actualMonthlyLimit,
        freshCanGenerate,
        hasGeneratedFinalContent,
        generationAttempts: generationAttempts + 1,
      })

      if (!freshCanGenerate) {
        console.log('❌ BLOCKED: Usage limit reached')
        addNotification(
          `Monthly generation limit reached (${actualCurrentUsage}/${actualMonthlyLimit}). Please upgrade your plan to continue.`,
          'error'
        )
        router.push('/pricing')
        return
      }

      console.log('⚡ Setting loading state to true...')
      setLoading(true)
      hasSetLoadingToFalse = false

      // Clear previous content if not voice enhancement
      if (!isVoiceContentAvailable) {
        setGeneratedContent('')
      }

      // 🔧 ROBUST FIX: Use cookie-based authentication (same as voice processing)
      console.log('🔐 Using cookie-based authentication...')

      // ✅ Force-refresh blob URLs before image analysis
      // 🔄 Force revoke old object URLs before refreshing
      processedImages.forEach((img) => {
        if (img.originalPreview) URL.revokeObjectURL(img.originalPreview)
        if (img.processedPreview) URL.revokeObjectURL(img.processedPreview)
      })

      const refreshedImages = processedImages.map((img) => ({
        ...img,
        processedPreview: img.processedPreview
          ? URL.createObjectURL(img.original)
          : img.processedPreview,
      }))

      setProcessedImages(refreshedImages)

      // ⏩ Use the fresh list for analysis
      let imageAnalysis = ''
      if (refreshedImages.length > 0) {
        console.log('🖼️ Starting image analysis...')
        const imageStart = Date.now()
        try {
          imageAnalysis = await analyzeImagesWithAI(refreshedImages)
          const imageDuration = Date.now() - imageStart
          console.log(
            `✅ Image analysis completed in ${Math.floor(imageDuration / 1000)}s`
          )
        } catch (imageError) {
          console.error(
            '⚠️ Image analysis failed, continuing without:',
            imageError
          )
          addNotification(
            'Image analysis failed, generating content without image insights',
            'info'
          )
        }
      }

      // 🚀 ENHANCED: Generate content with section selection
      console.log('📝 Starting content generation...')
      const generationStart = Date.now()

      const requestBody = {
        productName,
        features,
        platform,
        imageAnalysis,
        hasImages: processedImages.length > 0,
        hasProcessedImages: false,
        voiceTranscription: transcription || undefined,
        existingContent: isVoiceContentAvailable ? generatedContent : undefined,
        // 🚀 NEW: Pass selected content sections
        selectedSections: selectedSections,
      }

      console.log('📤 Sending generation request:', {
        ...requestBody,
        imageAnalysis: imageAnalysis ? 'included' : 'none',
        hasVoiceInput: !!transcription,
        selectedSectionCount: getSelectedSectionCount(),
      })

      // Make the API call using cookie authentication (same as voice processing)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.warn('⏰ Generation manually aborted after timeout')
        setLoading(false)
        addNotification('Generation took too long and was aborted.', 'error')
      }, 60000) // 60 seconds timeout

      let response
      try {
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // use cookies
          body: JSON.stringify(requestBody),
          signal: controller.signal, // attach abort controller
        })
      } finally {
        clearTimeout(timeoutId) // ✅ always clear timeout
      }

      const generationTime = Date.now() - generationStart
      console.log(
        `📊 Content generation API completed in ${Math.round(generationTime / 1000)}s`
      )
      console.log('📊 Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.log('❌ API Error Data:', errorData)
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError)
        }
        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
        console.log('✅ Successfully parsed response data')
      } catch (parseError) {
        console.error('❌ Failed to parse success response:', parseError)
        throw new Error('Invalid response from server')
      }

      if (data.performance) {
        console.log('📊 API Performance Breakdown:', data.performance)
      }

      // Update content state
      const newContent = data.result || 'Content generated successfully!'

      if (!isVoiceContentAvailable) {
        setGeneratedContent(newContent)
      } else {
        setGeneratedContent(newContent)
      }

      // Handle success state updates
      if (data.contentId) {
        console.log('✅ Content ID received:', data.contentId)
        setLastGeneratedContentId(data.contentId)
        setHasGeneratedFinalContent(true)

        // Call success callback to update usage display
        if (onGenerationSuccess) {
          console.log('🎉 Calling generation success callback...')
          try {
            onGenerationSuccess()
          } catch (callbackError) {
            console.error('❌ Success callback failed:', callbackError)
          }
        }

        // Update prompts and counters
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

      // Enhanced image storage
      if (
        processedImages.length > 0 &&
        !processedImages.some((img) => img.isStored) &&
        data.contentId
      ) {
        console.log('💾 Starting image storage after content generation...')

        try {
          await storeImagesToSupabase(data.contentId)
          console.log('✅ Image storage completed successfully')
        } catch (storageError) {
          console.error('❌ Image storage failed:', storageError)
          addNotification(
            `Content saved successfully! Image storage failed: ${
              storageError instanceof Error
                ? storageError.message
                : 'Unknown error'
            }. You can try saving images again later.`,
            'info'
          )
        }
      }

      const totalTime = Date.now() - startTime
      console.log(
        `🎉 Total process completed successfully in ${Math.round(totalTime / 1000)}s`
      )

      // 🚀 NEW: Enhanced success message with section info
      const sectionCount = getSelectedSectionCount()
      const sectionText =
        sectionCount === 6
          ? 'complete content package'
          : `${sectionCount} content sections`

      addNotification(
        isVoiceContentAvailable
          ? `🎤 Voice content enhanced (${sectionText}) and saved to dashboard!`
          : `🎉 ${sectionText} generated successfully in ${Math.round(totalTime / 1000)}s and saved to dashboard!`,
        'success'
      )
    } catch (error) {
      const errorTime = Date.now() - startTime
      console.error(
        `❌ Error generating content after ${Math.round(errorTime / 1000)}s:`,
        error
      )

      // Provide user-friendly error messages
      let userMessage = 'Failed to generate content. Please try again.'

      if (error instanceof Error) {
        if (error.message.includes('Authentication')) {
          userMessage = 'Please refresh the page and log in again.'
        } else if (error.message.includes('Network')) {
          userMessage =
            'Network error. Please check your connection and try again.'
        } else if (error.message.includes('limit')) {
          userMessage = error.message
        } else {
          userMessage = error.message
        }
      }

      addNotification(userMessage, 'error')
    } finally {
      clearLoadingState()
      const finalTime = Date.now() - startTime
      console.log(
        `🏁 handleGenerate completed in ${Math.round(finalTime / 1000)}s`
      )
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

  // 🔧 CRITICAL FIX: Enhanced reset function with proper state cleanup
  const handleStartNewProduct = async () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    console.log('🔄 Starting new product - comprehensive reset...')

    // Reset form state
    setHasGeneratedFinalContent(false)
    setGenerationAttempts(0)
    setLastResetTime(Date.now())
    setGeneratedContent('')
    setProductName('')
    setFeatures('')
    setLastGeneratedContentId(null)

    // Reset image state
    processedImages.forEach((img) => {
      URL.revokeObjectURL(img.originalPreview)
      if (img.processedPreview) {
        URL.revokeObjectURL(img.processedPreview)
      }
    })
    processedImages.forEach((img) => {
      if (img.originalPreview) {
        URL.revokeObjectURL(img.originalPreview)
      }
      if (img.processedPreview) {
        URL.revokeObjectURL(img.processedPreview)
      }
    })
    setProcessedImages([]) // ✅ now fully clears old blob URLs

    // Reset voice state
    setShowVoiceRecorder(false)
    setTranscription('')
    setIsVoiceContentAvailable(false)

    // Remount voice recorder
    setTimeout(() => {
      setShowVoiceRecorder(false)
    }, 100)

    // Reset content section state
    setSelectedSections(DEFAULT_CONTENT_SECTIONS)
    setShowContentSections(false)

    // Reset notifications/prompts
    setShowPostGenerationPrompt(false)
    setNotifications([])

    // Optional: Refresh session just in case
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error || !session) {
        console.warn(
          '⚠️ Supabase session refresh failed or returned null',
          error
        )
        addNotification(
          'Session refresh issue. Please refresh the page.',
          'error'
        )
      } else {
        console.log('🔁 Supabase session refreshed after reset:', session)
      }
    } catch (err) {
      console.error('❌ Supabase session fetch error:', err)
      addNotification('Supabase error during reset. Try re-logging.', 'error')
    }

    console.log('✅ New product reset completed')
    addNotification('Ready for new product! All components reset.', 'info')
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/50">
          <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-gray-900 px-8 py-8">
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

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-white/50">
        <div className="bg-gradient-to-r from-indigo-700 via-slate-700 to-gray-700 px-8 py-8">
          <h2 className="text-3xl font-bold text-white flex items-center">
            <Sparkles className="mr-3 h-8 w-8" />
            AI Content Generator
          </h2>
          <p className="text-slate-200 mt-3 text-lg">
            Create comprehensive product content packages with professional
            image processing and multilingual voice input
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ Multilingual Voice Input
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
          {/* Voice Integration Section */}
          <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    🎤 Voice to Content - Multilingual
                  </h3>
                  <p className="text-gray-600">
                    Speak in any language, get professional content worldwide
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                  className={`px-6 py-3 rounded-lg transition-all font-medium ${
                    showVoiceRecorder
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg'
                  }`}
                  style={{
                    minHeight: '48px',
                    minWidth: '180px',
                    touchAction: 'manipulation',
                  }}
                >
                  {showVoiceRecorder
                    ? 'Hide Voice Recorder'
                    : '🎤 Start Voice Input'}
                </button>
              </div>
            </div>

            {showVoiceRecorder && (
              <>
                {/* Revert to static keys to stop infinite re-renders */}
                <div key={`lang-prefs-${showVoiceRecorder}`}>
                  <LanguagePreferencesManager
                    selectedPlatform={platform}
                    onPreferencesChange={(input, output) => {
                      setSelectedLanguages({ input, output })
                    }}
                  />
                </div>

                <div className="mt-4">
                  <MultilingualVoiceRecorder
                    key={`voice-recorder-${showVoiceRecorder}`}
                    supabase={supabase}
                    onContentGenerated={async (result) => {
                      await updateFormWithVoiceContent(result)
                      // Update usage statistics
                      if (result.detectedLanguage && result.targetLanguage) {
                        await updateUsageStats(
                          result.detectedLanguage,
                          result.targetLanguage,
                          result.wasTranslated || false,
                          platform
                        )
                      }
                    }}
                    onTranscriptionComplete={setTranscription}
                  />
                </div>
              </>
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
                  ref={fileInputRef}
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

              {/* 🚀 NEW: Content Section Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    📝 Content Sections to Generate
                  </label>
                  <button
                    onClick={() => setShowContentSections(!showContentSections)}
                    className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{showContentSections ? 'Hide' : 'Customize'}</span>
                  </button>
                </div>

                {/* Quick Summary */}
                <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {getSelectedSectionCount() === 6
                            ? 'Complete Content Package'
                            : `${getSelectedSectionCount()} Content Sections`}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getSelectedSectionCount() === 6
                            ? 'All sections selected - full package generation'
                            : `Generating ${getSelectedSectionCount()} of 6 available sections`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleAllSections}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {Object.values(selectedSections).every(Boolean)
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Expandable Content Sections */}
                {showContentSections && (
                  <div className="space-y-3 bg-white rounded-xl border border-gray-200 p-6">
                    <h5 className="font-semibold text-gray-900 mb-4">
                      Choose what to generate:
                    </h5>

                    {[
                      {
                        key: 'title' as keyof ContentSections,
                        label: 'Product Title/Headline',
                        description: 'SEO-optimized main title',
                        icon: Target,
                        color: 'from-blue-500 to-blue-600',
                      },
                      {
                        key: 'sellingPoints' as keyof ContentSections,
                        label: 'Key Selling Points',
                        description: '5-7 bullet points highlighting benefits',
                        icon: Sparkles,
                        color: 'from-green-500 to-green-600',
                      },
                      {
                        key: 'description' as keyof ContentSections,
                        label: 'Detailed Product Description',
                        description: 'Comprehensive description with benefits',
                        icon: FileText,
                        color: 'from-purple-500 to-purple-600',
                      },
                      {
                        key: 'instagramCaption' as keyof ContentSections,
                        label: 'Instagram Caption',
                        description: 'Social media caption with hashtags',
                        icon: Share2,
                        color: 'from-pink-500 to-pink-600',
                      },
                      {
                        key: 'blogIntro' as keyof ContentSections,
                        label: 'Blog Introduction',
                        description: 'Compelling blog post introduction',
                        icon: MessageSquare,
                        color: 'from-orange-500 to-orange-600',
                      },
                      {
                        key: 'callToAction' as keyof ContentSections,
                        label: 'Call-to-Action',
                        description: 'Platform-specific conversion focus',
                        icon: Target,
                        color: 'from-red-500 to-red-600',
                      },
                    ].map((section) => {
                      const Icon = section.icon
                      return (
                        <div
                          key={section.key}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              className={`w-8 h-8 bg-gradient-to-r ${section.color} rounded-lg flex items-center justify-center`}
                            >
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {section.label}
                              </div>
                              <div className="text-sm text-gray-600">
                                {section.description}
                              </div>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSections[section.key]}
                              onChange={() => toggleSection(section.key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      )
                    })}

                    {getSelectedSectionCount() === 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-amber-800 text-sm">
                          ⚠️ Please select at least one content section to
                          generate.
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                  {getSelectedSectionCount() === 6
                    ? 'Complete Content Package'
                    : `Custom Content (${getSelectedSectionCount()} sections)`}
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
                        ? `AI is creating your ${getSelectedSectionCount() === 6 ? 'complete content package' : 'custom content'}...`
                        : `Your ${getSelectedSectionCount() === 6 ? 'complete content package' : 'custom content'} will appear here`}
                    </p>
                    {!loading && getSelectedSectionCount() > 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Selected:{' '}
                        {Object.entries(selectedSections)
                          .filter(([_, selected]) => selected)
                          .map(([key, _]) =>
                            key
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())
                          )
                          .join(', ')}
                      </p>
                    )}
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
                (!isAdmin && !canGenerate()) ||
                getSelectedSectionCount() === 0
              }
              className={`flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                loading ||
                !user ||
                hasGeneratedFinalContent ||
                (!isAdmin && !canGenerate()) ||
                getSelectedSectionCount() === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-700 hover:to-gray-800 transform hover:scale-105 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  {getSelectedSectionCount() === 6
                    ? 'Generating Complete Package...'
                    : `Generating ${getSelectedSectionCount()} Sections...`}
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
              ) : getSelectedSectionCount() === 0 ? (
                <>
                  <AlertTriangle className="mr-3 h-5 w-5" />
                  Select Content Sections First
                </>
              ) : (
                <>
                  <Wand2 className="mr-3 h-5 w-5" />
                  {getSelectedSectionCount() === 6
                    ? 'Generate Complete Content Package'
                    : `Generate ${getSelectedSectionCount()} Content Sections`}
                  {isVoiceContentAvailable && (
                    <span className="text-xs ml-2">(with Voice + Images)</span>
                  )}
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
                onClick={handleStartNewProduct}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Start New Product
              </button>
            )}
          </div>

          {/* Marketplace Integration Section */}
          {generatedContent && user && (
            <div className="mt-8 space-y-6">
              <div className="border-t border-gray-200 pt-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    🚀 Publish to Marketplaces
                  </h2>
                  <p className="text-gray-600">
                    Connect your accounts and publish instantly to Amazon,
                    Shopify, and more
                  </p>
                </div>

                <MarketplaceConnections
                  userId={user.id}
                  onConnectionChange={(platform, connected) => {
                    if (platform === 'amazon') {
                      setAmazonConnected(connected)
                    }
                    console.log(`${platform} connection changed:`, connected)
                  }}
                />

                <UnifiedPublisher
                  productContent={{
                    id: lastGeneratedContentId || '',
                    product_name: productName,
                    features: features,
                    platform: platform,
                    content: generatedContent,
                  }}
                  images={processedImages
                    .map(
                      (img) =>
                        img.publicUrls?.processed?.shopify ||
                        img.platforms?.amazon
                    )
                    .filter(
                      (url): url is string =>
                        Boolean(url) && !url.startsWith('data:')
                    )}
                  onPublishSuccess={handlePublishSuccess}
                  user={user}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
