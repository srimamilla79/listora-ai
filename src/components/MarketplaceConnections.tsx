// src/components/MarketplaceConnections.tsx - Updated with eBay/Etsy Coming Soon
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
      disabled: true,
      comingSoon: true,
    },
    {
      platform: 'etsy',
      connected: false,
      disabled: true,
      comingSoon: true,
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

      console.log(
        '🔍 MarketplaceConnections: Valid Amazon connection:',
        !!validAmazonConnection
      )
      console.log(
        '🔍 MarketplaceConnections: Valid Shopify connection:',
        !!validShopifyConnection
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
          connected: false,
          disabled: true,
          comingSoon: true,
        },
        {
          platform: 'etsy',
          connected: false,
          disabled: true,
          comingSoon: true,
        },
      ]

      setConnections(updatedConnections)
      console.log('✅ Marketplace connections loaded:', updatedConnections)

      // Notify parent components (only for active platforms)
      if (onConnectionChange) {
        onConnectionChange('amazon', !!validAmazonConnection?.access_token)
        onConnectionChange('shopify', !!validShopifyConnection)
        onConnectionChange('ebay', false) // Always false for coming soon
        onConnectionChange('etsy', false) // Always false for coming soon
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Error loading connections:', error)

      // Graceful fallback
      setConnections([
        { platform: 'amazon', connected: false },
        { platform: 'shopify', connected: false },
        {
          platform: 'ebay',
          connected: false,
          disabled: true,
          comingSoon: true,
        },
        {
          platform: 'etsy',
          connected: false,
          disabled: true,
          comingSoon: true,
        },
      ])

      if (onConnectionChange) {
        onConnectionChange('amazon', false)
        onConnectionChange('shopify', false)
        onConnectionChange('ebay', false)
        onConnectionChange('etsy', false)
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

    // Only allow connection for enabled platforms
    if (platform === 'ebay' || platform === 'etsy') {
      return // Do nothing for disabled platforms
    }

    // OAuth flows for enabled platforms
    if (platform === 'amazon') {
      window.location.href = `/api/amazon/oauth?user_id=${currentUserId}`
    } else if (platform === 'shopify') {
      window.location.href = `/api/shopify/oauth?user_id=${currentUserId}`
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
  const availableCount = connections.filter((c) => !c.disabled).length

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
              {connectedCount}/{availableCount} Connected
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
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                connection.disabled
                  ? 'border-gray-200 bg-gray-50 opacity-75'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
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
                    ) : connection.comingSoon ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm text-yellow-700 font-medium">
                          Coming Soon
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
                          : isEtsy
                            ? 'Perfect for handmade, vintage & creative products'
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
                    ) : isEbay && connection.comingSoon ? (
                      <>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ Auction & Buy-It-Now
                        </span>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ 190M active buyers
                        </span>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ Lower seller fees
                        </span>
                      </>
                    ) : isEtsy && connection.comingSoon ? (
                      <>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ Handmade & vintage focus
                        </span>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ 96M active buyers
                        </span>
                        <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full text-xs">
                          ⏳ Higher profit margins
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
                ) : connection.comingSoon ? (
                  <div className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg cursor-default border border-yellow-300">
                    Coming Soon
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(connection.platform)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors text-white ${
                      isAmazon
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : isShopify
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    Connect{' '}
                    {isAmazon ? 'Amazon' : isShopify ? 'Shopify' : 'Platform'}
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
                Professional Results
              </div>
              <div className="text-xs text-blue-700">
                Optimized content and marketplace compliance
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
