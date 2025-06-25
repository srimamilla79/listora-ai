'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Home,
  Mail,
  Linkedin,
  Twitter,
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
  ChevronRight,
  Building2,
  Calendar,
  MapPin,
  Phone,
} from 'lucide-react'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function EnhancedAboutUsPage() {
  const [currentMilestone, setCurrentMilestone] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentValue, setCurrentValue] = useState(0)

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

  const stats = [
    {
      number: 'Thousands',
      label: 'Entrepreneurs Served',
      icon: Users,
      description: 'Active users creating content daily',
    },
    {
      number: '2 min',
      label: 'Voice to Live Products',
      icon: Zap,
      description: 'Average time from voice to published listing',
    },
    {
      number: '99.9%',
      label: 'Uptime Guarantee',
      icon: Award,
      description: 'Enterprise-grade reliability',
    },
    {
      number: '2 Platforms',
      label: 'Amazon Optimization + Shopify Direct',
      icon: Globe,
      description: 'Amazon optimization + Shopify direct publishing',
    },
  ]

  const values = [
    {
      icon: Lightbulb,
      title: 'Innovation First',
      description:
        "We push the boundaries of what's possible with AI technology, constantly innovating to give entrepreneurs the edge they need to succeed in today's competitive marketplace.",
      color: 'from-yellow-400 to-orange-500',
      bgColor: 'from-yellow-50 to-orange-50',
    },
    {
      icon: Heart,
      title: 'Entrepreneur Focused',
      description:
        "Every feature we build is designed with the entrepreneur in mind. We understand your challenges because we've been there too - late nights, tight budgets, and big dreams.",
      color: 'from-pink-400 to-red-500',
      bgColor: 'from-pink-50 to-red-50',
    },
    {
      icon: Shield,
      title: 'Trust & Reliability',
      description:
        'Your business depends on us, and we take that responsibility seriously. Enterprise-grade security, 99.9% uptime, and data protection you can count on.',
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'from-blue-50 to-indigo-50',
    },
    {
      icon: Rocket,
      title: 'Speed & Efficiency',
      description:
        'Time is money in business. Our platform helps you create professional content in seconds, not hours or days, so you can focus on growing your business.',
      color: 'from-green-400 to-emerald-500',
      bgColor: 'from-green-50 to-emerald-50',
    },
  ]

  const milestones = [
    {
      phase: 'Discovery',
      title: 'The Problem Discovery',
      description:
        'As entrepreneurs ourselves, we spent countless hours and thousands of dollars creating product content that should have taken minutes.',
      icon: Lightbulb,
      color: 'from-blue-400 to-indigo-500',
    },
    {
      phase: 'Innovation',
      title: 'AI Vision Integration',
      description:
        'Breakthrough: We integrated OpenAI Vision to let AI actually "see" products and write descriptions based on actual visual details.',
      icon: Camera,
      color: 'from-purple-400 to-pink-500',
    },
    {
      phase: 'Revolution',
      title: 'Voice-to-Content Launch',
      description:
        'Revolutionary voice recognition transforms natural speech into professional, conversion-optimized content in real-time.',
      icon: Mic,
      color: 'from-green-400 to-emerald-500',
    },
    {
      phase: 'Integration',
      title: 'Amazon Optimization + Shopify Publishing',
      description:
        'Professional Amazon listing optimization with step-by-step guidance and optimized data, plus direct one-click publishing to Shopify with seamless seller account integration.',
      icon: ShoppingCart,
      color: 'from-orange-400 to-red-500',
    },
    {
      phase: 'Scale',
      title: 'Bulk Processing Revolution',
      description:
        'Background job processing for hundreds of products simultaneously - scale your business while you sleep.',
      icon: Upload,
      color: 'from-cyan-400 to-blue-500',
    },
  ]

  const founder = {
    name: 'Srini Mamillapalli',
    role: 'Founder & CEO',
    bio: 'Entrepreneur and AI enthusiast who experienced the content creation struggle firsthand. Built Listora AI to democratize professional content creation for entrepreneurs worldwide.',
    avatar: 'SM',
    color: 'from-indigo-500 to-purple-600',
    expertise: 'AI Innovation & Entrepreneurship',
  }

  const expertise = [
    {
      icon: Brain,
      title: 'AI & Machine Learning',
      description:
        'Deep expertise in OpenAI Vision, voice recognition, and natural language processing.',
      color: 'from-blue-400 to-indigo-500',
    },
    {
      icon: Rocket,
      title: 'Product Development',
      description:
        'Full-stack development from concept to deployment, building scalable AI-powered platforms.',
      color: 'from-green-400 to-emerald-500',
    },
    {
      icon: Target,
      title: 'Entrepreneur Mindset',
      description:
        'Understanding real business challenges and building solutions that actually solve problems.',
      color: 'from-purple-400 to-pink-500',
    },
    {
      icon: Code,
      title: 'Technical Leadership',
      description:
        'Architecting robust systems that handle voice processing, image analysis, and bulk operations.',
      color: 'from-orange-400 to-red-500',
    },
  ]

  const futureRoadmap = [
    {
      icon: Globe,
      title: 'Global Expansion',
      description:
        'Support for 50+ languages and local market optimization for entrepreneurs worldwide.',
      timeline: 'Coming Soon',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'AI Analytics Dashboard',
      description:
        'Intelligent insights to optimize your content performance and maximize conversions with real-time data.',
      timeline: 'In Development',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description:
        'Advanced team features for agencies and larger businesses to collaborate on content creation seamlessly.',
      timeline: 'Planned',
      color: 'from-green-500 to-emerald-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header - UPDATED WITH CONSISTENT NAVIGATION */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Always clickable to home */}
            <Link
              href="/"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <ListoraAILogo size="header" showText={true} />
            </Link>

            {/* Desktop Navigation - Always visible */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Home
              </Link>
              <Link
                href="/#features-section"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Features
              </Link>
              <Link
                href="/#pricing-section"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-indigo-600 font-medium border-b-2 border-indigo-600"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Contact
              </Link>
            </nav>

            {/* Action Buttons - Always visible */}
            <div className="flex items-center space-x-3">
              {/* Login Button */}
              <Link
                href="/login"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Login
              </Link>

              {/* Book Demo Button */}
              <Link
                href="/demo"
                className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Book Demo
              </Link>

              {/* Start Free Trial Button */}
              <Link
                href="/signup"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-gray-600 hover:text-indigo-600 p-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
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
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-6 py-3 mb-8">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                Founded by entrepreneurs, built for entrepreneurs
              </span>
              <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" />
            </div>
            {/* Free Tier Highlight */}
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl px-6 py-4 mb-8 shadow-lg">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-lg font-bold text-green-800">
                  10 Free Generations Monthly
                </div>
                <div className="text-sm text-green-700">
                  No credit card required • Test our platform risk-free
                </div>
              </div>
            </div>
            {/* Enhanced Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              We're Building the Future of
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                Content Creation
              </span>
            </h1>
            {/* Enhanced Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              At Listora AI, we believe every entrepreneur deserves access to
              professional-grade content creation tools. We're on a mission to
              democratize marketing through artificial intelligence,
              <span className="font-semibold text-gray-800">
                {' '}
                one voice at a time.
              </span>
            </p>

            {/* Play Demo Button */}
            <div className="flex justify-center mb-16">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="group flex items-center space-x-4 text-indigo-600 hover:text-indigo-700 font-semibold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center group-hover:from-indigo-700 group-hover:to-purple-700 transition-all shadow-xl">
                  {isPlaying ? (
                    <Pause className="h-7 w-7 text-white" />
                  ) : (
                    <Play className="h-7 w-7 text-white ml-1" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold">Watch Our Story</div>
                  <div className="text-sm text-gray-600">
                    3 min founder's journey
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
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
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-lg font-semibold text-gray-800 mb-2">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.description}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Mission Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-6">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Our Mission
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                Empowering Entrepreneurs to
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {' '}
                  Compete with Giants
                </span>
              </h2>

              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  We started Listora AI because we experienced the frustration
                  firsthand. As entrepreneurs ourselves, we spent countless
                  hours and thousands of dollars creating product content that
                  should have taken minutes.
                </p>
                <p>
                  There had to be a better way. That's when we realized AI could
                  transform not just how content is created, but{' '}
                  <strong>who can create professional-quality content</strong>.
                  We're not just building software—we're leveling the playing
                  field.
                </p>
                <p>
                  Today, a solo entrepreneur with a great product idea can
                  compete with massive corporations. They can create content
                  that converts, optimize for Amazon and Shopify, and scale
                  their business without hiring expensive agencies or learning
                  complex tools.
                </p>
              </div>

              <div className="mt-10 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      Our Vision
                    </h3>
                    <p className="text-gray-700">
                      A world where every entrepreneur has access to the same
                      powerful content creation tools as the biggest companies,
                      democratizing success through artificial intelligence.
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
                    <Lightbulb className="w-16 h-16 text-white animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    From Idea to Impact
                  </h3>
                  <p className="text-gray-700 max-w-sm">
                    Transforming the way businesses create and share their
                    stories with the world through AI innovation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Timeline Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2 mb-6">
              <Clock className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                Our Journey
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              The Evolution of
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Voice-Powered Content
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From a simple frustration to a revolutionary platform that's
              transforming how entrepreneurs create content.
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
                            <span className="text-sm font-bold text-gray-700">
                              {milestone.phase}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {milestone.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
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
            <div className="inline-flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-6">
              <Heart className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Our Values
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What Drives Us
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {' '}
                Every Day
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do, from product development
              to customer support.
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
                    <Lightbulb className="h-10 w-10 text-white" />
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
                <h3 className="text-3xl font-bold text-gray-900 mb-6">
                  {values[currentValue].title}
                </h3>
                <p className="text-xl text-gray-700 leading-relaxed">
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
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    {value.title}
                  </h4>
                  <p className="text-sm text-gray-600">Click to learn more</p>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enhanced Founder Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 mb-6">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Meet the Founder
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built by an Entrepreneur,
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {' '}
                for Entrepreneurs
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hi! I'm Srini, and I built Listora AI because I experienced the
              content creation struggle firsthand. Here's my story and what
              drives me every day.
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
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {founder.name}
                  </h3>
                  <div className="text-xl text-indigo-600 font-semibold mb-4">
                    {founder.role}
                  </div>
                  <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full mb-6 inline-block">
                    {founder.expertise}
                  </div>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    {founder.bio}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                      The "Aha!" Moment
                    </h4>
                    <p className="text-gray-700 text-sm">
                      "I was spending 4-5 hours writing product descriptions
                      that should take minutes. That's when I realized AI could
                      transform not just how content is created, but who can
                      create it."
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Target className="h-5 w-5 text-green-500 mr-2" />
                      The Mission
                    </h4>
                    <p className="text-gray-700 text-sm">
                      "Every entrepreneur deserves the same powerful tools as
                      big corporations. Voice + AI + Direct Amazon & Shopify
                      Publishing = The future of content creation."
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                      Try It Risk-Free
                    </h4>
                    <p className="text-gray-700 text-sm">
                      "Start with 10 free content generations every month. No
                      credit card, no risk - just experience the power of
                      AI-driven content creation."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expertise Areas */}
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Core Expertise & Skills
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The diverse background and skills that went into building Listora
              AI from the ground up.
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
                  <h4 className="text-lg font-bold text-gray-900 mb-3">
                    {skill.title}
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {skill.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Personal Touch */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 max-w-3xl mx-auto border border-indigo-200">
              <h4 className="text-xl font-bold text-gray-900 mb-4">
                Let's Connect!
              </h4>
              <p className="text-gray-700 mb-6">
                I love hearing from fellow entrepreneurs! Feel free to reach out
                with questions, feedback, or just to share your content creation
                journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Get in Touch
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Future Vision Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2 mb-6">
              <Rocket className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                What's Next
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              The Future is
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {' '}
                Even Brighter
              </span>
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-4xl mx-auto">
              We're just getting started. Here's what we're building next to
              make content creation even more powerful for entrepreneurs
              worldwide.
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
                    <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {item.timeline}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Join Our Mission?
          </h2>
          <p className="text-xl text-indigo-100 mb-12 max-w-3xl mx-auto">
            Be part of the content creation revolution. Start building your
            business with AI-powered tools today and join thousands of
            successful entrepreneurs.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
            <Link
              href="/signup"
              className="group bg-white hover:bg-gray-100 text-indigo-600 px-8 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 shadow-2xl flex items-center"
            >
              <Sparkles className="mr-2 h-5 w-5 group-hover:animate-spin" />
              Start with 10 Free Generations
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center"
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Our Team
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-8 text-indigo-100">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>10 free generations monthly</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Setup in 60 seconds</span>
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
                Empowering entrepreneurs with AI-powered content creation tools.
                From voice to professional content in seconds, with Amazon
                Optimization & Direct Shopify publishing.
              </p>
              <div className="flex space-x-4">
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <Twitter className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <Linkedin className="w-5 h-5" />
                </button>
                <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors">
                  <Mail className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing-section"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    API
                  </button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Integrations
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Careers
                  </button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Blog
                  </button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Press
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button className="hover:text-white transition-colors">
                    Help Center
                  </button>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Privacy
                  </button>
                </li>
                <li>
                  <button className="hover:text-white transition-colors">
                    Terms
                  </button>
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
