// Complete AmazonPublisher.tsx - With OAuth User Authentication
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
  const [user, setUser] = useState<any>(null) // 🚀 NEW: User state

  const supabase = createClient()

  // 🚀 NEW: Get current user
  useEffect(() => {
    console.log('🔍 AmazonPublisher useEffect running...')
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      console.log('🔍 AmazonPublisher session:', session)
      setUser(session?.user || null)
    }
    getCurrentUser()
  }, [])

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

    // 🚀 NEW: Check if user is available
    if (!user?.id) {
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
      console.log('👤 User ID:', user.id) // 🚀 NEW: Log user ID

      // Prepare the request payload - FIXED to match API expectations
      const requestPayload = {
        productContent: {
          // ✅ API expects "productContent"
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
        userId: user.id, // 🚀 FIXED: Now using authenticated user ID
      }

      console.log(
        '📤 Request Payload:',
        JSON.stringify(requestPayload, null, 2)
      )
      // Simulate image upload if images exist
      if (images.length > 0) {
        console.log('🖼️ Uploading images...')
        await new Promise((resolve) => setTimeout(resolve, 1500)) // 1.5 second delay
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

  // Don't show publisher if not connected
  if (!isConnected) {
    return (
      <div className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Publish to Amazon
          </h3>
          <p className="text-gray-600 mb-4">
            Automatically create Amazon listing from your generated content
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              Connect Amazon Account First
            </p>
            <p className="text-blue-600 text-sm">
              Connect your Amazon Seller account to enable one-click publishing
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Debug Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">
          Publisher Debug Info:
        </h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>Content ID: {productContent.id}</p>
          <p>Product Name: {productContent.product_name}</p>
          <p>Platform: {productContent.platform}</p>
          <p>Images: {images.length} available</p>
          <p>
            Connection Status: {isConnected ? 'Connected' : 'Not Connected'}
          </p>
          <p>User ID: {user?.id || 'Not logged in'}</p>{' '}
          {/* 🚀 NEW: Show user ID */}
        </div>
      </div>

      {/* Publisher Header */}
      <div className="p-6 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2 text-green-600" />
              Publish to Amazon
            </h3>
            <p className="text-gray-600">
              Automatically create Amazon listing from your generated content
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">
              Product:{' '}
              <span className="font-medium">{productContent.product_name}</span>
            </p>
            <p className="text-sm text-gray-600">
              Platform:{' '}
              <span className="font-medium">{productContent.platform}</span>
            </p>
          </div>
        </div>

        {/* Publishing Options Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowOptions(!showOptions)}
            type="button"
            className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="font-medium text-gray-900">
              Publishing Options
            </span>
            <span className="text-gray-500">{showOptions ? '▼' : '▶'}</span>
          </button>
        </div>

        {/* Publishing Options Form */}
        {showOptions && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="h-4 w-4 inline mr-1" />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <Upload className="h-4 w-4 inline mr-1" />
                  {images.length} optimized image{images.length > 1 ? 's' : ''}{' '}
                  will be uploaded to Amazon
                </p>
              </div>
            )}
          </div>
        )}

        {/* Status Messages */}
        {publishError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Publishing Failed</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{publishError}</p>
          </div>
        )}

        {publishSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">
                Publishing Successful!
              </p>
            </div>
            <p className="text-green-700 text-sm mt-1">{publishSuccess}</p>
          </div>
        )}

        {/* Publish Button */}
        <div className="mt-6">
          <button
            onClick={handlePublish}
            type="button"
            disabled={isPublishing || !publishingOptions.price || !user?.id}
            className={`w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all ${
              isPublishing || !publishingOptions.price || !user?.id
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
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
            <p className="text-sm text-gray-500 text-center mt-2">
              Please enter a price to publish
            </p>
          )}
          {!user?.id && publishingOptions.price && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please log in to publish
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>What happens when you publish:</strong>
            <br />
            • Your product title, description, and features will be formatted
            for Amazon
            <br />
            • Images will be uploaded and optimized for Amazon's requirements
            <br />
            • A new product listing will be created in your Amazon Seller
            Central
            <br />• You can manage the listing directly in Amazon Seller Central
            after publishing
          </p>
        </div>
      </div>
    </div>
  )
}
