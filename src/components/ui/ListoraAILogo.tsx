// src/components/ui/ListoraAILogo.tsx
'use client'

import React from 'react'

interface ListoraAILogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header'
  showText?: boolean
  className?: string
}

export default function ListoraAILogo({
  size = 'md',
  showText = true,
  className = '',
}: ListoraAILogoProps) {
  // Size configurations
  const sizeConfig = {
    sm: {
      logoSize: 'w-6 h-6',
      textSize: 'text-lg',
      badgeSize: 'w-3 h-3',
      badgeText: 'text-xs',
      spacing: 'space-x-2',
    },
    md: {
      logoSize: 'w-8 h-8',
      textSize: 'text-2xl',
      badgeSize: 'w-4 h-4',
      badgeText: 'text-xs',
      spacing: 'space-x-2',
    },
    lg: {
      logoSize: 'w-12 h-12',
      textSize: 'text-3xl',
      badgeSize: 'w-5 h-5',
      badgeText: 'text-sm',
      spacing: 'space-x-3',
    },
    xl: {
      logoSize: 'w-16 h-16',
      textSize: 'text-4xl',
      badgeSize: 'w-6 h-6',
      badgeText: 'text-base',
      spacing: 'space-x-4',
    },
    header: {
      logoSize: 'w-10 h-10',
      textSize: 'text-2xl',
      badgeSize: 'w-4 h-4',
      badgeText: 'text-xs',
      spacing: 'space-x-3',
    },
  }

  const config = sizeConfig[size]

  return (
    <div className={`flex items-center ${config.spacing} ${className}`}>
      {/* Voice-to-Amazon Pipeline Logo */}
      <div className="relative group">
        <div
          className={`flex items-center justify-center ${config.logoSize} bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 rounded-2xl shadow-lg overflow-hidden`}
        >
          {/* Voice waves */}
          <div className="absolute left-1 top-1/2 transform -translate-y-1/2">
            <div className="w-0.5 h-2 bg-white/60 rounded-full animate-pulse"></div>
          </div>
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
            <div
              className="w-0.5 h-3 bg-white/80 rounded-full animate-pulse"
              style={{ animationDelay: '100ms' }}
            ></div>
          </div>
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <div
              className="w-0.5 h-4 bg-white rounded-full animate-pulse"
              style={{ animationDelay: '200ms' }}
            ></div>
          </div>

          {/* Central AI processor */}
          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div>
          </div>

          {/* Amazon arrow/cart */}
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
            <div className="text-orange-300 text-xs">🛒</div>
          </div>
        </div>

        {/* AI Badge */}
        <div
          className={`absolute -top-1 -right-1 ${config.badgeSize} bg-green-500 rounded-full flex items-center justify-center`}
        >
          <span className={`text-white ${config.badgeText} font-bold`}>AI</span>
        </div>
      </div>

      {/* Text */}
      {showText && (
        <div>
          <span className={`${config.textSize} font-bold text-gray-900`}>
            Listora AI
          </span>
          <div className="text-sm text-blue-600 font-medium -mt-1">
            Speak. Create. Publish.
          </div>
        </div>
      )}
    </div>
  )
}
