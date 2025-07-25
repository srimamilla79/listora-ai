// src/components/layout/UniversalHeader.tsx - ORIGINAL WITH BULK UPLOAD ADDED
'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AvatarHeader from '@/components/AvatarHeader'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

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
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.id) {
        try {
          const { data: adminCheck } = await supabase.rpc('is_admin', {
            user_uuid: user.id,
          })
          setIsAdmin(adminCheck || false)
        } catch (error) {
          console.error('Error checking admin status:', error)
          setIsAdmin(false)
        }
      }
    }

    checkAdminStatus()
  }, [user, supabase])

  // Navigation items with Bulk Upload added
  const navigationItems = [
    { path: '/generate', label: 'Generate', cursor: 'cursor-pointer' },
    { path: '/dashboard', label: 'Content Library', cursor: 'cursor-pointer' },
    { path: '/bulk', label: 'Bulk Upload', cursor: 'cursor-pointer' },
    {
      path: '/published-products',
      label: 'Published Products',
      cursor: 'cursor-pointer',
    },
    { path: '/pricing', label: 'Pricing', cursor: 'cursor-pointer' },
    ...(isAdmin
      ? [{ path: '/admin', label: 'Admin', cursor: 'cursor-pointer' }]
      : []),
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
      {/* Desktop Header with Lighter Background */}
      <header className="bg-slate-50/95 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section - Now with Custom Logo */}
            <div className="flex items-center space-x-8">
              <button
                onClick={handleLogoClick}
                className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
              >
                <ListoraAILogo size="lg" showText={true} />
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
                    } ${
                      item.path === '/admin'
                        ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 hover:from-purple-200 hover:to-indigo-200 border border-purple-200'
                        : ''
                    } ${
                      item.path === '/published-products'
                        ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 hover:from-orange-100 hover:to-red-100 border border-orange-200'
                        : ''
                    } ${
                      item.path === '/bulk'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 hover:from-green-100 hover:to-emerald-100 border border-green-200'
                        : ''
                    }`}
                  >
                    {item.label}
                    {item.path === '/admin' && (
                      <span className="ml-1 text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                        🛡️
                      </span>
                    )}
                    {item.path === '/published-products' && (
                      <span className="ml-1 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                        📦
                      </span>
                    )}
                    {item.path === '/bulk' && (
                      <span className="ml-1 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                        📊
                      </span>
                    )}
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

      {/* Mobile Navigation with Matching Light Background */}
      <div className="md:hidden bg-slate-50/90 border-b border-gray-100 px-4 py-3 sticky top-16 z-30">
        <div className="flex space-x-1 overflow-x-auto">
          {navigationItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`text-sm font-medium px-3 py-2 rounded-md whitespace-nowrap transition-all duration-200 ${item.cursor} ${
                isActive(item.path)
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
              } ${
                item.path === '/admin'
                  ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200'
                  : ''
              } ${
                item.path === '/published-products'
                  ? 'bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 border border-orange-200'
                  : ''
              } ${
                item.path === '/bulk'
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
                  : ''
              }`}
            >
              {item.label}
              {item.path === '/admin' && (
                <span className="ml-1 text-xs bg-purple-500 text-white px-1 py-0.5 rounded-full">
                  🛡️
                </span>
              )}
              {item.path === '/published-products' && (
                <span className="ml-1 text-xs bg-orange-500 text-white px-1 py-0.5 rounded-full">
                  📦
                </span>
              )}
              {item.path === '/bulk' && (
                <span className="ml-1 text-xs bg-green-500 text-white px-1 py-0.5 rounded-full">
                  📊
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
