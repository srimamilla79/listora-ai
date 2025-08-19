'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connected = searchParams.get('connected')
  const sellerId = searchParams.get('sellerId')

  useEffect(() => {
    if (connected === 'walmart') {
      // Show success message
      console.log(`Walmart connected successfully! Seller ID: ${sellerId}`)
    }
  }, [connected, sellerId])

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Marketplace Integrations</h1>

      {connected === 'walmart' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="text-green-800 font-semibold">
            ✅ Walmart Connected Successfully!
          </h2>
          <p className="text-green-700">Seller ID: {sellerId}</p>
        </div>
      )}

      {/* List all integrations */}
      <div className="grid gap-4">
        {/* Walmart card */}
        <div className="border rounded-lg p-6">
          <h3 className="text-xl font-semibold">Walmart Marketplace</h3>
          <p className="text-green-600">Connected</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  )
}
