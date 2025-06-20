// src/components/MarketplaceConnections.tsx - Simple Fallback Version
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
  ])
  const [loading, setLoading] = useState(true) // Start with loading true
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
      // If no user, stop loading and show default state
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

    // ✅ Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('⏰ Database query timeout - using fallback')
      setLoading(false)
      setError('Database query timed out. Showing default state.')
    }, 5000) // 5 second timeout

    try {
      // ✅ Use API endpoint instead of direct Supabase queries
      const response = await fetch('/api/marketplace-connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies for auth
        body: JSON.stringify({
          userId: currentUserId,
        }),
      })

      clearTimeout(timeoutId) // Clear timeout if request completes

      if (!response.ok) {
        console.log('⚠️ API call failed, using fallback state')
        // Don't throw error, just use default state
        setConnections([
          { platform: 'amazon', connected: false },
          { platform: 'shopify', connected: false },
        ])

        // Notify parent of default state
        if (onConnectionChange) {
          onConnectionChange('amazon', false)
          onConnectionChange('shopify', false)
        }

        setLoading(false)
        return
      }

      const data = await response.json()

      const updatedConnections = [
        {
          platform: 'amazon',
          connected: data.amazon?.connected || false,
          storeInfo: data.amazon?.storeInfo,
          connectedAt: data.amazon?.connectedAt,
        },
        {
          platform: 'shopify',
          connected: data.shopify?.connected || false,
          storeInfo: data.shopify?.storeInfo,
          connectedAt: data.shopify?.connectedAt,
        },
      ]

      setConnections(updatedConnections)
      console.log('✅ Marketplace connections loaded:', updatedConnections)

      // Notify parent components
      if (onConnectionChange) {
        onConnectionChange('amazon', data.amazon?.connected || false)
        onConnectionChange('shopify', data.shopify?.connected || false)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('❌ Error loading connections:', error)

      // ✅ Graceful fallback - don't show error, just use default state
      setConnections([
        { platform: 'amazon', connected: false },
        { platform: 'shopify', connected: false },
      ])

      // Notify parent of default state
      if (onConnectionChange) {
        onConnectionChange('amazon', false)
        onConnectionChange('shopify', false)
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

    // Use existing OAuth flows
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
          loadConnections() // Refresh connections
        }
      } else if (platform === 'shopify') {
        // Call shopify disconnect endpoint
        const response = await fetch('/api/shopify/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUserId }),
        })

        if (response.ok) {
          loadConnections() // Refresh connections
        }
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
    }
  }

  // ✅ Show loading only briefly
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
      {/* Header - Matches your screenshot */}
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
              {connectedCount}/2 Connected
            </span>
          </div>
        </div>
      </div>

      {/* Platform Connection Cards - Clean Design Like Screenshot */}
      <div className="p-6 space-y-4">
        {connections.map((connection) => {
          const isAmazon = connection.platform === 'amazon'
          const isShopify = connection.platform === 'shopify'

          return (
            <div
              key={connection.platform}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{isAmazon ? '📦' : '🛍️'}</div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {isAmazon ? 'Amazon Seller Central' : 'Shopify Store'}
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
                      : 'Publish directly to your Shopify store'}
                  </p>

                  {/* Feature tags like in screenshot */}
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
                    ) : (
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
                    )}
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
                ) : (
                  <button
                    onClick={() => handleConnect(connection.platform)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors text-white ${
                      isAmazon
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Connect {isAmazon ? 'Amazon' : 'Shopify'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Benefits Section - Matches screenshot design */}
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
                OAuth 2.0 authentication with auto-refresh
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

      {/* Warning when no connections - like in screenshot */}
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
