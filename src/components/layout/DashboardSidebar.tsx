// src/components/layout/DashboardSidebar.tsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import {
  Sparkles,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Package,
  Store,
  CreditCard,
  User,
  Shield,
  Crown,
} from 'lucide-react'

interface DashboardSidebarProps {
  user: any
  userPlan?: string
  isAdmin?: boolean
  onLogout: () => void
}

export default function DashboardSidebar({
  user,
  userPlan = 'starter',
  isAdmin = false,
  onLogout,
}: DashboardSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  console.log('DashboardSidebar - Current pathname:', pathname)
  console.log('DashboardSidebar - Mounted')

  const navigation = [
    {
      name: 'Generate',
      href: '/generate',
      icon: Sparkles,
      current: pathname === '/generate',
    },
    {
      name: 'Content Library',
      href: '/dashboard',
      icon: FileText,
      current: pathname === '/dashboard',
    },
    {
      name: 'Bulk Upload',
      href: '/bulk',
      icon: Package,
      current: pathname === '/bulk',
    },
    {
      name: 'Published Products',
      href: '/published-products',
      icon: Store,
      current: pathname === '/published-products',
    },
    {
      name: 'Pricing',
      href: '/pricing',
      icon: CreditCard,
      current: pathname === '/pricing',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      current: pathname === '/profile',
    },
  ]

  // Add admin link if user is admin
  if (isAdmin) {
    navigation.push({
      name: 'Admin',
      href: '/admin',
      icon: Shield,
      current: pathname === '/admin',
    })
  }

  const secondaryNavigation = [
    { name: 'Help & Support', href: '/support', icon: HelpCircle },
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col relative z-40">
        {' '}
        <div className="flex flex-col flex-grow bg-gray-900 h-full">
          <div className="flex items-center flex-shrink-0 px-4 pt-5">
            <span className="text-2xl font-semibold text-white">
              Listora<span className="text-indigo-400"> </span>AI
            </span>
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      console.log('Button clicked, navigating to:', item.href)
                      router.push(item.href)
                    }}
                    className={`
    w-full text-left
    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
    ${
      item.current
        ? 'bg-gray-800 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }
  `}
                  >
                    <Icon
                      className={`
      mr-3 flex-shrink-0 h-5 w-5
      ${item.current ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
    `}
                    />
                    {item.name}
                    {item.name === 'Admin' && (
                      <span className="ml-auto bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        🛡️
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex flex-col px-2 space-y-1 pb-4">
            {secondaryNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                  {item.name}
                </Link>
              )
            })}
            <button
              onClick={onLogout}
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
              Log out
            </button>
          </div>
          {/* User info */}
          <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isAdmin
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600'
                      : 'bg-gray-600'
                  }`}
                >
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs font-medium text-gray-400 capitalize flex items-center">
                  {isAdmin && <Crown className="h-3 w-3 mr-1" />}
                  {isAdmin ? 'Owner' : userPlan} Plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={`md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 flex z-50">
          <div className="fixed inset-0" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
          </div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-900">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            {/* Mobile sidebar content - same as desktop */}
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <span className="text-2xl font-semibold text-white">
                  Listora<span className="text-indigo-400"> </span>AI
                </span>
              </div>
              <nav className="mt-8 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${
                          item.current
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon
                        className={`
                          mr-3 flex-shrink-0 h-5 w-5
                          ${
                            item.current
                              ? 'text-white'
                              : 'text-gray-400 group-hover:text-gray-300'
                          }
                        `}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
              <div className="mt-auto px-2 space-y-1 pb-4">
                {secondaryNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                      {item.name}
                    </Link>
                  )
                })}
                <button
                  onClick={() => {
                    onLogout()
                    setSidebarOpen(false)
                  }}
                  className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white transition-colors w-full"
                >
                  <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-40 p-2 bg-gray-900 text-white rounded-lg md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  )
}
