// src/components/layout/UniversalHeader.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import AvatarHeader from '@/components/AvatarHeader'

interface UniversalHeaderProps {
  user: any
  onSignOut: () => void
}

export default function UniversalHeader({
  user,
  onSignOut,
}: UniversalHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Navigation items with proper cursor pointers and active states
  const navigationItems = [
    { path: '/generate', label: 'Generate', cursor: 'cursor-pointer' },
    { path: '/dashboard', label: 'Dashboard', cursor: 'cursor-pointer' },
    { path: '/pricing', label: 'Pricing', cursor: 'cursor-pointer' },
  ]

  const isActive = (path: string) => pathname === path

  const handleLogoClick = () => {
    // Navigate to dashboard if logged in, otherwise to landing page
    if (user) {
      router.push('/dashboard')
    } else {
      router.push('/') // or your landing page route
    }
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <>
      {/* Desktop Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section - Now Clickable */}
            <div className="flex items-center space-x-8">
              <button
                onClick={handleLogoClick}
                className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity duration-200"
              >
                <Sparkles className="h-8 w-8 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">
                  Listora AI
                </span>
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`font-medium px-3 py-2 rounded-md transition-all duration-200 ${item.cursor} ${
                      isActive(item.path)
                        ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {user ? (
                <AvatarHeader user={user} onSignOut={onSignOut} />
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer duration-200"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white/90 border-b border-gray-200 px-4 py-3 sticky top-16 z-30">
        <div className="flex space-x-1 overflow-x-auto">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`text-sm font-medium px-3 py-2 rounded-md whitespace-nowrap transition-all duration-200 ${item.cursor} ${
                isActive(item.path)
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
