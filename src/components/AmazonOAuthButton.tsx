// src/components/AmazonOAuthButton.tsx - Light & Clean Design
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ExternalLink,
  Loader,
  CheckCircle,
  AlertTriangle,
  Shield,
  Package,
  Calendar,
  Lock,
  Zap,
} from 'lucide-react'

interface AmazonOAuthButtonProps {
  userId: string
  onConnectionChange?: (connected: boolean) => void
}

export default function AmazonOAuthButton({
  userId,
  onConnectionChange,
}: AmazonOAuthButtonProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionData, setConnectionData] = useState<any>(null)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Check connection status on mount
  useEffect(() => {
    if (userId && supabase) {
      checkConnectionStatus()
    }
  }, [userId, supabase])

  const checkConnectionStatus = async () => {
    if (!supabase) return

    try {
      const response = await fetch(`/api/amazon/status?user_id=${userId}`)
      const data = await response.json()

      setIsConnected(data.connected)
      setConnectionData(data.connection)
      onConnectionChange?.(data.connected)
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const handleConnect = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/amazon/oauth?user_id=${userId}`
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      setError('Failed to connect to Amazon')
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!supabase) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/amazon/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        setIsConnected(false)
        setConnectionData(null)
        onConnectionChange?.(false)
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting:', error)
      setError('Failed to disconnect from Amazon')
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  // Connected State - Light Success Design
  if (isConnected) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Amazon Connected
              </h3>
              <p className="text-green-600 font-medium">
                Ready to publish products
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-700 text-sm font-medium">Active</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-gray-600" />
              <div>
                <span className="text-sm text-gray-500">Seller ID:</span>
                <p className="font-medium text-gray-900">
                  {connectionData?.seller_id}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <div>
                <span className="text-sm text-gray-500">Connected:</span>
                <p className="font-medium text-gray-900">
                  {new Date(connectionData?.connected_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-center">
            <Zap className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-blue-900 font-medium text-sm">
              Instant Publishing
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-center">
            <Lock className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-green-900 font-medium text-sm">Secure OAuth</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-center">
            <Shield className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-purple-900 font-medium text-sm">Auto-Refresh</p>
          </div>
        </div>

        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="w-full px-4 py-3 text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Disconnecting...</span>
            </div>
          ) : (
            'Disconnect Amazon Account'
          )}
        </button>
      </div>
    )
  }

  // Not Connected State - Light Call-to-Action Design
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 text-orange-600" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Connect Amazon Seller Account
        </h3>
        <p className="text-gray-600 mb-6">
          Link your Amazon seller account to publish products directly from
          Listora AI with our secure OAuth integration
        </p>

        {/* Security & Benefits */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-left">
              <h4 className="font-medium text-blue-900 mb-1">
                Enterprise Security
              </h4>
              <p className="text-blue-700 text-sm">
                Secure OAuth 2.0 authentication with Amazon's official Selling
                Partner API. Your credentials are never stored - only secure
                tokens.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <Zap className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <h4 className="font-medium text-green-900 mb-1">
              One-Click Publishing
            </h4>
            <p className="text-green-700 text-sm">
              Transform AI content into live Amazon listings instantly
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <Lock className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <h4 className="font-medium text-purple-900 mb-1">
              Auto Token Refresh
            </h4>
            <p className="text-purple-700 text-sm">
              No re-authentication needed - seamless experience
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">Connection Failed</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {isLoading ? (
            <>
              <Loader className="h-5 w-5 mr-2 animate-spin" />
              Connecting to Amazon...
            </>
          ) : (
            <>
              <ExternalLink className="h-5 w-5 mr-2" />
              Connect Amazon Account with OAuth
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Secure redirect</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>No credentials stored</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Instant setup</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          You'll be securely redirected to Amazon to authorize the connection
        </p>
      </div>
    </div>
  )
}
