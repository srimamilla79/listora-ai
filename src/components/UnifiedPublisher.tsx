// src/components/UnifiedPublisher.tsx - WITH META INTEGRATION
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ExternalLink, RefreshCw } from 'lucide-react'
import WalmartCategoryPicker from './WalmartCategoryPicker'
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
  MapPin,
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
  imageUpdateTrigger?: number
}

export default function UnifiedPublisher({
  productContent,
  images = [],
  onPublishSuccess,
  user: passedUser,
  imageUpdateTrigger,
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
    {
      id: 'meta',
      name: 'Facebook & Instagram',
      icon: '📱',
      color: 'gradient',
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
  const [publishResult, setPublishResult] = useState<any>(null)
  const [showMarketplacePermissionDialog, setShowMarketplacePermissionDialog] =
    useState(false)

  const [publishingOptions, setPublishingOptions] = useState({
    price: '',
    quantity: '1',
    sku: '',
    condition: 'new',
    productType: '',
    metaPlatforms: ['facebook', 'instagram'],
  })

  // Marketplace details state
  const [marketplaceDetails, setMarketplaceDetails] = useState({
    category: '',
    brand: '',
    shippingPrice: 0,
    location: {
      city: '',
      state: '',
      country: '',
    },
  })

  // State to track current images
  const [currentImages, setCurrentImages] = useState(images)

  // Update images when prop changes or trigger updates
  useEffect(() => {
    console.log('🔍 UnifiedPublisher - Images updated:', {
      imagesLength: images.length,
      imageUpdateTrigger,
      images,
    })
    setCurrentImages(images)
  }, [images, imageUpdateTrigger])

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
      const metaConnected = urlParams.get('meta')

      if (
        shopifyConnected === 'connected' ||
        amazonConnected === 'connected' ||
        ebayConnected === 'connected' ||
        metaConnected === 'connected'
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
    let loadingTimeout: NodeJS.Timeout | undefined
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

      // Add a timeout to prevent hanging
      loadingTimeout = setTimeout(() => {
        console.log('⚠️ UnifiedPublisher: Loading timeout - using empty state')
        setLoading(false)
      }, 5000)

      // 🔧 SIMPLIFIED queries with longer timeouts
      let amazonConnections: any[] = []
      let shopifyConnections: any[] = []
      let ebayConnections: any[] = []
      let walmartConnections: any[] = []
      let metaConnections: any[] = []

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

        // Meta query
        supabase
          .from('meta_connections')
          .select('*')
          .eq('user_id', passedUser.id)
          .eq('status', 'connected')
          .then((result: any) => ({ type: 'meta', result }))
          .catch((error: any) => ({ type: 'meta', error })),
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
              } else if (type === 'meta') {
                metaConnections = result.data || []
                console.log(
                  '🔍 UnifiedPublisher: Meta data found:',
                  metaConnections
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
      const validMetaConnection =
        metaConnections.find(
          (conn: any) =>
            conn.facebook_page_access_token &&
            conn.facebook_page_access_token.trim() !== ''
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
      console.log(
        '🔍 UnifiedPublisher: Valid Meta connection:',
        !!validMetaConnection
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
        } else if (platform.id === 'meta') {
          isConnected = !!validMetaConnection
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
        const metaConnected = urlParams.get('meta') === 'connected'

        if (
          shopifyConnected ||
          amazonConnected ||
          ebayConnected ||
          metaConnected
        ) {
          console.log(
            '🔄 UnifiedPublisher: OAuth detected in URL, assuming connection successful'
          )

          const updatedPlatforms = platforms.map((platform) => ({
            ...platform,
            connected:
              (platform.id === 'amazon' && amazonConnected) ||
              (platform.id === 'shopify' && shopifyConnected) ||
              (platform.id === 'ebay' && ebayConnected) ||
              (platform.id === 'meta' && metaConnected),
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
      if (loadingTimeout) clearTimeout(loadingTimeout)
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

    // Meta uses different auth endpoint
    const authUrl =
      platformId === 'meta'
        ? `/api/meta/auth?user_id=${passedUser.id}`
        : `/api/${platformId}/oauth?user_id=${passedUser.id}`

    window.location.href = authUrl
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

  // In handlePublish function - REPLACE the entire function with this:
  const handlePublish = async () => {
    console.log('🚀 handlePublish called with:', {
      currentImages,
      currentImagesLength: currentImages.length,
      originalImages: images,
      originalImagesLength: images.length,
    })

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

    // Validate current images
    if (!currentImages || currentImages.length === 0) {
      setPublishError('Please upload at least one image before publishing')
      return
    }

    // Handle Amazon instructions generation (only method for Amazon)
    if (selectedPlatform === 'amazon') {
      await generateAmazonInstructions()
      return
    }

    // 🆕 NEW: Special handling for Meta with marketplace
    if (
      selectedPlatform === 'meta' &&
      publishingOptions.metaPlatforms.includes('marketplace')
    ) {
      // Validate marketplace requirements first
      if (
        !marketplaceDetails.location.city ||
        !marketplaceDetails.location.state ||
        !marketplaceDetails.location.country
      ) {
        setPublishError('Please enter your location for marketplace listing')
        return
      }
      if (!marketplaceDetails.category) {
        setPublishError('Please select a category for marketplace listing')
        return
      }

      // 🆕 NEW: Check if user needs to reconnect for marketplace permissions
      try {
        const permissionCheckResponse = await fetch(
          '/api/meta/check-permissions',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: passedUser?.id }),
          }
        )

        if (permissionCheckResponse.ok) {
          const permissionData = await permissionCheckResponse.json()

          if (!permissionData.hasMarketplacePermissions) {
            // 🆕 NEW: Show detailed error with action button
            setPublishError(null) // Clear any existing error
            setShowMarketplacePermissionDialog(true) // You'll need to add this state
            return
          }
        }
      } catch (permError) {
        console.warn('Permission check failed, proceeding anyway:', permError)
      }
    }

    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(null)

    try {
      let endpoint = `/api/${selectedPlatform}/publish`

      // Special handling for Walmart - use the new endpoint
      if (selectedPlatform === 'walmart') {
        endpoint = `/api/walmart/items/offer-match`
      }

      let requestPayload: any = {
        productContent: {
          id: productContent?.id,
          product_name: productContent.product_name,
          features: productContent.features,
          content: productContent.content,
        },
        images: currentImages,
        publishingOptions: {
          ...publishingOptions,
          price: parseFloat(publishingOptions.price),
          quantity: parseInt(publishingOptions.quantity),
          sku: publishingOptions.sku || generateSKU(),
        },
        platform: selectedPlatform,
        userId: passedUser?.id,
      }
      // Handle Meta publishing
      if (selectedPlatform === 'meta') {
        requestPayload = {
          productContent: {
            id: productContent?.id,
            product_name: productContent.product_name,
            features: productContent.features,
            generated_content: productContent.content,
            price: parseFloat(publishingOptions.price),
            quantity: parseInt(publishingOptions.quantity),
            sku: publishingOptions.sku || generateSKU(),
          },
          images: currentImages,
          publishingOptions: {
            platforms: publishingOptions.metaPlatforms,
            marketplaceDetails: publishingOptions.metaPlatforms.includes(
              'marketplace'
            )
              ? {
                  ...marketplaceDetails,
                  condition: publishingOptions.condition,
                  price: parseFloat(publishingOptions.price),
                  quantity: parseInt(publishingOptions.quantity),
                }
              : undefined,
          },
          userId: passedUser?.id,
          platforms: publishingOptions.metaPlatforms,
        }
      }

      console.log('🚀 Publishing request:', {
        endpoint,
        platform: selectedPlatform,
      })

      const response = await fetch(`${window.location.origin}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // 🆕 NEW: Special handling for permission errors
        if (response.status === 403 && errorData.permissions_required) {
          setShowMarketplacePermissionDialog(true)
          setPublishError(
            'Facebook Marketplace requires additional permissions. Please reconnect your Facebook account.'
          )
          return
        }

        throw new Error(
          errorData.error ||
            `Failed to publish to ${selectedPlatformData?.name}`
        )
      }

      const result = await response.json()

      // 🆕 NEW: Handle partial success (e.g., posted to FB/IG but not marketplace)
      if (result.data && Array.isArray(result.data)) {
        const failures = result.data.filter((r: any) => r.error)
        const successes = result.data.filter((r: any) => !r.error)

        if (failures.length > 0 && successes.length > 0) {
          // Partial success
          const successPlatforms = successes
            .map((s: any) =>
              s.platform === 'facebook'
                ? 'Facebook'
                : s.platform === 'instagram'
                  ? 'Instagram'
                  : s.platform === 'marketplace'
                    ? 'Marketplace'
                    : s.platform
            )
            .join(', ')

          const failedPlatforms = failures
            .map((f: any) =>
              f.platform === 'facebook'
                ? 'Facebook'
                : f.platform === 'instagram'
                  ? 'Instagram'
                  : f.platform === 'marketplace'
                    ? 'Marketplace'
                    : f.platform
            )
            .join(', ')

          setPublishSuccess(`✅ Posted to ${successPlatforms}`)
          setPublishError(
            `⚠️ Failed to post to ${failedPlatforms}: ${failures[0].error}`
          )

          // Still mark as published for successful platforms
          setPublishedProducts((prev) => ({
            ...prev,
            [selectedPlatform]: {
              ...result,
              publishedAt: new Date().toISOString(),
              partial: true,
            },
          }))

          if (onPublishSuccess) {
            onPublishSuccess({ ...result, platform: selectedPlatform })
          }

          return
        } else if (failures.length > 0 && successes.length === 0) {
          // Complete failure
          throw new Error(failures[0].error || 'All publishing attempts failed')
        }
      }

      // Complete success
      const successMessage =
        selectedPlatform === 'ebay'
          ? `✅ Successfully listed on eBay! Item ID: ${result.data?.itemId || result.data?.listingId || 'Processing'}`
          : selectedPlatform === 'walmart'
            ? `✅ Successfully submitted to Walmart! Feed ID: ${result.data?.feedId || 'Processing'}`
            : selectedPlatform === 'meta'
              ? `✅ Successfully posted to ${publishingOptions.metaPlatforms
                  .map((p) =>
                    p === 'facebook'
                      ? 'Facebook'
                      : p === 'instagram'
                        ? 'Instagram'
                        : 'Marketplace'
                  )
                  .join(', ')}!`
              : `✅ Successfully published to ${selectedPlatformData?.name}! Product ID: ${result.productId || result.listingId || result.id || 'Unknown'}`

      setPublishSuccess(successMessage)
      setPublishResult(result)

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
                                : platform.id === 'meta'
                                  ? 'Post to Facebook Pages and Instagram Business accounts'
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
                      {/* 👇 ADD THE WALMART CATEGORY SELECTOR HERE 👇 */}
                      {selectedPlatform === 'walmart' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Package className="h-4 w-4 inline mr-1 text-blue-600" />
                            Walmart Product Category
                          </label>
                          <WalmartCategoryPicker
                            userId={passedUser?.id}
                            onCategorySelect={(category, attributes) => {
                              setPublishingOptions((prev) => ({
                                ...prev,
                                walmartProductType: category.name,
                                walmartAttributes: attributes,
                              }))
                            }}
                          />
                        </div>
                      )}
                      {/* 👆 END OF WALMART CATEGORY SELECTOR 👆 */}

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

                      {/* Meta Platform Selector */}
                      {selectedPlatform === 'meta' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Globe className="h-4 w-4 inline mr-1 text-blue-600" />
                            Select Platforms
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={publishingOptions.metaPlatforms.includes(
                                  'facebook'
                                )}
                                onChange={(e) => {
                                  const platforms = e.target.checked
                                    ? [
                                        ...publishingOptions.metaPlatforms,
                                        'facebook',
                                      ]
                                    : publishingOptions.metaPlatforms.filter(
                                        (p) => p !== 'facebook'
                                      )
                                  setPublishingOptions((prev) => ({
                                    ...prev,
                                    metaPlatforms: platforms,
                                  }))
                                }}
                                className="mr-2"
                              />
                              <div>
                                <div className="font-medium">Facebook Page</div>
                                <div className="text-xs text-gray-500">
                                  Social post
                                </div>
                              </div>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={publishingOptions.metaPlatforms.includes(
                                  'instagram'
                                )}
                                onChange={(e) => {
                                  const platforms = e.target.checked
                                    ? [
                                        ...publishingOptions.metaPlatforms,
                                        'instagram',
                                      ]
                                    : publishingOptions.metaPlatforms.filter(
                                        (p) => p !== 'instagram'
                                      )
                                  setPublishingOptions((prev) => ({
                                    ...prev,
                                    metaPlatforms: platforms,
                                  }))
                                }}
                                className="mr-2"
                              />
                              <div>
                                <div className="font-medium">Instagram</div>
                                <div className="text-xs text-gray-500">
                                  Photo post
                                </div>
                              </div>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg bg-gray-50 cursor-not-allowed opacity-60">
                              <input
                                type="checkbox"
                                checked={false}
                                disabled={true}
                                className="mr-2 cursor-not-allowed"
                              />
                              <div>
                                <div className="font-medium text-gray-500">
                                  Marketplace
                                </div>
                                <div className="text-xs text-gray-400">
                                  Coming Soon
                                </div>
                              </div>
                            </label>
                          </div>

                          {/* Show marketplace details if marketplace is selected */}
                          {publishingOptions.metaPlatforms.includes(
                            'marketplace'
                          ) && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                <Store className="h-4 w-4 mr-2" />
                                Marketplace Details
                              </h4>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={marketplaceDetails.category}
                                    onChange={(e) =>
                                      setMarketplaceDetails({
                                        ...marketplaceDetails,
                                        category: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    required
                                  >
                                    <option value="">Select Category</option>
                                    <option value="apparel">
                                      Clothing & Accessories
                                    </option>
                                    <option value="electronics">
                                      Electronics
                                    </option>
                                    <option value="home">Home & Garden</option>
                                    <option value="family">
                                      Family & Kids
                                    </option>
                                    <option value="health_beauty">
                                      Health & Beauty
                                    </option>
                                    <option value="sports_outdoors">
                                      Sports & Outdoors
                                    </option>
                                    <option value="misc">
                                      Everything Else
                                    </option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Brand{' '}
                                    <span className="text-gray-400 text-xs">
                                      (optional)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    value={marketplaceDetails.brand}
                                    onChange={(e) =>
                                      setMarketplaceDetails({
                                        ...marketplaceDetails,
                                        brand: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="e.g., Nike, Apple"
                                  />
                                </div>

                                <div className="col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <MapPin className="h-4 w-4 inline mr-1" />
                                    Location{' '}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <input
                                      type="text"
                                      value={marketplaceDetails.location.city}
                                      onChange={(e) =>
                                        setMarketplaceDetails({
                                          ...marketplaceDetails,
                                          location: {
                                            ...marketplaceDetails.location,
                                            city: e.target.value,
                                          },
                                        })
                                      }
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="City"
                                      required
                                    />
                                    <input
                                      type="text"
                                      value={marketplaceDetails.location.state}
                                      onChange={(e) =>
                                        setMarketplaceDetails({
                                          ...marketplaceDetails,
                                          location: {
                                            ...marketplaceDetails.location,
                                            state: e.target.value,
                                          },
                                        })
                                      }
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="State/Province"
                                      required
                                    />
                                    <input
                                      type="text"
                                      value={
                                        marketplaceDetails.location.country
                                      }
                                      onChange={(e) =>
                                        setMarketplaceDetails({
                                          ...marketplaceDetails,
                                          location: {
                                            ...marketplaceDetails.location,
                                            country:
                                              e.target.value.toUpperCase(),
                                          },
                                        })
                                      }
                                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="Country (e.g., US)"
                                      maxLength={2}
                                      required
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Where is the item located? Buyers can filter
                                    by location.
                                  </p>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Shipping{' '}
                                    <span className="text-gray-400 text-xs">
                                      (optional)
                                    </span>
                                  </label>
                                  <select
                                    value={
                                      marketplaceDetails.shippingPrice === 0
                                        ? 'free'
                                        : 'paid'
                                    }
                                    onChange={(e) =>
                                      setMarketplaceDetails({
                                        ...marketplaceDetails,
                                        shippingPrice:
                                          e.target.value === 'free'
                                            ? 0
                                            : marketplaceDetails.shippingPrice ||
                                              5,
                                      })
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  >
                                    <option value="free">Free Shipping</option>
                                    <option value="paid">
                                      Buyer Pays Shipping
                                    </option>
                                  </select>
                                </div>

                                {marketplaceDetails.shippingPrice > 0 && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Shipping Cost
                                    </label>
                                    <input
                                      type="number"
                                      value={marketplaceDetails.shippingPrice}
                                      onChange={(e) =>
                                        setMarketplaceDetails({
                                          ...marketplaceDetails,
                                          shippingPrice:
                                            parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="5.00"
                                      step="0.01"
                                      min="0"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs text-blue-700">
                                  <strong>Note:</strong> Price ($
                                  {publishingOptions.price || '0'}) and
                                  Condition ({publishingOptions.condition}) are
                                  set in the main form above.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-blue-800 text-sm font-medium">
                              ✨ Multi-Platform Publishing
                            </p>
                            <p className="text-blue-700 text-xs mt-1">
                              {publishingOptions.metaPlatforms.includes(
                                'marketplace'
                              )
                                ? 'Post to Facebook, Instagram, and list on Marketplace simultaneously.'
                                : 'Post simultaneously to Facebook and Instagram with optimized captions.'}
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

                    {/* Walmart Feed Status Check */}
                    {selectedPlatform === 'walmart' &&
                      publishResult?.feedId && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">
                            Track Your Walmart Feed
                          </h4>
                          <p className="text-sm text-blue-700 mb-3">
                            Feed ID: {publishResult.feedId}
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch(
                                  `/api/walmart/check-feed-status?feedId=${encodeURIComponent(
                                    publishResult.feedId
                                  )}&userId=${passedUser?.id}`
                                )
                                const data = await response.json()
                                console.log('Feed Status:', data)
                                alert(
                                  `Feed Status: ${data.feedStatus || 'Unknown'}\n${data.interpretation?.message || ''}`
                                )
                              } catch (error) {
                                console.error(
                                  'Failed to check feed status:',
                                  error
                                )
                                alert('Failed to check feed status')
                              }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Check Feed Status
                          </button>
                        </div>
                      )}
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
                            } else if (selectedPlatform === 'meta') {
                              // For Meta, open Facebook Page
                              window.open('https://facebook.com', '_blank')
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
                            : selectedPlatform === 'meta'
                              ? 'Post to Social Media'
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
      {/* 🆕 ADD THE MARKETPLACE PERMISSION DIALOG HERE */}
      {showMarketplacePermissionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Facebook Marketplace Permissions Required
            </h3>
            <p className="text-gray-600 mb-4">
              To list products on Facebook Marketplace, you need to reconnect
              your Facebook account and approve additional permissions:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
              <li>Catalog Management</li>
              <li>Commerce Account Access</li>
              <li>Business Management</li>
            </ul>
            <p className="text-sm text-gray-500 mb-6">
              Note: These permissions may require Facebook app review. In the
              meantime, you can still post to Facebook Pages and Instagram.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  fetch('/api/meta/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: passedUser?.id }),
                  }).then(() => {
                    setTimeout(() => {
                      handlePlatformConnect('meta')
                    }, 500)
                  })
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reconnect Facebook
              </button>
              <button
                onClick={() => {
                  setShowMarketplacePermissionDialog(false)
                  setPublishingOptions((prev) => ({
                    ...prev,
                    metaPlatforms: prev.metaPlatforms.filter(
                      (p) => p !== 'marketplace'
                    ),
                  }))
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Continue Without Marketplace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
