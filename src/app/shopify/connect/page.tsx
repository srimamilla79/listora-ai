// src/app/shopify/connect/page.tsx
'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ShopifyConnectPage() {
  const [shopDomain, setShopDomain] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  const state = searchParams?.get('state')
  const userId = searchParams?.get('user_id')

  const handleConnect = () => {
    if (!shopDomain.trim()) {
      alert('Please enter your Shopify store domain')
      return
    }

    setIsConnecting(true)

    // Clean up domain (remove https://, .myshopify.com if present)
    let cleanDomain = shopDomain
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    if (!cleanDomain.includes('.')) {
      cleanDomain = `${cleanDomain}.myshopify.com`
    }

    // Build Shopify OAuth URL
    const scopes = 'write_products,read_products,write_inventory,read_inventory'
    const redirectUri = `${window.location.origin}/api/shopify/callback`
    const shopifyAuthUrl = `https://${cleanDomain}/admin/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    // Redirect to Shopify
    window.location.href = shopifyAuthUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🛍️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Your Shopify Store
          </h1>
          <p className="text-gray-600">
            Enter your Shopify store domain to connect with Listora AI
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Store Domain
            </label>
            <input
              type="text"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="your-store.myshopify.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              disabled={isConnecting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter just "your-store" if using .myshopify.com domain
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting || !shopDomain.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isConnecting ? 'Connecting...' : 'Connect to Shopify'}
          </button>

          <button
            onClick={() => router.push('/generate')}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>✓ Secure OAuth connection</p>
          <p>✓ We only request necessary permissions</p>
          <p>✓ You can disconnect anytime</p>
        </div>
      </div>
    </div>
  )
}
