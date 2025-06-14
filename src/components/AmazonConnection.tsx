// src/components/AmazonConnection.tsx - Light & Clean Design
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ExternalLink,
  Loader,
  CheckCircle,
  AlertTriangle,
  Package,
  Shield,
  Zap,
  Globe,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react'

interface AmazonConnectionProps {
  userId?: string
  onConnectionChange?: (connected: boolean) => void
}

export default function AmazonConnection({
  userId,
  onConnectionChange,
}: AmazonConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionData, setConnectionData] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    userId || null
  )

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Get current user if not provided as prop
  useEffect(() => {
    if (!currentUserId && supabase) {
      const getCurrentUser = async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUserId(session.user.id)
        }
      }
      getCurrentUser()
    }
  }, [currentUserId, supabase])

  // Check OAuth connection status
  useEffect(() => {
    if (currentUserId && supabase) {
      checkConnectionStatus()
    }
  }, [currentUserId, supabase])

  const checkConnectionStatus = async () => {
    if (!currentUserId || !supabase) return

    try {
      console.log('🔍 Checking OAuth Amazon status for user:', currentUserId)

      // Check if user has OAuth tokens in database
      const { data: connection, error } = await supabase
        .from('amazon_connections')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('status', 'active')
        .not('access_token', 'is', null) // Must have OAuth tokens
        .single()

      const connected = !error && !!connection?.access_token

      console.log('✅ OAuth connection status:', {
        connected,
        hasTokens: !!connection?.access_token,
      })

      setIsConnected(connected)
      setConnectionData(connection)
      onConnectionChange?.(connected)
    } catch (error) {
      console.error('Error checking OAuth connection:', error)
      setIsConnected(false)
    }
  }

  const handleConnect = async () => {
    if (!currentUserId) {
      setError('Please log in to connect your Amazon account')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('🔗 Starting OAuth flow for user:', currentUserId)

      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/amazon/oauth?user_id=${currentUserId}`
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      setError('Failed to connect to Amazon')
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!currentUserId || !supabase) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/amazon/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
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
        <div className="flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">
            Loading connection status...
          </span>
        </div>
      </div>
    )
  }

  // Loading state while getting user ID
  if (!currentUserId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">
            Loading user information...
          </span>
        </div>
      </div>
    )
  }

  // Connected state - LIGHT SUCCESS DESIGN
  if (isConnected && connectionData) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-green-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Amazon Account Connected
              </h3>
              <p className="text-green-600 font-medium">
                Ready to publish products directly
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-700 text-sm font-medium">Active</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Shield className="h-4 w-4 mr-2 text-gray-600" />
            Connection Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">Seller ID:</span>
              <p className="font-medium text-gray-900">
                {connectionData.seller_id}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Marketplace:</span>
              <p className="font-medium text-gray-900">
                {connectionData.marketplace_id}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Connected:</span>
              <p className="font-medium text-gray-900">
                {new Date(connectionData.connected_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Security:</span>
              <div className="flex items-center space-x-1">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900">OAuth Secured</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                Instant Publishing
              </span>
            </div>
            <p className="text-sm text-blue-700">Direct to your account</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center space-x-2 mb-2">
              <Globe className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Global Access</span>
            </div>
            <p className="text-sm text-purple-700">All marketplaces</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Auto-Refresh</span>
            </div>
            <p className="text-sm text-orange-700">No re-authentication</p>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 mb-6 border border-green-100">
          <h4 className="font-medium text-green-900 mb-3">
            Available Features
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Instant product publishing
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Automatic image upload
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Real-time status tracking
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">
                Secure token management
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

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

  // Not connected state - LIGHT CALL-TO-ACTION
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Connect Amazon Seller Account
            </h3>
            <p className="text-gray-600">
              Secure OAuth authentication for direct publishing
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-gray-600 text-sm font-medium">
            Not Connected
          </span>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              Enterprise-Grade Security
            </h4>
            <p className="text-blue-700 text-sm">
              We use Amazon's official Selling Partner API with OAuth 2.0. Your
              credentials are never stored - only secure tokens that you
              control.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">
              Instant Publishing
            </span>
          </div>
          <p className="text-sm text-green-700">One-click product creation</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-900">Auto-Refresh</span>
          </div>
          <p className="text-sm text-orange-700">No re-authentication needed</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 mb-3">What You'll Get</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              Direct account publishing
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              Automatic image optimization
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">
              Real-time status updates
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-gray-700">Performance analytics</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
      >
        {isLoading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <ExternalLink className="w-5 h-5" />
            <span>Connect Amazon Account with OAuth</span>
          </>
        )}
      </button>

      <p className="text-gray-500 text-center mt-3 text-sm">
        Secure redirect to Amazon for authorization
      </p>
    </div>
  )
}
