// src/app/(dashboard)/dashboard/page.tsx - ENHANCED WITH MODERN DESIGN
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Package,
  TrendingUp,
  Calendar,
  Copy,
  X,
  ExternalLink,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Minus,
  Cloud,
  Camera,
  Plus,
  Zap,
  FileText,
  Archive,
  Grid3x3,
} from 'lucide-react'

let notificationCounter = 0

interface ProductContent {
  id: string
  product_name: string
  platform: string
  features: string | null
  generated_content: string
  created_at: string
  has_images?: boolean
  image_folder?: string
  original_images?: string
  processed_images?: string
}

interface ImageUrls {
  original: string[]
  processed: {
    amazon: string[]
    shopify: string[]
    etsy: string[]
    instagram: string[]
  }
}

interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface DashboardStats {
  total: number
  amazon: number
  etsy: number
  shopify: number
  instagram: number
  withImages: number
}

export default function EnhancedDashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<ProductContent[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductContent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [imageFilter, setImageFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState<ProductContent | null>(
    null
  )
  const [selectedProductImages, setSelectedProductImages] =
    useState<ImageUrls | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Image features
  const [showImageLightbox, setShowImageLightbox] = useState<{
    url: string
    title: string
    platform?: string
  } | null>(null)
  const [selectedImagesForDownload, setSelectedImagesForDownload] = useState<
    Set<string>
  >(new Set())
  const [isDownloadingBulk, setIsDownloadingBulk] = useState(false)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  const itemsPerPage = 10

  // 🔧 NULL-SAFE helper function
  const safeDisplayText = useCallback(
    (text: string | null | undefined, maxLength: number = 50): string => {
      if (!text || text === null || text === undefined) {
        return 'Not specified'
      }
      return text.length > maxLength
        ? `${text.substring(0, maxLength)}...`
        : text
    },
    []
  )

  // 🚀 OPTIMIZED: Memoized stats calculation
  const stats = useMemo((): DashboardStats => {
    if (products.length === 0) {
      return {
        total: 0,
        amazon: 0,
        etsy: 0,
        shopify: 0,
        instagram: 0,
        withImages: 0,
      }
    }

    return {
      total: products.length,
      amazon: products.filter((p) => p.platform === 'amazon').length,
      etsy: products.filter((p) => p.platform === 'etsy').length,
      shopify: products.filter((p) => p.platform === 'shopify').length,
      instagram: products.filter((p) => p.platform === 'instagram').length,
      withImages: products.filter((p) => p.has_images).length,
    }
  }, [products])

  // 🚀 OPTIMIZED: Memoized filtering with null safety
  const filteredAndPaginatedProducts = useMemo(() => {
    let filtered = products

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.product_name.toLowerCase().includes(searchLower) ||
          product.platform.toLowerCase().includes(searchLower) ||
          (product.features || '').toLowerCase().includes(searchLower)
      )
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter(
        (product) => product.platform === platformFilter
      )
    }

    if (imageFilter !== 'all') {
      if (imageFilter === 'with-images') {
        filtered = filtered.filter((product) => product.has_images)
      } else if (imageFilter === 'no-images') {
        filtered = filtered.filter((product) => !product.has_images)
      }
    }

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentProducts = filtered.slice(startIndex, endIndex)

    return {
      filtered,
      totalPages,
      startIndex,
      endIndex,
      currentProducts,
    }
  }, [products, searchTerm, platformFilter, imageFilter, currentPage])

  // Add notification function
  const addNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `${Date.now()}-${++notificationCounter}-${Math.random().toString(36).substr(2, 5)}`
      const notification = { id, message, type }
      setNotifications((prev) => [...prev, notification])

      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 4000)
    },
    []
  )

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 🚀 OPTIMIZED: Memoized JSON parsing
  const safeJSONParse = useCallback(
    (jsonString: string | undefined, fallback: any) => {
      if (!jsonString) return fallback
      try {
        return JSON.parse(jsonString)
      } catch (error) {
        console.warn('Failed to parse JSON:', jsonString, error)
        return fallback
      }
    },
    []
  )

  // 🚀 OPTIMIZED: Memoized image URL generation
  const generateImageUrls = useCallback(
    (product: ProductContent): ImageUrls => {
      if (!product.image_folder) {
        return {
          original: [],
          processed: { amazon: [], shopify: [], etsy: [], instagram: [] },
        }
      }

      const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listora-images/${product.image_folder}`

      const originalImages = safeJSONParse(product.original_images, [])
      const processedImages = safeJSONParse(product.processed_images, {})

      return {
        original: originalImages.map(
          (filename: string) => `${baseUrl}/${filename}`
        ),
        processed: {
          amazon: (processedImages.amazon || []).map(
            (filename: string) => `${baseUrl}/${filename}`
          ),
          shopify: (processedImages.shopify || []).map(
            (filename: string) => `${baseUrl}/${filename}`
          ),
          etsy: (processedImages.etsy || []).map(
            (filename: string) => `${baseUrl}/${filename}`
          ),
          instagram: (processedImages.instagram || []).map(
            (filename: string) => `${baseUrl}/${filename}`
          ),
        },
      }
    },
    [safeJSONParse]
  )

  // 🚀 OPTIMIZED: Streamlined product loading
  const loadProducts = useCallback(
    async (userId: string) => {
      if (!supabase) return

      try {
        console.log('Loading products for user:', userId)

        // Simple, fast query - only essential fields for list view
        const { data, error } = await supabase
          .from('product_contents')
          .select(
            `
          id,
          product_name,
          platform,
          features,
          generated_content,
          created_at,
          has_images,
          image_folder,
          original_images,
          processed_images
        `
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1000) // Reasonable limit for performance

        if (error) {
          console.error('Error loading products:', error)
          throw error
        }

        console.log('Loaded products:', data?.length || 0)
        setProducts(data || [])
      } catch (error) {
        console.error('Error loading products:', error)
        addNotification(
          'Failed to load content. Please refresh the page.',
          'error'
        )
      }
    },
    [supabase, addNotification]
  )

  // 🚀 OPTIMIZED: Simplified auth check
  useEffect(() => {
    if (!supabase) return

    let mounted = true

    const checkAuthAndLoadData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            // Start loading products immediately without waiting for other data
            loadProducts(session.user.id)
          } else {
            router.push('/login')
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkAuthAndLoadData()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          loadProducts(session.user.id)
        } else {
          router.push('/login')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase, loadProducts])

  // Enhanced download function
  const downloadImage = useCallback(async (url: string, filename: string) => {
    if (!url) {
      console.log('No URL provided for download')
      return
    }

    try {
      console.log('Starting download for:', filename)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
      }

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(blobUrl)
      console.log('✅ Download completed:', filename)
    } catch (error) {
      console.error('❌ Download failed:', error)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.download = filename
      link.click()
    }
  }, [])

  // Bulk download function with ZIP support
  const bulkDownloadImages = useCallback(async () => {
    if (selectedImagesForDownload.size === 0) return

    setIsDownloadingBulk(true)

    try {
      const imageUrls = Array.from(selectedImagesForDownload)

      if (imageUrls.length === 1) {
        const url = imageUrls[0]
        const filename = `${selectedProduct?.product_name.replace(/\s+/g, '_')}.jpg`
        await downloadImage(url, filename)
        addNotification('Image downloaded successfully!', 'success')
      } else {
        addNotification(
          `Preparing ${imageUrls.length} images for download...`,
          'info'
        )

        const JSZip = (await import('jszip')).default
        const zip = new JSZip()

        for (let i = 0; i < imageUrls.length; i++) {
          const url = imageUrls[i]

          try {
            const response = await fetch(url)
            if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}`)

            const blob = await response.blob()
            let filename = `image_${i + 1}.jpg`

            if (selectedProductImages) {
              const originalIndex = selectedProductImages.original.indexOf(url)
              if (originalIndex !== -1) {
                filename = `original_${originalIndex + 1}.jpg`
              } else {
                for (const [platform, urls] of Object.entries(
                  selectedProductImages.processed
                )) {
                  const platformIndex = urls.indexOf(url)
                  if (platformIndex !== -1) {
                    const platformLabels = {
                      amazon: 'Amazon_1000x1000',
                      shopify: 'Shopify_1024x1024',
                      etsy: 'Etsy_2000x2000',
                      instagram: 'Instagram_1080x1080',
                    }
                    filename = `${platformLabels[platform as keyof typeof platformLabels] || platform}_${platformIndex + 1}.jpg`
                    break
                  }
                }
              }
            }

            zip.file(filename, blob)
            addNotification(
              `Processing image ${i + 1} of ${imageUrls.length}...`,
              'info'
            )
          } catch (error) {
            console.error(`Failed to fetch image ${i + 1}:`, error)
          }
        }

        addNotification('Creating ZIP file...', 'info')
        const zipBlob = await zip.generateAsync({ type: 'blob' })

        const zipUrl = URL.createObjectURL(zipBlob)
        const link = document.createElement('a')
        link.href = zipUrl
        link.download = `${selectedProduct?.product_name.replace(/\s+/g, '_')}_images.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(zipUrl)

        addNotification(
          `Successfully downloaded ${imageUrls.length} images as ZIP file!`,
          'success'
        )
      }

      setSelectedImagesForDownload(new Set())
    } catch (error) {
      console.error('Bulk download failed:', error)
      addNotification('Download failed. Please try again.', 'error')
    } finally {
      setIsDownloadingBulk(false)
    }
  }, [
    selectedImagesForDownload,
    selectedProduct,
    selectedProductImages,
    downloadImage,
    addNotification,
  ])

  const toggleImageSelection = useCallback(
    (url: string) => {
      const newSelection = new Set(selectedImagesForDownload)
      if (newSelection.has(url)) {
        newSelection.delete(url)
      } else {
        newSelection.add(url)
      }
      setSelectedImagesForDownload(newSelection)
    },
    [selectedImagesForDownload]
  )

  const selectAllImages = useCallback(() => {
    if (!selectedProductImages) return

    const allUrls = [
      ...selectedProductImages.original,
      ...Object.values(selectedProductImages.processed).flat(),
    ]

    setSelectedImagesForDownload(new Set(allUrls))
  }, [selectedProductImages])

  const clearImageSelection = useCallback(() => {
    setSelectedImagesForDownload(new Set())
  }, [])

  // 🚀 OPTIMIZED: Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, platformFilter, imageFilter])

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // 🚀 OPTIMIZED: Memoized view handler
  const handleView = useCallback(
    (product: ProductContent) => {
      setSelectedProduct(product)
      setSelectedProductImages(generateImageUrls(product))
      setShowModal(true)
    },
    [generateImageUrls]
  )

  const handleDownload = useCallback((product: ProductContent) => {
    const element = document.createElement('a')
    const file = new Blob([product.generated_content], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${product.product_name.replace(/\s+/g, '_')}_${product.platform}_content.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [])

  const copyToClipboard = useCallback(
    async (text: string) => {
      await navigator.clipboard.writeText(text)
      addNotification('Content copied to clipboard!', 'success')
    },
    [addNotification]
  )

  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setPlatformFilter('all')
    setImageFilter('all')
  }, [])

  // 🚀 OPTIMIZED: Memoized platform badge
  const getPlatformBadge = useCallback((platform: string) => {
    const badges = {
      amazon: { label: '🛒 Amazon', color: 'bg-orange-100 text-orange-800' },
      etsy: { label: '🎨 Etsy', color: 'bg-pink-100 text-pink-800' },
      shopify: { label: '🏪 Shopify', color: 'bg-green-100 text-green-800' },
      instagram: {
        label: '📱 Instagram',
        color: 'bg-purple-100 text-purple-800',
      },
    }
    return (
      badges[platform as keyof typeof badges] || {
        label: platform,
        color: 'bg-gray-100 text-gray-800',
      }
    )
  }, [])

  if (loading || !mounted || !supabase) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-md p-4 rounded-xl shadow-xl border backdrop-blur-xl transform transition-all duration-300 ease-in-out ${
              notification.type === 'success'
                ? 'bg-green-50/90 border-green-200 text-green-800'
                : notification.type === 'error'
                  ? 'bg-red-50/90 border-red-200 text-red-800'
                  : 'bg-blue-50/90 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' && (
                  <CheckSquare className="h-5 w-5 mr-2 text-green-600" />
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
                className="text-gray-400 hover:text-gray-600 ml-4 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                Content Library
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                Your complete collection of AI-generated content and images
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/generate')}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                <span>Create New</span>
              </button>
              <button
                onClick={() => router.push('/bulk')}
                className="bg-white/80 hover:bg-white backdrop-blur-xl border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <Archive className="h-5 w-5" />
                <span>Bulk Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  Total Generated
                </p>
                <p className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-3 shadow-lg text-2xl">
                🛒
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  Amazon
                </p>
                <p className="text-lg lg:text-2xl font-bold text-orange-600">
                  {stats.amazon}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mr-3 shadow-lg text-2xl">
                🎨
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  Etsy
                </p>
                <p className="text-lg lg:text-2xl font-bold text-pink-600">
                  {stats.etsy}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-3 shadow-lg text-2xl">
                🏪
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  Shopify
                </p>
                <p className="text-lg lg:text-2xl font-bold text-green-600">
                  {stats.shopify}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mr-3 shadow-lg text-2xl">
                📱
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  Instagram
                </p>
                <p className="text-lg lg:text-2xl font-bold text-purple-600">
                  {stats.instagram}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-gray-600 font-medium">
                  With Images
                </p>
                <p className="text-lg lg:text-2xl font-bold text-cyan-600">
                  {stats.withImages}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Search and Filter */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 mb-6 shadow-xl border border-white/50">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your content library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-80 transition-all shadow-sm"
                />
              </div>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer min-w-[140px] shadow-sm"
              >
                <option value="all">All Platforms</option>
                <option value="amazon">🛒 Amazon</option>
                <option value="etsy">🎨 Etsy</option>
                <option value="shopify">🏪 Shopify</option>
                <option value="instagram">📱 Instagram</option>
              </select>
              <select
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value)}
                className="px-4 py-3 bg-gray-50/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer min-w-[140px] shadow-sm"
              >
                <option value="all">All Content</option>
                <option value="with-images">📸 With Images</option>
                <option value="no-images">📝 Text Only</option>
              </select>
            </div>
            <div className="flex gap-2 w-full lg:w-auto justify-between lg:justify-end">
              {(searchTerm ||
                platformFilter !== 'all' ||
                imageFilter !== 'all') && (
                <button
                  onClick={clearSearch}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 cursor-pointer text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Clear
                </button>
              )}
              <div className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl text-sm font-medium shadow-md flex items-center space-x-2">
                <Grid3x3 className="h-4 w-4" />
                <span>
                  {filteredAndPaginatedProducts.filtered.length} items
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Content Table */}
        {filteredAndPaginatedProducts.filtered.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-b border-gray-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Product
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Platform
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Images
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-700 hidden lg:table-cell">
                      Features
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-gray-700 hidden sm:table-cell">
                      Created
                    </th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAndPaginatedProducts.currentProducts.map(
                    (product) => {
                      const badge = getPlatformBadge(product.platform)
                      const imageUrls = generateImageUrls(product)
                      const hasImages = product.has_images
                      const firstImage = imageUrls.original[0]

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-indigo-50/50 transition-all duration-200"
                        >
                          <td className="px-4 lg:px-6 py-4">
                            <div className="text-gray-900 font-medium text-sm lg:text-base truncate max-w-[200px]">
                              {product.product_name}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${badge.color} shadow-sm`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4">
                            {hasImages ? (
                              <div className="flex items-center space-x-2">
                                {firstImage && (
                                  <img
                                    src={firstImage}
                                    alt="Product"
                                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                                <div className="text-xs text-gray-600">
                                  📸{' '}
                                  {Math.max(
                                    imageUrls.original.length,
                                    Object.values(imageUrls.processed).reduce(
                                      (total, arr) => total + arr.length,
                                      0
                                    ) / 4
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">
                                No images
                              </span>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                            <div className="text-gray-600 text-sm truncate max-w-xs">
                              {safeDisplayText(product.features, 50)}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                            <div className="flex items-center text-gray-600 text-sm">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(
                                product.created_at
                              ).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                              <button
                                onClick={() => handleView(product)}
                                className="p-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105"
                                title="View content & images"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(product)}
                                className="p-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105"
                                title="Download content"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            {filteredAndPaginatedProducts.totalPages > 1 && (
              <div className="px-4 lg:px-6 py-4 bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {filteredAndPaginatedProducts.startIndex + 1}-
                    {Math.min(
                      filteredAndPaginatedProducts.endIndex,
                      filteredAndPaginatedProducts.filtered.length
                    )}{' '}
                    of {filteredAndPaginatedProducts.filtered.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105 disabled:transform-none"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-900 rounded-xl text-sm font-medium shadow-sm">
                      {currentPage} of {filteredAndPaginatedProducts.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage(
                          Math.min(
                            filteredAndPaginatedProducts.totalPages,
                            currentPage + 1
                          )
                        )
                      }
                      disabled={
                        currentPage === filteredAndPaginatedProducts.totalPages
                      }
                      className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105 disabled:transform-none"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 lg:p-12 text-center shadow-xl border border-white/50">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Package className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchTerm || platformFilter !== 'all' || imageFilter !== 'all'
                ? 'No matching content found'
                : 'Your content library is empty'}
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              {searchTerm || platformFilter !== 'all' || imageFilter !== 'all'
                ? "Try adjusting your search criteria to find what you're looking for."
                : 'Start generating your first product content with our AI-powered tools.'}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => router.push('/generate')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl transition-all duration-200 cursor-pointer font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <Sparkles className="h-5 w-5" />
                <span>Generate Content</span>
              </button>
              <button
                onClick={() => router.push('/bulk')}
                className="bg-white/80 hover:bg-white backdrop-blur-xl border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <Archive className="h-5 w-5" />
                <span>Bulk Upload</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ALL EXISTING MODALS AND FUNCTIONALITY PRESERVED EXACTLY */}
      {/* Enhanced View Modal with Images */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/50">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProduct.product_name}
                  </h2>
                  <div className="flex items-center mt-2 space-x-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlatformBadge(selectedProduct.platform).color}`}
                    >
                      {getPlatformBadge(selectedProduct.platform).label}
                    </span>
                    <span className="text-gray-600 text-sm">
                      {new Date(
                        selectedProduct.created_at
                      ).toLocaleDateString()}
                    </span>
                    {selectedProduct.has_images && (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        📸{' '}
                        {(() => {
                          const originalCount =
                            selectedProductImages?.original.length || 0
                          const processedCount = selectedProductImages
                            ? Math.max(
                                ...Object.values(
                                  selectedProductImages.processed
                                ).map((arr) => arr.length)
                              )
                            : 0
                          return Math.max(originalCount, processedCount)
                        })()}{' '}
                        Images
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      copyToClipboard(selectedProduct.generated_content)
                    }
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Copy content"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(selectedProduct)}
                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    title="Download"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content with Images */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: 'calc(90vh - 140px)' }}
            >
              <div
                className={`p-6 ${selectedProduct.has_images ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}
              >
                {/* Content Section */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Generated Content
                    </h3>
                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                      {selectedProduct.generated_content ? (
                        <div className="space-y-4">
                          <pre className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
                            {selectedProduct.generated_content}
                          </pre>
                          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
                            <p>
                              ✓ Includes: Product Description • Instagram
                              Caption • Blog Intro • Call-to-Action
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500 text-lg">
                            No content available
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            The generated content might not have been saved
                            properly.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Images Section */}
                {selectedProduct.has_images && selectedProductImages && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Product Images
                        </h3>
                        <div className="flex items-center space-x-2 text-sm">
                          {selectedImagesForDownload.size > 0 && (
                            <>
                              <button
                                onClick={clearImageSelection}
                                className="text-gray-500 hover:text-gray-700 cursor-pointer"
                              >
                                Clear
                              </button>
                              <button
                                onClick={bulkDownloadImages}
                                disabled={isDownloadingBulk}
                                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isDownloadingBulk ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                                ) : (
                                  <Download className="h-4 w-4 mr-1" />
                                )}
                                Download ({selectedImagesForDownload.size})
                              </button>
                            </>
                          )}
                          {selectedImagesForDownload.size === 0 && (
                            <button
                              onClick={selectAllImages}
                              className="text-blue-600 hover:text-blue-700 cursor-pointer"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Platform-Optimized Images */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Platform-Optimized Images
                          </h4>
                          <div className="space-y-4">
                            {Object.entries(
                              selectedProductImages.processed
                            ).map(([platform, images]) => {
                              if (images.length === 0) return null
                              const badge = getPlatformBadge(platform)

                              return (
                                <div key={platform}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                                    >
                                      {badge.label} (
                                      {platform === 'amazon'
                                        ? '1000×1000'
                                        : platform === 'shopify'
                                          ? '1024×1024'
                                          : platform === 'etsy'
                                            ? '2000×2000'
                                            : '1080×1080'}
                                      )
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {images.length} images
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {images.map((url, index) => (
                                      <div
                                        key={index}
                                        className="relative group"
                                      >
                                        <div
                                          className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                            selectedImagesForDownload.has(url)
                                              ? 'border-blue-500 ring-2 ring-blue-200'
                                              : 'border-gray-200 hover:border-gray-300'
                                          }`}
                                          onClick={() =>
                                            toggleImageSelection(url)
                                          }
                                        >
                                          <img
                                            src={url}
                                            alt={`${platform} optimized ${index + 1}`}
                                            className="w-full h-32 object-cover"
                                          />
                                          {selectedImagesForDownload.has(
                                            url
                                          ) && (
                                            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                              <CheckSquare className="h-6 w-6 text-blue-600" />
                                            </div>
                                          )}
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setShowImageLightbox({
                                                url,
                                                title: `${selectedProduct.product_name} - ${platform}`,
                                                platform,
                                              })
                                            }}
                                            className="p-1 bg-black bg-opacity-50 text-white rounded cursor-pointer"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Original Images */}
                        {selectedProductImages.original.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Original Images
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {selectedProductImages.original.map(
                                (url, index) => (
                                  <div key={index} className="relative group">
                                    <div
                                      className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                        selectedImagesForDownload.has(url)
                                          ? 'border-blue-500 ring-2 ring-blue-200'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      onClick={() => toggleImageSelection(url)}
                                    >
                                      <img
                                        src={url}
                                        alt={`Original ${index + 1}`}
                                        className="w-full h-32 object-cover"
                                      />
                                      {selectedImagesForDownload.has(url) && (
                                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                                          <CheckSquare className="h-6 w-6 text-blue-600" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowImageLightbox({
                                            url,
                                            title: `${selectedProduct.product_name} - Original`,
                                          })
                                        }}
                                        className="p-1 bg-black bg-opacity-50 text-white rounded cursor-pointer"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons at bottom */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() =>
                      copyToClipboard(selectedProduct.generated_content)
                    }
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Content
                  </button>
                  <button
                    onClick={() => handleDownload(selectedProduct)}
                    className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Content
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {showImageLightbox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageLightbox(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 cursor-pointer"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={showImageLightbox.url}
              alt={showImageLightbox.title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              <p className="font-medium">{showImageLightbox.title}</p>
              {showImageLightbox.platform && (
                <p className="text-sm text-gray-300">
                  {showImageLightbox.platform} optimized
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
