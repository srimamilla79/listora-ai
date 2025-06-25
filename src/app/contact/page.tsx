'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mail,
  MessageSquare,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  Send,
  User,
  HelpCircle,
  Zap,
  Shield,
  Star,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function EnhancedContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    priority: 'normal',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formErrors, setFormErrors] = useState<any>({})
  const [submitError, setSubmitError] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const validateForm = () => {
    const errors: any = {}

    if (!formData.name.trim()) errors.name = 'Name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      errors.email = 'Email is invalid'
    if (!formData.subject.trim()) errors.subject = 'Subject is required'
    if (!formData.message.trim()) errors.message = 'Message is required'
    else if (formData.message.trim().length < 10)
      errors.message = 'Message must be at least 10 characters'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSubmitted(true)
      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
        priority: 'normal',
      })
      setFormErrors({})

      // Reset success state after 8 seconds
      setTimeout(() => setSubmitted(false), 8000)
    } catch (error) {
      console.error('Contact form error:', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to send message. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev: any) => ({ ...prev, [name]: '' }))
    }
    // Clear submit error
    if (submitError) {
      setSubmitError('')
    }
  }

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      value: 'support@listora.ai',
      description: 'Get help with your account, billing, or technical issues',
      responseTime: 'Within 24 hours',
      available: '24/7',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: MessageSquare,
      title: 'Sales & Partnerships',
      value: 'sales@listora.ai',
      description: 'Enterprise plans, custom solutions, and partnerships',
      responseTime: 'Within 4 hours',
      available: 'Business hours',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: HelpCircle,
      title: 'Help Center',
      value: 'Browse FAQs',
      description: 'Self-service guides, tutorials, and common questions',
      responseTime: 'Instant access',
      available: '24/7',
      color: 'from-purple-500 to-purple-600',
      isLink: true,
      href: '/help',
    },
  ]

  const subjectOptions = [
    { value: '', label: 'Select a subject...' },
    { value: 'technical-support', label: '🔧 Technical Support' },
    { value: 'billing-account', label: '💳 Billing & Account' },
    { value: 'feature-request', label: '💡 Feature Request' },
    { value: 'bug-report', label: '🐛 Bug Report' },
    { value: 'partnership', label: '🤝 Partnership Inquiry' },
    { value: 'enterprise', label: '🏢 Enterprise Solutions' },
    { value: 'feedback', label: '📝 General Feedback' },
    { value: 'other', label: '📋 Other' },
  ]

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
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
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-indigo-600 font-medium border-b-2 border-indigo-600"
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

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            We're Here to Help
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Have questions about Listora AI? Our team is ready to help you
            succeed with AI-powered content generation.
          </p>

          {/* Quick Stats */}
          <div className="flex items-center justify-center space-x-8 text-sm text-gray-600 mb-8">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Average 4-hour response time</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>99% customer satisfaction</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>24/7 support available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Contact Information
              </h2>

              <div className="space-y-6">
                {contactMethods.map((method, index) => {
                  const Icon = method.icon
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-12 h-12 bg-gradient-to-r ${method.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {method.title}
                          </h3>
                          {method.isLink ? (
                            <Link
                              href={method.href || '#'}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            >
                              {method.value}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Link>
                          ) : (
                            <a
                              href={`mailto:${method.value}`}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              {method.value}
                            </a>
                          )}
                          <p className="text-gray-600 text-sm mt-1 mb-3">
                            {method.description}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {method.responseTime}
                            </span>
                            <span>{method.available}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Office Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-gray-600" />
                Our Location
              </h3>
              <div className="text-gray-600 space-y-1">
                <p className="font-medium">Listora AI Headquarters</p>
                <p>United States</p>
                <p className="text-sm">Serving customers worldwide</p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-4">
                Why Choose Our Support?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">Fast response times</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">Expert technical team</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">Secure communication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-700">Personalized solutions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Send us a Message
              </h2>
              <p className="text-gray-600 mb-8">
                Fill out the form below and we'll get back to you as soon as
                possible.
              </p>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Thank you for contacting us. We'll get back to you within
                    4-24 hours depending on your inquiry type.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          formErrors.name
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="Your full name"
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          formErrors.email
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder="your@email.com"
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="subject"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          formErrors.subject
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                      >
                        {subjectOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {formErrors.subject && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.subject}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="priority"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Priority Level
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="low">🟢 Low - General inquiry</option>
                        <option value="normal">
                          🟡 Normal - Standard request
                        </option>
                        <option value="high">🟠 High - Urgent issue</option>
                        <option value="critical">
                          🔴 Critical - Service down
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none ${
                        formErrors.message
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 focus:border-blue-500'
                      }`}
                      placeholder="Please provide as much detail as possible about your question or issue..."
                    />
                    <div className="flex justify-between items-center mt-2">
                      {formErrors.message ? (
                        <p className="text-sm text-red-600">
                          {formErrors.message}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {formData.message.length}/500 characters
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-gray-500">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Sending Message...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Help Resources */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
            <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
              Check out our comprehensive help center with tutorials, guides,
              and frequently asked questions to get answers instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/help"
                className="inline-flex items-center bg-white text-indigo-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Visit Help Center
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <span className="inline-flex items-center border border-white/50 text-white/70 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                Watch Tutorials
                <span className="ml-2 text-xs">(Coming Soon)</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <ListoraAILogo size="sm" showText={false} />
                <span className="text-lg font-semibold text-gray-900">
                  Listora AI
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                Empowering entrepreneurs with AI-powered content creation tools.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/" className="hover:text-blue-600">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-blue-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/help" className="hover:text-blue-600">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/about" className="hover:text-blue-600">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-blue-600">
                    Contact
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400 cursor-not-allowed">
                    Careers
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/privacy" className="hover:text-blue-600">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-600">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <span className="text-gray-400 cursor-not-allowed">
                    Security
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2025 Listora AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
