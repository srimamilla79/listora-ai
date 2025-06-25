'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Send,
  User,
  Mail,
  Building,
  Globe,
  Phone,
  MessageSquare,
  Zap,
  Shield,
  Star,
  ArrowRight,
  Play,
  Mic,
  Camera,
  Upload,
  ShoppingCart,
  Target,
  BarChart3,
  Rocket,
  Award,
} from 'lucide-react'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function BookDemoPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    country: '',
    useCase: '',
    currentSolution: '',
    message: '',
    preferredTime: '',
    hearAboutUs: '',
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

    if (!formData.firstName.trim()) errors.firstName = 'First name is required'
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required'
    if (!formData.email.trim()) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      errors.email = 'Email is invalid'
    if (!formData.company.trim()) errors.company = 'Company is required'
    if (!formData.country.trim()) errors.country = 'Country is required'
    if (!formData.useCase.trim()) errors.useCase = 'Use case is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Prepare demo request data
      const demoRequestData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        subject: 'demo-request',
        priority: 'high',
        message: `
Demo Request Details:

Contact Information:
- Name: ${formData.firstName} ${formData.lastName}
- Email: ${formData.email}
- Phone: ${formData.phone || 'Not provided'}
- Company: ${formData.company}
- Country: ${formData.country}

Company Information:
- Current Solution: ${formData.currentSolution || 'Not specified'}
- How they heard about us: ${formData.hearAboutUs || 'Not specified'}

Demo Requirements:
- Primary Use Case: ${formData.useCase}
- Preferred Demo Time: ${formData.preferredTime || 'Flexible'}
- Additional Message: ${formData.message || 'None'}

This is a demo request - please follow up soon to schedule a personalized demonstration.
        `.trim(),
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demoRequestData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit demo request')
      }

      setSubmitted(true)
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        phone: '',
        country: '',
        useCase: '',
        currentSolution: '',
        message: '',
        preferredTime: '',
        hearAboutUs: '',
      })
      setFormErrors({})

      // Reset success state after 10 seconds
      setTimeout(() => setSubmitted(false), 10000)
    } catch (error) {
      console.error('Demo request error:', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to submit demo request. Please try again.'
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

  const useCases = [
    { value: '', label: "What's your primary use case?" },
    {
      value: 'product-descriptions',
      label: '📝 Product Description Generation',
    },
    { value: 'amazon-optimization', label: '📦 Amazon Listing Optimization' },
    { value: 'shopify-integration', label: '🛍️ Shopify Store Management' },
    { value: 'bulk-processing', label: '📊 Bulk Product Processing' },
    { value: 'voice-content', label: '🎤 Voice-to-Content Creation' },
    { value: 'image-analysis', label: '📷 AI Image Analysis' },
    { value: 'multi-platform', label: '🌐 Multi-Platform Publishing' },
    { value: 'scale-business', label: '🚀 Scale Content Operations' },
    { value: 'other', label: '🔍 Other (please specify in message)' },
  ]

  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Netherlands',
    'Sweden',
    'Denmark',
    'Norway',
    'Finland',
    'Spain',
    'Italy',
    'Portugal',
    'Switzerland',
    'Austria',
    'Belgium',
    'Ireland',
    'New Zealand',
    'Japan',
    'South Korea',
    'Singapore',
    'Hong Kong',
    'India',
    'Brazil',
    'Mexico',
    'Argentina',
    'Chile',
    'South Africa',
    'Israel',
    'Other',
  ]

  const preferredTimes = [
    { value: '', label: 'When would you prefer the demo?' },
    { value: 'asap', label: '🚀 ASAP - Within 24 hours' },
    { value: 'this-week', label: '📅 This week' },
    { value: 'next-week', label: '🗓️ Next week' },
    { value: 'flexible', label: "⏰ I'm flexible" },
    { value: 'specific', label: "📋 I'll specify in message" },
  ]

  const hearAboutUsOptions = [
    { value: '', label: 'How did you hear about us?' },
    { value: 'google-search', label: '🔍 Google Search' },
    { value: 'social-media', label: '📱 Social Media' },
    { value: 'word-of-mouth', label: '👥 Word of Mouth' },
    { value: 'industry-publication', label: '📰 Industry Publication' },
    { value: 'conference-event', label: '🎪 Conference/Event' },
    { value: 'partner-referral', label: '🤝 Partner Referral' },
    { value: 'online-ad', label: '📺 Online Advertisement' },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
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

              {/* Book Demo Button - Active State */}
              <Link
                href="/demo"
                className="border-2 border-indigo-600 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg font-medium shadow-lg"
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
      <section className="relative py-16 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 via-purple-600/5 to-pink-600/5" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-full px-4 py-2 mb-8">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                Request Your Personalized Demo
              </span>
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Schedule Your
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {' '}
                Personal Demo
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              See how Listora AI can transform your content creation process.
              Fill out the form below and our team will contact you soon to
              schedule your demonstration.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Demo Information */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                What You'll See in Your Demo
              </h2>

              <div className="space-y-6">
                {[
                  {
                    icon: Play,
                    title: 'Live Voice-to-Content',
                    description:
                      'Speak about your product and watch AI create professional copy instantly',
                    color: 'from-red-500 to-red-600',
                  },
                  {
                    icon: Camera,
                    title: 'AI Vision Analysis',
                    description:
                      'Upload your product image and see OpenAI Vision extract features automatically',
                    color: 'from-purple-500 to-purple-600',
                  },
                  {
                    icon: Target,
                    title: 'Platform Optimization',
                    description:
                      'See content optimized for Amazon listings and published directly to Shopify',
                    color: 'from-orange-500 to-green-600',
                  },
                  {
                    icon: BarChart3,
                    title: 'Bulk Processing Demo',
                    description:
                      'Watch background automation process multiple products simultaneously',
                    color: 'from-blue-500 to-indigo-600',
                  },
                  {
                    icon: MessageSquare,
                    title: 'Q&A & Custom Setup',
                    description:
                      'Discuss your specific needs and see how Listora AI fits your workflow',
                    color: 'from-green-500 to-emerald-600',
                  },
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-10 h-10 bg-gradient-to-r ${item.color} rounded-xl flex items-center justify-center flex-shrink-0`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="h-5 w-5 mr-2 text-indigo-600" />
                Why Book a Demo?
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    See real results with your actual products
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    Get personalized setup recommendations
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    Learn advanced automation techniques
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    Understand ROI for your specific case
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">
                    Ask questions from AI experts
                  </span>
                </div>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">
                  100% No-Pressure Demo
                </h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Our demos are educational, not sales pitches. We'll show you
                exactly how Listora AI works and answer all your questions.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Average response time: 2 hours</span>
              </div>
            </div>
          </div>

          {/* Demo Request Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Request Your Personal Demo
                </h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll schedule your personalized
                  demonstration soon.
                </p>
              </div>

              {submitted ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                    Demo Request Received! 🎉
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="text-left space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-800 font-medium">
                          Demo request submitted successfully
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-800">
                          We'll contact you soon to schedule
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-purple-600" />
                        <span className="text-purple-800">
                          Confirmation email sent to {formData.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Our demo specialists will reach out to schedule your
                    personalized demonstration. In the meantime, feel free to
                    explore our platform or start your free trial.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Request Another Demo
                    </button>
                    <Link
                      href="/signup"
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg flex items-center"
                    >
                      Start Free Trial Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm">{submitError}</p>
                    </div>
                  )}

                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="firstName"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          required
                          value={formData.firstName}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.firstName
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                          placeholder="John"
                        />
                        {formErrors.firstName && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.firstName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="lastName"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          required
                          value={formData.lastName}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.lastName
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                          placeholder="Smith"
                        />
                        {formErrors.lastName && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.lastName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Business Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.email
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                          placeholder="john@company.com"
                        />
                        {formErrors.email && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.email}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Company Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          required
                          value={formData.company}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.company
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                          placeholder="Your Company Inc."
                        />
                        {formErrors.company && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.company}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="country"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Country <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="country"
                          name="country"
                          required
                          value={formData.country}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.country
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        >
                          <option value="">Select your country...</option>
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </select>
                        {formErrors.country && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.country}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Demo Requirements */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Demo Requirements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="useCase"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Primary Use Case{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="useCase"
                          name="useCase"
                          required
                          value={formData.useCase}
                          onChange={handleChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                            formErrors.useCase
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300 focus:border-indigo-500'
                          }`}
                        >
                          {useCases.map((useCase) => (
                            <option key={useCase.value} value={useCase.value}>
                              {useCase.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.useCase && (
                          <p className="mt-1 text-sm text-red-600">
                            {formErrors.useCase}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="preferredTime"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Preferred Demo Time
                        </label>
                        <select
                          id="preferredTime"
                          name="preferredTime"
                          value={formData.preferredTime}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                          {preferredTimes.map((time) => (
                            <option key={time.value} value={time.value}>
                              {time.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="currentSolution"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Current Content Solution
                        </label>
                        <input
                          type="text"
                          id="currentSolution"
                          name="currentSolution"
                          value={formData.currentSolution}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="e.g., Manual writing, Jasper, Copy.ai, etc."
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="hearAboutUs"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          How did you hear about us?
                        </label>
                        <select
                          id="hearAboutUs"
                          name="hearAboutUs"
                          value={formData.hearAboutUs}
                          onChange={handleChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                          {hearAboutUsOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Additional Information
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                      placeholder="Tell us about your specific needs, questions, or anything else you'd like us to cover in the demo..."
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {formData.message.length}/500 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-between pt-6">
                    <p className="text-sm text-gray-500">
                      <span className="text-red-500">*</span> Required fields
                    </p>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 shadow-lg"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Calendar className="mr-3 h-5 w-5" />
                          Request Demo
                          <ArrowRight className="ml-3 h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Privacy Notice */}
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-600">
                      By submitting this form, you agree to our{' '}
                      <Link
                        href="/privacy"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        Privacy Policy
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/terms"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        Terms of Service
                      </Link>
                      . We'll only use your information to schedule and conduct
                      your demo.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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
                images for various e-commerce platforms.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6">Product</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/demo"
                    className="hover:text-white transition-colors"
                  >
                    Request Demo
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6">Company</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white mb-6">Support</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
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
      `}</style>
    </div>
  )
}
