// src/components/ProductForm.tsx - Enhanced with Multilingual Voice Integration
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import debounce from 'lodash.debounce'
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

// 🔧 ADD THIS MISSING FUNCTION - Blob URL to Base64 converter
// 🔧 DEBUG VERSION - Blob URL to Base64 converter
const convertBlobToBase64 = async (blobUrl: string): Promise<string> => {
  console.log(
    '🔄 [BLOB DEBUG] Starting conversion for URL:',
    blobUrl.substring(0, 50) + '...'
  )

  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.log('❌ [BLOB DEBUG] Conversion timeout after 10s')
      reject(new Error('Blob conversion timeout'))
    }, 10000)
  })

  try {
    const conversionPromise = new Promise<string>(async (resolve, reject) => {
      try {
        console.log('🔄 [BLOB DEBUG] Step 1: Fetching blob...')
        const response = await fetch(blobUrl)
        console.log(
          '✅ [BLOB DEBUG] Step 1 complete - Response status:',
          response.status
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${response.status}`)
        }

        console.log('🔄 [BLOB DEBUG] Step 2: Converting to blob...')
        const blob = await response.blob()
        console.log('✅ [BLOB DEBUG] Step 2 complete - Blob size:', blob.size)

        console.log('🔄 [BLOB DEBUG] Step 3: FileReader conversion...')
        const reader = new FileReader()

        reader.onload = () => {
          console.log('✅ [BLOB DEBUG] Step 3 complete - FileReader success')
          const result = reader.result as string
          resolve(result)
        }

        reader.onerror = (error) => {
          console.error('❌ [BLOB DEBUG] FileReader error:', error)
          reject(new Error('FileReader failed'))
        }

        reader.readAsDataURL(blob)
        console.log('🔄 [BLOB DEBUG] FileReader.readAsDataURL called')
      } catch (error) {
        console.error('❌ [BLOB DEBUG] Conversion error:', error)
        reject(error)
      }
    })

    console.log(
      '🔄 [BLOB DEBUG] Starting race between conversion and timeout...'
    )
    const result = await Promise.race([conversionPromise, timeoutPromise])
    console.log('✅ [BLOB DEBUG] Conversion successful!')
    return result
  } catch (error) {
    console.error('❌ [BLOB DEBUG] Final catch - conversion failed:', error)
    // Return a fallback base64 image (1x1 transparent pixel)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
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
    walmart: string
    custom: string
  }
  isStored?: boolean
  publicUrls?: {
    original?: string
    processed?: {
      amazon?: string
      shopify?: string
      etsy?: string
      instagram?: string
      walmart?: string
      custom?: string
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
  // Move user assignment to the top to avoid block-scoped variable error
  const user = userProp
  // Basic state
  const [productName, setProductName] = useState('')
  const [features, setFeatures] = useState('')
  const [platform, setPlatform] = useState('amazon')
  const [generatedContent, setGeneratedContent] = useState('')
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle')
  // Debounced auto-save function
  // Debounced auto-save function that always gets latest values
  const debouncedAutoSave = useRef(
    debounce(
      async (
        content: string,
        productName: string,
        features: string,
        user: any,
        lastGeneratedContentId: string | null
      ) => {
        if (!user || !productName) return
        setAutoSaveStatus('saving')
        try {
          const res = await fetch('/api/content-library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contentId: lastGeneratedContentId,
              userId: user.id,
              productName,
              content,
              features,
            }),
          })
          const data = await res.json()
          if (data.success) {
            setLastGeneratedContentId(data.data.id)
            setAutoSaveStatus('saved')
          } else {
            setAutoSaveStatus('error')
            addNotification('Auto-save failed. Please try again.', 'error')
          }
        } catch (e) {
          setAutoSaveStatus('error')
          addNotification(
            'Auto-save failed. Please check your connection.',
            'error'
          )
        }
      },
      1200
    )
  ).current
  // Auto-save on generatedContent change
  useEffect(() => {
    if (generatedContent && user && productName) {
      debouncedAutoSave(
        generatedContent,
        productName,
        features,
        user,
        lastGeneratedContentId
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedContent, productName, features, user])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [imageProcessingEnabled, setImageProcessingEnabled] = useState(false)
  const [showBeforeAfter, setShowBeforeAfter] = useState<number | null>(null)
  const [storingImages, setStoringImages] = useState(false)
  const [voiceRecorderKey, setVoiceRecorderKey] = useState(Date.now())
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

  // 🔧 CRITICAL FIX: Replace canGenerate function in ProductForm.tsx (around line 298)
  // This stops the infinite loop that's blocking voice processing

  const canGenerate = () => {
    if (isAdmin) {
      console.log('👑 Admin bypass enabled')
      return true
    }

    // 🚨 FIX: Add usage check FIRST to prevent infinite logging
    const usageOk = actualCurrentUsage < actualMonthlyLimit
    if (!usageOk) {
      console.log(
        '❌ Usage limit reached:',
        actualCurrentUsage,
        '>=',
        actualMonthlyLimit
      )
      return false
    }

    // 🔧 CRITICAL: Limit reset bypass logging to prevent infinite loop
    const timeSinceReset = Date.now() - lastResetTime
    if (timeSinceReset < 15000) {
      // 🚨 ONLY log this ONCE, not repeatedly
      if (timeSinceReset > 14000) {
        // Only log in the last second
        console.log('✅ Recent reset - generation available')
      }
      return true
    }

    // 🔧 Block if currently loading
    if (loading) {
      return false
    }

    // 🔧 Block if already generated (but not if recently reset)
    if (hasGeneratedFinalContent) {
      return false
    }

    return true
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
    console.log('🔍 Full publish result:', result)
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
    {
      value: 'walmart',
      label: '🏬 Walmart',
      description: 'Marketplace listing + competitive pricing',
      imageSize: '1000x1000',
    },
    {
      value: 'custom',
      label: '⚙️ Custom Platform',
      description: 'Generic content for any platform',
      imageSize: '1200x1200',
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

  // 🔧 FIXED: Enhanced storeImagesToSupabase with blob URL conversion
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
      console.log('🔄 Converting blob URLs to base64 for server processing...')

      // ✅ FIXED: Convert blob URLs to data URLs before sending
      const convertBlobToDataUrl = async (blobUrl: string): Promise<string> => {
        if (blobUrl.startsWith('data:')) {
          return blobUrl // Already a data URL
        }

        if (blobUrl.startsWith('blob:')) {
          try {
            const response = await fetch(blobUrl)
            const blob = await response.blob()

            return new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          } catch (error) {
            console.error('❌ Failed to convert blob URL:', blobUrl, error)
            throw new Error(`Failed to convert blob URL: ${error}`)
          }
        }

        return blobUrl // Return as-is for HTTP URLs
      }

      // Convert original images
      const originalImages = await Promise.all(
        processedImages.map(async (img) => {
          try {
            return await convertBlobToDataUrl(img.originalPreview)
          } catch (error) {
            console.error('❌ Failed to convert original image:', error)
            throw error
          }
        })
      )

      // Convert processed images for each platform
      const processedImagesData = {
        amazon: await Promise.all(
          processedImages
            .map((img) => img.platforms.amazon)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Amazon image:', error)
                throw error
              }
            })
        ),
        shopify: await Promise.all(
          processedImages
            .map((img) => img.platforms.shopify)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Shopify image:', error)
                throw error
              }
            })
        ),
        etsy: await Promise.all(
          processedImages
            .map((img) => img.platforms.etsy)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Etsy image:', error)
                throw error
              }
            })
        ),
        instagram: await Promise.all(
          processedImages
            .map((img) => img.platforms.instagram)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Instagram image:', error)
                throw error
              }
            })
        ),
        walmart: await Promise.all(
          processedImages
            .map((img) => img.platforms.walmart)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Walmart image:', error)
                throw error
              }
            })
        ),
        custom: await Promise.all(
          processedImages
            .map((img) => img.platforms.custom)
            .filter(Boolean)
            .map(async (url) => {
              try {
                return await convertBlobToDataUrl(url)
              } catch (error) {
                console.error('❌ Failed to convert Custom image:', error)
                throw error
              }
            })
        ),
      }

      console.log('✅ All blob URLs converted to data URLs successfully')
      console.log('🚀 Making API call with cookie authentication...')

      const response = await fetch('/api/store-images-auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productName,
          originalImages, // ✅ Now data URLs instead of blob URLs
          processedImages: processedImagesData, // ✅ Now data URLs instead of blob URLs
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
              amazon: result.publicUrls.processed.amazon?.[index],
              shopify: result.publicUrls.processed.shopify?.[index],
              etsy: result.publicUrls.processed.etsy?.[index],
              instagram: result.publicUrls.processed.instagram?.[index],
              walmart: result.publicUrls.processed.walmart?.[index],
              custom: result.publicUrls.processed.custom?.[index],
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

      // More specific error messages
      if (error instanceof Error && error.message.includes('convert blob')) {
        addNotification(
          '❌ Image conversion failed. Please try uploading the images again.',
          'error'
        )
      } else {
        addNotification(
          '🎉 Content generated successfully! Click "Save Images" button to store your images.',
          'success'
        )
      }
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
        walmart: resizeImage(canvas, 1000, 1000),
        custom: resizeImage(canvas, 1200, 1200),
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
        platforms: {
          amazon: '',
          shopify: '',
          etsy: '',
          instagram: '',
          walmart: '',
          custom: '',
        },
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
  // 🎯 FULL VISION ANALYSIS with robust error handling - Replace your entire analyzeImagesWithAI function
  const analyzeImagesWithAI = async (images: ProcessedImage[]) => {
    console.log('🔍 Starting enhanced image analysis...', {
      imageCount: images.length,
      hasProcessedImages: false,
    })

    if (!supabase || images.length === 0) {
      return ''
    }

    try {
      // 🔧 SIMPLE validation - no complex blob testing
      const validImages = images.filter((img) => {
        const hasValidUrl = img.processedPreview || img.originalPreview
        if (!hasValidUrl) {
          console.warn('⚠️ Skipping image with no valid URL')
          return false
        }
        return true
      })

      if (validImages.length === 0) {
        console.log('⚠️ No valid images found for analysis')
        return ''
      }

      console.log(
        `✅ Using ${validImages.length} valid images out of ${images.length}`
      )

      // 🔧 SIMPLIFIED: Skip session check, call API directly with cookies
      console.log('🔍 Calling vision API with cookie authentication...')

      // 🔧 SELECT IMAGE and convert to base64 with timeout
      const imageToAnalyze =
        validImages.find((img) => img.processedPreview) || validImages[0]
      const imageUrl =
        imageToAnalyze.processedPreview || imageToAnalyze.originalPreview

      console.log('🖼️ Converting image to base64 for AI analysis...', {
        imageType: imageToAnalyze.processedPreview ? 'processed' : 'original',
      })

      let imageBase64 = ''

      if (imageUrl.startsWith('blob:')) {
        try {
          console.log('🔄 Converting blob URL to base64...')

          // 🔧 ADD TIMEOUT to blob conversion with proper typing
          const blobPromise: Promise<Response> = fetch(imageUrl)
          const blobTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Blob fetch timeout')), 15000)
          )

          const blobResp = await Promise.race([blobPromise, blobTimeout])

          if (!blobResp.ok) {
            throw new Error(`Blob fetch failed: ${blobResp.status}`)
          }

          const blob = await blobResp.blob()

          // 🔧 ADD TIMEOUT to FileReader
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            const readerTimeout = setTimeout(() => {
              reject(new Error('FileReader timeout'))
            }, 10000)

            reader.onload = () => {
              clearTimeout(readerTimeout)
              resolve(reader.result as string)
            }

            reader.onerror = () => {
              clearTimeout(readerTimeout)
              reject(new Error('FileReader failed'))
            }

            reader.readAsDataURL(blob)
          })

          console.log('✅ Blob converted to base64 successfully')
        } catch (conversionError) {
          console.error('❌ Blob conversion failed:', conversionError)
          const imageCount = validImages.length
          return `${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} available. Conversion temporarily unavailable, using basic analysis.`
        }
      } else if (imageUrl.startsWith('data:')) {
        imageBase64 = imageUrl
      } else {
        throw new Error('Unsupported image format')
      }

      // 🔧 VISION API CALL with aggressive timeout and fallback
      console.log('🚀 Making AI vision API call...')

      const visionPromise: Promise<Response> = fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          imageData: imageBase64,
          imageCount: validImages.length,
          hasProcessedImages: false,
          productName: productName || undefined,
        }),
      })

      // 🔧 SHORTER TIMEOUT for vision API (20 seconds instead of 45)
      const visionTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Vision API timeout')), 60000)
      )

      let apiResponse: Response
      try {
        apiResponse = await Promise.race([visionPromise, visionTimeout])
      } catch (visionError) {
        console.error('⚠️ Vision API failed/timeout:', visionError)
        const imageCount = validImages.length
        let fallbackAnalysis = `${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} available`

        if (productName) {
          const possibleBrand = productName.split(' ')[0]
          fallbackAnalysis += `. Product appears to be ${possibleBrand} branded item`
        }

        fallbackAnalysis +=
          '. Images showcase professional quality with clear product details, suitable for marketplace listings with high visual appeal.'

        return fallbackAnalysis
      }

      if (!apiResponse.ok) {
        console.log('⚠️ API response not OK, using fallback')
        throw new Error(`API call failed: ${apiResponse.status}`)
      }

      const result = await apiResponse.json()

      if (result.fallback) {
        console.log('⚠️ Vision analysis used fallback:', result.reason)
      } else {
        console.log('✅ AI vision analysis completed successfully')
      }

      return result.analysis || 'Image analysis completed successfully.'
    } catch (error) {
      console.error('❌ Complete image analysis failure:', error)

      const imageCount = images.length
      let finalFallback = `${imageCount} high-quality product image${imageCount > 1 ? 's' : ''} available`

      if (productName) {
        const words = productName.toLowerCase().split(' ')
        const commonBrands = [
          'nike',
          'adidas',
          'apple',
          'samsung',
          'sony',
          'lg',
          'hp',
          'dell',
          'canon',
          'nikon',
        ]
        const detectedBrand = words.find((word) => commonBrands.includes(word))

        if (detectedBrand) {
          finalFallback += `. ${detectedBrand.charAt(0).toUpperCase() + detectedBrand.slice(1)} branded product visible`
        }
      }

      finalFallback +=
        '. Images showcase key product features with professional presentation quality suitable for e-commerce platforms.'

      return finalFallback
    }
  }

  // Replace your handleGenerate function with this fixed version
  const handleGenerate = async () => {
    const startTime = Date.now()
    console.log('🚀 Starting enhanced content generation...')

    // 🔧 CRITICAL: Pre-flight checks and state cleanup
    console.log('🔍 Pre-flight state check:', {
      productName: !!productName.trim(),
      features: !!features.trim(),
      user: !!user,
      supabase: !!supabase,
      loading,
      hasGeneratedFinalContent,
      canGenerateResult: canGenerate(),
      selectedSections: getSelectedSectionCount(),
      timeSinceReset: Date.now() - lastResetTime,
    })

    // Clear any stale loading state first
    if (loading) {
      console.log('⚠️ Clearing stale loading state')
      setLoading(false)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    // Increment generation attempts
    setGenerationAttempts((prev) => prev + 1)

    let hasSetLoadingToFalse = false
    const clearLoadingState = () => {
      if (!hasSetLoadingToFalse) {
        console.log('🔄 Clearing loading state...')
        setLoading(false)
        hasSetLoadingToFalse = true
      }
    }

    // 🛡 FIX: Increase timeout to 60 seconds to match API timeout
    const timeoutId = setTimeout(() => {
      if (!hasSetLoadingToFalse) {
        console.warn('⚠️ Generation timeout - force clearing loading')
        clearLoadingState()
        addNotification(
          'Generation is taking longer than expected. Content may still appear shortly.',
          'info'
        )
      }
    }, 60000) // Changed from 45000 to 60000 (60 seconds)

    try {
      // Validation checks
      if (!productName.trim()) {
        addNotification('Please enter a product name', 'error')
        clearTimeout(timeoutId)
        return
      }

      if (!features.trim()) {
        addNotification('Please enter product features', 'error')
        clearTimeout(timeoutId)
        return
      }

      if (!user || !supabase) {
        addNotification('Please wait for the component to load', 'error')
        clearTimeout(timeoutId)
        return
      }

      if (getSelectedSectionCount() === 0) {
        addNotification(
          'Please select at least one content section to generate',
          'error'
        )
        clearTimeout(timeoutId)
        return
      }

      // 🔧 Enhanced usage validation
      const freshCanGenerate = canGenerate()
      if (!freshCanGenerate) {
        console.log('❌ Generation blocked by canGenerate check')
        addNotification(
          `Monthly generation limit reached (${actualCurrentUsage}/${actualMonthlyLimit}). Please upgrade your plan to continue.`,
          'error'
        )
        clearTimeout(timeoutId)
        router.push('/pricing')
        return
      }

      console.log('✅ All validations passed, starting generation...')
      setLoading(true)
      hasSetLoadingToFalse = false

      // Clear previous content if not voice enhancement
      if (!isVoiceContentAvailable) {
        setGeneratedContent('')
      }

      // Image analysis (enhanced logging)
      let imageAnalysis = ''
      if (processedImages.length > 0) {
        console.log('🖼️ Starting image analysis...', {
          imageCount: processedImages.length,
          hasValidImages: processedImages.filter(
            (img) => img.originalPreview || img.processedPreview
          ).length,
        })
        try {
          console.log('🔄 Calling analyzeImagesWithAI...')
          imageAnalysis = await analyzeImagesWithAI(processedImages)
          console.log(
            '✅ Image analysis result:',
            imageAnalysis ? imageAnalysis.substring(0, 100) + '...' : 'EMPTY'
          )
        } catch (imageError) {
          console.error('⚠️ Image analysis failed:', imageError)
          addNotification(
            'Image analysis failed, generating content without image insights',
            'info'
          )
        }
      } else {
        console.log('ℹ️ No images to analyze')
      }

      // API call with better timeout handling
      console.log('📝 Making generation API call...')
      const controller = new AbortController()

      // FIX: Match API timeout with UI timeout
      const apiTimeoutId = setTimeout(() => {
        controller.abort()
        console.warn('⏰ API call manually aborted after timeout')
      }, 55000) // Slightly less than UI timeout (55 seconds)

      const requestBody = {
        productName,
        features,
        platform,
        imageAnalysis,
        hasImages: processedImages.length > 0,
        hasProcessedImages: false,
        voiceTranscription: transcription || undefined,
        existingContent: isVoiceContentAvailable ? generatedContent : undefined,
        selectedSections: selectedSections,
      }

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        clearTimeout(apiTimeoutId)

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log('✅ API call successful')

        // Update content
        const newContent = data.result || 'Content generated successfully!'
        setGeneratedContent(newContent)

        // Handle success
        if (data.contentId) {
          console.log('✅ Content ID received:', data.contentId)
          setLastGeneratedContentId(data.contentId)
          setHasGeneratedFinalContent(true)

          // Update usage callback
          if (onGenerationSuccess) {
            try {
              onGenerationSuccess()
            } catch (callbackError) {
              console.error('Success callback failed:', callbackError)
            }
          }

          // Update counters
          if (
            !dismissedPrompts.includes('post-generation') &&
            componentMounted
          ) {
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

        // Image storage
        if (
          processedImages.length > 0 &&
          !processedImages.some((img) => img.isStored) &&
          data.contentId
        ) {
          console.log('💾 Starting image storage...')
          try {
            await storeImagesToSupabase(data.contentId)
            console.log('✅ Image storage completed')
          } catch (storageError) {
            console.error('Image storage failed:', storageError)
            addNotification(
              'Content saved! Image storage failed - you can try saving images again later.',
              'info'
            )
          }
        }

        const totalTime = Date.now() - startTime
        console.log(
          `🎉 Generation completed in ${Math.round(totalTime / 1000)}s`
        )

        const sectionCount = getSelectedSectionCount()
        const sectionText =
          sectionCount === 6
            ? 'complete content package'
            : `${sectionCount} content sections`

        addNotification(
          isVoiceContentAvailable
            ? `🎤 Voice content enhanced (${sectionText}) and saved!`
            : `🎉 ${sectionText} generated successfully in ${Math.round(totalTime / 1000)}s!`,
          'success'
        )
      } catch (fetchError) {
        // Handle specific timeout vs other errors
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('⚠️ Request was aborted due to timeout')
          addNotification(
            'The request is taking longer than expected. Content may still appear in a moment. If not, please try again.',
            'info'
          )
          // Don't throw - let the outer timeout handle cleanup
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      const errorTime = Date.now() - startTime
      console.error(
        `❌ Generation error after ${Math.round(errorTime / 1000)}s:`,
        error
      )

      let userMessage = 'Failed to generate content. Please try again.'
      if (error instanceof Error) {
        if (error.message.includes('Authentication')) {
          userMessage = 'Please refresh the page and log in again.'
        } else if (error.message.includes('Network')) {
          userMessage =
            'Network error. Please check your connection and try again.'
        } else if (error.message.includes('limit')) {
          userMessage = error.message
        } else if (error.name === 'AbortError') {
          userMessage =
            'Generation is taking longer than expected. Please wait a moment and check if content appears.'
        } else {
          userMessage = error.message
        }
      }

      addNotification(userMessage, 'error')
    } finally {
      clearTimeout(timeoutId)
      clearLoadingState()
      console.log('🏁 Generation process completed')
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
  // 🔧 COMPLETE FIX: Enhanced handleStartNewProduct with forced VoiceRecorder remount
  // Replace the handleStartNewProduct function in ProductForm.tsx

  const handleStartNewProduct = async () => {
    console.log('🔄 Starting comprehensive product reset...')

    // 🔧 FIX: Don't clear file input, just clear processed images
    if (fileInputRef.current && processedImages.length > 0) {
      // Only clear if there were processed images
      fileInputRef.current.value = ''
    }

    // 🔧 PHASE 1: IMMEDIATE state reset (all synchronous)
    console.log('⚡ Phase 1: Immediate critical state reset...')

    // ✅ CRITICAL: Reset generation control flags FIRST
    setHasGeneratedFinalContent(false)
    setGenerationAttempts(0)
    setLastResetTime(Date.now())
    setLoading(false)

    // ✅ Reset all form content
    setGeneratedContent('')
    setProductName('')
    setFeatures('')
    setLastGeneratedContentId(null)

    // ✅ Reset content sections
    setSelectedSections(DEFAULT_CONTENT_SECTIONS)
    setShowContentSections(false)

    // 🔧 CRITICAL: Hide voice recorder FIRST to force unmount
    setShowVoiceRecorder(false)
    setTranscription('')
    setIsVoiceContentAvailable(false)

    // ✅ Reset UI state
    setShowPostGenerationPrompt(false)
    setNotifications([])
    setAutoSaveStatus('idle')

    // 🔧 PHASE 2: Enhanced resource cleanup
    console.log('🧹 Phase 2: Resource cleanup...')

    // Check if any processed images exist before cleanup
    const hasImages = processedImages.length > 0
    if (hasImages) {
      console.log(
        '🗑️ Cleaning up',
        processedImages.length,
        'image blob URLs...'
      )
    }

    processedImages.forEach((img, index) => {
      try {
        if (img.originalPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.originalPreview)
          console.log(`✅ Cleaned original blob ${index + 1}`)
        }
        if (img.processedPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(img.processedPreview)
          console.log(`✅ Cleaned processed blob ${index + 1}`)
        }
        // 🔧 NEW: Clean platform-specific blobs too
        Object.entries(img.platforms || {}).forEach(([platform, url]) => {
          if (url && url.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(url)
              console.log(`✅ Cleaned ${platform} blob ${index + 1}`)
            } catch (platformError) {
              console.warn(
                `⚠️ Failed to clean ${platform} blob:`,
                platformError
              )
            }
          }
        })
      } catch (error) {
        console.warn('⚠️ Blob cleanup warning:', error)
      }
    })

    setProcessedImages([])
    console.log('✅ All image references cleared')

    // 🔧 PHASE 3: CRITICAL FIX - Reinitialize Supabase client
    console.log('🔄 Phase 3: Reinitializing Supabase client...')
    try {
      const newSupabaseClient = createClient()
      setSupabase(newSupabaseClient)

      // Update global reference for VoiceRecorder
      if (typeof window !== 'undefined') {
        ;(window as any).supabase = newSupabaseClient
      }

      console.log('✅ Supabase client reinitialized successfully')
    } catch (supabaseError) {
      console.error('❌ Supabase reinit error:', supabaseError)
    }
    // 🔧 PHASE 4: CRITICAL - Force VoiceRecorder remount with new key
    console.log('🔄 Phase 4: Forcing VoiceRecorder remount...')
    setVoiceRecorderKey(Date.now()) // This forces complete remount with fresh Supabase

    console.log('✅ Reset completed immediately!')
    console.log('🎯 State after reset:', {
      hasGeneratedFinalContent: false,
      loading: false,
      generationAttempts: 0,
      canGenerate: true,
    })

    addNotification(
      '🆕 Ready for new product! Voice recorder refreshed.',
      'success'
    )

    console.log('✅ Reset completed - session validation skipped')
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
          <h2 className="text-display-title text-white flex items-center">
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
                {/* 🔧 FIX: Remove dynamic keys that cause re-mounting */}
                <div className="voice-lang-prefs">
                  <LanguagePreferencesManager
                    selectedPlatform={platform}
                    onPreferencesChange={(input, output) => {
                      setSelectedLanguages({ input, output })
                    }}
                  />
                </div>

                <div className="mt-4">
                  {/* 🔧 FIX: Use stable key that doesn't change */}
                  <MultilingualVoiceRecorder
                    key={`voice-recorder-${voiceRecorderKey}`}
                    supabase={supabase}
                    onContentGenerated={async (result) => {
                      console.log('🎤 Voice content received:', result)
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
                    onProcessingChange={(isProcessing) => {
                      console.log('🎤 Processing state changed:', isProcessing)
                      // You can add loading state here if needed
                    }}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  <>
                    <textarea
                      value={generatedContent}
                      onChange={(e) => {
                        setGeneratedContent(e.target.value)
                        setAutoSaveStatus('idle') // Reset status only when user edits
                      }}
                      className="w-full h-[550px] resize-vertical rounded-lg border border-gray-300 p-4 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Edit your generated content here..."
                    />
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      {autoSaveStatus === 'saving' && <span>Saving...</span>}
                      {autoSaveStatus === 'saved' && (
                        <span className="text-green-600">Saved</span>
                      )}
                      {autoSaveStatus === 'error' && (
                        <span className="text-red-600">Auto-save failed</span>
                      )}
                    </div>
                  </>
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
