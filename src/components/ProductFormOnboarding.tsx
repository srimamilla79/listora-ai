// src/components/ProductFormOnboarding.tsx
import { useEffect, useState } from 'react'
import { X, HelpCircle } from 'lucide-react'

export function ProductFormOnboarding({
  children,
}: {
  children: React.ReactNode
}) {
  const [showTips, setShowTips] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(false)

  useEffect(() => {
    // Check if first time user
    const hasVisited = localStorage.getItem('hasVisitedBefore')
    if (!hasVisited) {
      setIsFirstTime(true)
      setShowTips(true)
      localStorage.setItem('hasVisitedBefore', 'true')
    }
  }, [])

  if (!isFirstTime) return <>{children}</>

  return (
    <div className="relative">
      {/* Simple Welcome Banner */}
      {showTips && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-blue-900">
                👋 Welcome! Here's how to get started:
              </h3>
              <ol className="mt-2 space-y-1 text-sm text-blue-700">
                <li>
                  1️⃣ Click "Start Voice Input" to describe your product in ANY
                  language
                </li>
                <li>2️⃣ Or type your product name and features manually</li>
                <li>3️⃣ Upload product images (optional but recommended)</li>
                <li>4️⃣ Click "Generate" to create your content!</li>
              </ol>
              <p className="mt-2 text-xs text-blue-600">
                💡 Tip: Voice input is 3x faster than typing!
              </p>
            </div>
            <button
              onClick={() => setShowTips(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {children}

      {/* Simple Help Button */}
      <button
        onClick={() => setShowTips(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 z-50"
        title="Show tips"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    </div>
  )
}
