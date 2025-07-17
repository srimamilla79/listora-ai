'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  currentPage?: 'home' | 'login' | 'signup' | 'demo' | 'blog' | 'about'
}

export default function MobileNav({ currentPage }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (sectionId: string) => {
    window.location.href = `/#${sectionId}`
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      // Add event listeners
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      // Cleanup
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const closeMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const getButtonClass = (page: string) => {
    if (currentPage === page) {
      return 'flex items-center space-x-3 px-4 py-3 bg-indigo-100 border-2 border-indigo-300 rounded-lg transition-all shadow-sm w-full text-left'
    }
    return 'flex items-center space-x-3 px-4 py-3 bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-all shadow-sm w-full text-left'
  }

  const getButtonTextClass = (page: string) => {
    if (currentPage === page) {
      return 'font-semibold text-indigo-800'
    }
    return 'font-semibold text-gray-800'
  }

  const getActionButtonClass = (page: string) => {
    if (currentPage === page) {
      return 'block w-full text-center py-3 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-semibold transition-colors border-2 border-indigo-300'
    }
    return 'block w-full text-center py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-semibold transition-colors border border-gray-300'
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="text-gray-600 hover:text-indigo-600 p-2 rounded-lg transition-colors"
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop - Simple click handler */}
          <div
            className="fixed inset-0 bg-black/80 z-[60] md:hidden"
            onClick={closeMenu}
          />

          {/* Menu Panel - NOW SLIDES FROM LEFT */}
          <div
            ref={menuRef}
            className="fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[70] md:hidden transform translate-x-0"
          >
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Listora AI</h3>
                <button
                  onClick={closeMenu}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="bg-white px-5 py-3">
              {/* Navigation Links */}
              <div className="space-y-1.5 mb-4">
                <Link
                  href="/"
                  className={getButtonClass('home')}
                  onClick={closeMenu}
                >
                  <span className="text-xl">🏠</span>
                  <span className={getButtonTextClass('home')}>
                    Home{currentPage === 'home' ? ' (Current)' : ''}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    scrollToSection('features-section')
                    closeMenu()
                  }}
                  className="flex items-center space-x-3 px-4 py-3 bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-all shadow-sm w-full text-left"
                >
                  <span className="text-xl">⚡</span>
                  <span className="font-semibold text-gray-800">Features</span>
                </button>

                <button
                  onClick={() => {
                    scrollToSection('pricing-section')
                    closeMenu()
                  }}
                  className="flex items-center space-x-3 px-4 py-3 bg-white border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg transition-all shadow-sm w-full text-left"
                >
                  <span className="text-xl">💰</span>
                  <span className="font-semibold text-gray-800">Pricing</span>
                </button>

                <Link
                  href="/about"
                  className={getButtonClass('about')}
                  onClick={closeMenu}
                >
                  <span className="text-xl">👥</span>
                  <span className={getButtonTextClass('about')}>
                    About{currentPage === 'about' ? ' (Current)' : ''}
                  </span>
                </Link>

                <Link
                  href="/blog"
                  className={getButtonClass('blog')}
                  onClick={closeMenu}
                >
                  <span className="text-xl">📝</span>
                  <span className={getButtonTextClass('blog')}>
                    Blog{currentPage === 'blog' ? ' (Current)' : ''}
                  </span>
                </Link>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5">
                <Link
                  href="/login"
                  className={getActionButtonClass('login')}
                  onClick={closeMenu}
                >
                  Login{currentPage === 'login' ? ' (Current)' : ''}
                </Link>

                <Link
                  href="/demo"
                  className={
                    currentPage === 'demo'
                      ? 'block w-full text-center py-3 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-semibold transition-colors border-2 border-indigo-300'
                      : 'block w-full text-center py-3 px-4 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg font-semibold transition-all'
                  }
                  onClick={closeMenu}
                >
                  📅 Book Demo{currentPage === 'demo' ? ' (Current)' : ''}
                </Link>

                <Link
                  href="/signup"
                  className={
                    currentPage === 'signup'
                      ? 'block w-full text-center py-3 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-semibold transition-colors border-2 border-indigo-300'
                      : 'block w-full text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors'
                  }
                  onClick={closeMenu}
                >
                  🚀 Start Free Trial
                  {currentPage === 'signup' ? ' (Current)' : ''}
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
