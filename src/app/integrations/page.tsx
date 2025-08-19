'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const connected = searchParams.get('connected')
  const sellerId = searchParams.get('sellerId')

  useEffect(() => {
    if (connected === 'walmart') {
      // Show success message or redirect somewhere else
      alert(`Walmart connected successfully! Seller ID: ${sellerId}`)
      // Redirect to dashboard or wherever you want
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }, [connected, sellerId, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          {connected === 'walmart'
            ? 'Walmart Connected Successfully!'
            : 'Integrations'}
        </h1>
        {sellerId && <p>Seller ID: {sellerId}</p>}
      </div>
    </div>
  )
}
