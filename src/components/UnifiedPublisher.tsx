// src/components/UnifiedPublisher.tsx - Complete with eBay + Etsy Support
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
  Download,
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
      connected: false,
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🛍️',
      color: 'green',
      connected: false,
    },
    {
      id: 'ebay',
      name: 'eBay',
      icon: '🔨',
      color: 'blue',
      connected: false,
    },
    {
      id: 'etsy',
      name: 'Etsy',
      icon: '🎨',
      color: 'purple',
      connected: false,
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
  const [loading, setLoading] = useState(true)

  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
    productType: '',
    amazonMethod: 'api',
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
      // Query Amazon connections
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

      // Query Shopify connections
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

      // Query eBay connections
      console.log('🔍 UnifiedPublisher: Querying eBay connections...')
      const { data: ebayConnections, error: ebayError } = await supabase
        .from('ebay_connections')
        .select('*')
        .eq('user_id', passedUser.id)
        .eq('status', 'active')

      if (ebayError) {
        console.error('❌ UnifiedPublisher: eBay connection error:', ebayError)
      } else {
        console.log(
          '✅ UnifiedPublisher: eBay query successful, found:',
          ebayConnections?.length || 0,
          'connections'
        )
      }

      // ✅ NEW: Query Etsy connections
      console.log('🔍 UnifiedPublisher: Querying Etsy connections...')
      const { data: etsyConnections, error: etsyError } = await supabase
        .from('etsy_connections')
        .select('*')
        .eq('user_id', passedUser.id)
        .eq('status', 'active')

      if (etsyError) {
        console.error('❌ UnifiedPublisher: Etsy connection error:', etsyError)
      } else {
        console.log(
          '✅ UnifiedPublisher: Etsy query successful, found:',
          etsyConnections?.length || 0,
          'connections'
        )
      }

      // Filter valid connections
      const validAmazonConnection =
        amazonConnections?.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      const validShopifyConnection =
        shopifyConnections && shopifyConnections.length > 0
          ? shopifyConnections[0]
          : null

      const validEbayConnection =
        ebayConnections?.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      // ✅ NEW: Filter valid Etsy connections
      const validEtsyConnection =
        etsyConnections?.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      console.log(
        '🔍 UnifiedPublisher: Valid Amazon connection:',
        !!validAmazonConnection
      )
      console.log(
        '🔍 UnifiedPublisher: Valid Shopify connection:',
        !!validShopifyConnection
      )
      console.log(
        '🔍 UnifiedPublisher: Valid eBay connection:',
        !!validEbayConnection
      )
      console.log(
        '🔍 UnifiedPublisher: Valid Etsy connection:',
        !!validEtsyConnection
      )

      // Update platforms with connection status
      const updatedPlatforms = platforms.map((platform) => {
        let isConnected = false

        if (platform.id === 'amazon') {
          isConnected = !!validAmazonConnection?.access_token
        } else if (platform.id === 'shopify') {
          isConnected = !!validShopifyConnection
        } else if (platform.id === 'ebay') {
          isConnected = !!validEbayConnection?.access_token
        } else if (platform.id === 'etsy') {
          isConnected = !!validEtsyConnection?.access_token
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

      // Set first connected platform as default
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

      // Graceful fallback - all platforms disconnected
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
      let endpoint = `/api/${selectedPlatform}/publish`
      let requestPayload

      // Handle Amazon template generation
      if (
        selectedPlatform === 'amazon' &&
        publishingOptions.amazonMethod === 'template'
      ) {
        endpoint = '/api/amazon/template/generate'

        requestPayload = {
          contentId: productContent?.id,
          userId: passedUser?.id,
          productData: {
            id: productContent?.id,
            title: productContent.product_name,
            product_name: productContent.product_name,
            features: productContent.features,
            content: productContent.content,
            description: productContent.content,
            brand: extractBrand(productContent),
          },
          options: publishingOptions,
          images: images,
          platform: selectedPlatform,
        }
      } else if (selectedPlatform === 'amazon') {
        // Existing Amazon API method
        requestPayload = {
          contentId: productContent?.id,
          userId: passedUser?.id,
          productData: {
            id: productContent?.id,
            title: productContent.product_name,
            product_name: productContent.product_name,
            features: productContent.features,
            content: productContent.content,
            description: productContent.content,
          },
          options: publishingOptions,
          images: images,
          platform: selectedPlatform,
        }
      } else if (selectedPlatform === 'ebay' || selectedPlatform === 'etsy') {
        // eBay and Etsy format (similar to Shopify)
        requestPayload = {
          productContent: {
            id: productContent?.id,
            product_name: productContent.product_name,
            features: productContent.features,
            content: productContent.content,
          },
          images: images,
          publishingOptions: {
            ...publishingOptions,
            price: parseFloat(publishingOptions.price),
            quantity: parseInt(publishingOptions.quantity),
            sku: publishingOptions.sku || generateSKU(),
          },
          platform: selectedPlatform,
          userId: passedUser?.id,
        }
      } else {
        // Shopify format (original working format)
        requestPayload = {
          productContent: {
            id: productContent?.id,
            product_name: productContent.product_name,
            features: productContent.features,
            content: productContent.content,
          },
          images: images,
          publishingOptions: {
            ...publishingOptions,
            price: parseFloat(publishingOptions.price),
            quantity: parseInt(publishingOptions.quantity),
            sku: publishingOptions.sku || generateSKU(),
          },
          platform: selectedPlatform,
          userId: passedUser?.id,
        }
      }

      console.log('🚀 Publishing request:', {
        endpoint,
        method: publishingOptions.amazonMethod,
      })

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error ||
            `Failed to publish to ${selectedPlatformData?.name}`
        )
      }

      const result = await response.json()

      // Handle template generation success
      if (
        selectedPlatform === 'amazon' &&
        publishingOptions.amazonMethod === 'template'
      ) {
        setPublishSuccess(
          `✅ Amazon template generated successfully! Download and upload to Seller Central.`
        )

        // Store template info for download
        setPublishedProducts((prev) => ({
          ...prev,
          [selectedPlatform]: {
            ...result,
            publishedAt: new Date().toISOString(),
            downloadUrl: result.data?.downloadUrl,
            templateId: result.data?.templateId,
            method: 'template',
          },
        }))
      } else {
        // Success handling for all platforms including eBay and Etsy
        let successMessage = ''

        if (selectedPlatform === 'amazon') {
          successMessage = `✅ Successfully published to ${selectedPlatformData?.name}! Feed ID: ${result.data?.feedId || result.data?.productId || 'Processing'}`
        } else if (selectedPlatform === 'ebay') {
          successMessage = `✅ Successfully listed on ${selectedPlatformData?.name}! Item ID: ${result.data?.itemId || 'N/A'}`
        } else if (selectedPlatform === 'etsy') {
          // ✅ NEW: Etsy success message
          successMessage = `✅ Successfully listed on ${selectedPlatformData?.name}! Listing ID: ${result.data?.listingId || 'N/A'}`
        } else {
          // Shopify and others
          successMessage = `✅ Successfully published to ${selectedPlatformData?.name}! Product ID: ${result.data?.productId || 'N/A'}`
        }

        setPublishSuccess(successMessage)

        setPublishedProducts((prev) => ({
          ...prev,
          [selectedPlatform]: {
            ...result,
            publishedAt: new Date().toISOString(),
            productUrl:
              result.data?.listingUrl ||
              result.productUrl ||
              result.listing_url ||
              result.product_url,
            productId:
              result.data?.listingId ||
              result.data?.itemId ||
              result.listingId ||
              result.productId ||
              result.id ||
              'N/A',
            method: 'api',
          },
        }))
      }

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

  // Helper function to extract brand from content
  function extractBrand(productContent: any): string {
    const content =
      `${productContent.product_name || ''} ${productContent.content || ''}`.toLowerCase()

    // Common brand extraction patterns
    if (content.includes('nike')) return 'Nike'
    if (content.includes('apple')) return 'Apple'
    if (content.includes('samsung')) return 'Samsung'
    if (content.includes('sony')) return 'Sony'

    // Try to extract from title (first word if it looks like a brand)
    const words = (productContent.product_name || '').split(' ')
    if (words[0] && words[0].length > 2 && /^[A-Z]/.test(words[0])) {
      return words[0]
    }

    return 'Generic'
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

  // Show loading state
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

      {/* Show message when no platforms are connected */}
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
                      : platform.id === 'ebay'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : platform.id === 'etsy'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {platform.icon} {platform.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Only show connected platforms */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Publishing Platform
            </label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      <p className="text-xs text-gray-500 mt-1">
                        {platform.id === 'amazon'
                          ? 'Sell to millions of Amazon customers worldwide'
                          : platform.id === 'shopify'
                            ? 'Publish directly to your Shopify store'
                            : platform.id === 'ebay'
                              ? "List on the world's largest auction marketplace"
                              : platform.id === 'etsy'
                                ? 'Perfect for handmade & creative products'
                                : 'Marketplace integration'}
                      </p>
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
                        <Package className="h-4 w-4 inline mr-1 text-purple-600" />
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
                        <ShoppingCart className="h-4 w-4 inline mr-1 text-indigo-600" />
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
                        <option value="used_acceptable">
                          Used - Acceptable
                        </option>
                      </select>
                    </div>

                    {/* Amazon Product Type - Only shows for Amazon platform */}
                    {selectedPlatform === 'amazon' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Package className="h-4 w-4 inline mr-1 text-orange-600" />
                          Amazon Product Type
                        </label>
                        <select
                          value={publishingOptions.productType}
                          onChange={(e) =>
                            setPublishingOptions((prev) => ({
                              ...prev,
                              productType: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Auto-detect (recommended)</option>
                          <option value="SHOES">Shoes</option>
                          <option value="WATCH">Watches</option>
                          <option value="CLOTHING">Clothing</option>
                          <option value="ELECTRONICS">Electronics</option>
                          <option value="HOME_AND_GARDEN">Home & Garden</option>
                          <option value="BEAUTY">Beauty</option>
                          <option value="AUTOMOTIVE">Automotive</option>
                          <option value="BOOKS">Books</option>
                          <option value="SPORTS">Sports</option>
                          <option value="TOYS_AND_GAMES">Toys & Games</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Select a specific product type or let AI auto-detect
                          based on your content
                        </p>
                      </div>
                    )}

                    {/* Amazon Publishing Method - Only shows for Amazon platform */}
                    {selectedPlatform === 'amazon' && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Package className="h-4 w-4 inline mr-1 text-orange-600" />
                          Amazon Publishing Method
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              publishingOptions.amazonMethod === 'api'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() =>
                              setPublishingOptions((prev) => ({
                                ...prev,
                                amazonMethod: 'api',
                              }))
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                checked={
                                  publishingOptions.amazonMethod === 'api'
                                }
                                readOnly
                                className="text-blue-600"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  Direct API (Current)
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Automatic publishing via Amazon SP-API
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                              publishingOptions.amazonMethod === 'template'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() =>
                              setPublishingOptions((prev) => ({
                                ...prev,
                                amazonMethod: 'template',
                              }))
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                checked={
                                  publishingOptions.amazonMethod === 'template'
                                }
                                readOnly
                                className="text-green-600"
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  Template Download ⭐
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Generate Amazon template (guaranteed to
                                  appear)
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {publishingOptions.amazonMethod === 'template'
                            ? '✅ Template method ensures products appear in Seller Central'
                            : '⚠️ API method may have visibility issues in Seller Central'}
                        </p>
                      </div>
                    )}
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
              {publishedProducts[selectedPlatform] ? (
                <div className="space-y-3">
                  {/* Success message */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-green-800 font-medium">
                        ✅ Successfully{' '}
                        {publishedProducts[selectedPlatform].method ===
                        'template'
                          ? 'generated template for'
                          : 'published to'}{' '}
                        {selectedPlatformData?.name}!
                      </p>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      {publishedProducts[selectedPlatform].method === 'template'
                        ? `Template ready for download • SKU: ${publishedProducts[selectedPlatform].data?.sku}`
                        : `Product ID: ${publishedProducts[selectedPlatform].productId}`}
                    </p>
                  </div>

                  {/* Template Download Button OR Product View Button */}
                  {publishedProducts[selectedPlatform].method === 'template' ? (
                    <>
                      {/* Download Template Button */}
                      <button
                        onClick={() => {
                          const downloadUrl =
                            publishedProducts[selectedPlatform].data
                              ?.downloadUrl
                          if (downloadUrl) {
                            window.open(downloadUrl, '_blank')
                          }
                        }}
                        className="w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download Amazon Template
                      </button>

                      {/* Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">
                          📋 Next Steps:
                        </h4>
                        <ol className="text-sm text-blue-800 space-y-1">
                          <li>1. Download the template file above</li>
                          <li>
                            2. Go to{' '}
                            <a
                              href="https://sellercentral.amazon.com/listing/cards"
                              target="_blank"
                              className="underline font-medium"
                            >
                              Amazon Seller Central → Add Products via Upload
                            </a>
                          </li>
                          <li>3. Upload the template file</li>
                          <li>
                            4. Your product will appear in Seller Central within
                            15 minutes ✅
                          </li>
                        </ol>
                      </div>

                      {/* Secondary buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            window.open(
                              'https://sellercentral.amazon.com/listing/cards',
                              '_blank'
                            )
                          }
                          className="flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          Open Seller Central
                        </button>

                        <button
                          onClick={() => {
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
                          className="flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Generate Again
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Regular View Product Button for API methods */}
                      <button
                        onClick={() => {
                          const publishedProduct =
                            publishedProducts[selectedPlatform]
                          if (publishedProduct?.productUrl) {
                            window.open(publishedProduct.productUrl, '_blank')
                          } else if (selectedPlatform === 'shopify') {
                            window.open('https://admin.shopify.com/', '_blank')
                          } else if (selectedPlatform === 'amazon') {
                            window.open(
                              'https://sellercentral.amazon.com/',
                              '_blank'
                            )
                          } else if (selectedPlatform === 'ebay') {
                            // eBay seller hub or direct item link
                            const itemId = publishedProduct?.productId
                            if (itemId && itemId !== 'N/A') {
                              window.open(
                                `https://www.ebay.com/itm/${itemId}`,
                                '_blank'
                              )
                            } else {
                              window.open(
                                'https://www.ebay.com/sh/ovw',
                                '_blank'
                              )
                            }
                          } else if (selectedPlatform === 'etsy') {
                            // ✅ NEW: Etsy listing or shop manager
                            const listingId = publishedProduct?.productId
                            if (listingId && listingId !== 'N/A') {
                              window.open(
                                `https://www.etsy.com/listing/${listingId}`,
                                '_blank'
                              )
                            } else {
                              window.open(
                                'https://www.etsy.com/your/shops/me',
                                '_blank'
                              )
                            }
                          }
                        }}
                        className="w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        <Globe className="h-5 w-5 mr-2" />
                        {selectedPlatform === 'ebay'
                          ? 'View Listing on eBay'
                          : selectedPlatform === 'etsy'
                            ? 'View Listing on Etsy'
                            : `View Product on ${selectedPlatformData?.name}`}
                      </button>

                      {/* Publish Again Button */}
                      <button
                        onClick={() => {
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
                        <Settings className="h-4 w-4 mr-2" />
                        Publish Again
                      </button>
                    </>
                  )}
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
                      {selectedPlatform === 'amazon' &&
                      publishingOptions.amazonMethod === 'template'
                        ? 'Generating Amazon Template...'
                        : `Publishing to ${selectedPlatformData?.name}...`}
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 mr-2" />
                      {selectedPlatform === 'amazon' &&
                      publishingOptions.amazonMethod === 'template'
                        ? 'Generate Amazon Template'
                        : `Publish to ${selectedPlatformData?.name}`}
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
