import { getAllPosts } from '@/lib/blog'
import Link from 'next/link'
import Image from 'next/image'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Enhanced Header with Mobile Menu Component */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side: Mobile Menu + Logo */}
            <div className="flex items-center space-x-3">
              {/* Mobile Navigation Component - NOW ON LEFT */}
              <MobileNav currentPage="blog" />

              {/* Logo */}
              <Link
                href="/"
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <ListoraAILogo size="header" showText={true} />
              </Link>
            </div>

            {/* Unified Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
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
                href="/blog"
                className="text-indigo-600 font-medium border-b-2 border-indigo-600"
              >
                Blog
              </Link>

              {/* Separator */}
              <div className="h-4 w-px bg-gray-300"></div>

              <Link
                href="/login"
                className="text-gray-600 hover:text-indigo-600 transition-colors font-medium"
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Book Demo
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Start Free Trial
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob-delayed"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob-delayed-2"></div>
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Enhanced Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-4 py-2 mb-8">
            <span className="text-sm font-medium text-blue-800">
              ✨ Listora AI Blog
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            AI Insights &
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent block">
              E-commerce Tips
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Discover AI insights, e-commerce strategies, multilingual content
            tips, and product updates to help you scale your business globally
            with Listora AI.
          </p>
        </div>

        {/* Blog Posts Grid or Empty State */}
        {posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link
                href={`/blog/${post.slug}`}
                key={post.slug}
                className="group block"
              >
                <article className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-white/50">
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
                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                          {post.category}
                        </span>
                      )}
                      {post.date && (
                        <time className="text-gray-500 text-sm">
                          {new Date(post.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </time>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>

                    {/* Excerpt */}
                    {post.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-blue-600 font-medium group-hover:underline">
                        Read more →
                      </span>
                      {post.readTime && (
                        <span className="text-gray-500 text-sm">
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
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 shadow-xl border border-white/50 max-w-2xl mx-auto">
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                No blog posts yet
              </h3>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
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
              <h3 className="text-3xl font-bold mb-6">
                Ready to Transform Your Content Creation?
              </h3>
              <p className="text-xl text-indigo-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join thousands of sellers using Listora AI to create
                professional content in 99+ languages and scale globally.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-indigo-600 transition-all"
                >
                  Book Demo
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
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
