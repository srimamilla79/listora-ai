// src/components/UnifiedPublisher.tsx - Multi-Platform Publishing
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Upload,
  Package,
  DollarSign,
  Hash,
  AlertCircle,
  CheckCircle,
  Loader,
  ExternalLink,
  ShoppingCart,
  Sparkles,
  Image,
  Settings,
  Info,
  Globe,
  Store,
  ChevronDown,
} from 'lucide-react'

interface ProductContent {
  id: string
  product_name: string
  features: string
  platform: string
  content: string
}

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  setupUrl?: string
}

interface UnifiedPublisherProps {
  productContent: ProductContent
  images?: string[]
  onPublishSuccess?: (result: any) => void
}

export default function UnifiedPublisher({
  productContent,
  images = [],
  onPublishSuccess,
}: UnifiedPublisherProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'amazon',
      name: 'Amazon',
      icon: '📦',
      color: 'orange',
      connected: true, // For now, assuming Amazon is connected
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🛍️',
      color: 'green',
      connected: false,
    },
    {
      id: 'etsy',
      name: 'Etsy',
      icon: '🎨',
      color: 'orange',
      connected: false,
    },
  ])

  const [selectedPlatform, setSelectedPlatform] = useState<string>('amazon')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
  })

  const [user, setUser] = useState<any>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // Initialize
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Get current user
  useEffect(() => {
    if (supabase) {
      const getCurrentUser = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setUser(session?.user || null)
      }
      getCurrentUser()
    }
  }, [supabase])

  // Load platform connections
  useEffect(() => {
    if (user?.id && supabase) {
      loadPlatformConnections()
    }
  }, [user, supabase])

  const loadPlatformConnections = async () => {
    try {
      // Check platform connections from database
      const { data: connections } = await supabase
        .from('platform_connections')
        .select('platform, status')
        .eq('user_id', user.id)

      // Update platform connection status
      setPlatforms((prev) =>
        prev.map((platform) => {
          const connection = connections?.find(
            (c: any) => c.platform === platform.id
          )
          return {
            ...platform,
            connected:
              connection?.status === 'connected' || platform.id === 'amazon', // Amazon is connected by default for now
          }
        })
      )

      // Set first connected platform as default
      const connectedPlatform = platforms.find((p) => p.connected)
      if (connectedPlatform && !selectedPlatform) {
        setSelectedPlatform(connectedPlatform.id)
      }
    } catch (error) {
      console.error('Error loading platform connections:', error)
    }
  }

  const handlePlatformConnect = async (platformId: string) => {
    // Redirect to platform OAuth
    window.location.href = `/api/${platformId}/oauth?user_id=${user?.id}`
  }

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const productPrefix = productContent.product_name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
    return `${productPrefix}-${timestamp}`
  }

  const handlePublish = async () => {
    const selectedPlatformData = platforms.find(
      (p) => p.id === selectedPlatform
    )

    if (!selectedPlatform) {
      setPublishError('Please select a platform')
      return
    }

    if (!selectedPlatformData?.connected) {
      setPublishError(
        `Please connect your ${selectedPlatformData?.name} account first`
      )
      return
    }

    if (!productContent.id) {
      setPublishError('Product content ID required')
      return
    }

    if (!publishingOptions.price) {
      setPublishError('Please enter a price')
      return
    }

    if (!user?.id || !supabase) {
      setPublishError('Please log in to publish products')
      return
    }

    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      console.log(`🚀 Starting ${selectedPlatform} publishing process...`)
      console.log('📦 Product Content ID:', productContent.id)
      console.log('📝 Product Name:', productContent.product_name)
      console.log('🖼️ Images Count:', images.length)
      console.log('💰 Price:', publishingOptions.price)
      console.log('👤 User ID:', user.id)

      // Prepare the request payload
      const requestPayload = {
        productContent: {
          id: productContent.id,
          product_name: productContent.product_name,
          features: productContent.features,
          content: productContent.content,
          platform: productContent.platform,
        },
        images: images,
        publishingOptions: {
          ...publishingOptions,
          price: parseFloat(publishingOptions.price),
          quantity: parseInt(publishingOptions.quantity),
          sku: publishingOptions.sku || generateSKU(),
        },
        platform: selectedPlatform,
        userId: user.id,
      }

      console.log(
        '📤 Request Payload:',
        JSON.stringify(requestPayload, null, 2)
      )

      // Simulate image upload if images exist
      if (images.length > 0) {
        console.log('🖼️ Processing images...')
        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log('✅ Images processed')
      }

      const response = await fetch(`/api/${selectedPlatform}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      console.log('📥 Response Status:', response.status)
      console.log('📥 Response OK:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error Response:', errorData)
        throw new Error(
          errorData.error ||
            `Failed to publish to ${selectedPlatformData?.name}`
        )
      }

      const result = await response.json()
      console.log('✅ Success Response:', result)

      setPublishSuccess(
        `Successfully published to ${selectedPlatformData?.name}! ${result.data?.productId ? `Product ID: ${result.data.productId}` : ''}`
      )

      if (onPublishSuccess) {
        onPublishSuccess(result)
      }

      // Reset form
      setPublishingOptions({
        price: '',
        quantity: '1',
        sku: '',
        condition: 'new',
      })
    } catch (error) {
      console.error(`❌ ${selectedPlatform} publishing error:`, error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to publish to ${selectedPlatformData?.name}`
      setPublishError(errorMessage)
    } finally {
      setIsPublishing(false)
    }
  }

  // Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform)
  const connectedPlatforms = platforms.filter((p) => p.connected)

  return (
    <div className="mt-6 space-y-6">
      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Info className="h-4 w-4 text-blue-600" />
          <h4 className="font-medium text-blue-900">Publisher Status</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded-md p-2 border border-blue-100">
            <span className="text-gray-500">Content ID:</span>
            <p className="font-medium text-gray-900 truncate">
              {productContent.id}
            </p>
          </div>
          <div className="bg-white rounded-md p-2 border border-blue-100">
            <span className="text-gray-500">Platform:</span>
            <p className="font-medium text-gray-900">
              {productContent.platform}
            </p>
          </div>
          <div className="bg-white rounded-md p-2 border border-blue-100">
            <span className="text-gray-500">Images:</span>
            <p className="font-medium text-gray-900">{images.length} ready</p>
          </div>
        </div>
      </div>

      {/* Publisher Main Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Publish to Marketplace
              </h3>
              <p className="text-gray-600">
                Choose your platform and publish instantly
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <span className="text-blue-700 text-sm font-medium">
                {connectedPlatforms.length} Platform
                {connectedPlatforms.length !== 1 ? 's' : ''} Connected
              </span>
            </div>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Publishing Platform
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlatform === platform.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!platform.connected ? 'opacity-75' : ''}`}
                onClick={() =>
                  platform.connected && setSelectedPlatform(platform.id)
                }
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {platform.name}
                    </h4>
                    <p
                      className={`text-xs ${
                        platform.connected ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {platform.connected ? '✓ Connected' : 'Not connected'}
                    </p>
                  </div>
                  {selectedPlatform === platform.id && platform.connected && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>

                {!platform.connected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePlatformConnect(platform.id)
                    }}
                    className="mt-3 w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Connect {platform.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">
            Product Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Product Name:</span>
              <p className="font-medium text-gray-900">
                {productContent.product_name}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Publishing To:</span>
              <p className="font-medium text-gray-900 capitalize">
                {selectedPlatformData?.icon} {selectedPlatformData?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Publishing Options - Only show if platform is connected */}
        {selectedPlatformData?.connected && (
          <>
            <div className="mb-6">
              <button
                onClick={() => setShowOptions(!showOptions)}
                type="button"
                className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    Publishing Options
                  </span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    showOptions ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* Publishing Options Form */}
            {showOptions && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="h-4 w-4 inline mr-1 text-green-600" />
                      Price (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={publishingOptions.price}
                      onChange={(e) =>
                        setPublishingOptions((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="29.99"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Hash className="h-4 w-4 inline mr-1 text-blue-600" />
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={publishingOptions.quantity}
                      onChange={(e) =>
                        setPublishingOptions((prev) => ({
                          ...prev,
                          quantity: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* SKU */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU (Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      value={publishingOptions.sku}
                      onChange={(e) =>
                        setPublishingOptions((prev) => ({
                          ...prev,
                          sku: e.target.value,
                        }))
                      }
                      placeholder={generateSKU()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Condition
                    </label>
                    <select
                      value={publishingOptions.condition}
                      onChange={(e) =>
                        setPublishingOptions((prev) => ({
                          ...prev,
                          condition: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="new">New</option>
                      <option value="used_like_new">Used - Like New</option>
                      <option value="used_very_good">Used - Very Good</option>
                      <option value="used_good">Used - Good</option>
                      <option value="used_acceptable">Used - Acceptable</option>
                    </select>
                  </div>
                </div>

                {/* Images Info */}
                {images.length > 0 && (
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <Image className="h-5 w-5 text-blue-600" />
                      <p className="text-blue-800 font-medium">
                        {images.length} optimized image
                        {images.length > 1 ? 's' : ''} ready for upload
                      </p>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      Images will be automatically uploaded and optimized for{' '}
                      {selectedPlatformData?.name}'s requirements
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Status Messages */}
            {publishError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 font-medium">Publishing Failed</p>
                </div>
                <p className="text-red-700 text-sm mt-1">{publishError}</p>
              </div>
            )}

            {publishSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800 font-medium">Success!</p>
                </div>
                <p className="text-green-700 text-sm mt-1">{publishSuccess}</p>
              </div>
            )}

            {/* Publish Button */}
            <button
              onClick={handlePublish}
              type="button"
              disabled={isPublishing || !publishingOptions.price || !user?.id}
              className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all ${
                isPublishing || !publishingOptions.price || !user?.id
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
              }`}
            >
              {isPublishing ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Publishing to {selectedPlatformData?.name}...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Publish to {selectedPlatformData?.name}
                </>
              )}
            </button>

            {!publishingOptions.price && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Please enter a price to publish
              </p>
            )}
          </>
        )}

        {/* Help Text */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-medium text-gray-900 mb-2">
            What happens when you publish:
          </h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Product title, description, and features formatted for{' '}
                {selectedPlatformData?.name || 'the selected platform'}
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Images uploaded and optimized for platform requirements
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                New product listing created in your{' '}
                {selectedPlatformData?.name || 'marketplace'} account
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Manage the listing directly in your marketplace dashboard after
                publishing
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
