'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import DashboardPageWrapper from '@/components/layout/DashboardPageWrapper'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import {
  HelpCircle,
  Mail,
  Video,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Store,
  Send,
  Loader,
  PlayCircle,
} from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
}

export default function SupportPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState('all')
  const [showVideos, setShowVideos] = useState(false)

  // Contact form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // User state
  const [user, setUser] = useState<any>(null)
  const [supabase, setSupabase] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [mounted])

  useEffect(() => {
    if (!supabase || !mounted) return

    let isMounted = true

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (isMounted) {
          setUser(session?.user || null)
          setAuthChecked(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        if (isMounted) {
          setUser(null)
          setAuthChecked(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (isMounted) {
        setUser(session?.user || null)
        setAuthChecked(true)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase, mounted])

  const faqItems: FAQItem[] = [
    // Getting Started
    {
      id: '1',
      category: 'getting-started',
      question: 'How do I generate my first product listing?',
      answer:
        'To generate your first product listing, go to the Generate page and enter your product details including title, description, and key features. Select the content sections you want to generate such as Product Title, Key Selling Points, Product Description, Instagram Caption, Blog Introduction, and Call to Action. Upload a product image for better context. Select your target platforms (Amazon, Shopify, eBay, or Etsy) and click "Generate Content". Our AI will create optimized listings for each platform and display the content in the Complete Content Package section.',
    },
    {
      id: '2',
      category: 'getting-started',
      question: 'What information do I need to provide for content generation?',
      answer:
        "You'll need: Product name, key features or specifications, target audience, and any unique selling points. The more detailed information you provide, the better the AI-generated content will be. You can also upload product images for more contextual generation.",
    },
    {
      id: '3',
      category: 'getting-started',
      question: 'How long does content generation take?',
      answer:
        "Content generation typically takes 30-60 seconds depending on the complexity and number of platforms selected. For single product generation on the Generate page, you'll need to wait for completion. However, with Bulk Upload (available on Business plans and above), you can upload multiple products and continue working on other tasks while they generate in the background. You'll see a real-time progress indicator during generation for bulk processing.",
    },

    // Platforms
    {
      id: '4',
      category: 'platforms',
      question: 'Which e-commerce platforms does Listora support?',
      answer:
        "Listora generates comprehensive content for all types of products including Product Titles, Key Selling Points, Product Descriptions, Instagram Captions, Blog Introductions, and Call to Actions. For e-commerce platforms, we specifically support Amazon, Shopify, eBay, and Etsy. Each platform receives customized content that follows their specific guidelines and best practices, ensuring your listings are optimized for maximum visibility and conversion. We're continuously working on adding more platforms.",
    },
    {
      id: '5',
      category: 'platforms',
      question: 'Can I publish directly to my e-commerce platforms?',
      answer:
        "Yes! You can publish directly to eBay and Shopify using your store credentials. Simply connect your accounts and publish with one click. For Amazon, we provide optimized content that you can easily copy and paste into your Seller Central account, ensuring compliance with Amazon's listing requirements.",
    },
    {
      id: '6',
      category: 'platforms',
      question: 'How do I connect my Shopify store?',
      answer:
        "To connect your Shopify store for the first time, start by generating content for at least one product on the Generate page. Once you have generated content, the marketplace connections will appear. Look for the Shopify option and click \"Connect\". You'll be redirected to Shopify's secure login page where you'll need to enter your store URL and credentials. After authenticating, Shopify will ask you to authorize Listora AI to access your store. Once approved, you'll be redirected back to Listora with your store successfully connected, ready to publish products directly.",
    },
    {
      id: '7',
      category: 'platforms',
      question: 'How do I connect Facebook & Instagram to Listora AI?',
      answer: `To publish content through Listora AI to Facebook and Instagram, you'll need to set up your accounts properly:

**Before You Start:**
• A Facebook Page (not a personal profile)
• An Instagram Business or Creator account (optional, for Instagram publishing)
• Admin access to both accounts

**Step 1: Set Up Your Facebook Page**
If you don't have a Facebook Page yet:
1. Visit facebook.com/pages/create
2. Select your business category
3. Enter your business name and details
4. Complete the page setup

Note: Personal Facebook profiles cannot be used for publishing. You must have a Facebook Page.

**Step 2: Convert Your Instagram to a Business Account**
To publish to Instagram, you need a Business or Creator account:
1. Open the Instagram app on your phone
2. Go to Settings → Account
3. Tap "Switch to Professional Account"
4. Choose "Business" (recommended) or "Creator"
5. Follow the setup prompts

**Step 3: Link Instagram to Your Facebook Page**
Connect your Instagram Business account to your Facebook Page:
1. In Instagram app: Settings → Account → Linked Accounts
2. Select Facebook
3. Choose "Link to Facebook Page"
4. Select your Facebook Page from the list
5. Confirm the connection

**Step 4: Connect to Listora AI**
Once your accounts are properly set up:
1. Log into your Listora AI account
2. Navigate to Generate Content
3. Find "Marketplace Connections"
4. Click "Connect" next to Facebook & Instagram
5. Authorize Listora AI to access your accounts
6. Select which Facebook Page and Instagram account to use

**Troubleshooting Common Issues:**
• "No Facebook Pages found" - Ensure you have at least one Facebook Page and you're an admin
• Instagram account not showing - Confirm it's converted to Business/Creator and linked to your Facebook Page
• "Feature Unavailable" error - Clear browser cache and ensure you're accessing from the same domain`,
    },

    // Billing
    {
      id: '8',
      category: 'billing',
      question: "What's included in the free Starter plan?",
      answer:
        "The Starter plan includes 10 free content generations per month, access to all four platforms (Amazon, Shopify, eBay, Etsy), basic AI optimization, and email support. It's perfect for small sellers just getting started.",
    },
    {
      id: '9',
      category: 'billing',
      question: 'How do I upgrade my plan?',
      answer:
        'Visit the Pricing page to see all available plans. Click "Upgrade" on your desired plan, enter your payment information, and your new limits will be available immediately. You can change or cancel your plan anytime.',
    },
    {
      id: '10',
      category: 'billing',
      question: 'When does my usage reset?',
      answer:
        "Usage resets on the first day of each calendar month at 12:00 AM UTC. Any unused generations don't carry over to the next month. You can view your current usage on the Generate page.",
    },

    // Features
    {
      id: '11',
      category: 'features',
      question: 'What is Bulk Upload and how does it work?',
      answer:
        'Bulk Upload allows you to generate content for multiple products at once using a CSV file. Prepare your product data in our template format, upload the file, and our AI will generate optimized listings for all products. This feature is available on Business and higher plans.',
    },
    {
      id: '12',
      category: 'features',
      question: 'Can I edit AI-generated content?',
      answer:
        'Absolutely! All generated content is fully editable. You can modify titles, descriptions, bullet points, and any other fields directly on the Generate page before publishing. We recommend reviewing and personalizing the content to match your brand voice.',
    },
    {
      id: '13',
      category: 'features',
      question: 'How does the AI optimization work?',
      answer:
        'Our AI analyzes successful listings, platform-specific SEO requirements, and current market trends to create optimized content. It considers keyword density, readability, platform guidelines, and conversion-focused copywriting principles.',
    },

    // Troubleshooting
    {
      id: '14',
      category: 'troubleshooting',
      question: 'Why is my content generation failing?',
      answer:
        'Common causes include: insufficient product information, special characters in input fields, or temporary server issues. Try providing more detailed information and avoiding special symbols. If issues persist, contact support.',
    },
    {
      id: '15',
      category: 'troubleshooting',
      question: "My published products aren't showing up on the platform",
      answer:
        "With our direct integration for eBay and Shopify, products are published instantly if there are no errors. Check your platform dashboard for any error messages or validation issues. Ensure your account credentials are correct and you have the necessary permissions to create listings. If you're still experiencing issues, verify your product data meets the platform's requirements.",
    },
  ]

  const categories = [
    { id: 'all', name: 'All Topics', icon: HelpCircle },
    { id: 'getting-started', name: 'Getting Started', icon: Zap },
    { id: 'platforms', name: 'Platforms', icon: Store },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'features', name: 'Features', icon: Sparkles },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: AlertCircle },
  ]

  const filteredFAQs = faqItems.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' || item.category === activeCategory
    return matchesCategory
  })

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()

    // For logged-in users, auto-fill name and email
    const submissionName = user
      ? user.user_metadata?.full_name || user.email || 'Dashboard User'
      : name
    const submissionEmail = user ? user.email || 'no-email@listora.ai' : email

    if (!subject.trim() || !message.trim()) return
    if (!user && (!name.trim() || !email.trim())) return

    setSending(true)
    setSubmitError('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: submissionName,
          email: submissionEmail,
          subject: `[Support] ${subject}`,
          message: message,
          priority: 'normal',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setSent(true)
      setSubject('')
      setMessage('')
      setName('')
      setEmail('')

      setTimeout(() => {
        setSent(false)
      }, 5000)
    } catch (error) {
      console.error('Support form error:', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to send message. Please try again.'
      )
    } finally {
      setSending(false)
    }
  }

  // Function to render answer with formatting
  const renderAnswer = (answer: string) => {
    // Split by double newlines for paragraphs
    const paragraphs = answer.split('\n\n')

    return paragraphs.map((paragraph, idx) => {
      // Check if it's a bold heading (starts with **)
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        return (
          <h4 key={idx} className="font-semibold text-gray-900 mt-4 mb-2">
            {paragraph.slice(2, -2)}
          </h4>
        )
      }

      // Check if it's a heading followed by content (has **)
      if (paragraph.includes('**')) {
        const parts = paragraph.split('**')
        return (
          <div key={idx} className="mb-3">
            {parts.map((part, partIdx) => {
              if (partIdx % 2 === 1) {
                return (
                  <span key={partIdx} className="font-semibold">
                    {part}
                  </span>
                )
              }
              return <span key={partIdx}>{part}</span>
            })}
          </div>
        )
      }

      // Check if it's a list item (starts with • or number.)
      if (paragraph.startsWith('•') || /^\d+\./.test(paragraph)) {
        const lines = paragraph.split('\n')
        return (
          <ul key={idx} className="list-disc list-inside space-y-1 mb-3 ml-2">
            {lines.map((line, lineIdx) => (
              <li key={lineIdx} className="text-gray-700">
                {line.replace(/^[•\d+\.]/, '').trim()}
              </li>
            ))}
          </ul>
        )
      }

      // Regular paragraph
      return (
        <p key={idx} className="text-gray-700 mb-3">
          {paragraph}
        </p>
      )
    })
  }

  // Main content component
  const SupportContent = () => (
    <>
      {/* Video Tutorials Card */}
      <div className="mb-8">
        <button
          onClick={() => setShowVideos(!showVideos)}
          className="w-full group bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Video Tutorials</h3>
                <p className="text-sm text-gray-600">
                  Watch step-by-step guides
                </p>
              </div>
            </div>
            {showVideos ? (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </button>

        {/* Video Section - Coming Soon */}
        {showVideos && (
          <div className="mt-4 bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Video Tutorials Coming Soon
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                We're creating comprehensive video guides to help you get the
                most out of Listora AI. Check back soon for step-by-step
                tutorials on all features.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ Section */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeCategory === category.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {category.name}
                  </button>
                )
              })}
            </div>

            {/* FAQ Items */}
            <div className="space-y-4">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No questions found.</p>
                </div>
              ) : (
                filteredFAQs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                      }
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900">
                        {faq.question}
                      </span>
                      {expandedFAQ === faq.id ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="px-6 py-4 bg-gray-50 border-t">
                        {renderAnswer(faq.answer)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-1">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Contact Support
            </h2>

            {submitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-600">
                  We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                {/* Show name and email fields only for non-logged-in users */}
                {!user && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What do you need help with?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                >
                  {sending ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Email Support
                  </p>
                  <p className="text-sm text-blue-700">support@listora.ai</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Response within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  // Public header component
  const PublicHeader = () => (
    <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <ListoraAILogo size="header" showText={true} />
          </Link>

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
            <Link
              href="/support"
              className="text-indigo-600 font-medium border-b-2 border-indigo-600"
            >
              Support
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  )

  // Show loading only while checking auth
  if (!mounted || isLoading || !authChecked || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // If user is logged in, show dashboard version
  if (user) {
    return (
      <DashboardPageWrapper title="Help & Support">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <SupportContent />
          </div>
        </div>

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
        `}</style>
      </DashboardPageWrapper>
    )
  }

  // If user is NOT logged in, show public version
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <PublicHeader />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title for public users */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Help & Support
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions or contact our support team
          </p>
        </div>

        <SupportContent />
      </div>

      {/* Simple Footer for public version */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
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
      `}</style>
    </div>
  )
}
