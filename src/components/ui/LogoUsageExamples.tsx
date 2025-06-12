// src/components/ui/LogoUsageExamples.tsx
// This file shows you how to use the ListoraAILogo component in different contexts

import ListoraAILogo from './ListoraAILogo'

export default function LogoUsageExamples() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Listora AI Logo Usage Examples
      </h1>

      {/* Header Usage */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Header/Navigation Usage
        </h2>
        <div className="bg-white p-4 rounded-lg border">
          <ListoraAILogo size="md" showText={true} />
        </div>
      </div>

      {/* Different Sizes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Different Sizes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Small */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Small (sm)</h3>
            <ListoraAILogo size="sm" showText={true} />
            <p className="text-sm text-gray-600 mt-2">
              Perfect for: Mobile headers, compact spaces
            </p>
          </div>

          {/* Medium */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Medium (md)</h3>
            <ListoraAILogo size="md" showText={true} />
            <p className="text-sm text-gray-600 mt-2">
              Perfect for: Desktop headers, main navigation
            </p>
          </div>

          {/* Large */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Large (lg)</h3>
            <ListoraAILogo size="lg" showText={true} />
            <p className="text-sm text-gray-600 mt-2">
              Perfect for: Landing pages, hero sections
            </p>
          </div>

          {/* Extra Large */}
          <div className="bg-white p-4 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Extra Large (xl)</h3>
            <ListoraAILogo size="xl" showText={true} />
            <p className="text-sm text-gray-600 mt-2">
              Perfect for: Marketing materials, presentations
            </p>
          </div>
        </div>
      </div>

      {/* Icon Only Versions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Icon-Only Versions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border text-center">
            <ListoraAILogo size="sm" showText={false} />
            <p className="text-xs text-gray-600 mt-2">App icon</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <ListoraAILogo size="md" showText={false} />
            <p className="text-xs text-gray-600 mt-2">Notification icon</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <ListoraAILogo size="lg" showText={false} />
            <p className="text-xs text-gray-600 mt-2">Loading spinner</p>
          </div>
          <div className="bg-white p-4 rounded-lg border text-center">
            <ListoraAILogo size="xl" showText={false} />
            <p className="text-xs text-gray-600 mt-2">Brand mark</p>
          </div>
        </div>
      </div>

      {/* Different Backgrounds */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          On Different Backgrounds
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Light Background */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-gray-900">
              Light Background
            </h3>
            <ListoraAILogo size="md" showText={true} />
          </div>

          {/* Dark Background */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-white">
              Dark Background
            </h3>
            <div className="filter invert">
              <ListoraAILogo size="md" showText={true} />
            </div>
          </div>

          {/* Gradient Background */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-lg">
            <h3 className="text-lg font-medium mb-4 text-white">
              Gradient Background
            </h3>
            <div className="bg-white/90 rounded-lg p-3 inline-block">
              <ListoraAILogo size="md" showText={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Business Card Layout */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Business Card Layout
        </h2>
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white max-w-md">
          <div className="mb-4">
            <div className="bg-white/90 rounded-lg p-3 inline-block">
              <ListoraAILogo size="sm" showText={true} />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Your Name</h3>
            <p className="text-blue-100">CEO & Founder</p>
            <p className="text-sm text-blue-200">your.email@listora.ai</p>
            <p className="text-sm text-blue-200">listora.ai</p>
          </div>
        </div>
      </div>

      {/* Email Signature */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Email Signature
        </h2>
        <div className="bg-white border rounded-lg p-4 max-w-md">
          <div className="flex items-center space-x-3 mb-2">
            <ListoraAILogo size="sm" showText={false} />
            <div>
              <p className="font-semibold text-gray-900">Your Name</p>
              <p className="text-sm text-gray-600">CEO, Listora AI</p>
            </div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>📧 your.email@listora.ai</p>
            <p>🌐 listora.ai</p>
            <p className="text-blue-600 font-medium">Speak. Create. Publish.</p>
          </div>
        </div>
      </div>

      {/* Implementation Notes */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-4">
          Implementation Notes
        </h2>
        <div className="space-y-3 text-blue-800">
          <p>
            <strong>File Location:</strong> Save as{' '}
            <code>src/components/ui/ListoraAILogo.tsx</code>
          </p>
          <p>
            <strong>Import:</strong>{' '}
            <code>
              import ListoraAILogo from '@/components/ui/ListoraAILogo'
            </code>
          </p>
          <p>
            <strong>Favicon:</strong> You can use the icon-only version for
            favicons by taking a screenshot or converting to SVG
          </p>
          <p>
            <strong>Responsive:</strong> Use different sizes for mobile (sm) and
            desktop (md/lg)
          </p>
          <p>
            <strong>Custom Styling:</strong> Add your own className prop for
            additional customization
          </p>
        </div>
      </div>
    </div>
  )
}
