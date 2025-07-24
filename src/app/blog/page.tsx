import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'
import Image from 'next/image'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'

export default function BlogPage() {
  const posts = getAllPosts()

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

      {/* Enhanced Header - matching homepage */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component */}
              <MobileNav currentPage="blog" />

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
              <Link
                href="/#features-section"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#pricing-section"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-form-label text-gray-600 hover:text-indigo-600 transition-colors"
              >
                About
              </Link>
              <Link
                href="/blog"
                className="text-form-label text-indigo-600 border-b-2 border-indigo-600 px-1 pb-1"
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

      {/* Main Content */}
      <main className="relative">
        {/* Hero Section - dark background */}
        <section className="relative pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Enhanced Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
                <span className="text-form-label text-white">
                  ✨ Listora AI Blog
                </span>
              </div>
              <h1 className="text-display-title mb-6 leading-tight">
                AI Insights &
                <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
                  E-commerce Tips
                </span>
              </h1>
              <p
                className="text-body-comfortable text-white/90 max-w-4xl mx-auto leading-relaxed drop-shadow-lg"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}
              >
                Discover AI insights, e-commerce strategies, multilingual
                content tips, and product updates to help you scale your
                business globally with Listora AI.
              </p>
            </div>
          </div>
        </section>

        {/* Content Section - white background */}
        <section className="relative bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Blog Posts Grid or Empty State */}
            {posts.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link
                    href={`/blog/${post.slug}`}
                    key={post.slug}
                    className="group block"
                  >
                    <article className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 hover:border-gray-300">
                      {/* Cover Image */}
                      {post.coverImage && (
                        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      <div className="p-6">
                        {/* Category and Date */}
                        <div className="flex items-center gap-2 mb-3">
                          {post.category && (
                            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-form-label font-medium">
                              {post.category}
                            </span>
                          )}
                          {post.date && (
                            <time className="text-caption text-gray-500">
                              {new Date(post.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </time>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-card-title font-bold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {post.title}
                        </h3>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <p className="text-body-md text-gray-600 mb-4 line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between">
                          <span className="text-form-label text-blue-600 font-medium group-hover:underline">
                            Read more →
                          </span>
                          {post.readTime && (
                            <span className="text-caption text-gray-500">
                              {post.readTime} min read
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
              // Enhanced Empty state
              <div className="text-center py-20">
                <div className="bg-white rounded-2xl p-12 shadow-xl border border-gray-200 max-w-2xl mx-auto">
                  <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-4xl">📝</span>
                  </div>
                  <h3 className="text-heading-md font-bold text-gray-900 mb-6">
                    No blog posts yet
                  </h3>
                  <p className="text-body-comfortable text-gray-600 mb-8 leading-relaxed">
                    Stay tuned! We're working on amazing content about AI,
                    e-commerce, and multilingual business growth strategies.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-lg"
                    >
                      ← Back to Home
                    </Link>
                    <Link
                      href="/signup"
                      className="inline-flex items-center px-6 py-3 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white font-medium rounded-lg transition-all transform hover:scale-105"
                    >
                      Start Free Trial
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Section */}
            {posts.length > 0 && (
              <div className="mt-20">
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-12 text-white text-center shadow-2xl">
                  <h3 className="text-heading-md font-bold mb-6">
                    Ready to Transform Your Content Creation?
                  </h3>
                  <p className="text-body-comfortable text-indigo-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                    Join thousands of entrepreneurs using Listora AI to create
                    professional content in 99+ languages and scale globally.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      href="/signup"
                      className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-form-label hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                    >
                      Start Free Trial
                    </Link>
                    <Link
                      href="/demo"
                      className="inline-flex items-center border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-form-label hover:bg-white hover:text-indigo-600 transition-all"
                    >
                      Book Demo
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

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
                various e-commerce platforms worldwide.
              </p>
              <div className="flex space-x-4">
                <Link
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-sm font-bold">𝕏</span>
                </Link>
                <Link
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-sm font-bold">in</span>
                </Link>
                <Link
                  href="mailto:contact@listora.ai"
                  className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center transition-colors"
                >
                  <span className="text-sm">@</span>
                </Link>
              </div>
            </div>
            {/* Product Links */}
            <div>
              <h3 className="font-bold text-white mb-6">Product</h3>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link
                    href="/#features-section"
                    className="hover:text-white transition-colors"
                  >
                    Multilingual Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing-section"
                    className="hover:text-white transition-colors"
                  >
                    Global Pricing
                  </Link>
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
    </div>
  )
}

// SEO metadata
export const metadata = {
  title: 'Blog | Listora AI - AI Content Creation Insights',
  description:
    'Discover AI insights, e-commerce tips, and multilingual content strategies to scale your business globally with Listora AI.',
  keywords:
    'AI content creation, e-commerce tips, multilingual marketing, Amazon SEO, Shopify automation',
}
