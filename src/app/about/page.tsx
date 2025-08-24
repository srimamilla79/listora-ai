'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'
import {
  Zap,
  Users,
  Target,
  Award,
  TrendingUp,
  Globe,
  Heart,
  Lightbulb,
  Rocket,
  Shield,
  Clock,
  Star,
  ArrowRight,
  Mail,
  CheckCircle,
  Sparkles,
  Code,
  Brain,
  Mic,
  Camera,
  ShoppingCart,
  Upload,
  Play,
  Pause,
  Languages,
  Store,
  Check,
  Share2,
} from 'lucide-react'

export default function EnhancedAboutUsPage() {
  const [currentMilestone, setCurrentMilestone] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentValue, setCurrentValue] = useState(0)
  const [activeLanguage, setActiveLanguage] = useState(0)

  // Language examples for showcase
  const languageExamples = [
    { flag: '🇪🇸', name: 'Spanish', example: 'Auriculares premium...' },
    { flag: '🇫🇷', name: 'French', example: 'Casque haut de gamme...' },
    { flag: '🇩🇪', name: 'German', example: 'Premium Kopfhörer...' },
    { flag: '🇮🇳', name: 'Hindi', example: 'प्रीमियम हेडफोन्स...' },
    { flag: '🇨🇳', name: 'Chinese', example: '高级耳机...' },
    { flag: '🇯🇵', name: 'Japanese', example: 'プレミアムヘッドホン...' },
  ]

  // ✅ UPDATED: Stats with eBay integration
  const stats = [
    {
      number: '99+',
      label: 'Languages Supported Globally',
      icon: Languages,
      description: 'Automatic detection and processing worldwide',
    },
    {
      number: '2 min',
      label: 'Voice to Live Products',
      icon: Zap,
      description: 'Average time from voice to published listing',
    },
    {
      number: 'OpenAI Vision',
      label: 'AI-Powered Image Analysis',
      icon: Award,
      description: 'Smart product analysis and description generation',
    },
    {
      number: 'Multi-Platforms',
      label: 'Amazon Optimization + Direct Publishing',
      icon: Store,
      description:
        'Professional Amazon listing optimization plus one-click direct publishing to Shopify, eBay, Instagram & Facebook with AI-optimized captions',
    },
  ]

  const values = [
    {
      icon: Lightbulb,
      title: "Tomorrow's AI, Today's Results",
      description:
        "We push the boundaries of what's possible with cutting-edge multilingual AI technology, delivering future-forward solutions that give entrepreneurs worldwide the competitive edge they need to succeed in today's rapidly evolving marketplace.",
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
    },
    {
      icon: Heart,
      title: 'From Garage to Global',
      description:
        "Every feature we build is designed with the entrepreneurial journey in mind. We understand your path because we've walked it too - from humble beginnings to global ambitions, navigating language barriers, cultural differences, and big dreams along the way.",
      color: 'from-pink-400 to-red-500',
      bgColor: 'from-pink-50 to-red-50',
    },
    {
      icon: Shield,
      title: 'Complexity Made Simple',
      description:
        'We take the most complex challenges - multilingual content creation, AI processing, global marketplace optimization - and make them effortlessly simple. Your business growth should be about vision and execution, not technical complexity.',
      color: 'from-green-400 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
    },
    {
      icon: Zap,
      title: 'Think It, Speak It, Sell It',
      description:
        'Transform your thoughts into global sales with the speed of speech. Our platform eliminates the traditional barriers between having a great product idea and selling it worldwide - just think it, speak it in any language, and start selling.',
      color: 'from-purple-400 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
    },
  ]

  // ✅ UPDATED: Milestones with eBay integration
  const milestones = [
    {
      phase: 'Discovery',
      title: 'The Global Problem Discovery',
      description:
        'As entrepreneurs ourselves, we spent countless hours and thousands of dollars creating product content in multiple languages that should have taken minutes.',
      icon: Lightbulb,
      color: 'from-blue-400 to-indigo-500',
    },
    {
      phase: 'Innovation',
      title: 'AI Vision Integration',
      description:
        'Breakthrough: We integrated OpenAI Vision to let AI actually "see" products and write descriptions based on actual visual details, in any target language.',
      icon: Camera,
      color: 'from-purple-400 to-pink-500',
    },
    {
      phase: 'Revolution',
      title: '🌍 Multilingual Voice-to-Content Launch (99+ Languages)',
      description:
        'Revolutionary multilingual voice recognition transforms natural speech in 99+ languages into professional, conversion-optimized content in your target market language.',
      icon: Languages,
      color: 'from-green-400 to-emerald-500',
    },
    {
      phase: 'Integration',
      title: 'Multi-Platform Integration: Optimization & Direct Publishing',
      description:
        'Launched comprehensive Amazon listing optimization with SEO best practices, plus groundbreaking one-click direct publishing to Shopify and eBay stores. Our eBay integration features real-time Taxonomy API category detection—a first in the industry.',
      icon: ShoppingCart,
      color: 'from-orange-400 to-red-500',
    },
    {
      phase: 'Innovation',
      title: '🏪 eBay AI-Powered Direct Listing Revolution',
      description:
        "World's first eBay integration with dual-token authentication, real-time Taxonomy API category suggestions, and automatic item specifics generation. AI analyzes content and suggests perfect eBay categories with all required fields automatically.",
      icon: Store,
      color: 'from-blue-400 to-cyan-500',
    },
    {
      phase: 'Social Commerce',
      title: '📱 Instagram & Facebook Direct Publishing Launch',
      description:
        'Revolutionary social media integration with direct Instagram & Facebook publishing featuring AI-optimized captions, smart hashtag generation, and engagement-driven content formatting for maximum reach and conversions.',
      icon: Share2,
      color: 'from-pink-400 to-purple-500',
    },
    {
      phase: 'Scale',
      title: 'Global Bulk Processing Revolution',
      description:
        'Background job processing for hundreds of products simultaneously in multiple languages across Amazon, Shopify, eBay, Instagram & Facebook - scale your global business while you sleep.',
      icon: Upload,
      color: 'from-cyan-400 to-blue-500',
    },
  ]

  const founder = {
    name: 'Srini Mamillapalli',
    role: 'Founder & CEO',
    bio: 'Global entrepreneur and AI enthusiast who experienced the multilingual content creation struggle firsthand. Built Listora AI to democratize professional content creation for entrepreneurs worldwide, regardless of their native language.',
    avatar: 'SM',
    color: 'from-indigo-500 to-purple-600',
    expertise: 'Multilingual AI Innovation & Global Entrepreneurship',
  }

  // ✅ UPDATED: Expertise with eBay integration
  const expertise = [
    {
      icon: Languages,
      title: 'Multilingual AI & Machine Learning',
      description:
        'Deep expertise in OpenAI Vision, multilingual voice recognition (99+ languages), natural language processing across cultures, eBay Taxonomy API integration, and social media content optimization.',
      color: 'from-blue-400 to-indigo-500',
    },
    {
      icon: Rocket,
      title: 'Global Product Development',
      description:
        'Full-stack development from concept to deployment, building scalable AI-powered platforms that serve entrepreneurs worldwide with Amazon, Shopify, eBay, Instagram & Facebook integrations.',
      color: 'from-green-400 to-emerald-500',
    },
    {
      icon: Globe,
      title: 'Global Entrepreneur Mindset',
      description:
        'Understanding real business challenges across cultures and building solutions that actually solve problems for international entrepreneurs selling on multiple platforms and social media.',
      color: 'from-purple-400 to-pink-500',
    },
    {
      icon: Code,
      title: 'Technical Architecture & Marketplace Integration',
      description:
        "Engineering enterprise-grade systems for multilingual voice processing, AI vision analysis, and bulk operations at scale. Deep expertise in marketplace APIs including eBay's dual-token authentication, Shopify's GraphQL architecture, and Meta's Graph API for Instagram & Facebook.",
      color: 'from-orange-400 to-red-500',
    },
  ]

  // ✅ UPDATED: Future roadmap with eBay enhancements
  const futureRoadmap = [
    {
      icon: Languages,
      title: 'Advanced Language Intelligence & Global Expansion',
      description:
        'Next-gen dialect recognition, cultural context AI, and hyper-local market optimization. Expanding direct publishing to international eBay marketplaces, additional e-commerce platforms, and emerging social commerce channels.',
      timeline: 'Coming Soon',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Global AI Analytics Dashboard with Multi-Platform Insights',
      description:
        'Intelligent insights to optimize your content performance across Amazon, Shopify, eBay, Instagram & Facebook in different markets and languages, with cultural sensitivity analysis, eBay category performance tracking, and social media engagement metrics.',
      timeline: 'In Development',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Global Team Collaboration & Advanced Platform Features',
      description:
        'Advanced team features for international agencies and larger businesses to collaborate on multilingual content creation seamlessly across all platforms, with eBay bulk listing management and social media campaign coordination.',
      timeline: 'Planned',
      color: 'from-green-500 to-emerald-500',
    },
  ]

  // Auto-rotate milestones
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMilestone((prev) => (prev + 1) % milestones.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Auto-rotate values
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentValue((prev) => (prev + 1) % values.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  // Auto-rotate languages
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveLanguage((prev) => (prev + 1) % languageExamples.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen">
      {/* Stripe-style dark gradient background - same as homepage */}
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

      {/* Enhanced Header - matching homepage style */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component - NOW ON LEFT */}
              <MobileNav currentPage="about" />

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
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Home
              </Link>
              <button
                onClick={() => (window.location.href = '/#features-section')}
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button
                onClick={() => (window.location.href = '/#pricing-section')}
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <Link
                href="/about"
                className="text-form-label text-indigo-600 border-b-2 border-indigo-600 px-1 pb-1"
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

      {/* Enhanced Hero Section - dark background */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Dark overlays for matching home page darkness */}
        <div className="absolute inset-0 -z-10">
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Gradient overlay for smooth transition */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            {/* Multilingual Highlight - updated for dark background */}
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 mb-8 shadow-lg">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <Languages className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-white">
                  🌍 99+ Languages Supported
                </div>
                <div className="text-sm text-white/80">
                  Speak any language • Get content in any target market
                </div>
              </div>
              <div className="text-2xl animate-pulse">
                {languageExamples[activeLanguage].flag}
              </div>
            </div>

            {/* Platform Highlight - updated for dark background */}
            <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 mb-8 shadow-lg">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">📦</span>
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">🛍️</span>
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">🏪</span>
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">📸</span>
                </div>
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-sky-500 rounded-full flex items-center justify-center border-2 border-white">
                  <span className="text-white text-xs">👍</span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-white">
                  Amazon Optimization | Direct Multi-Platform Publishing
                </div>
                <div className="text-sm text-white/80">
                  The only platform with multi-marketplace & social media
                  integration
                </div>
              </div>
            </div>

            {/* Enhanced Title - for dark background */}
            <h1 className="text-display-title mb-8 leading-tight">
              <span className="text-white drop-shadow-lg">
                We're Building the Future of
              </span>
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                Global Content Creation
              </span>
            </h1>
            {/* Enhanced Subtitle - for dark background */}
            <p
              className="text-body-comfortable text-white/90 mb-12 max-w-4xl mx-auto leading-relaxed drop-shadow-lg"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
            >
              At Listora AI, we believe every entrepreneur deserves access to
              enterprise-grade content creation tools in their native language.
              We're on a mission to democratize global e-commerce through
              cutting-edge multilingual AI—transforming your voice into
              optimized Amazon listings and publishing directly to Shopify,
              eBay, Instagram & Facebook with AI-optimized captions,
              <span className="font-semibold text-white">
                {' '}
                one voice at a time, in any language.
              </span>
            </p>

            {/* Language Showcase - Updated for dark background */}
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-5xl mx-auto mb-12 border border-white/20">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

              <div className="text-center mb-8">
                <h3 className="text-card-title text-white mb-2">
                  🌍 Our Global Vision in Action
                </h3>
                <p className="text-body-md text-white/80">
                  Entrepreneurs worldwide creating content in their language
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
                <p className="text-caption text-white/60">
                  + 93 more languages including Arabic, Russian, Korean,
                  Portuguese, Italian, Dutch, and many others
                </p>
              </div>
            </div>

            {/* Play Demo Button - updated for dark background */}
            <div className="flex justify-center mb-16">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="group flex items-center space-x-4 text-white hover:text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center group-hover:from-indigo-700 group-hover:to-purple-700 transition-all shadow-xl">
                  {isPlaying ? (
                    <Pause className="h-7 w-7 text-white" />
                  ) : (
                    <Play className="h-7 w-7 text-white ml-1" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold">
                    Watch Our Global Story
                  </div>
                  <div className="text-sm text-white/70">
                    3 min multilingual founder's journey
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards - for transition area */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-lg rounded-2xl p-8 text-center shadow-xl border border-white/50 hover:shadow-2xl transition-all hover:scale-105 group"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-heading-md font-bold text-gray-900">
                    {stat.number}
                  </div>
                  <div className="text-body-sm text-gray-700 font-semibold mb-2">
                    {stat.label}
                  </div>
                  <div className="text-caption text-gray-600">
                    {stat.description}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Mission Section - white background */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2 mb-6">
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="text-form-label text-blue-900">
                  Our Global Mission
                </span>
              </div>

              <h2 className="text-section-title font-semibold text-gray-900 mb-8">
                Empowering Global Entrepreneurs to
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {' '}
                  Compete Worldwide
                </span>
              </h2>

              <div className="space-y-6 text-body-md text-gray-700 leading-relaxed">
                <p>
                  We started Listora AI because we experienced the multilingual
                  frustration firsthand. As global entrepreneurs ourselves, we
                  spent countless hours and thousands of dollars creating
                  product content in multiple languages that should have taken
                  minutes.
                </p>
                <p>
                  There had to be a better way. That's when we realized AI could
                  transform not just how content is created, but{' '}
                  <strong>
                    who can create professional-quality content in any language
                  </strong>
                  . We're not just building software—we're breaking down
                  language barriers.
                </p>
                <p>
                  Today, a solo entrepreneur in Spain can speak naturally in
                  Spanish and instantly receive professionally optimized English
                  content for Amazon US, while publishing directly to their
                  Shopify, eBay stores, and posting to Instagram & Facebook with
                  AI-optimized captions. An entrepreneur in India can speak in
                  Hindi and generate German content for European
                  markets—competing with multinational corporations without
                  translation agencies or technical expertise.
                </p>
              </div>

              <div className="mt-10 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Languages className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-card-title text-gray-900 mb-3">
                      Our Global Vision
                    </h3>
                    <p className="text-body-md text-gray-700">
                      A world where every entrepreneur has access to the same
                      powerful multilingual content creation tools as Fortune
                      500 companies—democratizing global e-commerce through
                      AI-powered Amazon optimization and seamless direct
                      publishing to Shopify, eBay, Instagram & Facebook with
                      AI-optimized captions, eliminating language barriers
                      forever.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 rounded-3xl p-8 h-96 flex items-center justify-center relative overflow-hidden">
                {/* Animated Background Elements */}
                <div className="absolute top-4 left-4 w-16 h-16 bg-blue-400/20 rounded-full animate-pulse" />
                <div className="absolute bottom-8 right-8 w-12 h-12 bg-purple-400/20 rounded-full animate-pulse animation-delay-2000" />
                <div className="absolute top-1/2 left-8 w-8 h-8 bg-pink-400/20 rounded-full animate-pulse animation-delay-4000" />

                <div className="text-center relative z-10">
                  <div className="w-32 h-32 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                    <Languages className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <h3 className="text-heading-md font-bold text-gray-900 mb-4">
                    From Global Idea to Multi-Platform Impact
                  </h3>
                  <p className="text-body-md text-gray-700 max-w-sm">
                    Transforming the way businesses worldwide create and share
                    their stories across cultures through multilingual AI
                    innovation and revolutionary multi-platform publishing
                    including social media integration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section - subtle background */}
      <section className="py-24 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-purple-100 rounded-full px-4 py-2 mb-6">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-form-label text-purple-900">
                Our Global Journey
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-6">
              The Evolution of{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Multilingual Voice-Powered Content
              </span>
            </h2>
            <p className="text-body-comfortable text-gray-600 max-w-3xl mx-auto">
              From a simple multilingual frustration to a revolutionary platform
              that's transforming how global entrepreneurs create content in any
              language and publish across Amazon, Shopify, eBay, Instagram &
              Facebook.
            </p>
          </div>

          {/* Interactive Timeline */}
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-0.5 w-1 h-full bg-gradient-to-b from-blue-400 via-purple-500 to-pink-500 rounded-full" />

            <div className="space-y-16">
              {milestones.map((milestone, index) => {
                const Icon = milestone.icon
                const isActive = currentMilestone === index

                return (
                  <div
                    key={index}
                    className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Content */}
                    <div className="w-5/12">
                      <div
                        className={`bg-white rounded-2xl p-8 shadow-xl border border-gray-200 transition-all duration-500 ${
                          isActive
                            ? 'scale-105 shadow-2xl border-indigo-300'
                            : 'hover:shadow-lg hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div
                            className={`w-12 h-12 bg-gradient-to-r ${milestone.color} rounded-xl flex items-center justify-center`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="bg-gray-100 px-3 py-1 rounded-full">
                            <span className="text-form-label text-gray-700">
                              {milestone.phase}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-card-title text-gray-900 mb-3">
                          {milestone.title}
                        </h3>
                        <p className="text-body-md text-gray-600 leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Dot */}
                    <div className="w-2/12 flex justify-center">
                      <div
                        className={`w-6 h-6 rounded-full transition-all duration-500 ${
                          isActive
                            ? 'bg-indigo-600 scale-125 ring-4 ring-indigo-200'
                            : 'bg-gray-400'
                        }`}
                      />
                    </div>

                    {/* Spacer */}
                    <div className="w-5/12" />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Timeline Navigation */}
          <div className="flex justify-center space-x-2 mt-12">
            {milestones.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentMilestone(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  currentMilestone === index
                    ? 'bg-indigo-600 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Values Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-green-100 rounded-full px-4 py-2 mb-6">
              <Heart className="h-4 w-4 text-green-600" />
              <span className="text-form-label text-green-900">
                Our Global Values
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-6">
              What Drives Us
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {' '}
                Worldwide Every Day
              </span>
            </h2>
            <p className="text-body-comfortable text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do globally, from
              multilingual product development to international customer support
              across Amazon, Shopify, and eBay integrations.
            </p>
          </div>

          {/* Featured Value */}
          <div className="mb-16">
            <div
              className={`bg-gradient-to-br ${values[currentValue].bgColor} rounded-3xl p-12 border border-opacity-50 shadow-xl`}
            >
              <div className="max-w-4xl mx-auto text-center">
                <div
                  className={`w-20 h-20 bg-gradient-to-r ${values[currentValue].color} rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-xl`}
                >
                  {currentValue === 0 && (
                    <Globe className="h-10 w-10 text-white" />
                  )}
                  {currentValue === 1 && (
                    <Heart className="h-10 w-10 text-white" />
                  )}
                  {currentValue === 2 && (
                    <Shield className="h-10 w-10 text-white" />
                  )}
                  {currentValue === 3 && (
                    <Rocket className="h-10 w-10 text-white" />
                  )}
                </div>
                <h3 className="text-heading-md font-bold text-gray-900 mb-6">
                  {values[currentValue].title}
                </h3>
                <p className="text-body-comfortable text-gray-700 leading-relaxed">
                  {values[currentValue].description}
                </p>
              </div>
            </div>
          </div>

          {/* Value Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <button
                  key={index}
                  onClick={() => setCurrentValue(index)}
                  className={`text-left p-6 rounded-2xl transition-all border-2 ${
                    currentValue === index
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl scale-105'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:scale-102'
                  }`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-r ${value.color} rounded-xl mb-4 flex items-center justify-center`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-card-title text-gray-900 mb-2">
                    {value.title}
                  </h4>
                  <p className="text-body-sm text-gray-600">
                    Click to learn more
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Founder Section - subtle background */}
      <section className="py-24 bg-gradient-to-b from-gray-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-blue-100 rounded-full px-4 py-2 mb-6">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-form-label text-blue-900">
                Meet the Global Founder
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-6">
              Built by a Global Entrepreneur,
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {' '}
                for Global Entrepreneurs
              </span>
            </h2>
            <p className="text-body-comfortable text-gray-600 max-w-3xl mx-auto">
              Hi! I'm Srini, and I built Listora AI because I experienced the
              multilingual content creation struggle firsthand. Here's my global
              story and what drives me every day to serve entrepreneurs
              worldwide.
            </p>
          </div>

          {/* Founder Profile */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-white rounded-3xl p-12 shadow-2xl border border-gray-200 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-20 transform translate-x-32 -translate-y-32" />

              <div className="relative grid md:grid-cols-2 gap-12 items-center">
                <div className="text-center md:text-left">
                  <div
                    className={`w-32 h-32 bg-gradient-to-r ${founder.color} rounded-full flex items-center justify-center mx-auto md:mx-0 mb-8 text-white font-bold text-4xl shadow-2xl`}
                  >
                    {founder.avatar}
                  </div>
                  <h3 className="text-heading-md font-bold text-gray-900 mb-2">
                    {founder.name}
                  </h3>
                  <div className="text-body-comfortable text-indigo-600 font-semibold mb-4">
                    {founder.role}
                  </div>
                  <div className="text-body-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full mb-6 inline-block">
                    {founder.expertise}
                  </div>
                  <p className="text-body-md text-gray-700 leading-relaxed">
                    {founder.bio}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Languages className="h-5 w-5 text-blue-500 mr-2" />
                      The Global "Aha!" Moment
                    </h4>
                    <p className="text-body-md text-gray-700">
                      "I was spending 4-5 hours creating product descriptions in
                      multiple languages that should take minutes. That's when I
                      realized AI could transform not just how content is
                      created, but who can create it - in any language."
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Globe className="h-5 w-5 text-green-500 mr-2" />
                      The Global Mission
                    </h4>
                    <p className="text-body-md text-gray-700">
                      "Every entrepreneur deserves the same powerful tools as
                      enterprise companies. Our formula is simple: Multilingual
                      Voice Recognition (99+ languages) + Advanced AI + Amazon
                      Optimization + Direct Publishing to Shopify, eBay,
                      Instagram & Facebook = The future of global e-commerce."
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                      Try It Risk-Free in Any Language
                    </h4>
                    <p className="text-body-md text-gray-700">
                      "Start with 10 free multilingual content generations every
                      month. No credit card, no risk - just experience the power
                      of AI-driven content creation in 99+ languages with direct
                      publishing to all major platforms and social media."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expertise Areas */}
          <div className="text-center mb-12">
            <h3 className="text-heading-md font-bold text-gray-900 mb-4">
              Global Core Expertise & Skills
            </h3>
            <p className="text-body-md text-gray-600 max-w-2xl mx-auto">
              The diverse international background and skills that went into
              building Listora AI from the ground up for global entrepreneurs
              across Amazon, Shopify, eBay, Instagram & Facebook.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {expertise.map((skill, index) => {
              const Icon = skill.icon
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all hover:scale-105 group text-center"
                >
                  <div
                    className={`w-14 h-14 bg-gradient-to-r ${skill.color} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h4 className="text-card-title text-gray-900 mb-3">
                    {skill.title}
                  </h4>
                  <p className="text-body-sm text-gray-600 leading-relaxed">
                    {skill.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Personal Touch */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 max-w-3xl mx-auto border border-indigo-200">
              <h4 className="text-card-title font-bold text-gray-900 mb-4">
                Let's Connect Globally!
              </h4>
              <p className="text-body-md text-gray-700 mb-6">
                I love hearing from fellow entrepreneurs worldwide! Feel free to
                reach out with questions, feedback, or just to share your
                multilingual content creation journey from any corner of the
                world.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Get in Touch Globally
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-purple-100 rounded-full px-4 py-2 mb-6">
              <Rocket className="h-4 w-4 text-purple-600" />
              <span className="text-form-label text-purple-900">
                What's Next Globally
              </span>
            </div>
            <h2 className="text-section-title font-semibold text-gray-900 mb-6">
              The Global Future is
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {' '}
                Even Brighter
              </span>
            </h2>
            <p className="text-body-comfortable text-gray-600 mb-12 max-w-4xl mx-auto">
              We're just getting started globally. Here's what we're building
              next to make multilingual content creation even more powerful for
              entrepreneurs worldwide, breaking down more barriers and creating
              more opportunities across Amazon, Shopify, eBay, Instagram,
              Facebook, and beyond.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {futureRoadmap.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 shadow-xl border border-gray-200 hover:shadow-2xl transition-all hover:scale-105 group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-14 h-14 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-form-label font-semibold">
                      {item.timeline}
                    </div>
                  </div>
                  <h3 className="text-card-title font-bold text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-body-md text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-section-title font-bold text-white mb-6">
            Ready to Join Our Global Mission?
          </h2>
          <p className="text-body-comfortable text-indigo-100 mb-12 max-w-3xl mx-auto">
            Join the multilingual e-commerce revolution. Build your global
            business with enterprise-grade AI tools and join thousands of
            successful entrepreneurs who speak in 99+ languages, optimize for
            Amazon, and publish directly to Shopify, eBay, Instagram & Facebook
            with AI-optimized captions—all from a single platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <Link
              href="/signup"
              className="group bg-white hover:bg-gray-100 text-indigo-600 px-8 py-4 rounded-xl text-form-label font-bold transition-all transform hover:scale-105 shadow-2xl flex items-center"
            >
              <Languages className="mr-2 h-5 w-5 group-hover:animate-spin" />
              Start with 10 Free Multilingual Generations
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 rounded-xl text-form-label font-bold transition-all flex items-center"
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Our Global Team
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-body-md text-indigo-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>10 free multilingual generations monthly</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>99+ languages supported</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>
                Amazon Optimization + Direct Publishing to 4 Platforms
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Setup in 60 seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - matching homepage */}
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
                various e-commerce platforms and social media worldwide.
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
                    onClick={() =>
                      (window.location.href = '/#features-section')
                    }
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Multilingual Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (window.location.href = '/#pricing-section')}
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
              <h3 className="font-bold text-white mb-6">Company</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <span className="text-gray-500">Blog</span>
                </li>
                <li>
                  <span className="text-gray-500">Careers</span>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors cursor-pointer"
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
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Contact Support
                  </Link>
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
            </div>
          </div>
          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Listora AI. All rights reserved.</p>
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
      `}</style>
    </div>
  )
}
