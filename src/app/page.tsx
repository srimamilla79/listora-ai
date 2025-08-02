'use client'

import React, { useState, useEffect } from 'react'
import {
  Wand2,
  Camera,
  Download,
  Cloud,
  Mic,
  Zap,
  Shield,
  Globe,
  Users,
  Star,
  Check,
  ArrowRight,
  Play,
  Pause,
  ChevronRight,
  BarChart3,
  Target,
  Award,
  Headphones,
  TrendingUp,
  Clock,
  Rocket,
  MessageCircle,
  Sparkles,
  Heart,
  ShoppingCart,
  DollarSign,
  Timer,
  FileText,
  Upload,
  Volume2,
  Store,
  Package,
  Languages,
  X,
} from 'lucide-react'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import Link from 'next/link'
import MobileNav from '@/components/ui/MobileNav'

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [contentPreview, setContentPreview] = useState('')
  const [typingIndex, setTypingIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activePlatform, setActivePlatform] = useState(0)
  const [activeLanguage, setActiveLanguage] = useState(0)

  // Enhanced typing effect
  const sampleContent =
    'Premium Wireless Headphones - Experience crystal-clear audio with our premium wireless headphones featuring noise cancellation, 30-hour battery life, and comfortable over-ear design perfect for music lovers and professionals.'

  // Language examples for showcase
  const languageExamples = [
    {
      flag: '🇪🇸',
      name: 'Spanish',
      text: 'Auriculares inalámbricos premium...',
    },
    { flag: '🇫🇷', name: 'French', text: 'Casque sans fil premium...' },
    { flag: '🇩🇪', name: 'German', text: 'Premium kabellose Kopfhörer...' },
    { flag: '🇮🇳', name: 'Hindi', text: 'प्रीमियम वायरलेस हेडफोन्स...' },
    { flag: '🇨🇳', name: 'Chinese', text: '高级无线耳机...' },
    { flag: '🇯🇵', name: 'Japanese', text: 'プレミアムワイヤレスヘッドホン...' },
  ]

  // Platform showcase with eBay
  const platforms = [
    {
      name: 'Amazon',
      color: 'from-orange-50 to-red-50 border-orange-200',
      emoji: '📦',
      text: 'Amazon Optimized!',
      id: 'ASIN: B08XYZ123',
      textColor: 'text-orange-700',
      idColor: 'text-orange-600',
    },
    {
      name: 'Shopify',
      color: 'from-green-50 to-emerald-50 border-green-200',
      emoji: '🛍️',
      text: 'Live on Shopify!',
      id: 'Product ID: 789456',
      textColor: 'text-green-700',
      idColor: 'text-green-600',
    },
    {
      name: 'eBay',
      color: 'from-blue-50 to-indigo-50 border-blue-200',
      emoji: '🏪',
      text: 'Live on eBay!',
      id: 'Item ID: 306375092611',
      textColor: 'text-blue-700',
      idColor: 'text-blue-600',
    },
  ]

  useEffect(() => {
    if (activeFeature === 0 && typingIndex < sampleContent.length) {
      const timer = setTimeout(() => {
        setContentPreview(sampleContent.slice(0, typingIndex + 1))
        setTypingIndex(typingIndex + 1)
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [activeFeature, typingIndex])

  // Auto-rotate platform showcase
  useEffect(() => {
    const timer = setInterval(() => {
      setActivePlatform((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Auto-rotate language examples
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLanguage((prev) => (prev + 1) % languageExamples.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const features = [
    {
      icon: Mic,
      title: '🌍 Multilingual Voice-to-Content Magic (99+ Languages)',
      description:
        'Speak naturally in ANY of 99+ languages about your product features, and our advanced AI instantly detects your language, translates if needed, and transforms your words into professional, conversion-optimized content in your target market language.',
      benefit:
        'Speak Spanish, get English content - or any language combination. Perfect for global sellers!',

      demo: (
        <div className="relative">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Languages className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">
                    {languageExamples[activeLanguage].flag}
                  </span>
                  <span className="text-form-label text-blue-700">
                    🎯 Detected: {languageExamples[activeLanguage].name}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1 bg-blue-500 rounded-full animate-pulse ${
                        i <= 3 ? 'h-4' : i === 4 ? 'h-6' : 'h-3'
                      }`}
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <p className="text-body-md text-blue-700 font-medium">
                  "{languageExamples[activeLanguage].text}"
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-caption text-gray-600">
                    🔄 Auto-translating to:
                  </span>
                  <span className="text-caption bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    🇺🇸 English
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-caption text-green-600 font-semibold mb-2 flex items-center">
                <Sparkles className="h-3 w-3 mr-1" />
                🌍 AI Generated English Content:
              </div>
              <div className="text-body-md text-gray-800 leading-relaxed">
                {contentPreview}
                <span className="animate-pulse text-blue-500">|</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Camera,
      title: 'AI Vision Analysis + Multi-Platform Images',
      description:
        'Upload one image and our OpenAI Vision AI analyzes the actual visual content to generate hyper-specific descriptions. Then automatically optimize for Amazon, Shopify, eBay, and other major platforms.',
      benefit:
        'AI sees your product and writes descriptions based on actual visual details',

      demo: (
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 border border-purple-200">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mx-auto flex items-center justify-center mb-2">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <p className="text-form-label text-purple-700">
              AI Vision Analysis → Multi-Platform Optimization
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">👁️</span>
              </div>
              <span className="text-form-label text-gray-800">
                OpenAI Vision Analysis
              </span>
            </div>
            <div className="text-caption text-gray-600 space-y-1">
              <p>✓ Detects: Wireless headphones, over-ear design</p>
              <p>✓ Colors: Matte black with metallic accents</p>
              <p>✓ Features: Cushioned ear cups, adjustable headband</p>
              <p>✓ Keywords: Premium, wireless, comfort, audio</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                name: 'Amazon',
                color: 'from-orange-400 to-orange-500',
                emoji: '📦',
                status: 'optimized',
              },
              {
                name: 'Shopify',
                color: 'from-green-400 to-green-500',
                emoji: '🛍️',
                status: 'direct',
              },
              {
                name: 'eBay',
                color: 'from-blue-400 to-blue-500',
                emoji: '🏪',
                status: 'smart',
              },
            ].map((platform, i) => (
              <div
                key={platform.name}
                className={`bg-gradient-to-br ${platform.color} rounded-lg p-3 text-white text-center transform transition-all duration-300 hover:scale-105`}
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="text-lg mb-1">{platform.emoji}</div>
                <div className="text-caption font-semibold">
                  {platform.name}
                </div>
                <div className="w-full h-1 bg-white/30 rounded-full mt-2">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000"
                    style={{ width: activeFeature === 1 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: ShoppingCart,
      title:
        'Triple Platform Power: Amazon Optimization + Shopify & eBay Direct Publishing',
      description:
        'Get professional Amazon listing optimization with step-by-step guidance, direct one-click publishing to Shopify with seamless seller account integration, and revolutionary eBay direct listing with AI-powered category detection.',
      benefit:
        'From voice input to live on Amazon, Shopify AND eBay in under 2 minutes',

      demo: (
        <div className="bg-gradient-to-br from-orange-50 to-blue-100 rounded-xl p-6 border border-orange-200">
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">📦</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🛍️</span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🏪</span>
                </div>
              </div>
              <p className="text-form-label text-gray-700">
                Voice → AI Content → Amazon + Shopify + eBay Live
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: '1. Voice Input Processed',
                  status: 'complete',
                  icon: '🎤',
                },
                {
                  step: '2. AI Content Generated',
                  status: 'complete',
                  icon: '🤖',
                },
                {
                  step: '3. Platforms Connected',
                  status: 'complete',
                  icon: '🔗',
                },
                {
                  step: '4. Publishing to All 3 Platforms...',
                  status: 'processing',
                  icon: '🚀',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-200">
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-form-label text-gray-700">
                        {item.step}
                      </span>
                      <span
                        className={`text-caption px-2 py-1 rounded-full font-medium ${
                          item.status === 'complete'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.status === 'complete' ? '✓' : '⚡'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <div className="text-form-label text-orange-800">
                  📦 Amazon Optimized!
                </div>
                <div className="text-caption text-orange-600 mt-1">
                  Ready to list
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-form-label text-green-800">
                  🛍️ Shopify Live!
                </div>
                <div className="text-caption text-green-600 mt-1">
                  Product ID: 789456
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-form-label text-blue-800">
                  🏪 eBay Live!
                </div>
                <div className="text-caption text-blue-600 mt-1">
                  Item ID: 306375092611
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Award,
      title: '🏪 eBay AI-Powered Direct Listing with Smart Category Detection',
      description:
        'Revolutionary eBay integration with dual-token authentication, real-time Taxonomy API category suggestions, and automatic item specifics generation. Our AI analyzes your content and suggests the perfect eBay category with all required fields.',
      benefit:
        'AI detects perfect eBay categories automatically - no manual research needed',

      demo: (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <span className="text-white text-lg">🏪</span>
              </div>
              <p className="text-form-label text-blue-700">
                AI-Powered eBay Category Detection + Live Publishing
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: '1. AI Analyzes Your Content',
                  status: 'complete',
                  icon: '🤖',
                },
                {
                  step: '2. eBay Taxonomy API Suggests Category',
                  status: 'complete',
                  icon: '🎯',
                },
                {
                  step: '3. Auto-Generate Item Specifics',
                  status: 'complete',
                  icon: '📋',
                },
                {
                  step: '4. Live eBay Listing Created!',
                  status: 'complete',
                  icon: '🏪',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-blue-200">
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-form-label text-gray-700">
                      {item.step}
                    </span>
                    <span className="text-caption bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium ml-2">
                      ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-form-label text-blue-800 mb-2">
                🏪 Live on eBay!
              </div>
              <div className="text-caption text-blue-600 space-y-1">
                <div>Item ID: 306375092611</div>
                <div>Category: 112529 (Headphones) - AI Detected!</div>
                <div>Brand: Bose • Color: Beige • Type: Over-Ear</div>
                <div>✅ All item specifics auto-generated</div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-form-label text-green-800">
                  🌟 eBay AI Integration Features
                </span>
              </div>
              <div className="text-caption text-green-700 space-y-1">
                <p>✓ Real eBay Taxonomy API integration</p>
                <p>✓ Dual-token authentication system</p>
                <p>✓ Auto category detection (27 aspects)</p>
                <p>✓ Smart item specifics generation</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Upload,
      title: 'Bulk CSV Background Processing',
      description:
        'Upload a CSV with hundreds of products and let our servers generate professional content for all of them in the background. Navigate freely while your job keeps running - no waiting around!',
      benefit:
        'Process 500+ products while you sleep - background processing never stops',

      demo: (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl p-6 border border-indigo-200">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <p className="text-form-label text-indigo-700">
                CSV Upload → Background Processing → All Content Ready
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="text-form-label text-gray-800">
                    products_batch_247.csv
                  </span>
                </div>
                <span className="text-caption bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  ⚡ Processing
                </span>
              </div>
              <div className="text-caption text-gray-600 mb-3">
                📊 247 products • Uploaded 3 minutes ago
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-caption">
                  <span className="text-gray-600">
                    Content Generation Progress
                  </span>
                  <span className="text-indigo-600 font-medium">
                    164/247 complete
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all duration-1000 animate-pulse"
                    style={{ width: '66%' }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-form-label text-green-800">
                  🌟 Background Processing Active
                </span>
              </div>
              <div className="text-caption text-green-700 space-y-1">
                <p>✓ Job continues even if you close browser</p>
                <p>✓ Navigate freely - processing never stops</p>
                <p>✓ Email notification when complete</p>
                <p>✓ ETA: 4 minutes remaining</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Wand2,
      title: 'Advanced AI Engine',
      description:
        'Powered by cutting-edge artificial intelligence that creates compelling product descriptions, catchy titles, and persuasive marketing copy optimized for Amazon, Shopify, and eBay simultaneously.',
      benefit: 'AI-generated content that outperforms traditional copywriting',

      demo: (
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200">
          <div className="space-y-3">
            {[
              {
                task: 'Vision Analysis',
                status: 'complete',
                progress: 100,
                detail: 'Product features detected',
              },
              {
                task: 'Keyword Extraction',
                status: 'complete',
                progress: 100,
                detail: 'SEO keywords identified',
              },
              {
                task: 'Content Generation',
                status: 'processing',
                progress: 75,
                detail: 'Writing descriptions...',
              },
              {
                task: 'Platform Optimization',
                status: 'pending',
                progress: 30,
                detail: 'Amazon, Shopify & eBay formatting',
              },
            ].map((item, i) => (
              <div key={item.task} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-form-label text-gray-700">
                      {item.task}
                    </span>
                    <div className="text-caption text-gray-500">
                      {item.detail}
                    </div>
                  </div>
                  <span
                    className={`text-caption px-2 py-1 rounded-full font-medium ${
                      item.status === 'complete'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.status === 'complete'
                      ? '✓ Complete'
                      : item.status === 'processing'
                        ? '⚡ Processing'
                        : '⏳ Pending'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      item.status === 'complete'
                        ? 'bg-green-500'
                        : item.status === 'processing'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-gray-400'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: Cloud,
      title: 'Enterprise Cloud Storage',
      description:
        'Your content and images are safely stored with guaranteed 99.9% uptime, automatic backups, and access from anywhere.',
      benefit: 'Never lose your valuable content and images again',

      demo: (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 rounded-xl p-6 border border-cyan-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cloud className="h-5 w-5 text-cyan-600" />
              <span className="text-card-title text-gray-800">
                Cloud Storage
              </span>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-caption font-medium">Live & Synced</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-body-md text-gray-600">Product Images</span>
              <span className="text-form-label text-gray-800">2.4 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full"
                style={{ width: '35%' }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-body-md text-gray-600">
                Generated Content
              </span>
              <span className="text-form-label text-gray-800">847 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: '25%' }}
              />
            </div>
            <div className="text-center pt-2">
              <span className="text-caption text-green-600 font-medium">
                ✓ Auto-backup every 30 seconds
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const handleLogin = () => {
    window.location.href = '/login'
  }

  const handleSignup = () => {
    window.location.href = '/signup'
  }

  const handleContact = () => {
    window.location.href = '/contact'
  }

  const handleAbout = () => {
    window.location.href = '/about'
  }

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Stripe-style dark gradient background - simplified approach */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            linear-gradient(180deg, 
              #0a2540 0%, 
              #0a2540 20%, 
              #0e2a47 40%, 
              #1a3a5c 60%, 
              #ffffff 100%
            )
          `,
        }}
      >
        {/* Colored accent overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(0, 212, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 40%, rgba(122, 90, 248, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 50% 60%, rgba(255, 94, 91, 0.1) 0%, transparent 50%)
            `,
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      {/* Inline keyframes */}
      <style jsx global>{`
        @keyframes slideX {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
      {/* Enhanced Header with Professional Typography */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component - NOW ON LEFT */}
              <MobileNav currentPage="home" />

              {/* Logo */}
              <Link
                href="/"
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <ListoraAILogo size="header" showText={true} />
              </Link>
            </div>

            {/* Right Side: Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-form-label text-indigo-600 border-b-2 border-indigo-600 px-1 pb-1"
              >
                Home
              </Link>
              <button
                onClick={() => scrollToSection('features-section')}
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing-section')}
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <Link
                href="/about"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Blog
              </Link>

              {/* Separator */}
              <div className="h-4 w-px bg-gray-300"></div>

              <Link
                href="/login"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="text-form-label border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-sm"
              >
                Book Demo
              </Link>
              <Link
                href="/signup"
                className="text-form-label bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md"
              >
                Start Free Trial
              </Link>
            </nav>
          </div>
        </div>
      </header>
      {/* Enhanced Hero Section with Stripe-style Background */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Hero gradient overlay */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/10 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Enhanced Badge with better styling */}
            <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse mr-2" />
              <span className="text-form-label text-white">
                Revolutionary AI platform with 99+ languages
              </span>
            </div>

            {/* Enhanced Title with Professional Typography */}
            <h1 className="text-display-title mb-8 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Multilingual Content Automation Platform
              </span>
              <br />
              <span
                className="text-section-title text-white drop-shadow-lg"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
              >
                🌍 Speak in 99+ Languages → Get Professional Content
              </span>
            </h1>

            {/* Enhanced Subtitle */}
            <p
              className="text-body-comfortable text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed drop-shadow-lg"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
            >
              The world's first AI that combines
              <span className="font-semibold text-blue-200">
                {' '}
                multilingual voice recognition (99+ languages)
              </span>
              , OpenAI Vision analysis, bulk CSV processing, and
              <span className="font-semibold text-orange-200">
                {' '}
                Amazon optimization
              </span>
              ,
              <span className="font-semibold text-green-200">
                {' '}
                direct Shopify publishing
              </span>
              , and
              <span className="font-semibold text-blue-200">
                {' '}
                revolutionary eBay direct listing
              </span>
              . Scale from 1 product to 500+ with background automation.
              <span className="font-semibold text-white">
                {' '}
                No technical skills required.
              </span>
            </p>

            {/* Multilingual Language Showcase - Updated for dark background */}
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-5xl mx-auto mb-12 border border-white/20">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              <div className="text-center mb-8">
                <h3 className="text-card-title text-white mb-2">
                  Speak in ANY Language
                </h3>
                <p className="text-body-md text-white">
                  Auto-detects and processes 99+ languages instantly
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {languageExamples.map((lang, index) => (
                  <div
                    key={lang.name}
                    className={`relative p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      activeLanguage === index
                        ? 'bg-white/20 border-white/40 shadow-lg transform scale-105'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-1 text-center">{lang.flag}</div>
                    <div className="text-caption font-medium text-white text-center">
                      {lang.name}
                    </div>
                    {activeLanguage === index && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <p className="text-caption text-white">
                  + 93 more languages supported
                </p>
              </div>
            </div>

            {/* Platform Showcase - Updated for dark background */}
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-6xl mx-auto mb-12 border border-white/20">
              <div className="grid md:grid-cols-3 gap-8">
                {/* Voice Input */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Mic className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-card-title text-white mb-2">
                    Speak Any Language
                  </h3>
                  <p className="text-body-md text-white mb-4">
                    Voice input in 99+ languages with automatic detection
                  </p>
                  <div className="inline-flex items-center bg-purple-500/20 border border-purple-400/30 rounded-lg px-3 py-1.5">
                    <span className="text-lg mr-2">
                      {languageExamples[activeLanguage].flag}
                    </span>
                    <span className="text-form-label text-white">
                      {languageExamples[activeLanguage].name} detected
                    </span>
                  </div>
                </div>

                {/* AI Processing */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Sparkles className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-card-title text-white mb-2">
                    AI Creates Content
                  </h3>
                  <p className="text-body-md text-gray-300 mb-4">
                    Professional copy optimized for each platform
                  </p>
                  <div className="inline-flex items-center bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-1.5">
                    <Check className="h-4 w-4 text-blue-400 mr-2" />
                    <span className="text-form-label text-white">
                      Content generated
                    </span>
                  </div>
                </div>

                {/* Platform Publishing */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Store className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-card-title text-white mb-2">
                    Publish Everywhere
                  </h3>
                  <p className="text-body-md text-gray-300 mb-4">
                    Amazon Optimization, Direct publishing to Shopify & eBay
                  </p>
                  <div className="inline-flex items-center bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1.5">
                    <span className="text-form-label text-white">
                      {platforms[activePlatform].name} ready
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced CTAs - Updated for dark background */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={handleSignup}
                className="bg-white hover:bg-gray-100 text-gray-900 px-8 py-3 rounded-lg text-form-label font-medium transition-all transform hover:scale-105 shadow-lg flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-8 py-3 rounded-lg text-form-label font-medium transition-all border border-white/30 flex items-center"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Watch Demo
              </button>
            </div>

            {/* Trust Indicators - Updated for dark background */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-body-md text-white">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>99+ languages supported</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Setup in 60 seconds</span>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards - Updated for transition area */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                number: '99+',
                label: 'Languages',
                sublabel: 'Auto-detected',
                icon: Languages,
              },
              {
                number: 'Vision AI',
                label: 'Image Analysis',
                sublabel: 'OpenAI powered',
                icon: Camera,
              },
              {
                number: '500+',
                label: 'Bulk Processing',
                sublabel: 'CSV support',
                icon: Upload,
              },
              {
                number: 'Multi-Platforms',
                label: 'Amazon Optimization +',
                sublabel: 'Direct publishing to eBay & Shopify',
                icon: Store,
              },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-200/50 hover:border-gray-300 transition-all hover:shadow-lg"
                >
                  <Icon className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                  <div className="text-heading-md font-semibold text-gray-900">
                    {stat.number}
                  </div>
                  <div className="text-body-sm text-gray-700">{stat.label}</div>
                  <div className="text-caption text-gray-800 mt-1">
                    {stat.sublabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      {/* Enhanced Features Section - Subtle Background */}
      <section
        id="features-section"
        className="relative py-24 bg-gradient-to-b from-gray-50/50 to-white"
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-50/30 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-purple-100 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-form-label text-purple-900">
                Powerful Features
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-4">
              Everything you need to scale globally
            </h2>
            <p className="text-body-comfortable text-gray-600 max-w-3xl mx-auto">
              From voice input in any language to direct marketplace publishing,
              our platform handles the entire content creation workflow.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Feature Navigation */}
            <div className="space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setActiveFeature(index)
                      setTypingIndex(0)
                      setContentPreview('')
                    }}
                    className={`p-6 rounded-xl border cursor-pointer transition-all ${
                      activeFeature === index
                        ? 'bg-white border-gray-300 shadow-lg'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`p-3 rounded-lg transition-all ${
                          activeFeature === index
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-card-title text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-body-md text-gray-600 mb-4 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="bg-gray-50 rounded-lg px-3 py-1.5 inline-block">
                          <p className="text-form-label text-gray-700">
                            {feature.benefit}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 transition-all ${
                          activeFeature === index
                            ? 'text-indigo-600 rotate-90'
                            : 'text-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Feature Demo - Clean Card */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-card-title text-gray-900">Live Demo</h3>
                  <div className="flex space-x-1">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveFeature(index)}
                        className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                          activeFeature === index
                            ? 'bg-gray-900 w-6'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="min-h-[400px]">
                  {features[activeFeature].demo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Enhanced Pricing Section - Premium Background */}
      <section
        id="pricing-section"
        className="relative py-24 bg-gradient-to-b from-white via-purple-50/20 to-gray-50/50"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 right-0 w-80 h-80 bg-gradient-to-br from-purple-100/40 to-pink-100/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 left-0 w-80 h-80 bg-gradient-to-tr from-blue-100/40 to-cyan-100/40 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-green-100 rounded-full px-4 py-1.5 mb-6">
              <DollarSign className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-form-label text-green-900">
                Simple, transparent pricing
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-4">
              Choose your plan
            </h2>
            <p className="text-body-comfortable text-gray-600 max-w-3xl mx-auto">
              Start free and scale as you grow. All plans include 99+ language
              support and our complete feature set.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {[
              {
                name: 'Starter (Free)',
                price: 'Free',
                period: 'forever',
                description: 'Perfect for testing our multilingual AI platform',
                limit: '10 content generations/month',
                badge: null,
                topBorderColor: '',
                features: [
                  '🌍 Multilingual voice processing (99+ languages) - ALL PLANS',
                  'Manual content generation (text input)',
                  'Voice-to-content generation (up to 1 minute)',
                  'AI Vision analysis (brands, colors, features)',
                  'Amazon, Shopify & eBay optimized content format',
                  'Content library access',
                  'Email support',
                ],
                limitations: [
                  'No bulk CSV upload',
                  'No background processing',
                  'No direct platform publishing',
                ],
                cta: '🚀 Start Free',
                popular: false,
                borderColor: 'border-gray-300',
                buttonStyle:
                  'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300',
              },
              {
                name: 'Business',
                price: '$29',
                period: 'per month',
                description:
                  'Scale your multilingual content creation with bulk processing',
                limit: '250 content generations/month',
                badge: 'Most Popular',
                topBorderColor: '',
                features: [
                  '🌍 Multilingual voice processing (99+ languages) - ALL PLANS',
                  'Everything in Starter plan',
                  'Bulk CSV upload (up to 50 products)',
                  'Background job processing',
                  'Content library with organization',
                  'Amazon optimization + Direct Shopify publishing + eBay direct listing integration',
                  'Priority email support',
                ],
                newCapabilities: [
                  'Global bulk workflow automation',
                  'Background processing for any language',
                  'Higher generation limits',
                ],
                cta: '🎯 Start Free Trial',
                popular: true,
                borderColor: 'border-indigo-500',
                buttonStyle: 'bg-gray-900 hover:bg-gray-800 text-white',
              },
              {
                name: 'Premium',
                price: '$59',
                period: 'per month',
                description:
                  'Professional global scale with marketplace integration',
                limit: '1,000 content generations/month',
                badge: null,
                topBorderColor: '',
                features: [
                  '🌍 Multilingual voice processing (99+ languages) - ALL PLANS',
                  'Everything in Business plan',
                  'Large bulk CSV upload (up to 200 products)',
                  'Amazon optimization + Direct Shopify publishing + eBay direct listing (enhanced)',
                  'Enhanced voice processing (full 1-minute in any language)',
                  'Advanced AI Vision analysis',
                  'Bulk export options (CSV, Excel)',
                ],
                differentiators: [
                  'Amazon optimization + Direct Shopify publishing + eBay direct listing (enhanced)',
                  'Higher bulk limits for global markets',
                  'Enhanced multilingual AI features',
                ],
                newCapabilities: [
                  'Direct marketplace integration',
                  'Advanced multilingual AI processing',
                  'Large-scale bulk processing',
                ],
                cta: '💎 Start Free Trial',
                popular: false,
                borderColor: 'border-purple-500',
                buttonStyle: 'bg-gray-900 hover:bg-gray-800 text-white',
              },
              {
                name: 'Enterprise',
                price: 'Custom', // Changed from '$99'
                period: '', // Changed from 'per month' to empty string
                description: 'Unlimited global scale for enterprise needs',
                limit: 'Unlimited content generations',
                badge: 'Contact Sales', // Changed from null
                topBorderColor: '',
                features: [
                  '🌍 Multilingual voice processing (99+ languages) - ALL PLANS',
                  'Everything in Premium plan',
                  'Enterprise bulk processing (up to 1,000 products)',
                  'Amazon optimization + Shopify publishing + eBay publishing (unlimited)',
                  'Priority support (faster response)',
                  'Large-scale background processing',
                  'Global marketplace optimization',
                ],
                futureFeatures: [
                  'Custom integrations (contact us)',
                  'White-label solutions (contact us)',
                  'Additional platform integrations',
                ],
                cta: '📞 Contact Sales', // Changed from '🚀 Start Free Trial'
                popular: false,
                borderColor: 'border-gray-300',
                buttonStyle: 'bg-gray-900 hover:bg-gray-800 text-white',
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl border ${plan.borderColor} relative ${
                  plan.popular ? 'shadow-xl' : 'shadow-sm'
                } hover:shadow-lg transition-shadow h-full flex flex-col`}
              >
                {/* Most Popular Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gray-900 text-white px-4 py-1 rounded-full text-form-label">
                      {plan.badge}
                    </div>
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  {/* Plan name and description */}
                  <div className="text-center mb-4">
                    <h3 className="text-heading-md text-gray-900 font-bold mb-1 text-2xl md:text-3xl">
                      {plan.name}
                    </h3>
                    <p className="text-body-md text-gray-600">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-display-lg font-bold text-gray-900 text-3xl md:text-4xl">
                        {plan.price}
                      </span>
                      {plan.period !== 'forever' && (
                        <span className="text-body-md text-gray-500 ml-2 text-lg md:text-xl">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    <div className="text-form-label text-gray-600 mt-2">
                      {plan.limit}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-body-sm text-gray-700 leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}

                    {plan.limitations && (
                      <div className="pt-3 border-t border-gray-200">
                        {plan.limitations.map((limitation, i) => (
                          <div key={i} className="flex items-start">
                            <X className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                            <span className="text-body-sm text-gray-500">
                              {limitation}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={
                      plan.name === 'Enterprise'
                        ? () =>
                            (window.location.href = '/contact?plan=enterprise')
                        : handleSignup
                    }
                    className={`w-full py-3 px-4 rounded-lg text-form-label font-semibold transition-all transform hover:scale-105 shadow-md ${plan.buttonStyle}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Enhanced Footer - Premium Dark Style */}
      <footer className="relative bg-gradient-to-b from-gray-900 to-black text-white">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-blue-900/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <ListoraAILogo size="md" showText={false} />
                <span className="text-xl font-bold text-white">Listora AI</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Revolutionizing global product marketing with advanced
                multilingual AI technology. Transform your voice in 99+
                languages into professional content and optimize images for
                various e-commerce platforms worldwide.
              </p>
              <div className="flex space-x-4">
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <span className="text-sm font-bold">𝕏</span>
                </button>
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <span className="text-sm font-bold">in</span>
                </button>
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <span className="text-sm">@</span>
                </button>
              </div>
            </div>
            {/* Product Links */}
            <div>
              <h3 className="font-bold text-white mb-6">Product</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => scrollToSection('features-section')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Multilingual Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing-section')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Global Pricing
                  </button>
                </li>
                <li>
                  <span className="text-gray-500">99+ Languages Support</span>
                </li>
                <li>
                  <span className="text-gray-500">Platform Integrations</span>
                </li>
              </ul>
            </div>
            {/* Company Links */}
            <div>
              <h4 className="text-form-label font-medium text-white mb-4">
                Company
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="text-body-sm text-gray-400 hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-body-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/careers"
                    className="text-body-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-body-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            {/* Support Links */}
            <div>
              <h3 className="font-bold text-white mb-6">Support</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <span className="text-gray-500">Help Center</span>
                </li>
                <li>
                  <button
                    onClick={handleContact}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact Support
                  </button>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dmca"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    DMCA Policy
                  </Link>
                </li>
              </ul>
            </div>{' '}
          </div>{' '}
          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Listora AI. All rights reserved.</p>
          </div>
        </div>{' '}
      </footer>{' '}
    </div>
  )
}
