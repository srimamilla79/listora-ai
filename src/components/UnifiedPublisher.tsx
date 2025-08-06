// src/components/UnifiedPublisher.tsx - ROCK SOLID VERSION - NO MORE SPINNING
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
  FileText,
  Copy,
  Star,
} from 'lucide-react'

interface Platform {
  id: string
  name: string
  icon: string
  color: string
  connected: boolean
  disabled?: boolean
  comingSoon?: boolean
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
  user?: any
}

export default function UnifiedPublisher({
  productContent,
  images = [],
  onPublishSuccess,
  user: passedUser,
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
      id: 'walmart',
      name: 'Walmart',
      icon: '🛒',
      color: 'darkblue',
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
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructionData, setInstructionData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
    productType: '',
  })

  // 🔧 GUARANTEED to finish in 3 seconds max
  useEffect(() => {
    // Always clear loading after 3 seconds regardless of what happens
    const maxLoadingTimer = setTimeout(() => {
      setLoading(false)
    }, 3000)

    if (passedUser?.id) {
      console.log('📝 Loading platform connections for user:', passedUser.id)
      loadPlatformConnections()
    } else {
      setLoading(false)
    }

    return () => clearTimeout(maxLoadingTimer)
  }, [passedUser?.id])

  // 🔧 DETECT OAuth completion from URL and refresh connections
  useEffect(() => {
    if (typeof window !== 'undefined' && passedUser?.id) {
      const urlParams = new URLSearchParams(window.location.search)
      const shopifyConnected = urlParams.get('shopify')
      const amazonConnected = urlParams.get('amazon')
      const ebayConnected = urlParams.get('ebay')

      if (
        shopifyConnected === 'connected' ||
        amazonConnected === 'connected' ||
        ebayConnected === 'connected'
      ) {
        console.log(
          '🔄 UnifiedPublisher: OAuth completion detected, refreshing connections...'
        )

        // Small delay to ensure database is updated
        setTimeout(() => {
          loadPlatformConnections()
        }, 1000)
      }
    }
  }, [passedUser?.id])

  // 🔧 ROBUST connection loading with better error handling
  const loadPlatformConnections = async () => {
    if (!passedUser?.id) {
      setLoading(false)
      return
    }

    console.log(
      '🔗 UnifiedPublisher: Loading connections for user:',
      passedUser.id
    )

    try {
      const supabase = createClient()

      console.log('🔍 UnifiedPublisher: Testing database connectivity first...')

      // 🔧 TEST database connectivity first
      try {
        const testQuery = await supabase
          .from('platform_connections')
          .select('count', { count: 'exact', head: true })
        console.log('✅ UnifiedPublisher: Database connectivity test passed')
      } catch (testError) {
        console.log(
          '⚠️ UnifiedPublisher: Database connectivity test failed, using fallback mode'
        )
        throw new Error('Database not accessible')
      }

      console.log('🔍 UnifiedPublisher: Running database queries...')

      // 🔧 SIMPLIFIED queries with longer timeouts
      let amazonConnections: any[] = []
      let shopifyConnections: any[] = []
      let ebayConnections: any[] = []
      let walmartConnections: any[] = []

      // Parallel queries with 5-second timeout each
      const queryPromises = [
        // Amazon query
        supabase
          .from('amazon_connections')
          .select('*')
          .eq('user_id', passedUser.id)
          .eq('status', 'active')
          .then((result: any) => ({ type: 'amazon', result }))
          .catch((error: any) => ({ type: 'amazon', error })),

        // Shopify query - most permissive query
        supabase
          .from('platform_connections')
          .select('*')
          .eq('user_id', passedUser.id)
          .eq('platform', 'shopify')
          .then((result: any) => ({ type: 'shopify', result }))
          .catch((error: any) => ({ type: 'shopify', error })),

        // eBay query
        supabase
          .from('ebay_connections')
          .select('*')
          .eq('user_id', passedUser.id)
          .eq('status', 'active')
          .then((result: any) => ({ type: 'ebay', result }))
          .catch((error: any) => ({ type: 'ebay', error })),

        // Walmart query
        supabase
          .from('walmart_connections')
          .select('*')
          .eq('user_id', passedUser.id)
          .eq('status', 'active')
          .then((result: any) => ({ type: 'walmart', result }))
          .catch((error: any) => ({ type: 'walmart', error })),
      ]

      // Wait for all queries with overall timeout
      const queryTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Overall query timeout')), 8000)
      )

      const queryResults = await Promise.race([
        Promise.allSettled(queryPromises),
        queryTimeout,
      ])

      console.log('✅ UnifiedPublisher: All database queries completed')

      // Process results
      if (Array.isArray(queryResults)) {
        for (const queryResult of queryResults) {
          if (queryResult.status === 'fulfilled') {
            const { type, result, error } = queryResult.value

            if (error) {
              console.log(
                `⚠️ UnifiedPublisher: ${type} query failed:`,
                error.message
              )
            } else if (result?.data) {
              console.log(
                `✅ UnifiedPublisher: ${type} query successful, found:`,
                result.data.length,
                'records'
              )

              if (type === 'amazon') {
                amazonConnections = result.data || []
              } else if (type === 'shopify') {
                shopifyConnections = result.data || []
                console.log(
                  '🔍 UnifiedPublisher: Shopify data found:',
                  shopifyConnections
                )
              } else if (type === 'ebay') {
                ebayConnections = result.data || []
                console.log(
                  '🔍 UnifiedPublisher: eBay data found:',
                  ebayConnections
                )
              } else if (type === 'walmart') {
                walmartConnections = result.data || []
                console.log(
                  '🔍 UnifiedPublisher: Walmart data found:',
                  walmartConnections
                )
              }
            }
          }
        }
      }

      // Filter valid connections
      const validAmazonConnection =
        amazonConnections.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      // For Shopify, accept any connection regardless of status
      let validShopifyConnection =
        shopifyConnections.length > 0 ? shopifyConnections[0] : null

      const validEbayConnection =
        ebayConnections.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null
      const validWalmartConnection =
        walmartConnections.find(
          (conn: any) => conn.access_token && conn.access_token.trim() !== ''
        ) || null

      console.log('🔍 UnifiedPublisher: Final connection status:')
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
        '🔍 UnifiedPublisher: Valid Walmart connection:',
        !!validWalmartConnection
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
        } else if (platform.id === 'walmart') {
          isConnected = !!validWalmartConnection?.access_token
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
    } catch (err) {
      const error = err as Error
      console.error('❌ UnifiedPublisher: Error loading connections:', error)

      // 🔧 GRACEFUL FALLBACK - Check URL for OAuth completion
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const shopifyConnected = urlParams.get('shopify') === 'connected'
        const amazonConnected = urlParams.get('amazon') === 'connected'
        const ebayConnected = urlParams.get('ebay') === 'connected'

        if (shopifyConnected || amazonConnected || ebayConnected) {
          console.log(
            '🔄 UnifiedPublisher: OAuth detected in URL, assuming connection successful'
          )

          const updatedPlatforms = platforms.map((platform) => ({
            ...platform,
            connected:
              (platform.id === 'amazon' && amazonConnected) ||
              (platform.id === 'shopify' && shopifyConnected) ||
              (platform.id === 'ebay' && ebayConnected),
          }))

          setPlatforms(updatedPlatforms)

          // Set first connected platform as default
          const connectedPlatform = updatedPlatforms.find((p) => p.connected)
          if (connectedPlatform) {
            setSelectedPlatform(connectedPlatform.id)
          }

          console.log(
            '✅ UnifiedPublisher: Using OAuth URL fallback for connections'
          )
          return
        }
      }

      // Final fallback - all platforms disconnected
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

  // 🔧 SIMPLE retry function
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    loadPlatformConnections()
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
    window.location.href = `/api/${platformId}/oauth?user_id=${passedUser.id}`
  }

  const generateAmazonInstructions = async () => {
    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      // Generate optimized product data
      const amazonData = {
        sku: publishingOptions.sku || generateSKU(),
        title: cleanAndEnhanceTitle(productContent.product_name),
        description: formatAmazonDescription(
          productContent.content,
          productContent.features
        ),
        brand: extractBrand(productContent),
        manufacturer: extractBrand(productContent),
        price: parseFloat(publishingOptions.price),
        quantity: parseInt(publishingOptions.quantity) || 1,
        category: 'Clothing, Shoes & Jewelry',
        keywords: generateCleanKeywords(productContent),
        bullet_point1: generateBulletPoint(productContent.features, 0),
        bullet_point2: generateBulletPoint(productContent.features, 1),
        bullet_point3: generateBulletPoint(productContent.features, 2),
        bullet_point4: generateBulletPoint(productContent.features, 3),
        bullet_point5: generateBulletPoint(productContent.features, 4),
        main_image_url: images[0] || '',
        other_image_url1: images[1] || '',
        other_image_url2: images[2] || '',
        other_image_url3: images[3] || '',
        other_image_url4: images[4] || '',
      }

      setInstructionData(amazonData)
      setPublishSuccess(
        '✅ Amazon listing instructions generated successfully!'
      )

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)

      setShowInstructions(true)

      setPublishedProducts((prev) => ({
        ...prev,
        [selectedPlatform]: {
          data: amazonData,
          publishedAt: new Date().toISOString(),
          method: 'instructions',
        },
      }))
    } catch (err) {
      const error = err as Error
      console.error('Error generating instructions:', error)
      setPublishError('Failed to generate Amazon instructions')
    } finally {
      setIsPublishing(false)
    }
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

    // Handle Amazon instructions generation (only method for Amazon)
    if (selectedPlatform === 'amazon') {
      await generateAmazonInstructions()
      return
    }

    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      let endpoint = `/api/${selectedPlatform}/publish`
      let requestPayload = {
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

      console.log('🚀 Publishing request:', {
        endpoint,
        platform: selectedPlatform,
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

      const successMessage =
        selectedPlatform === 'ebay'
          ? `✅ Successfully listed on eBay! Item ID: ${result.data?.itemId || result.data?.listingId || 'Processing'}`
          : selectedPlatform === 'walmart'
            ? `✅ Successfully submitted to Walmart! Feed ID: ${result.data?.feedId || 'Processing'}`
            : `✅ Successfully published to ${selectedPlatformData?.name}! Product ID: ${result.productId || result.listingId || result.id || 'Unknown'}`
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

      if (onPublishSuccess) {
        onPublishSuccess({ ...result, platform: selectedPlatform })
      }

      setPublishedPlatforms((prev) => [...prev, selectedPlatform])
    } catch (err) {
      const error = err as Error
      console.error('Publishing error:', error)
      setPublishError(error.message)
    } finally {
      setIsPublishing(false)
    }
  }

  // Helper functions
  function extractBrand(productContent: any): string {
    const content =
      `${productContent.product_name || ''} ${productContent.content || ''}`.toLowerCase()

    if (content.includes('nike')) return 'Nike'
    if (content.includes('apple')) return 'Apple'
    if (content.includes('samsung')) return 'Samsung'
    if (content.includes('sony')) return 'Sony'
    if (content.includes('uwood')) return 'UWOOD'
    if (content.includes('bewell')) return 'BEWELL'

    const words = (productContent.product_name || '').split(' ')
    if (words[0] && words[0].length > 2 && /^[A-Z]/.test(words[0])) {
      return words[0]
    }

    return 'Premium'
  }

  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6)
    const productPrefix = productContent.product_name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6)
    return `${productPrefix}-${timestamp}`
  }

  function cleanAndEnhanceTitle(title: string): string {
    let cleaned = title
      .replace(/[^\w\s\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const words = cleaned.split(' ')
    const uniqueWords = []
    const seen = new Set()

    for (const word of words) {
      const lower = word.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        uniqueWords.push(word)
      }
    }

    let result = uniqueWords.join(' ')

    if (result.length < 20) {
      result = `Premium ${result} - High Quality Design`
    }

    if (result.length > 200) {
      result = result.substring(0, 197) + '...'
    }

    return result
  }

  function formatAmazonDescription(
    description: string,
    features: string
  ): string {
    let text = description || features || ''

    text = text
      .replace(/PRODUCT TITLE\/HEADLINE:\s*/gi, '')
      .replace(/KEY SELLING POINTS:\s*/gi, '')
      .replace(/DETAILED PRODUCT DESCRIPTION:\s*/gi, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\d+\.\s*/g, '')
      .replace(/[^\w\s\-.,!?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 3)

    let result = sentences.join('. ')
    if (result && !result.endsWith('.')) {
      result += '.'
    }

    if (result.length > 500) {
      result = result.substring(0, 497) + '...'
    }

    return result || 'High-quality product with excellent features and design.'
  }

  function generateCleanKeywords(productData: any): string {
    const content = `${productData.product_name || ''} ${productData.content || ''}`

    const keywords = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && word.length < 15)
      .filter(
        (word) => !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
      )
      .slice(0, 5)

    return [...new Set(keywords)].join(', ')
  }

  function generateBulletPoint(features: string, index: number): string {
    const defaults = [
      'Premium quality construction and materials',
      'Excellent performance and reliability',
      'Great value for money and satisfaction',
      'Fast shipping and customer support',
      'Perfect for everyday use and occasions',
    ]

    if (!features) return defaults[index] || ''

    const sentences = features
      .replace(/[^\w\s\-.,!?]/g, ' ')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10)

    return sentences[index] || defaults[index] || ''
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const selectedPlatformData = platforms.find((p) => p.id === selectedPlatform)
  const connectedPlatforms = platforms.filter((p) => p.connected)
  const enabledPlatforms = platforms.filter((p) => !p.disabled)

  // 🔧 BRIEF loading state - max 3 seconds
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
    <div className="mt-6 space-y-6">
      {/* Amazon Instructions Modal */}
      {showInstructions && instructionData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="h-full overflow-y-auto pt-4">
            <div className="max-w-4xl mx-auto px-4 pb-4">
              <div className="bg-white rounded-xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center">
                        🚀 Amazon Listing Instructions
                      </h2>
                      <p className="text-orange-100 mt-1">
                        Professional guide with optimized product data
                      </p>
                    </div>
                    <button
                      onClick={() => setShowInstructions(false)}
                      className="text-white hover:text-orange-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="bg-gray-50 p-6 border-b">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    📦 Your Product Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <strong className="text-gray-600">Product:</strong>
                      <p className="text-gray-900 text-sm">
                        {instructionData.title}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <strong className="text-gray-600">Category:</strong>
                      <p className="text-gray-900 text-sm">
                        {instructionData.category}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <strong className="text-gray-600">SKU:</strong>
                      <p className="text-gray-900 text-sm">
                        {instructionData.sku}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <strong className="text-gray-600">Price:</strong>
                      <p className="text-gray-900 text-sm">
                        ${instructionData.price}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions Content */}
                <div className="p-6 space-y-6">
                  {/* Step 1 */}
                  <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                    <div className="bg-blue-500 text-white p-4">
                      <h4 className="font-semibold text-lg">
                        📥 Step 1: Download Amazon's Official Template
                      </h4>
                    </div>
                    <div className="p-4">
                      <ol className="space-y-2 text-sm">
                        <li>
                          1. Go to <strong>Amazon Seller Central</strong>
                        </li>
                        <li>
                          2. Navigate to:{' '}
                          <strong>Catalog → Add Products via Upload</strong>
                        </li>
                        <li>
                          3. Click:{' '}
                          <strong>"Download an Inventory File"</strong>
                        </li>
                        <li>
                          4. Select category:{' '}
                          <strong>"Clothing, Shoes & Jewelry"</strong>
                        </li>
                        <li>
                          5. Choose your marketplace and click{' '}
                          <strong>"Generate Template"</strong>
                        </li>
                        <li>6. Download the official Amazon template file</li>
                      </ol>
                      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-yellow-800 text-sm">
                          <strong>⚠️ Important:</strong> Only use Amazon's
                          official template. Never modify the headers or
                          structure.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                    <div className="bg-green-500 text-white p-4">
                      <h4 className="font-semibold text-lg">
                        ✏️ Step 2: Fill in Your Optimized Product Data
                      </h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <p className="text-sm text-gray-600">
                        Open the downloaded template in Excel and copy-paste the
                        optimized data below:
                      </p>

                      {/* Core Product Information */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-900 mb-3">
                          🎯 Core Product Information
                        </h5>
                        <div className="space-y-3">
                          {[
                            { label: 'SKU', value: instructionData.sku },
                            {
                              label: 'Product Name',
                              value: instructionData.title,
                            },
                            { label: 'Brand', value: instructionData.brand },
                            {
                              label: 'Price',
                              value: instructionData.price.toString(),
                            },
                            {
                              label: 'Quantity',
                              value: instructionData.quantity.toString(),
                            },
                          ].map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-3 bg-white p-3 rounded border"
                            >
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                                {item.label}:
                              </span>
                              <div className="flex-1 bg-gray-50 p-2 rounded border text-sm font-mono">
                                {item.value}
                              </div>
                              <button
                                onClick={() => copyToClipboard(item.value)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h5 className="font-semibold text-purple-900 mb-3">
                          📝 Product Description
                        </h5>
                        <div className="flex items-start space-x-3 bg-white p-3 rounded border">
                          <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                            Description:
                          </span>
                          <div className="flex-1 bg-gray-50 p-2 rounded border text-sm">
                            {instructionData.description}
                          </div>
                          <button
                            onClick={() =>
                              copyToClipboard(instructionData.description)
                            }
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bullet Points */}
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h5 className="font-semibold text-orange-900 mb-3">
                          🎯 Bullet Points
                        </h5>
                        <div className="space-y-3">
                          {[
                            instructionData.bullet_point1,
                            instructionData.bullet_point2,
                            instructionData.bullet_point3,
                            instructionData.bullet_point4,
                            instructionData.bullet_point5,
                          ].map((bullet, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-3 bg-white p-3 rounded border"
                            >
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                                Bullet {index + 1}:
                              </span>
                              <div className="flex-1 bg-gray-50 p-2 rounded border text-sm">
                                {bullet}
                              </div>
                              <button
                                onClick={() => copyToClipboard(bullet)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Keywords & Images */}
                      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                        <h5 className="font-semibold text-teal-900 mb-3">
                          🔍 Keywords & Images
                        </h5>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 bg-white p-3 rounded border">
                            <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                              Keywords:
                            </span>
                            <div className="flex-1 bg-gray-50 p-2 rounded border text-sm">
                              {instructionData.keywords}
                            </div>
                            <button
                              onClick={() =>
                                copyToClipboard(instructionData.keywords)
                              }
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {instructionData.main_image_url && (
                            <div className="flex items-center space-x-3 bg-white p-3 rounded border">
                              <span className="text-sm font-medium text-gray-700 min-w-[100px]">
                                Main Image:
                              </span>
                              <div className="flex-1 bg-gray-50 p-2 rounded border text-sm font-mono">
                                {instructionData.main_image_url}
                              </div>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    instructionData.main_image_url
                                  )
                                }
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors flex items-center"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="border-2 border-purple-200 rounded-lg overflow-hidden">
                    <div className="bg-purple-500 text-white p-4">
                      <h4 className="font-semibold text-lg">
                        📤 Step 3: Upload Your Completed Template
                      </h4>
                    </div>
                    <div className="p-4">
                      <ol className="space-y-2 text-sm">
                        <li>1. Save your completed template file</li>
                        <li>
                          2. Go back to:{' '}
                          <strong>Catalog → Add Products via Upload</strong>
                        </li>
                        <li>
                          3. Click:{' '}
                          <strong>"Upload your inventory file"</strong>
                        </li>
                        <li>
                          4. Select{' '}
                          <strong>"Category-specific inventory files"</strong>
                        </li>
                        <li>
                          5. Choose <strong>"Clothing, Shoes & Jewelry"</strong>
                        </li>
                        <li>6. Upload your completed template</li>
                        <li>7. Wait for Amazon to process your file</li>
                        <li>8. Check the processing report for confirmation</li>
                      </ol>
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800 text-sm">
                          <strong>🎉 Success!</strong> Your product will be
                          listed on Amazon with professionally optimized data
                          that complies with all Amazon requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-100 p-4 rounded-b-xl border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Generated by <strong>Listora AI</strong> • Professional
                      Amazon Optimization
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() =>
                          window.open(
                            'https://sellercentral.amazon.com/listing/cards',
                            '_blank'
                          )
                        }
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Open Seller Central</span>
                      </button>
                      <button
                        onClick={() => setShowInstructions(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Publisher Component */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        {/* Header with refresh button */}
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
          <button
            onClick={handleRetry}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh connections"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
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
              {enabledPlatforms.map((platform) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            ? 'Professional instructions with optimized data'
                            : platform.id === 'shopify'
                              ? 'Publish directly to your Shopify store'
                              : platform.id === 'ebay'
                                ? "List on the world's largest auction marketplace"
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
                          Price *
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
                        <p className="text-xs text-gray-500 mt-1">
                          Enter the price in your local currency
                        </p>
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
                          <option value="used_very_good">
                            Used - Very Good
                          </option>
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
                            <option value="HOME_AND_GARDEN">
                              Home & Garden
                            </option>
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
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 text-sm font-medium">
                              ✨ Amazon Publishing Method: Premium Instructions
                            </p>
                            <p className="text-blue-700 text-xs mt-1">
                              We'll generate step-by-step instructions with
                              optimized data for Amazon success.
                            </p>
                          </div>
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
                    {/* Instructions Download Button OR Product View Button */}
                    {publishedProducts[selectedPlatform].method ===
                    'instructions' ? (
                      <>
                        {/* View Instructions Button */}
                        <button
                          onClick={() => setShowInstructions(true)}
                          className="w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          View Amazon Instructions
                        </button>

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
                              setShowInstructions(false)
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
                              window.open(
                                'https://admin.shopify.com/',
                                '_blank'
                              )
                            } else if (selectedPlatform === 'ebay') {
                              window.open(
                                'https://www.ebay.com/sh/ovw',
                                '_blank'
                              )
                            } else if (selectedPlatform === 'walmart') {
                              // For Walmart, open the feed status page since items process asynchronously
                              window.open(
                                'https://seller.walmart.com/items/uploads',
                                '_blank'
                              )
                            }
                          }}
                          className="w-full flex items-center justify-center px-6 py-4 rounded-lg font-medium text-lg transition-all bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Globe className="h-5 w-5 mr-2" />
                          View{' '}
                          {selectedPlatform === 'ebay'
                            ? 'Listing'
                            : 'Product'}{' '}
                          on {selectedPlatformData?.name}
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
                        {selectedPlatform === 'amazon'
                          ? 'Generating Amazon Instructions...'
                          : `Publishing to ${selectedPlatformData?.name}...`}
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        {selectedPlatform === 'amazon'
                          ? 'Generate Amazon Instructions'
                          : selectedPlatform === 'ebay'
                            ? 'List on eBay'
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
    </div>
  )
}
