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
} from 'lucide-react'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [contentPreview, setContentPreview] = useState('')
  const [typingIndex, setTypingIndex] = useState(0)
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Enhanced typing effect
  const sampleContent =
    'Premium Wireless Headphones - Experience crystal-clear audio with our premium wireless headphones featuring noise cancellation, 30-hour battery life, and comfortable over-ear design perfect for music lovers and professionals.'

  useEffect(() => {
    if (activeFeature === 0 && typingIndex < sampleContent.length) {
      const timer = setTimeout(() => {
        setContentPreview(sampleContent.slice(0, typingIndex + 1))
        setTypingIndex(typingIndex + 1)
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [activeFeature, typingIndex])

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const features = [
    {
      icon: Mic,
      title: 'Voice-to-Content Magic',
      description:
        'Simply speak naturally about your product features, and our advanced AI instantly transforms your words into professional, conversion-optimized content.',
      benefit:
        'Turn 30 seconds of speaking into $500 worth of professional copywriting',
      stats: '3x faster than traditional writing',
      demo: (
        <div className="relative">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
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
                <p className="text-sm text-blue-700 font-medium">
                  "Wireless headphones with great sound and long battery..."
                </p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-green-600 font-semibold mb-2 flex items-center">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Generated Content:
              </div>
              <div className="text-sm text-gray-800 leading-relaxed">
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
      title: 'AI Vision Analysis + Image Suite',
      description:
        'Upload one image and our OpenAI Vision AI analyzes the actual visual content to generate hyper-specific descriptions and keywords. Then automatically optimize for Amazon, Shopify, Etsy, eBay, and Instagram.',
      benefit:
        'AI sees your product and writes descriptions based on actual visual details',
      stats: 'OpenAI Vision + 5 platform optimization',
      demo: (
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 border border-purple-200">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl mx-auto flex items-center justify-center mb-2">
              <Camera className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-purple-700 font-medium">
              AI Vision Analysis → Multi-Platform Optimization
            </p>
          </div>

          {/* Vision Analysis Demo */}
          <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">👁️</span>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                OpenAI Vision Analysis
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>✓ Detects: Wireless headphones, over-ear design</p>
              <p>✓ Colors: Matte black with metallic accents</p>
              <p>✓ Features: Cushioned ear cups, adjustable headband</p>
              <p>✓ Keywords: Premium, wireless, comfort, audio</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              {
                name: 'Amazon',
                color: 'from-orange-400 to-orange-500',
                emoji: '🛒',
              },
              {
                name: 'Shopify',
                color: 'from-green-400 to-green-500',
                emoji: '🏪',
              },
              {
                name: 'Etsy',
                color: 'from-yellow-400 to-orange-400',
                emoji: '🎨',
              },
              { name: 'eBay', color: 'from-blue-400 to-blue-500', emoji: '💰' },
              {
                name: 'Instagram',
                color: 'from-pink-400 to-purple-500',
                emoji: '📱',
              },
            ].map((platform, i) => (
              <div
                key={platform.name}
                className={`bg-gradient-to-br ${platform.color} rounded-lg p-3 text-white text-center transform transition-all duration-300 hover:scale-105`}
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <div className="text-lg mb-1">{platform.emoji}</div>
                <div className="text-xs font-semibold">{platform.name}</div>
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
      title: 'Direct Amazon Publishing',
      description:
        'Skip the copy-paste hassle! Publish your AI-generated content directly to Amazon with one click. Our integration connects to your seller account for seamless product listing creation.',
      benefit: 'From voice input to live Amazon listing in under 2 minutes',
      stats: 'Direct API integration',
      demo: (
        <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-xl p-6 border border-orange-200">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-orange-700 font-medium">
                Voice → AI Content → Amazon Live
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
                  step: '3. Amazon API Connected',
                  status: 'complete',
                  icon: '🔗',
                },
                {
                  step: '4. Publishing to Amazon...',
                  status: 'processing',
                  icon: '🚀',
                },
              ].map((item, i) => (
                <div key={item.step} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-orange-200">
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {item.step}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
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

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-green-800">
                🎉 Product live on Amazon in 90 seconds!
              </div>
              <div className="text-xs text-green-600 mt-1">
                ASIN: B08XYZ123 • Status: Active
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
      stats: 'Background jobs + CSV automation',
      demo: (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl p-6 border border-indigo-200">
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm text-indigo-700 font-medium">
                CSV Upload → Background Processing → All Content Ready
              </p>
            </div>

            {/* Upload Status */}
            <div className="bg-white rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    products_batch_247.csv
                  </span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  ⚡ Processing
                </span>
              </div>
              <div className="text-xs text-gray-600 mb-3">
                📊 247 products • Uploaded 3 minutes ago
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
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

            {/* Background Process Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-green-800">
                  🌟 Background Processing Active
                </span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
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
        'Powered by cutting-edge artificial intelligence that creates compelling product descriptions, catchy titles, and persuasive marketing copy.',
      benefit: 'AI-generated content that outperforms traditional copywriting',
      stats: '99.2% accuracy rate',
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
                task: 'Amazon Optimization',
                status: 'pending',
                progress: 30,
                detail: 'Platform formatting',
              },
            ].map((item, i) => (
              <div key={item.task} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {item.task}
                    </span>
                    <div className="text-xs text-gray-500">{item.detail}</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
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
      stats: '99.9% uptime guarantee',
      demo: (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 rounded-xl p-6 border border-cyan-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Cloud className="h-5 w-5 text-cyan-600" />
              <span className="font-semibold text-gray-800">Cloud Storage</span>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">Live & Synced</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Product Images</span>
              <span className="text-sm font-medium text-gray-800">2.4 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full"
                style={{ width: '35%' }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Generated Content</span>
              <span className="text-sm font-medium text-gray-800">847 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: '25%' }}
              />
            </div>
            <div className="text-center pt-2">
              <span className="text-xs text-green-600 font-medium">
                ✓ Auto-backup every 30 seconds
              </span>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'E-commerce Entrepreneur',
      company: 'TechGadgets Pro',
      content:
        'Listora AI completely transformed my workflow. What used to take me 4-5 hours per product now takes 5 minutes. The voice feature is incredibly intuitive!',
      rating: 5,
      metric: '300% efficiency boost',
      avatar: 'SC',
      color: 'from-blue-400 to-blue-600',
      results: '+40% sales increase',
    },
    {
      name: 'Michael Rodriguez',
      role: 'Digital Marketing Specialist',
      company: 'Growth Marketing Co',
      content:
        'As someone managing 50+ clients, Listora AI became my secret weapon. The AI-generated content consistently outperforms human-written copy.',
      rating: 5,
      metric: '40% more clients served',
      avatar: 'MR',
      color: 'from-green-400 to-green-600',
      results: '+$50k monthly revenue',
    },
    {
      name: 'Emma Thompson',
      role: 'Amazon FBA Seller',
      company: 'Home Essentials',
      content:
        'The platform-specific optimization is brilliant. I launch products 5x faster now, and my conversion rates have never been higher.',
      rating: 5,
      metric: '5x faster launches',
      avatar: 'ET',
      color: 'from-purple-400 to-purple-600',
      results: '+65% conversion rate',
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

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <ListoraAILogo size="header" showText={true} />

            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features-section')}
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing-section')}
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollToSection('testimonials-section')}
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Reviews
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogin}
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                Login
              </button>
              <button
                onClick={handleSignup}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg cursor-pointer"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-pink-600/5" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center mb-16">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                Join 10,000+ entrepreneurs using AI Vision + Bulk Processing +
                Amazon Direct
              </span>
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            </div>

            {/* Enhanced Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Transform Your
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                Voice Into Sales
              </span>
              in 30 Seconds
            </h1>

            {/* Enhanced Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              The world's first AI that combines voice recognition, OpenAI
              Vision analysis, bulk CSV processing, and direct Amazon
              publishing. Scale from 1 product to 500+ with background
              automation.
              <span className="font-semibold text-gray-800">
                {' '}
                No technical skills required.
              </span>
            </p>

            {/* Interactive Demo Preview */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 max-w-5xl mx-auto mb-12 border border-white/50 shadow-2xl">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center animate-pulse">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        You Speak (30 sec)
                      </h3>
                      <p className="text-sm text-gray-600">
                        Natural conversation about your product
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Volume2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-500">
                        Recording...
                      </span>
                    </div>
                    <p className="text-gray-700 italic">
                      "These wireless headphones have amazing sound quality,
                      30-hour battery, and they're super comfortable for long
                      listening sessions..."
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white animate-spin" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        AI Creates Content
                      </h3>
                      <p className="text-sm text-gray-600">
                        Professional copy ready to sell
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Generated!
                      </span>
                    </div>
                    <div className="text-sm text-gray-800">
                      <strong>Premium Wireless Headphones</strong> - Experience
                      studio-quality audio with our premium wireless headphones
                      featuring advanced noise cancellation...
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced CTAs */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              <button
                onClick={handleSignup}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-2xl flex items-center cursor-pointer"
              >
                <Mic className="mr-2 h-5 w-5 group-hover:animate-pulse" />
                Start Creating Amazing Content
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="group flex items-center space-x-3 text-indigo-600 hover:text-indigo-700 font-semibold px-6 py-4 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </div>
                <span>Watch Demo Video</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Free 14-day trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Setup in 60 seconds</span>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                number: '2 min',
                label: 'Voice to Amazon Live',
                icon: Timer,
                color: 'from-blue-500 to-cyan-500',
              },
              {
                number: 'AI Vision',
                label: 'OpenAI Image Analysis',
                icon: Camera,
                color: 'from-green-500 to-emerald-500',
              },
              {
                number: '500+',
                label: 'Bulk CSV Processing',
                icon: Upload,
                color: 'from-purple-500 to-indigo-500',
              },
              {
                number: 'Direct',
                label: 'Amazon Integration',
                icon: ShoppingCart,
                color: 'from-orange-500 to-red-500',
              },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-lg rounded-xl p-6 text-center shadow-lg border border-white/50 hover:shadow-xl transition-all hover:scale-105"
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features-section" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2 mb-6">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                Powerful Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need to create
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {' '}
                content that converts
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our revolutionary AI platform combines voice recognition, OpenAI
              Vision analysis, bulk CSV processing with background jobs, and
              direct Amazon integration to scale your business faster than ever.
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
                    className={`group p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      activeFeature === index
                        ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`p-3 rounded-xl transition-all ${
                          activeFeature === index
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 mb-4 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <p className="text-sm text-green-800 font-semibold">
                              {feature.benefit}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-indigo-600">
                              {feature.stats}
                            </div>
                          </div>
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

            {/* Feature Demo */}
            <div className="lg:sticky lg:top-24">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {features[activeFeature].title} - Live Demo
                  </h3>
                  <div className="flex space-x-1">
                    {features.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveFeature(index)}
                        className={`w-3 h-3 rounded-full cursor-pointer transition-all ${
                          activeFeature === index
                            ? 'bg-indigo-600'
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="min-h-[200px]">
                  {features[activeFeature].demo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section */}
      <section
        id="testimonials-section"
        className="py-24 bg-gradient-to-br from-gray-50 to-indigo-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium text-green-800">
                4.9/5 from 2,500+ reviews
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Real results from
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {' '}
                real entrepreneurs
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how businesses of all sizes are using Listora AI to create
              better content faster and achieve remarkable growth.
            </p>
          </div>

          {/* Featured Testimonial */}
          <div className="mb-16">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-6 w-6 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                  {testimonials[currentTestimonial].results}
                </div>
              </div>

              <blockquote className="text-xl md:text-2xl text-gray-800 leading-relaxed mb-8 italic">
                "{testimonials[currentTestimonial].content}"
              </blockquote>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${testimonials[currentTestimonial].color} rounded-full flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {testimonials[currentTestimonial].avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-lg">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-indigo-600 font-medium">
                      {testimonials[currentTestimonial].role}
                    </div>
                    <div className="text-sm text-gray-500">
                      {testimonials[currentTestimonial].company}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600 mb-1">
                    {testimonials[currentTestimonial].metric}
                  </div>
                  <div className="text-sm text-gray-500">improvement</div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Navigation */}
          <div className="flex justify-center space-x-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentTestimonial === index
                    ? 'bg-indigo-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Pricing Section */}
      <section id="pricing-section" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2 mb-6">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Simple, Transparent Pricing
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Choose the perfect plan for your
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {' '}
                business growth
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Start with our generous free plan and scale as your business
              grows. All plans include enterprise-grade security and our
              complete feature set.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'Starter (Free)',
                price: 'Free',
                period: 'forever',
                description: 'Perfect for testing our AI platform',
                limit: '10 content generations/month',
                features: [
                  'Manual content generation (text input)',
                  'Voice-to-content generation (up to 1 minute)',
                  'AI Vision analysis (brands, colors, features)',
                  'Amazon-optimized content format',
                  'Content library access',
                  'Email support',
                ],
                limitations: [
                  'No bulk CSV upload',
                  'No background processing',
                  'No direct Amazon publishing',
                ],
                cta: '🚀 Start Free',
                popular: false,
                color: 'border-gray-200 bg-white',
              },
              {
                name: 'Business',
                price: '$29',
                period: 'per month',
                description: 'Scale your content creation with bulk processing',
                limit: '250 content generations/month',
                badge: 'Most Popular',
                features: [
                  'Everything in Starter plan',
                  'Bulk CSV upload (up to 50 products)',
                  'Background job processing',
                  'Content library with organization',
                  'Priority email support',
                ],
                newCapabilities: [
                  'Bulk workflow automation',
                  'Background processing',
                  'Higher generation limits',
                ],
                cta: '🎯 Start Free Trial',
                popular: true,
                color:
                  'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50',
              },
              {
                name: 'Premium',
                price: '$79',
                period: 'per month',
                description: 'Professional scale with Amazon integration',
                limit: '1,000 content generations/month',
                features: [
                  'Everything in Business plan',
                  'Large bulk CSV upload (up to 200 products)',
                  'Direct Amazon publishing integration',
                  'Enhanced voice processing (full 1-minute)',
                  'Advanced AI Vision analysis',
                  'Bulk export options (CSV, Excel)',
                ],
                differentiators: [
                  'Direct Amazon integration',
                  'Higher bulk limits',
                  'Enhanced AI features',
                ],
                cta: '💎 Start Free Trial',
                popular: false,
                color:
                  'border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50',
              },
              {
                name: 'Enterprise',
                price: '$199',
                period: 'per month',
                description: 'Unlimited scale for enterprise needs',
                limit: 'Unlimited content generations',
                features: [
                  'Everything in Premium plan',
                  'Enterprise bulk processing (up to 1,000 products)',
                  'Direct Amazon publishing (unlimited)',
                  'Priority support (faster response)',
                  'Large-scale background processing',
                ],
                futureFeatures: [
                  'Custom integrations (contact us)',
                  'White-label solutions (contact us)',
                  'Additional platform integrations',
                ],
                cta: '🚀 Start Free Trial',
                popular: false,
                color:
                  'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50',
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`rounded-2xl border-2 p-8 relative transition-all hover:shadow-xl ${plan.color} ${
                  plan.popular
                    ? 'scale-105 shadow-2xl'
                    : 'shadow-lg hover:scale-102'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    )}
                  </div>

                  <button
                    onClick={handleSignup}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all mb-4 cursor-pointer ${
                      plan.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                        : 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-lg'
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <p className="text-gray-600 mb-2">{plan.description}</p>
                  <p className="text-sm font-semibold text-indigo-600">
                    {plan.limit}
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      ✅ Included Features:
                    </h4>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Limitations for Starter */}
                  {plan.limitations && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        ⚠️ Limitations:
                      </h4>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <span className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                              ❌
                            </span>
                            <span className="text-gray-600 text-sm">
                              {limitation}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* New Capabilities for Business */}
                  {plan.newCapabilities && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        🚀 New Capabilities:
                      </h4>
                      <ul className="space-y-2">
                        {plan.newCapabilities.map((capability, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <Star className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                            <span className="text-blue-700 text-sm font-medium">
                              {capability}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Future Features for Enterprise */}
                  {plan.futureFeatures && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        🔮 Future Features (Contact Us):
                      </h4>
                      <ul className="space-y-2">
                        {plan.futureFeatures.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <span className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5">
                              🏢
                            </span>
                            <span className="text-purple-700 text-sm">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                  {plan.name === 'Starter (Free)'
                    ? '✓ No credit card required • ✓ Forever free'
                    : '✓ 14-day free trial • ✓ No setup fees • ✓ Cancel anytime'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-6">
              Need a custom solution for your enterprise?
            </p>
            <button
              onClick={handleContact}
              className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Contact our sales team</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Enhanced Final CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to 10X your content creation speed?
          </h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-3xl mx-auto">
            Join thousands of entrepreneurs who have already discovered the
            power of voice-driven content creation. Start your free trial today
            and transform your business forever.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <button
              onClick={handleSignup}
              className="group bg-white hover:bg-gray-100 text-indigo-600 px-8 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 shadow-2xl flex items-center cursor-pointer"
            >
              <Mic className="mr-2 h-5 w-5 group-hover:animate-pulse" />
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={handleContact}
              className="border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center cursor-pointer"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Contact Our Team
            </button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-indigo-100">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-400" />
              <span>Setup in under 60 seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <ListoraAILogo size="md" showText={false} />
                <span className="text-xl font-bold">Listora AI</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Revolutionizing product marketing with advanced AI technology.
                Transform your voice into professional content and optimize
                images for every major e-commerce platform.
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

            <div>
              <h3 className="font-bold text-white mb-6">Product</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => scrollToSection('features-section')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing-section')}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <span className="text-gray-500">API Documentation</span>
                </li>
                <li>
                  <span className="text-gray-500">Platform Integrations</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6">Company</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <a
                    href="/about"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <span className="text-gray-500">Blog</span>
                </li>
                <li>
                  <span className="text-gray-500">Careers</span>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

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
                  <a
                    href="/privacy"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2025 Listora AI. All rights reserved. Built with ❤️ for
              entrepreneurs worldwide.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}
