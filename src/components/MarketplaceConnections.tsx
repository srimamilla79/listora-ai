// src/components/MarketplaceConnections.tsx - TEMPORARY FIX VERSION - COMPLETE
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Store,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  Loader,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react'

interface Connection {
  platform: string
  connected: boolean
  disabled?: boolean
  comingSoon?: boolean
  storeInfo?: {
    seller_id?: string
    shop_name?: string
    shop_domain?: string
    marketplace_id?: string
    environment?: string
    shop_id?: string
  }
  lastUsed?: string
  connectedAt?: string
}

interface MarketplaceConnectionsProps {
  userId?: string
  onConnectionChange?: (platform: string, connected: boolean) => void
}

export default function MarketplaceConnections({
  userId,
  onConnectionChange,
}: MarketplaceConnectionsProps) {
  // 🔧 PERSISTENT connection state that survives page changes
  const [connections, setConnections] = useState<Connection[]>(() => {
    // Initialize with cached state if available
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('marketplace_connections')
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached)
          console.log('🔄 Restored connections from cache:', parsedCache)
          return parsedCache
        } catch (err) {
          console.log('⚠️ Failed to parse cached connections, using defaults')
        }
      }
    }

    return [
      { platform: 'amazon', connected: false },
      { platform: 'shopify', connected: false },
      { platform: 'ebay', connected: false },
    ]
  })

  // 🔧 Cache connections whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'marketplace_connections',
        JSON.stringify(connections)
      )
      console.log(
        '💾 Cached connection state:',
        connections.map((c) => `${c.platform}: ${c.connected}`)
      )
    }
  }, [connections])

  // 🔧 MINIMAL loading - max 3 seconds, then always show interface
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    userId || null
  )

  // Update userId when prop changes
  useEffect(() => {
    if (userId && userId !== currentUserId) {
      setCurrentUserId(userId)
    }
  }, [userId, currentUserId])

  // 🔧 GUARANTEED to finish in 3 seconds max
  useEffect(() => {
    // Always clear loading after 3 seconds regardless of what happens
    const maxLoadingTimer = setTimeout(() => {
      setLoading(false)
    }, 3000)

    if (currentUserId) {
      loadConnections()
    } else {
      setLoading(false)
    }

    return () => clearTimeout(maxLoadingTimer)
  }, [currentUserId])

  // 🔧 DETECT OAuth completion from URL and refresh connections
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const shopifyConnected = urlParams.get('shopify')
      const amazonConnected = urlParams.get('amazon')
      const ebayConnected = urlParams.get('ebay')

      if (
        shopifyConnected === 'connected' ||
        amazonConnected === 'connected' ||
        ebayConnected === 'connected'
      ) {
        console.log('🔄 OAuth completion detected, refreshing connections...')

        // Small delay to ensure database is updated
        setTimeout(() => {
          if (currentUserId) {
            loadConnections()
          }
        }, 1000)

        // Clean URL after refresh
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [currentUserId])

  // 🔧 ROBUST connection loading with persistent caching
  const loadConnections = async () => {
    if (!currentUserId) {
      setLoading(false)
      return
    }

    console.log('🔗 Loading marketplace connections for user:', currentUserId)

    // 🔧 FIRST: Check if we have recent cached connections (less than 5 minutes old)
    if (typeof window !== 'undefined') {
      const cacheKey = `connections_${currentUserId}`
      const cacheTimestampKey = `connections_timestamp_${currentUserId}`
      const cachedConnections = localStorage.getItem(cacheKey)
      const cacheTimestamp = localStorage.getItem(cacheTimestampKey)

      if (cachedConnections && cacheTimestamp) {
        const now = Date.now()
        const cached = parseInt(cacheTimestamp)
        const fiveMinutes = 5 * 60 * 1000

        if (now - cached < fiveMinutes) {
          try {
            const parsedConnections = JSON.parse(cachedConnections)
            console.log(
              '⚡ Using recent cached connections (less than 5min old)'
            )
            setConnections(parsedConnections)
            setLoading(false)

            // Still notify callbacks
            if (onConnectionChange) {
              parsedConnections.forEach((conn: Connection) => {
                onConnectionChange(conn.platform, conn.connected)
              })
            }
            return
          } catch (err) {
            console.log('⚠️ Failed to parse cached connections, will refresh')
          }
        }
      }
    }

    try {
      const supabase = createClient()

      // TEMPORARY FIX: Skip connectivity test and go straight to queries
      console.log('🔍 MarketplaceConnections: Running direct queries...')

      // Run all queries in parallel with simpler approach
      const [amazonResult, shopifyResult, ebayResult] = await Promise.all([
        // Amazon query
        supabase
          .from('amazon_connections')
          .select('access_token, seller_id, marketplace_id, created_at')
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .then((result: any) => ({
            success: !result.error,
            data: result.data?.[0] || null,
            error: result.error,
          }))
          .catch((err: any) => ({
            success: false,
            data: null,
            error: err,
          })),

        // Shopify query - more permissive (no status filter)
        supabase
          .from('platform_connections')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('platform', 'shopify')
          .then((result: any) => ({
            success: !result.error,
            data: result.data?.[0] || null,
            error: result.error,
          }))
          .catch((err: any) => ({
            success: false,
            data: null,
            error: err,
          })),

        // eBay query
        supabase
          .from('ebay_connections')
          .select('access_token, seller_info, created_at')
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .then((result: any) => ({
            success: !result.error,
            data: result.data?.[0] || null,
            error: result.error,
          }))
          .catch((err: any) => ({
            success: false,
            data: null,
            error: err,
          })),
      ])

      console.log('✅ All queries completed')
      console.log('🔍 Amazon result:', amazonResult)
      console.log('🔍 Shopify result:', shopifyResult)
      console.log('🔍 eBay result:', ebayResult)

      // 🔧 FALLBACK: If Shopify main query failed, try alternative queries
      let shopifyData = shopifyResult.data
      if (!shopifyData && shopifyResult.error) {
        console.log('🔄 Trying Shopify fallback query with status=connected...')
        const fallbackResult = await supabase
          .from('platform_connections')
          .select('*')
          .eq('user_id', currentUserId)
          .eq('platform', 'shopify')
          .eq('status', 'connected')
          .single()

        if (!fallbackResult.error && fallbackResult.data) {
          shopifyData = fallbackResult.data
          console.log('✅ Shopify fallback query successful:', shopifyData)
        }
      }

      // Process results
      const amazonData = amazonResult.data
      const ebayData = ebayResult.data

      console.log('🔍 Final connection status:')
      console.log('🔍 Amazon connected:', !!amazonData?.access_token)
      console.log('🔍 Shopify connected:', !!shopifyData)
      console.log('🔍 eBay connected:', !!ebayData?.access_token)

      // 🔧 COMPLETE connection objects
      const updatedConnections = [
        {
          platform: 'amazon',
          connected: !!amazonData?.access_token,
          storeInfo: {
            seller_id: amazonData?.seller_id,
            marketplace_id: amazonData?.marketplace_id,
          },
          connectedAt: amazonData?.created_at,
        },
        {
          platform: 'shopify',
          connected: !!shopifyData,
          storeInfo: {
            shop_name:
              shopifyData?.platform_store_info?.shop_name ||
              shopifyData?.shop_name ||
              'Shopify Store',
            shop_domain:
              shopifyData?.platform_store_info?.shop_domain ||
              shopifyData?.shop_domain ||
              'store.myshopify.com',
          },
          connectedAt: shopifyData?.created_at,
        },
        {
          platform: 'ebay',
          connected: !!ebayData?.access_token,
          storeInfo: {
            seller_id: ebayData?.seller_info?.seller_id || 'Connected',
            environment: process.env.EBAY_ENVIRONMENT || 'sandbox',
          },
          connectedAt: ebayData?.created_at,
        },
      ]

      setConnections(updatedConnections)

      // 🔧 CACHE the fresh connections for 5 minutes
      if (typeof window !== 'undefined') {
        const cacheKey = `connections_${currentUserId}`
        const cacheTimestampKey = `connections_timestamp_${currentUserId}`
        localStorage.setItem(cacheKey, JSON.stringify(updatedConnections))
        localStorage.setItem(cacheTimestampKey, Date.now().toString())
      }

      console.log('✅ Marketplace connections loaded and cached successfully')

      // 🔧 PRESERVE callback functionality
      if (onConnectionChange) {
        onConnectionChange('amazon', !!amazonData?.access_token)
        onConnectionChange('shopify', !!shopifyData)
        onConnectionChange('ebay', !!ebayData?.access_token)
      }
    } catch (err) {
      const error = err as Error
      console.error('❌ Error loading connections:', error)

      // 🔧 GRACEFUL FALLBACK - Check URL for OAuth completion
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const shopifyConnected = urlParams.get('shopify') === 'connected'
        const amazonConnected = urlParams.get('amazon') === 'connected'
        const ebayConnected = urlParams.get('ebay') === 'connected'

        if (shopifyConnected || amazonConnected || ebayConnected) {
          console.log(
            '🔄 OAuth detected in URL, assuming connection successful'
          )

          const fallbackConnections = connections.map((conn) => ({
            ...conn,
            connected:
              (conn.platform === 'amazon' && amazonConnected) ||
              (conn.platform === 'shopify' && shopifyConnected) ||
              (conn.platform === 'ebay' && ebayConnected) ||
              conn.connected,
          }))

          setConnections(fallbackConnections)

          if (onConnectionChange) {
            fallbackConnections.forEach((conn) => {
              onConnectionChange(conn.platform, conn.connected)
            })
          }

          console.log('✅ Using OAuth URL fallback for connections')
          return
        }
      }

      // Keep existing cached state instead of resetting to disconnected
      console.log('💾 Keeping existing connection state due to error')
      setError('Unable to refresh connections. Using cached state.')
    } finally {
      setLoading(false)
      console.log('✅ MarketplaceConnections loading completed')
    }
  }

  // 🔧 SIMPLE retry function
  const handleRetry = () => {
    setError(null)
    setLoading(true)
    loadConnections()
  }

  // 🔧 PRESERVE original OAuth flows
  const handleConnect = (platform: string) => {
    if (!currentUserId) {
      alert('Please log in to connect your account')
      return
    }

    if (platform === 'amazon') {
      window.location.href = `/api/amazon/oauth?user_id=${currentUserId}`
    } else if (platform === 'shopify') {
      window.location.href = `/api/shopify/oauth?user_id=${currentUserId}`
    } else if (platform === 'ebay') {
      window.location.href = `/api/ebay/oauth?user_id=${currentUserId}`
    }
  }

  // 🔧 PRESERVE original disconnect functionality
  const handleDisconnect = async (platform: string) => {
    if (!currentUserId) return

    try {
      const response = await fetch(`/api/${platform}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      })

      if (response.ok) {
        loadConnections()
      }
    } catch (err) {
      const error = err as Error
      console.error('Error disconnecting:', error.message)
    }
  }

  // 🔧 BRIEF loading state - max 3 seconds
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Marketplace Connections
                </h3>
                <p className="text-sm text-gray-600">
                  Checking connection status...
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-4">
            <Loader className="h-5 w-5 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading connections...</span>
          </div>
        </div>
      </div>
    )
  }

  const connectedCount = connections.filter((c) => c.connected).length
  const availableCount = connections.length

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Marketplace Connections
              </h3>
              <p className="text-sm text-gray-600">
                Secure OAuth authentication for direct publishing
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRetry}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Refresh connections"
            >
              <Settings className="h-4 w-4" />
            </button>
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              <span className="text-blue-700 text-sm font-medium">
                {connectedCount}/{availableCount} Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-700 text-sm">{error}</p>
            <button
              onClick={handleRetry}
              className="ml-auto text-yellow-700 hover:text-yellow-800 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Platform Cards */}
      <div className="p-6 space-y-4">
        {connections.map((connection) => {
          const isAmazon = connection.platform === 'amazon'
          const isShopify = connection.platform === 'shopify'
          const isEbay = connection.platform === 'ebay'

          return (
            <div
              key={connection.platform}
              className="flex items-center justify-between p-4 border rounded-lg transition-colors border-gray-200 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">
                  {isAmazon ? '📦' : isShopify ? '🛍️' : isEbay ? '🔨' : '🏪'}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isAmazon
                      ? 'Amazon Seller Central'
                      : isShopify
                        ? 'Shopify Store'
                        : isEbay
                          ? 'eBay Store'
                          : 'Marketplace'}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    {connection.connected ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-700 font-medium">
                          Connected
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-500">
                          Not Connected
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isAmazon
                      ? 'Professional instructions with optimized data'
                      : isShopify
                        ? 'Publish directly to your Shopify store'
                        : isEbay
                          ? "World's largest auction marketplace"
                          : ''}
                  </p>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {isAmazon ? (
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Step-by-step instructions
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Optimized product data
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Amazon-optimized format
                        </span>
                      </>
                    ) : isShopify ? (
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Direct store integration
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Real-time publishing
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Store management tools
                        </span>
                      </>
                    ) : isEbay ? (
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Auction & Buy-It-Now
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ 190M active buyers
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Lower seller fees
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2">
                {connection.connected ? (
                  <>
                    <button
                      onClick={() => {
                        if (isAmazon) {
                          window.open(
                            'https://sellercentral.amazon.com/',
                            '_blank'
                          )
                        } else if (
                          isShopify &&
                          connection.storeInfo?.shop_domain
                        ) {
                          window.open(
                            `https://${connection.storeInfo.shop_domain}/admin`,
                            '_blank'
                          )
                        } else if (isEbay) {
                          window.open('https://www.ebay.com/sh/ovw', '_blank')
                        }
                      }}
                      className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Manage
                    </button>
                    <button
                      onClick={() => handleDisconnect(connection.platform)}
                      className="px-3 py-2 text-sm text-red-600 hover:text-red-800 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnect(connection.platform)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors text-white ${
                      isAmazon
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : isShopify
                          ? 'bg-green-600 hover:bg-green-700'
                          : isEbay
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    Connect{' '}
                    {isAmazon
                      ? 'Amazon'
                      : isShopify
                        ? 'Shopify'
                        : isEbay
                          ? 'eBay'
                          : 'Platform'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Benefits section */}
      <div className="p-6 bg-blue-50 border-t border-blue-200">
        <h4 className="font-medium text-blue-900 mb-3 flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Why Connect Your Marketplaces?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-2">
            <Zap className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">Save Time</div>
              <div className="text-xs text-blue-700">
                No manual copy-pasting between platforms
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">
                Secure & Reliable
              </div>
              <div className="text-xs text-blue-700">
                OAuth authentication with auto-refresh
              </div>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-blue-900">
                Professional Results
              </div>
              <div className="text-xs text-blue-700">
                Optimized content and marketplace compliance
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for no connections */}
      {connectedCount === 0 && (
        <div className="p-4 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-yellow-800 text-sm font-medium">
              Connect at least one marketplace to start publishing your
              AI-generated content instantly!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
