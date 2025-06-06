'use client'

import React, { useState, useEffect } from 'react'
import {
  Sparkles,
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
} from 'lucide-react'

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [contentPreview, setContentPreview] = useState('')
  const [typingIndex, setTypingIndex] = useState(0)

  // Animated typing effect
  const sampleContent =
    '**Premium Wireless Headphones** - Experience crystal-clear audio with our premium wireless headphones featuring noise cancellation, 30-hour battery life, and comfortable over-ear design perfect for music lovers and professionals.'

  useEffect(() => {
    if (activeFeature === 0 && typingIndex < sampleContent.length) {
      const timer = setTimeout(() => {
        setContentPreview(sampleContent.slice(0, typingIndex + 1))
        setTypingIndex(typingIndex + 1)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeFeature, typingIndex])

  // Voice animation effect
  useEffect(() => {
    if (isVoiceActive) {
      const timer = setTimeout(() => setIsVoiceActive(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isVoiceActive])

  const features = [
    {
      icon: Mic,
      title: '🎤 Revolutionary Voice-to-Content Technology',
      description:
        'Simply speak naturally about your product features, and our advanced AI instantly transforms your words into professional, conversion-optimized content that sells.',
      realBenefit:
        '✨ Turn 30 seconds of speaking into $500 worth of professional copywriting',
      preview: (
        <div className="bg-white rounded-lg p-4 shadow-sm border h-32 overflow-hidden">
          <div className="text-sm text-indigo-600 mb-2 font-medium">
            🎤 You speak: "Wireless headphones with great sound and long
            battery..."
          </div>
          <div className="text-xs text-gray-800 leading-relaxed">
            <strong>AI creates:</strong> {contentPreview}
            <span className="animate-pulse">|</span>
          </div>
        </div>
      ),
    },
    {
      icon: Camera,
      title: '📸 Professional Image Processing Suite',
      description:
        'Upload one image and instantly get perfectly optimized versions for Amazon, Shopify, Etsy, eBay, and Instagram. Automatic background removal and platform-specific sizing included.',
      realBenefit:
        '🎨 Professional designer-quality results in seconds, not days',
      preview: (
        <div className="bg-white rounded-lg p-4 shadow-sm border h-32">
          <div className="grid grid-cols-3 gap-2 h-full">
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded flex flex-col items-center justify-center text-xs">
              <span className="font-semibold">🛒 Amazon</span>
              <span className="text-gray-600">1000×1000</span>
              <span className="text-green-600 text-xs">✓ Optimized</span>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded flex flex-col items-center justify-center text-xs">
              <span className="font-semibold">🏪 Shopify</span>
              <span className="text-gray-600">1024×1024</span>
              <span className="text-green-600 text-xs">✓ Optimized</span>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-yellow-200 rounded flex flex-col items-center justify-center text-xs">
              <span className="font-semibold">🎨 Etsy</span>
              <span className="text-gray-600">2000×2000</span>
              <span className="text-green-600 text-xs">✓ Optimized</span>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded flex flex-col items-center justify-center text-xs">
              <span className="font-semibold">💰 eBay</span>
              <span className="text-gray-600">1600×1600</span>
              <span className="text-green-600 text-xs">✓ Optimized</span>
            </div>
            <div className="bg-gradient-to-br from-pink-100 to-purple-200 rounded flex flex-col items-center justify-center text-xs">
              <span className="font-semibold">📱 Instagram</span>
              <span className="text-gray-600">1080×1080</span>
              <span className="text-green-600 text-xs">✓ Optimized</span>
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center text-xs">
              <span className="text-green-600 font-semibold">🚀 Ready!</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Wand2,
      title: '🤖 Advanced AI Content Generation',
      description:
        'Powered by cutting-edge artificial intelligence, Listora creates compelling product descriptions, catchy titles, and persuasive marketing copy that converts visitors into customers.',
      realBenefit:
        '🎯 AI-generated content that outperforms traditional copywriting',
      preview: (
        <div className="bg-white rounded-lg p-4 shadow-sm border h-32">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-800">
              AI Content Generation Progress
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Product Title</span>
                <span className="text-green-600">✓ Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs">
                <span>Description</span>
                <span className="text-green-600">✓ Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
              <div className="flex justify-between text-xs">
                <span>Key Features</span>
                <span className="text-blue-600">Processing...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full animate-pulse"
                  style={{ width: '75%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: Cloud,
      title: '☁️ Enterprise-Grade Cloud Storage',
      description:
        'Your content and images are safely stored in our secure cloud infrastructure. Access your work from anywhere, anytime, with guaranteed 99.9% uptime and automatic backups.',
      realBenefit: '🔒 Never lose your valuable content and images again',
      preview: (
        <div className="bg-white rounded-lg p-4 shadow-sm border h-32">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">
              Cloud Storage
            </span>
            <span className="text-xs text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Online & Synced
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Product Images</span>
              <span className="text-gray-600">2.4 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: '35%' }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span>Generated Content</span>
              <span className="text-gray-600">847 MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full"
                style={{ width: '25%' }}
              ></div>
            </div>
            <div className="text-center text-xs text-green-600 font-medium">
              ✓ Automatically backed up every 30 seconds
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
      content:
        'Listora AI has completely transformed how I create product content. What used to take me hours of writing and design work now happens in minutes. The voice feature is incredibly intuitive, and the image optimization for different platforms is a game-changer.',
      rating: 5,
      revenue: 'Increased efficiency by 300%',
      avatar: 'SC',
      color: 'from-blue-400 to-blue-500',
    },
    {
      name: 'Michael Rodriguez',
      role: 'Digital Marketing Specialist',
      content:
        'As someone who manages multiple e-commerce clients, Listora AI has become my secret weapon. The quality of AI-generated content consistently impresses my clients, and the time savings allow me to take on more projects.',
      rating: 5,
      revenue: 'Serving 40% more clients',
      avatar: 'MR',
      color: 'from-green-400 to-green-500',
    },
    {
      name: 'Emma Thompson',
      role: 'Amazon FBA Seller',
      content:
        "The platform-specific image optimization is brilliant. I no longer need to worry about image dimensions for different marketplaces. The voice-to-content feature lets me create professional listings while I'm on the go.",
      rating: 5,
      revenue: 'Faster product launches',
      avatar: 'ET',
      color: 'from-purple-400 to-purple-500',
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
      {/* Header - FIXED: Added cursor-pointer to all clickable elements */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Wand2 className="h-2 w-2 text-white" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  Listora AI
                </span>
                <div className="text-xs text-indigo-600 font-medium -mt-1">
                  Intelligent Content Creation
                </div>
              </div>
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

      {/* Hero Section - REDUCED TITLE FONT SIZE BY 15% */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-100 rounded-full p-4 animate-bounce">
              <Sparkles className="h-12 w-12 text-indigo-600" />
            </div>
          </div>

          {/* REDUCED: Font size from text-4xl md:text-6xl to text-3xl md:text-5xl (15% reduction) */}
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your Voice Into
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {' '}
              Premium Marketing Copy
            </span>
            <br />
            in Seconds That Actually Sells
          </h1>

          {/* ENHANCED: More compelling value proposition */}
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            <strong>Listora AI</strong> is the world's first voice-to-content
            platform that turns your natural speech into professional marketing
            copy that converts. Simply speak about your product, and our
            advanced AI instantly creates compelling descriptions, optimized
            images, and platform-specific content for Amazon, Shopify, Etsy, and
            more.
          </p>

          {/* ENHANCED: Added urgency and social proof */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-8 text-lg flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-semibold">
                  🎤 Speak Naturally (30 sec)
                </span>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-indigo-800 font-semibold">
                  🤖 AI Creates Professional Copy
                </span>
              </div>
              <div className="text-gray-400">→</div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-purple-800 font-semibold">
                  🚀 Copy & Launch Anywhere
                </span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600 bg-white px-4 py-2 rounded-full border">
                ⏱️ Average time saved: <strong>4.5 hours per product</strong> •
                💰 Ready-to-use content for <strong>5+ platforms</strong>
              </span>
            </div>
          </div>

          {/* ENHANCED: More compelling CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={handleSignup}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-xl flex items-center cursor-pointer"
            >
              🎤 Start Creating Amazing Content
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => scrollToSection('pricing-section')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold px-6 py-4 rounded-lg hover:bg-indigo-50 transition-all flex items-center cursor-pointer"
            >
              💎 View Pricing Plans
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>

          {/* ENHANCED: Better social proof */}
          <div className="text-sm text-gray-500 mb-8">
            ✓ Free trial • ✓ No credit card required • ✓ Setup in 60 seconds
            <br />
            <span className="text-green-600 font-semibold">
              🎉 Join 10,000+ entrepreneurs already using Listora AI
            </span>
          </div>

          {/* ENHANCED: Better feature highlights */}
          <div
            id="features-section"
            className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-16"
          >
            <div className="text-center bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <div className="text-2xl font-bold text-slate-600 mb-2">
                🎤 Voice Magic
              </div>
              <div className="text-gray-600">30-Second Creation</div>
              <div className="text-xs text-slate-500 mt-1">
                ✨ Speak → Professional copy
              </div>
            </div>
            <div className="text-center bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <div className="text-2xl font-bold text-slate-600 mb-2">
                📸 Image AI
              </div>
              <div className="text-gray-600">Platform Optimization</div>
              <div className="text-xs text-slate-500 mt-1">
                🎨 1 upload → 5 perfect sizes
              </div>
            </div>
            <div className="text-center bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <div className="text-2xl font-bold text-slate-600 mb-2">
                🤖 Smart AI
              </div>
              <div className="text-gray-600">Content Generation</div>
              <div className="text-xs text-slate-500 mt-1">
                ⚡ Titles, descriptions, features
              </div>
            </div>
            <div className="text-center bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <div className="text-2xl font-bold text-slate-600 mb-2">
                🌐 Multi-Platform
              </div>
              <div className="text-gray-600">Perfect Everywhere</div>
              <div className="text-xs text-slate-500 mt-1">
                🎯 Amazon, Shopify, Etsy, eBay+
              </div>
            </div>
            <div className="text-center bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <div className="text-2xl font-bold text-slate-600 mb-2">
                📦 Bulk Power
              </div>
              <div className="text-gray-600">Scale Fast</div>
              <div className="text-xs text-slate-500 mt-1">
                ⚡ 50+ products simultaneously
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - ENHANCED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            The Only Platform That Understands Your Voice AND Your Business
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stop spending hours writing product descriptions. Our revolutionary
            AI transforms your natural speech into high-converting copy that
            sells while you focus on growing your business.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Feature Navigation */}
          <div className="space-y-4">
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
                  className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    activeFeature === index
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg ${
                        activeFeature === index
                          ? 'bg-indigo-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          activeFeature === index
                            ? 'text-indigo-600'
                            : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {feature.description}
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800 font-semibold">
                          {feature.realBenefit}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 transition-colors ${
                        activeFeature === index
                          ? 'text-indigo-600'
                          : 'text-gray-400'
                      }`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Feature Preview */}
          <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-xl shadow-xl p-8 border">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                {features[activeFeature].title} - Live Demo
              </h3>
              {features[activeFeature].preview}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Interactive Preview
                </span>
                <div className="flex space-x-1">
                  {features.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full cursor-pointer ${
                        activeFeature === index
                          ? 'bg-indigo-600'
                          : 'bg-gray-300'
                      }`}
                      onClick={() => setActiveFeature(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Support */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Perfectly Optimized for Every Major Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Listora AI understands the unique requirements of each e-commerce
              platform and automatically creates content and images that meet
              their specific guidelines and best practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              {
                name: 'Amazon',
                icon: '🛒',
                size: '1000×1000',
                color: 'from-orange-300 to-orange-400',
                description: 'Marketplace leader',
              },
              {
                name: 'Shopify',
                icon: '🏪',
                size: '1024×1024',
                color: 'from-green-300 to-green-400',
                description: 'E-commerce platform',
              },
              {
                name: 'Etsy',
                icon: '🎨',
                size: '2000×2000',
                color: 'from-yellow-300 to-orange-300',
                description: 'Creative marketplace',
              },
              {
                name: 'eBay',
                icon: '💰',
                size: '1600×1600',
                color: 'from-blue-300 to-blue-400',
                description: 'Auction & shopping',
              },
              {
                name: 'Instagram',
                icon: '📱',
                size: '1080×1080',
                color: 'from-purple-300 to-pink-300',
                description: 'Social commerce',
              },
            ].map((platform, index) => (
              <div key={index} className="group">
                <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all p-6 text-center border hover:border-indigo-200 group-hover:scale-105 cursor-pointer">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center text-2xl transform group-hover:rotate-12 transition-transform`}
                  >
                    {platform.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {platform.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {platform.description}
                  </p>
                  <div className="text-xs bg-gray-100 rounded-full px-3 py-1 inline-block mb-2">
                    {platform.size}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-green-600 font-semibold">
                      ✓ Perfectly Optimized
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Powered by Advanced AI Technology
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Behind Listora AI's simple interface lies sophisticated artificial
              intelligence technology that understands context, optimizes for
              conversions, and delivers consistent, high-quality results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: 'Lightning Fast Processing',
                metric: '2.1s',
                description: 'Average content generation time',
                progress: 95,
              },
              {
                icon: Shield,
                title: 'Enterprise Security',
                metric: 'SOC 2',
                description: 'Type II certified infrastructure',
                progress: 100,
              },
              {
                icon: BarChart3,
                title: 'AI Accuracy Rate',
                metric: '99.2%',
                description: 'Content quality satisfaction',
                progress: 99,
              },
              {
                icon: Globe,
                title: 'Global Infrastructure',
                metric: '150+',
                description: 'Edge locations worldwide',
                progress: 87,
              },
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
                >
                  <Icon className="h-8 w-8 text-indigo-400 mb-4" />
                  <div className="text-2xl font-bold text-white mb-1">
                    {item.metric}
                  </div>
                  <div className="text-sm text-gray-300 mb-3">
                    {item.description}
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-indigo-400 to-purple-400 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-16 text-center">
            <div className="flex justify-center space-x-8 text-gray-400">
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>ISO 27001 Certified</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UPDATED Pricing Section - Removed discount, updated Enterprise */}
      <section id="pricing-section" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose the Perfect Plan for Your Business Growth
            </h2>
            <p className="text-xl text-gray-600">
              Start with our generous free plan and scale as your business
              grows. All plans include our complete feature set with
              enterprise-grade security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: 'Starter',
                price: 'Free',
                period: 'forever',
                description: 'Perfect for testing our platform',
                limit: '10 content generations per month',
                features: [
                  'AI content generation from text',
                  'Single image upload and processing',
                  'Platform-specific content formats',
                  'Email support',
                  'Access to all content templates',
                  'Export to text/copy formats',
                ],
                cta: '🚀 Start Free',
                popular: false,
                color: 'border-gray-200 bg-white',
              },
              {
                name: 'Business',
                price: '$29',
                period: 'per month',
                description: 'For growing entrepreneurs',
                limit: '250 content generations per month',
                badge: 'Most Popular',
                features: [
                  'Everything in Starter',
                  'Voice-to-content generation',
                  'Bulk CSV upload (up to 50 products)',
                  'Advanced image optimization',
                  'Multiple platform formats',
                  'Priority email support',
                ],
                cta: '🎯 Start Free Trial',
                popular: true,
                color: 'border-indigo-500 bg-indigo-50',
              },
              {
                name: 'Premium',
                price: '$79',
                period: 'per month',
                description: 'For scaling businesses',
                limit: '1000 content generations per month',
                badge: 'Best Value',
                features: [
                  'Everything in Business',
                  'Bulk CSV upload (up to 200 products)',
                  'Bulk content generation',
                  'Advanced content customization',
                  'Enhanced voice processing',
                  'Batch export capabilities',
                ],
                cta: '💎 Start Free Trial',
                popular: false,
                color: 'border-purple-500 bg-purple-50',
              },
              {
                name: 'Enterprise',
                price: '$199',
                period: 'per month',
                description: 'For large organizations',
                limit: 'Unlimited content generations',
                features: [
                  'Everything in Premium',
                  'Bulk CSV upload (up to 1000 products)',
                  'Mass content generation',
                  'Priority phone support',
                  'Custom content templates',
                  'Advanced batch processing',
                ],
                cta: '🚀 Start Free Trial',
                popular: false,
                color: 'border-gray-300 bg-gray-50',
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`rounded-xl border-2 p-8 relative ${plan.color} ${
                  plan.popular ? 'scale-105 shadow-xl' : 'shadow-lg'
                } hover:shadow-xl transition-all`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-600 ml-1">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {plan.description}
                  </p>
                  <p className="text-sm font-semibold text-indigo-600">
                    {plan.limit}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleSignup}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="mt-4 text-center text-xs text-gray-500">
                  ✓ 14-day free trial • ✓ No setup fees • ✓ Cancel anytime
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ENHANCED Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Real Results from Real Entrepreneurs
            </h2>
            <p className="text-xl text-gray-600">
              See how Listora AI is helping businesses of all sizes create
              better content faster and achieve remarkable results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-lg p-6 border hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {testimonial.revenue}
                  </div>
                </div>
                <p className="text-gray-600 mb-4 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 bg-gradient-to-r ${testimonial.color} rounded-full flex items-center justify-center text-white font-bold text-sm mr-3`}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-indigo-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UPDATED Final CTA - Changed Schedule Demo to Contact Us */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to 10X Your Content Creation Speed?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of entrepreneurs who have already discovered the
            power of voice-driven content creation. Start your free trial today
            and transform your business forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSignup}
              className="bg-white hover:bg-gray-100 text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-xl cursor-pointer"
            >
              🎤 Start Your Free Trial
            </button>
            <button
              onClick={handleContact}
              className="border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all cursor-pointer"
            >
              📞 Contact Us
            </button>
          </div>
          <div className="mt-4 text-indigo-100 text-sm">
            ✓ No credit card required • ✓ 14-day free trial • ✓ Setup in under
            60 seconds
          </div>
        </div>
      </section>

      {/* UPDATED Footer - Fixed all navigation links */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold">Listora AI</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Revolutionizing product marketing with advanced AI technology.
                Transform your voice into professional content and optimize
                images for every major e-commerce platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => scrollToSection('features-section')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('pricing-section')}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    API Documentation
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Platform Integrations
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Help Center
                  </span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Getting Started
                  </span>
                </li>
                <li>
                  <button
                    onClick={handleContact}
                    className="hover:text-white transition-colors cursor-pointer text-left"
                  >
                    Contact Support
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="/about"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">Blog</span>
                </li>
                <li>
                  <span className="text-gray-500 cursor-not-allowed">
                    Careers
                  </span>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>
              &copy; 2025 Listora AI. All rights reserved. Made with ❤️ for
              entrepreneurs worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
