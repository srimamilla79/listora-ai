'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface MobileNavProps {
  currentPage?: 'home' | 'login' | 'signup' | 'demo' | 'blog' | 'about'
}

export default function MobileNav({ currentPage }: MobileNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    window.location.href = `/#${sectionId}`
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
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 z-50 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel - REDUCED WIDTH */}
          <div
            className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-out ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Compact Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="font-bold text-lg">Listora AI</h3>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Navigation - FURTHER OPTIMIZED */}
            <div className="bg-white px-5 py-3">
              {/* Navigation Links - FURTHER REDUCED SPACING */}
              <div className="space-y-1.5 mb-4">
                <Link
                  href="/"
                  className={getButtonClass('home')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-xl">🏠</span>
                  <span className={getButtonTextClass('home')}>
                    Home{currentPage === 'home' ? ' (Current)' : ''}
                  </span>
                </Link>

                <button
                  onClick={() => {
                    scrollToSection('features-section')
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-4 py-3 bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-all shadow-sm w-full text-left"
                >
                  <span className="text-xl">⚡</span>
                  <span className="font-semibold text-gray-800">Features</span>
                </button>

                <button
                  onClick={() => {
                    scrollToSection('pricing-section')
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 px-4 py-3 bg-white border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg transition-all shadow-sm w-full text-left"
                >
                  <span className="text-xl">💰</span>
                  <span className="font-semibold text-gray-800">Pricing</span>
                </button>

                <Link
                  href="/about"
                  className={getButtonClass('about')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-xl">👥</span>
                  <span className={getButtonTextClass('about')}>
                    About{currentPage === 'about' ? ' (Current)' : ''}
                  </span>
                </Link>

                <Link
                  href="/blog"
                  className={getButtonClass('blog')}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-xl">📝</span>
                  <span className={getButtonTextClass('blog')}>
                    Blog{currentPage === 'blog' ? ' (Current)' : ''}
                  </span>
                </Link>
              </div>

              {/* Action Buttons - FURTHER REDUCED SPACING */}
              <div className="space-y-1.5">
                <Link
                  href="/login"
                  className={getActionButtonClass('login')}
                  onClick={() => setIsMobileMenuOpen(false)}
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
                  onClick={() => setIsMobileMenuOpen(false)}
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
                  onClick={() => setIsMobileMenuOpen(false)}
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
