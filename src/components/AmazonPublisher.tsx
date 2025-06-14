// src/components/AmazonPublisher.tsx - Light & Clean Design
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
} from 'lucide-react'

interface ProductContent {
  id: string
  product_name: string
  features: string
  platform: string
  content: string
}

interface AmazonPublisherProps {
  productContent: ProductContent
  images?: string[]
  isConnected: boolean
  onPublishSuccess?: (listingId: string) => void
}

export default function AmazonPublisher({
  productContent,
  images = [],
  isConnected,
  onPublishSuccess,
}: AmazonPublisherProps) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null)
  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
  })
  const [showOptions, setShowOptions] = useState(false)
  const [user, setUser] = useState<any>(null)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Get current user
  useEffect(() => {
    if (supabase) {
      console.log('🔍 AmazonPublisher useEffect running...')
      const getCurrentUser = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        console.log('🔍 AmazonPublisher session:', session)
        setUser(session?.user || null)
      }
      getCurrentUser()
    }
  }, [supabase])

  // Generate SKU automatically
  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const productPrefix = productContent.product_name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
    return `${productPrefix}-${timestamp}`
  }

  // Handle publishing to Amazon
  const handlePublish = async () => {
    if (!isConnected) {
      setPublishError('Please connect your Amazon account first')
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
      console.log('🚀 Starting Amazon publishing process...')
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
        userId: user.id,
      }

      console.log(
        '📤 Request Payload:',
        JSON.stringify(requestPayload, null, 2)
      )

      // Simulate image upload if images exist
      if (images.length > 0) {
        console.log('🖼️ Uploading images...')
        await new Promise((resolve) => setTimeout(resolve, 1500))
        console.log('✅ Images processed')
      }

      const response = await fetch('/api/amazon/publish', {
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
        throw new Error(errorData.error || 'Failed to publish to Amazon')
      }

      const result = await response.json()
      console.log('✅ Success Response:', result)

      setPublishSuccess(
        `Successfully published to Amazon! Listing ID: ${result.listingId || 'N/A'}`
      )

      if (onPublishSuccess && result.listingId) {
        onPublishSuccess(result.listingId)
      }

      // Reset form
      setPublishingOptions({
        price: '',
        quantity: '1',
        sku: '',
        condition: 'new',
      })
    } catch (error) {
      console.error('❌ Amazon publishing error:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to publish to Amazon'
      setPublishError(errorMessage)
    } finally {
      setIsPublishing(false)
    }
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  // Don't show publisher if not connected - LIGHT DESIGN
  if (!isConnected) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Publish to Amazon
          </h3>
          <p className="text-gray-600 mb-6">
            Transform your AI-generated content into live Amazon listings
            instantly
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Connect Amazon Account First
              </span>
            </div>
            <p className="text-blue-700 text-sm">
              Link your Amazon Seller account to enable one-click publishing
              with our secure OAuth integration
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-medium text-green-900 text-sm mb-1">
                Instant Publishing
              </h4>
              <p className="text-green-700 text-xs">
                One-click product creation
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Image className="h-5 w-5 text-orange-600" />
              </div>
              <h4 className="font-medium text-orange-900 text-sm mb-1">
                Auto Image Upload
              </h4>
              <p className="text-orange-700 text-xs">Optimized for Amazon</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <ExternalLink className="h-5 w-5 text-purple-600" />
              </div>
              <h4 className="font-medium text-purple-900 text-sm mb-1">
                Direct Integration
              </h4>
              <p className="text-purple-700 text-xs">Secure API connection</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Debug Info - Light Design */}
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

      {/* Publisher Main Card - Light Design */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Publish to Amazon
              </h3>
              <p className="text-gray-600">
                Create listing from your AI-generated content
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <span className="text-green-700 text-sm font-medium">
                ✓ Connected
              </span>
            </div>
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
              <span className="text-sm text-gray-500">Content Platform:</span>
              <p className="font-medium text-gray-900 capitalize">
                {productContent.platform}
              </p>
            </div>
          </div>
        </div>

        {/* Publishing Options Toggle */}
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
            <span className="text-gray-500 text-lg">
              {showOptions ? '−' : '+'}
            </span>
          </button>
        </div>

        {/* Publishing Options Form - Light Design */}
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
                  placeholder={`${productContent.product_name
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toUpperCase()
                    .slice(0, 6)}-${Date.now().toString().slice(-6)}`}
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
                  Images will be automatically uploaded and optimized for
                  Amazon's requirements
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
              <p className="text-green-800 font-medium">
                Publishing Successful!
              </p>
            </div>
            <p className="text-green-700 text-sm mt-1">{publishSuccess}</p>
          </div>
        )}

        {/* Publish Button */}
        <div className="space-y-4">
          <button
            onClick={handlePublish}
            type="button"
            disabled={isPublishing || !publishingOptions.price || !user?.id}
            className={`w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all ${
              isPublishing || !publishingOptions.price || !user?.id
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isPublishing ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Publishing to Amazon...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Publish Product to Amazon
              </>
            )}
          </button>

          {!publishingOptions.price && (
            <p className="text-sm text-gray-500 text-center">
              Please enter a price to publish
            </p>
          )}
          {!user?.id && publishingOptions.price && (
            <p className="text-sm text-gray-500 text-center">
              Please log in to publish
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h5 className="font-medium text-gray-900 mb-2">
            What happens when you publish:
          </h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Product title, description, and features formatted for Amazon
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Images uploaded and optimized for Amazon's requirements
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                New product listing created in your Amazon Seller Central
              </span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Manage the listing directly in Amazon Seller Central after
                publishing
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
