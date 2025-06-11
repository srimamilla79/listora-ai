// =============================================================================
// FILE 5: src/components/AmazonOAuthButton.tsx - OAuth Connection UI
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ExternalLink, Loader, CheckCircle, AlertTriangle } from 'lucide-react'

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

  const supabase = createClient()

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [userId])

  const checkConnectionStatus = async () => {
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

  if (isConnected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                Amazon Account Connected
              </p>
              <p className="text-sm text-green-700">
                Seller ID: {connectionData?.seller_id}
              </p>
              <p className="text-sm text-green-600">
                Connected:{' '}
                {new Date(connectionData?.connected_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Amazon Seller Account
        </h3>
        <p className="text-gray-600 mb-4">
          Connect your Amazon seller account to publish products directly from
          Listora AI
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Amazon Account
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          You'll be redirected to Amazon to authorize the connection
        </p>
      </div>
    </div>
  )
}
