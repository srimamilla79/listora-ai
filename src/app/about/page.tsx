'use client'

import React from 'react'
import {
  Sparkles,
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
} from 'lucide-react'

export default function AboutUsPage() {
  const stats = [
    { number: 'AI-Powered', label: 'Content Generation', icon: Zap },
    { number: 'Multi-Platform', label: 'Optimization', icon: Users },
    { number: '24/7', label: 'Reliable Service', icon: Award },
    { number: 'Multiple Platforms', label: 'Supported', icon: Globe },
  ]

  const values = [
    {
      icon: Lightbulb,
      title: 'Innovation First',
      description:
        "We push the boundaries of what's possible with AI technology, constantly innovating to give entrepreneurs the edge they need to succeed.",
    },
    {
      icon: Heart,
      title: 'Entrepreneur Focused',
      description:
        "Every feature we build is designed with the entrepreneur in mind. We understand your challenges because we've been there too.",
    },
    {
      icon: Shield,
      title: 'Trust & Reliability',
      description:
        'Your business depends on us, and we take that responsibility seriously. Enterprise-grade security and 99.9% uptime guaranteed.',
    },
    {
      icon: Rocket,
      title: 'Speed & Efficiency',
      description:
        'Time is money in business. Our platform helps you create professional content in seconds, not hours or days.',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header/Navigation */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
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
            <button
              onClick={() => (window.location.href = '/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              We're Building the Future of
              <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Content Creation
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-4xl mx-auto leading-relaxed">
              At Listora AI, we believe every entrepreneur deserves access to
              professional-grade content creation tools. We're on a mission to
              democratize marketing through artificial intelligence.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-lg"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-gray-600">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Our Mission: Empowering Entrepreneurs
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
                  transform not just how content is created, but who can create
                  professional-quality content. We're not just building
                  software—we're leveling the playing field.
                </p>
                <p>
                  Today, a solo entrepreneur with a great product idea can
                  compete with massive corporations. They can create content
                  that converts, optimize for every platform, and scale their
                  business without hiring expensive agencies or learning complex
                  tools.
                </p>
              </div>
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-start space-x-4">
                  <Target className="w-8 h-8 text-indigo-600 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
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
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lightbulb className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    From Idea to Impact
                  </h3>
                  <p className="text-gray-600">
                    Transforming the way businesses create and share their
                    stories with the world.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              These principles guide everything we do, from product development
              to customer support.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-xl hover:shadow-lg transition-all border border-gray-100"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Future Vision Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              What's Next?
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-4xl mx-auto">
              We're just getting started. Here's what we're building next to
              make content creation even more powerful for entrepreneurs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Global Expansion
                </h3>
                <p className="text-gray-600">
                  Support for 50+ languages and local market optimization for
                  entrepreneurs worldwide.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  AI Analytics
                </h3>
                <p className="text-gray-600">
                  Intelligent insights to optimize your content performance and
                  maximize conversions.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Real-time Collaboration
                </h3>
                <p className="text-gray-600">
                  Team features for agencies and larger businesses to
                  collaborate on content creation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Join Our Mission?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Be part of the content creation revolution. Start building your
            business with AI-powered tools today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => (window.location.href = '/signup')}
              className="bg-white hover:bg-gray-100 text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-xl flex items-center justify-center"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
            <button
              onClick={() => (window.location.href = '/contact')}
              className="border-2 border-white hover:bg-white hover:text-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all flex items-center justify-center"
            >
              Contact Our Team
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
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
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Empowering entrepreneurs with AI-powered content creation tools.
              </p>
              <div className="flex space-x-4">
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <button
                    onClick={() => (window.location.href = '/')}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => (window.location.href = '/#pricing-section')}
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </button>
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
                  <button className="hover:text-white transition-colors">
                    About
                  </button>
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
                  <button className="hover:text-white transition-colors">
                    Contact
                  </button>
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
    </div>
  )
}
