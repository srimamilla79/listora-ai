// src/components/UnifiedPublisher.tsx - Fixed Connection Detection
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ExternalLink, RefreshCw } from 'lucide-react'
import {
  Upload,
  Package,
  DollarSign,
  Hash,
  AlertCircle,
  CheckCircle,
  Loader,
  Settings,
  ChevronDown,
  ShoppingCart,
  Globe,
  Store,
} from 'lucide-react'

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  setupUrl?: string
}

interface ProductContent {
  id: string
  product_name: string
  features: string
  platform: string
  content: string
}

interface UnifiedPublisherProps {
  productContent: ProductContent
  images?: string[]
  onPublishSuccess?: (result: any) => void
  user?: any // User passed from parent component
}

export default function UnifiedPublisher({
  productContent,
  images = [],
  onPublishSuccess,
  user: passedUser, // User from parent
}: UnifiedPublisherProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([
    {
      id: 'amazon',
      name: 'Amazon',
      icon: '📦',
      color: 'orange',
      connected: false, // ✅ Start with false, detect from database
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🛍️',
      color: 'green',
      connected: false, // ✅ Start with false, detect from database
    },
    {
      id: 'etsy',
      name: 'Etsy',
      icon: '🎨',
      color: 'orange',
      connected: false, // ✅ Etsy always false for now
    },
  ])

  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [publishedPlatforms, setPublishedPlatforms] = useState<string[]>([])
  const [publishedProducts, setPublishedProducts] = useState<{
    [key: string]: any
  }>({})
  const [loading, setLoading] = useState(true) // ✅ Add loading state

  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
  })

  const [supabase, setSupabase] = useState<any>(null)

  // Initialize Supabase
  useEffect(() => {
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Load platform connections when user and supabase are available
  useEffect(() => {
    if (passedUser?.id && supabase) {
      console.log('📝 Loading platform connections for user:', passedUser.id)
      loadPlatformConnections()
    }
  }, [passedUser?.id, supabase])

  // ✅ Use the SAME logic as MarketplaceConnections
  const loadPlatformConnections = async () => {
    if (!passedUser?.id || !supabase) {
      setLoading(false)
      return
    }

    console.log(
      '🔗 UnifiedPublisher: Loading connections for user:',
      passedUser.id
    )
    setLoading(true)

    try {
      // ✅ SAME QUERIES as MarketplaceConnections
      console.log('🔍 UnifiedPublisher: Querying Amazon connections...')
      const { data: amazonConnections, error: amazonError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', passedUser.id)
        .eq('status', 'active')

      if (amazonError) {
        console.error(
          '❌ UnifiedPublisher: Amazon connection error:',
          amazonError
        )
      } else {
        console.log(
          '✅ UnifiedPublisher: Amazon query successful, found:',
          amazonConnections?.length || 0,
          'connections'
        )
      }

      console.log('🔍 UnifiedPublisher: Querying Shopify connections...')
      const { data: shopifyConnections, error: shopifyError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', passedUser.id)
        .eq('platform', 'shopify')
        .eq('status', 'connected')

      if (shopifyError) {
        console.error(
          '❌ UnifiedPublisher: Shopify connection error:',
          shopifyError
        )
      } else {
        console.log(
          '✅ UnifiedPublisher: Shopify query successful, found:',
          shopifyConnections?.length || 0,
          'connections'
        )
      }

      // ✅ SAME FILTERING as MarketplaceConnections
      const validAmazonConnection =
        amazonConnections?.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      const validShopifyConnection =
        shopifyConnections && shopifyConnections.length > 0
          ? shopifyConnections[0]
          : null

      console.log(
        '🔍 UnifiedPublisher: Valid Amazon connection:',
        !!validAmazonConnection
      )
      console.log(
        '🔍 UnifiedPublisher: Valid Shopify connection:',
        !!validShopifyConnection
      )

      // ✅ Update platforms with CORRECT connection status
      const updatedPlatforms = platforms.map((platform) => {
        let isConnected = false

        if (platform.id === 'amazon') {
          isConnected = !!validAmazonConnection?.access_token
        } else if (platform.id === 'shopify') {
          isConnected = !!validShopifyConnection
        } else if (platform.id === 'etsy') {
          isConnected = false // Etsy not implemented yet
        }

        console.log(
          `📱 UnifiedPublisher: Platform ${platform.id}: ${isConnected ? 'Connected' : 'Not connected'}`
        )

        return {
          ...platform,
          connected: isConnected,
        }
      })

      setPlatforms(updatedPlatforms)

      // ✅ Set first connected platform as default
      const connectedPlatform = updatedPlatforms.find((p) => p.connected)
      if (connectedPlatform) {
        setSelectedPlatform(connectedPlatform.id)
        console.log(
          '✅ UnifiedPublisher: Selected platform:',
          connectedPlatform.id
        )
      } else {
        setSelectedPlatform('')
        console.log('⚠️ UnifiedPublisher: No connected platforms found')
      }
    } catch (error) {
      console.error('❌ UnifiedPublisher: Error loading connections:', error)

      // ✅ Graceful fallback - all platforms disconnected
      setPlatforms((prev) =>
        prev.map((platform) => ({
          ...platform,
          connected: false,
        }))
      )
      setSelectedPlatform('')
    } finally {
      setLoading(false)
      console.log('✅ UnifiedPublisher: Loading completed')
    }
  }

  const handlePlatformConnect = async (platformId: string) => {
    if (!passedUser?.id) {
      console.error('No user ID available for OAuth. User:', passedUser)
      return
    }

    console.log(
      '🔗 Starting OAuth for platform:',
      platformId,
      'User ID:',
      passedUser.id
    )

    // Redirect to platform OAuth
    window.location.href = `/api/${platformId}/oauth?user_id=${passedUser.id}`
  }

  const handlePublish = async () => {
    if (!selectedPlatform) {
      setPublishError('Please select a platform')
      return
    }

    if (!publishingOptions.price) {
      setPublishError('Please enter a price')
      return
    }

    if (!passedUser?.id) {
      setPublishError('User not authenticated')
      return
    }

    // NEW: Validation check for product content ID
    if (!productContent?.id) {
      setPublishError(
        'Product content ID is missing. Please generate content first.'
      )
      return
    }

    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      const requestPayload = {
        contentId: productContent?.id,
        userId: passedUser?.id,
        productData: {
          // ✅ Fixed this already
          id: productContent?.id,
          title: productContent.product_name, // ✅ Map product_name to title
          product_name: productContent.product_name,
          features: productContent.features,
          content: productContent.content,
          description: productContent.content, // ✅ Add description mapping
        },
        options: publishingOptions, // ✅ ADD THIS - was missing!
        images: images,
        platform: selectedPlatform,
      }

      const response = await fetch(`/api/${selectedPlatform}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || `Failed to publish to ${selectedPlatform}`
        )
      }

      const result = await response.json()
      setPublishSuccess(`Successfully published to ${selectedPlatform}!`)

      // ✅ Store the published product details for this platform
      setPublishedProducts((prev) => ({
        ...prev,
        [selectedPlatform]: {
          ...result,
          publishedAt: new Date().toISOString(),
          productUrl:
            result.productUrl || result.listing_url || result.product_url,
          productId: result.listingId || result.productId || result.id || 'N/A',
        },
      }))

      if (onPublishSuccess) {
        onPublishSuccess({
          ...result,
          platform: selectedPlatform,
        })
      }
      // Mark platform as published
      setPublishedPlatforms((prev) => [...prev, selectedPlatform])
    } catch (error) {
      console.error('Publishing error:', error)
      setPublishError(
        error instanceof Error ? error.message : 'Publishing failed'
      )
    } finally {
      setIsPublishing(false)
    }
  }

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const productPrefix = productContent.product_name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
    return `${productPrefix}-${timestamp}`
  }

  const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform)
  const connectedPlatforms = platforms.filter((p) => p.connected)

  // ✅ Show loading state
  if (loading) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">
            Loading publishing options...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
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
      </div>

      {/* ✅ Show message when no platforms are connected */}
      {connectedPlatforms.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Connected Platforms
          </h4>
          <p className="text-gray-600 mb-6">
            Connect at least one marketplace above to start publishing your
            content.
          </p>
          <div className="flex justify-center space-x-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => handlePlatformConnect(platform.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors ${
                  platform.id === 'amazon'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : platform.id === 'shopify'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {platform.icon} {platform.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* ✅ Only show connected platforms */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Publishing Platform
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectedPlatforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPlatform === platform.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPlatform(platform.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{platform.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {platform.name}
                      </h4>
                      <p className="text-xs text-green-600">✓ Connected</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Publishing Options */}
          {selectedPlatform && selectedPlatformData?.connected && (
            <>
              <div className="mb-6">
                <button
                  onClick={() => setShowOptions(!showOptions)}
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

              {showOptions && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Package className="h-4 w-4 inline mr-1 text-purple-600" />
                        SKU (Optional)
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
                        placeholder="Auto-generated if empty"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <ShoppingCart className="h-4 w-4 inline mr-1 text-indigo-600" />
                        Condition
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
                        <option value="used">Used</option>
                        <option value="refurbished">Refurbished</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {publishError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-red-800 font-medium">
                      Publishing Failed
                    </p>
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
                  <p className="text-green-700 text-sm mt-1">
                    {publishSuccess}
                  </p>
                </div>
              )}

              {/* Publish Button */}
              {/* ✅ Show different button if already published to this platform */}
              {publishedProducts[selectedPlatform] ? (
                <div className="space-y-3">
                  {/* Success message */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-800 font-medium">
                        ✅ Successfully published to{' '}
                        {selectedPlatformData?.name}!
                      </p>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Product ID:{' '}
                      {publishedProducts[selectedPlatform].productId}
                    </p>
                  </div>

                  {/* View Product Button */}
                  <button
                    onClick={() => {
                      const publishedProduct =
                        publishedProducts[selectedPlatform]
                      if (publishedProduct?.productUrl) {
                        window.open(publishedProduct.productUrl, '_blank')
                      } else if (
                        selectedPlatform === 'shopify' &&
                        selectedPlatformData
                      ) {
                        // Fallback for Shopify - go to admin
                        const shopifyConnection = platforms.find(
                          (p) => p.id === 'shopify'
                        )
                        if (shopifyConnection) {
                          window.open('https://admin.shopify.com/', '_blank')
                        }
                      } else if (selectedPlatform === 'amazon') {
                        // Fallback for Amazon - go to seller central
                        window.open(
                          'https://sellercentral.amazon.com/',
                          '_blank'
                        )
                      }
                    }}
                    className="w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    View Product on {selectedPlatformData?.name}
                  </button>

                  {/* Publish Again Button (smaller) */}
                  <button
                    onClick={() => {
                      // Clear the published state for this platform to allow republishing
                      setPublishedProducts((prev) => {
                        const updated = { ...prev }
                        delete updated[selectedPlatform]
                        return updated
                      })
                      setPublishedPlatforms((prev) =>
                        prev.filter((p) => p !== selectedPlatform)
                      )
                      setPublishSuccess(null)
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Publish Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !publishingOptions.price}
                  className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all ${
                    isPublishing || !publishingOptions.price
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
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
