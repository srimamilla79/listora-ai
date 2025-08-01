// src/components/ui/MobileNav.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Menu,
  X,
  Home,
  Zap,
  DollarSign,
  Users,
  BookOpen,
  LogIn,
  Calendar,
  Rocket,
} from 'lucide-react'

interface MobileNavProps {
  currentPage?: 'home' | 'login' | 'signup' | 'demo' | 'blog' | 'about'
}

export default function MobileNav({ currentPage }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToSection = (sectionId: string) => {
    window.location.href = `/#${sectionId}`
  }

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const closeMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const publicNavigation = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      type: 'link',
      id: 'home',
    },
    {
      name: 'Features',
      href: '/#features-section',
      icon: Zap,
      type: 'scroll',
      id: 'features',
    },
    {
      name: 'Pricing',
      href: '/#pricing-section',
      icon: DollarSign,
      type: 'scroll',
      id: 'pricing',
    },
    {
      name: 'About',
      href: '/about',
      icon: Users,
      type: 'link',
      id: 'about',
    },
    {
      name: 'Blog',
      href: '/blog',
      icon: BookOpen,
      type: 'link',
      id: 'blog',
    },
  ]

  const authNavigation = [
    {
      name: 'Login',
      href: '/login',
      icon: LogIn,
      id: 'login',
    },
    {
      name: 'Book Demo',
      href: '/demo',
      icon: Calendar,
      id: 'demo',
    },
  ]

  const menuContent = (
    <>
      {/* SOLID OPAQUE BACKDROP */}
      <div
        className="fixed inset-0 bg-gray-900"
        style={{
          zIndex: 9999998,
          backgroundColor: 'rgba(17, 24, 39, 0.95)', // Solid dark backdrop
        }}
        onClick={closeMenu}
      />

      {/* Menu Panel - NO TRANSPARENCY */}
      <div
        className="fixed inset-y-0 left-0 w-64"
        style={{
          zIndex: 9999999,
          backgroundColor: '#111827', // Solid gray-900
        }}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
          onClick={closeMenu}
          style={{ zIndex: 10000000 }}
        >
          <X className="h-6 w-6" />
        </button>

        {/* Menu Content with solid background */}
        <div className="h-full flex flex-col bg-gray-900">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 pt-5">
            <span className="text-2xl font-semibold text-white">
              Listora<span className="text-indigo-400"> </span>AI
            </span>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {publicNavigation.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id

                if (item.type === 'scroll') {
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        scrollToSection(item.href.replace('/#', ''))
                        closeMenu()
                      }}
                      className={`
                        w-full text-left
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${
                          isActive
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <Icon
                        className={`
                          mr-3 flex-shrink-0 h-5 w-5
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                        `}
                      />
                      {item.name}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                    onClick={closeMenu}
                  >
                    <Icon
                      className={`
                        mr-3 flex-shrink-0 h-5 w-5
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                      `}
                    />
                    {item.name}
                  </Link>
                )
              })}

              {/* Divider */}
              <div className="my-4 border-t border-gray-700" />

              {/* Auth Links */}
              {authNavigation.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                    onClick={closeMenu}
                  >
                    <Icon
                      className={`
                        mr-3 flex-shrink-0 h-5 w-5
                        ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}
                      `}
                    />
                    {item.name}
                  </Link>
                )
              })}

              {/* Start Free Trial - Special Button */}
              <Link
                href="/signup"
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors mt-2
                  ${
                    currentPage === 'signup'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                  }
                `}
                onClick={closeMenu}
              >
                <Rocket className="mr-3 flex-shrink-0 h-5 w-5 text-white" />
                Start Free Trial
              </Link>
            </nav>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex border-t border-gray-700 p-4 bg-gray-900">
            <div className="flex-shrink-0 w-full">
              <p className="text-xs text-gray-400 text-center">
                © 2025 Listora AI. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden p-2 bg-gray-900 text-white rounded-lg shadow-md hover:bg-gray-800 transition-colors relative z-50"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Menu - Using Portal to render outside of page hierarchy */}
      {mounted && isMobileMenuOpen && createPortal(menuContent, document.body)}
    </>
  )
}
