// src/components/MarketplaceConnections.tsx - Complete with eBay + Etsy Support
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
  const [connections, setConnections] = useState<Connection[]>([
    {
      platform: 'amazon',
      connected: false,
    },
    {
      platform: 'shopify',
      connected: false,
    },
    {
      platform: 'ebay',
      connected: false,
    },
    {
      platform: 'etsy',
      connected: false,
    },
  ])
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

  // Load connections when user is available
  useEffect(() => {
    if (currentUserId) {
      loadConnections()
    } else {
      setLoading(false)
    }
  }, [currentUserId])

  const loadConnections = async () => {
    if (!currentUserId) {
      setLoading(false)
      return
    }

    console.log('🔗 Loading marketplace connections for user:', currentUserId)
    setLoading(true)
    setError(null)

    const timeoutId = setTimeout(() => {
      console.log('⏰ Database query timeout - using fallback')
      setLoading(false)
      setError('Database query timed out. Showing default state.')
    }, 5000)

    try {
      const supabase = createClient()

      // Query Amazon connections
      console.log('🔍 MarketplaceConnections: Querying Amazon connections...')
      const { data: amazonConnections, error: amazonError } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')

      if (amazonError) {
        console.error(
          '❌ MarketplaceConnections: Amazon connection error:',
          amazonError
        )
      } else {
        console.log(
          '✅ MarketplaceConnections: Amazon query successful, found:',
          amazonConnections?.length || 0,
          'connections'
        )
      }

      // Query Shopify connections
      console.log('🔍 MarketplaceConnections: Querying Shopify connections...')
      const { data: shopifyConnections, error: shopifyError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('platform', 'shopify')
        .eq('status', 'connected')

      if (shopifyError) {
        console.error(
          '❌ MarketplaceConnections: Shopify connection error:',
          shopifyError
        )
      } else {
        console.log(
          '✅ MarketplaceConnections: Shopify query successful, found:',
          shopifyConnections?.length || 0,
          'connections'
        )
      }

      // Query eBay connections
      console.log('🔍 MarketplaceConnections: Querying eBay connections...')
      const { data: ebayConnections, error: ebayError } = await supabase
        .from('ebay_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')

      if (ebayError) {
        console.error(
          '❌ MarketplaceConnections: eBay connection error:',
          ebayError
        )
      } else {
        console.log(
          '✅ MarketplaceConnections: eBay query successful, found:',
          ebayConnections?.length || 0,
          'connections'
        )
      }

      // ✅ NEW: Query Etsy connections
      console.log('🔍 MarketplaceConnections: Querying Etsy connections...')
      const { data: etsyConnections, error: etsyError } = await supabase
        .from('etsy_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')

      if (etsyError) {
        console.error(
          '❌ MarketplaceConnections: Etsy connection error:',
          etsyError
        )
      } else {
        console.log(
          '✅ MarketplaceConnections: Etsy query successful, found:',
          etsyConnections?.length || 0,
          'connections'
        )
      }

      clearTimeout(timeoutId)

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
        '🔍 MarketplaceConnections: Valid Amazon connection:',
        !!validAmazonConnection
      )
      console.log(
        '🔍 MarketplaceConnections: Valid Shopify connection:',
        !!validShopifyConnection
      )
      console.log(
        '🔍 MarketplaceConnections: Valid eBay connection:',
        !!validEbayConnection
      )
      console.log(
        '🔍 MarketplaceConnections: Valid Etsy connection:',
        !!validEtsyConnection
      )

      const updatedConnections = [
        {
          platform: 'amazon',
          connected: !!validAmazonConnection?.access_token,
          storeInfo: {
            seller_id: validAmazonConnection?.seller_id,
            marketplace_id: validAmazonConnection?.marketplace_id,
          },
          connectedAt: validAmazonConnection?.created_at,
        },
        {
          platform: 'shopify',
          connected: !!validShopifyConnection,
          storeInfo: {
            shop_name: validShopifyConnection?.shop_name,
            shop_domain: validShopifyConnection?.shop_domain,
          },
          connectedAt: validShopifyConnection?.created_at,
        },
        {
          platform: 'ebay',
          connected: !!validEbayConnection?.access_token,
          storeInfo: {
            seller_id:
              validEbayConnection?.seller_info?.seller_id || 'Connected',
            environment: process.env.EBAY_ENVIRONMENT || 'sandbox',
          },
          connectedAt: validEbayConnection?.created_at,
        },
        // ✅ NEW: Add Etsy connection
        {
          platform: 'etsy',
          connected: !!validEtsyConnection?.access_token,
          storeInfo: {
            shop_name: validEtsyConnection?.shop_info?.shop_name || 'Connected',
            shop_id: validEtsyConnection?.shop_info?.shop_id,
          },
          connectedAt: validEtsyConnection?.created_at,
        },
      ]

      setConnections(updatedConnections)
      console.log('✅ Marketplace connections loaded:', updatedConnections)

      // Notify parent components
      if (onConnectionChange) {
        onConnectionChange('amazon', !!validAmazonConnection?.access_token)
        onConnectionChange('shopify', !!validShopifyConnection)
        onConnectionChange('ebay', !!validEbayConnection?.access_token)
        onConnectionChange('etsy', !!validEtsyConnection?.access_token) // ✅ NEW
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Error loading connections:', error)

      // Graceful fallback
      setConnections([
        { platform: 'amazon', connected: false },
        { platform: 'shopify', connected: false },
        { platform: 'ebay', connected: false },
        { platform: 'etsy', connected: false }, // ✅ NEW
      ])

      if (onConnectionChange) {
        onConnectionChange('amazon', false)
        onConnectionChange('shopify', false)
        onConnectionChange('ebay', false)
        onConnectionChange('etsy', false) // ✅ NEW
      }
    } finally {
      setLoading(false)
      console.log('✅ MarketplaceConnections loading completed')
    }
  }

  const handleConnect = (platform: string) => {
    if (!currentUserId) {
      alert('Please log in to connect your account')
      return
    }

    // OAuth flows for all platforms
    if (platform === 'amazon') {
      window.location.href = `/api/amazon/oauth?user_id=${currentUserId}`
    } else if (platform === 'shopify') {
      window.location.href = `/api/shopify/oauth?user_id=${currentUserId}`
    } else if (platform === 'ebay') {
      window.location.href = `/api/ebay/oauth?user_id=${currentUserId}`
    } else if (platform === 'etsy') {
      // ✅ NEW: Etsy OAuth redirect
      window.location.href = `/api/etsy/oauth?user_id=${currentUserId}`
    }
  }

  const handleDisconnect = async (platform: string) => {
    if (!currentUserId) return

    try {
      if (platform === 'amazon') {
        const response = await fetch('/api/amazon/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          loadConnections()
        }
      } else if (platform === 'shopify') {
        const response = await fetch('/api/shopify/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          loadConnections()
        }
      } else if (platform === 'ebay') {
        const response = await fetch('/api/ebay/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          loadConnections()
        }
      } else if (platform === 'etsy') {
        // ✅ NEW: Etsy disconnect endpoint
        const response = await fetch('/api/etsy/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          loadConnections()
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

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
                  Secure OAuth authentication for direct publishing
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
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            <span className="text-blue-700 text-sm font-medium">
              {connectedCount}/4 Connected
            </span>
          </div>
        </div>
      </div>

      {/* Platform Connection Cards */}
      <div className="p-6 space-y-4">
        {connections.map((connection) => {
          const isAmazon = connection.platform === 'amazon'
          const isShopify = connection.platform === 'shopify'
          const isEbay = connection.platform === 'ebay'
          const isEtsy = connection.platform === 'etsy'

          return (
            <div
              key={connection.platform}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">
                  {isAmazon
                    ? '📦'
                    : isShopify
                      ? '🛍️'
                      : isEbay
                        ? '🔨'
                        : isEtsy
                          ? '🎨'
                          : '🏪'}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isAmazon
                      ? 'Amazon Seller Central'
                      : isShopify
                        ? 'Shopify Store'
                        : isEbay
                          ? 'eBay Store'
                          : isEtsy
                            ? 'Etsy Shop'
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
                      ? 'Sell to millions of Amazon customers worldwide'
                      : isShopify
                        ? 'Publish directly to your Shopify store'
                        : isEbay
                          ? "List on the world's largest auction marketplace"
                          : isEtsy
                            ? 'Perfect for handmade, vintage & creative products'
                            : ''}
                  </p>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {isAmazon ? (
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Instant product publishing
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Automatic inventory sync
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Global marketplace reach
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
                    ) : isEtsy ? (
                      // ✅ NEW: Etsy feature tags
                      <>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Handmade & vintage focus
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ 96M active buyers
                        </span>
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                          ✓ Higher profit margins
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

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
                        } else if (isEtsy) {
                          // ✅ NEW: Etsy shop manager link
                          window.open(
                            'https://www.etsy.com/your/shops/me',
                            '_blank'
                          )
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
                            : isEtsy
                              ? 'bg-purple-600 hover:bg-purple-700'
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
                          : isEtsy
                            ? 'Etsy'
                            : 'Platform'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Benefits Section */}
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
                Real-time Publishing
              </div>
              <div className="text-xs text-blue-700">
                Instant product updates and status tracking
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning when no connections */}
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
