import { getPostBySlug, getAllPosts } from '@/lib/blog'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import ListoraAILogo from '@/components/ui/ListoraAILogo'
import MobileNav from '@/components/ui/MobileNav'

interface BlogPostPageProps {
  params: {
    slug: string
  }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)

  if (!post) {
    notFound()
  }

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

      {/* Main Content - Single continuous section */}
      <div className="relative">
        {/* Dark to white gradient transition */}
        <div className="relative pt-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <Link
              href="/blog"
              className="inline-flex items-center text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 mb-8 font-medium px-4 py-2 rounded-lg shadow-md border border-white/20 transition-all"
            >
              ← Back to Blog
            </Link>

            {/* Article Header Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-t-2xl p-8 shadow-xl border border-gray-200 border-b-0">
              {/* Category */}
              {post.category && (
                <div className="mb-4">
                  <span className="bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-form-label font-medium">
                    {post.category}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-display-title font-bold text-gray-900 mb-6 leading-tight">
                {post.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-6 text-body-md text-gray-600 mb-8">
                {post.author && (
                  <div className="flex items-center gap-2">
                    <span>By</span>
                    <span className="font-medium">{post.author}</span>
                  </div>
                )}
                {post.date && (
                  <time>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                )}
                {post.readTime && <span>{post.readTime} min read</span>}
              </div>

              {/* Cover Image */}
              {post.coverImage && (
                <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Excerpt */}
              {post.excerpt && (
                <div className="text-body-comfortable text-gray-600 leading-relaxed border-l-4 border-blue-500 pl-6 bg-blue-50/50 py-4 rounded-r-lg">
                  {post.excerpt}
                </div>
              )}
            </div>

            {/* Article Content - Seamlessly connected */}
            <article className="bg-white rounded-b-2xl p-8 shadow-xl border border-gray-200 border-t-0 mb-12">
              <div
                className="prose prose-lg max-w-none 
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline 
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded 
                prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
                prose-ul:my-6 prose-ol:my-6
                prose-li:text-gray-700 prose-li:leading-relaxed
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600
                prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-hr:my-8 prose-hr:border-gray-200"
              >
                <MDXRemote source={post.content} />
              </div>
            </article>

            {/* Author Bio */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-start gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                SM
              </div>
              <div className="flex-1">
                <h4 className="text-card-title font-bold text-gray-900">
                  Srini Mamillapalli
                </h4>
                <p className="text-body-md text-gray-600">
                  Founder & CEO at Listora AI
                </p>
                <p className="text-body-sm text-gray-500 mt-2">
                  Building AI-powered tools to help entrepreneurs worldwide
                  create professional content in 99+ languages and scale their
                  e-commerce business globally.
                </p>
              </div>
            </div>

            {/* Share Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-center gap-4">
                <span className="text-body-md text-gray-600">
                  Share this article:
                </span>
                <Link
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://listora.ai/blog/${params.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Twitter
                </Link>
                <Link
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://listora.ai/blog/${params.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-800 font-medium transition-colors"
                >
                  LinkedIn
                </Link>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
              <div className="text-center">
                <h3 className="text-heading-md font-bold mb-4">
                  Ready to Transform Your Content Creation?
                </h3>
                <p className="text-body-comfortable text-indigo-100 mb-6 max-w-2xl mx-auto">
                  Experience the power of AI-driven multilingual content
                  creation. Start creating professional content in 99+ languages
                  today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/demo"
                    className="inline-flex items-center justify-center border-2 border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white hover:text-indigo-600 transition-all"
                  >
                    Watch Demo
                  </Link>
                </div>
                <p className="text-body-sm text-indigo-200 mt-4">
                  ✓ 14-day free trial • ✓ No credit card required • ✓ Setup in
                  60 seconds
                </p>
              </div>
            </div>

            {/* Keywords (for SEO - hidden) */}
            {post.keywords && post.keywords.length > 0 && (
              <div className="hidden">{post.keywords.join(', ')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - matching homepage */}
      <footer className="relative bg-gradient-to-b from-gray-900 to-black text-white mt-16">
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

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps) {
  const post = getPostBySlug(params.slug)

  if (!post) {
    return {
      title: 'Post Not Found | Listora AI Blog',
    }
  }

  return {
    title: `${post.title} | Listora AI Blog`,
    description: post.excerpt,
    keywords: post.keywords?.join(', '),
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImage ? [post.coverImage] : [],
    },
  }
}
