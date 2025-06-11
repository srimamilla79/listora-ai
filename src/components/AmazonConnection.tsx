// src/components/AmazonConnection.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ExternalLink,
  Loader,
  CheckCircle,
  AlertTriangle,
  Package,
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
      <div className="space-y-4 p-6 border border-gray-200 rounded-lg">
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
      <div className="space-y-4 p-6 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Loader className="w-4 h-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">
            Loading user information...
          </span>
        </div>
      </div>
    )
  }

  // Connected state
  if (isConnected && connectionData) {
    return (
      <div className="space-y-4 p-6 border border-green-200 rounded-lg bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                Amazon Account Connected
              </h3>
              <p className="text-sm text-green-700">
                Your Amazon seller account is connected via OAuth
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            Connection Details
          </h4>
          <div className="space-y-1 text-sm text-green-700">
            <p>
              <strong>Seller ID:</strong> {connectionData.seller_id}
            </p>
            <p>
              <strong>Marketplace:</strong> {connectionData.marketplace_id}
            </p>
            <p>
              <strong>Connected:</strong>{' '}
              {new Date(connectionData.connected_at).toLocaleDateString()}
            </p>
            <p>
              <strong>Status:</strong> OAuth Authenticated ✅
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-green-700">
            <strong>✅ You can now:</strong>
          </div>
          <ul className="text-sm text-green-600 space-y-1 list-disc list-inside">
            <li>Publish products directly to YOUR Amazon seller account</li>
            <li>Upload images automatically with OAuth security</li>
            <li>
              Manage your listings through the Published Products dashboard
            </li>
            <li>Track performance and sync data from Amazon</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

  // Not connected state
  return (
    <div className="space-y-4 p-6 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Package className="h-6 w-6 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Connect Amazon Seller Account
            </h3>
            <p className="text-sm text-gray-600">
              Connect your Amazon seller account using secure OAuth
              authentication
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">Not Connected</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-700">
          <strong>🚀 OAuth Benefits:</strong>
        </div>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Secure authentication through Amazon's official OAuth system</li>
          <li>Publish products directly to YOUR Amazon seller account</li>
          <li>Automatic token refresh - no re-authentication needed</li>
          <li>Full control - you can revoke access anytime</li>
          <li>Industry-standard security with encrypted token storage</li>
        </ul>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Secure OAuth Connection
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                You'll be redirected to Amazon to securely authorize the
                connection. We use Amazon's official Selling Partner API with
                OAuth 2.0. Your credentials are never stored - only secure
                access tokens.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              <span>Connect Amazon Account with OAuth</span>
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          You'll be redirected to Amazon to authorize the connection
        </p>
      </div>
    </div>
  )
}
