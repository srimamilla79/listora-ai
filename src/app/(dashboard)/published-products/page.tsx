// src/app/(dashboard)/published-products/page.tsx - Fixed version
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import DashboardPageWrapper from '@/components/layout/DashboardPageWrapper'

import {
  Package,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Calendar,
  Tag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Edit3,
  BarChart3,
  ShoppingCart,
  Star,
  Globe,
  ArrowUpRight,
  Loader,
  AlertTriangle,
  Plus,
  Settings,
  Sparkles,
  Download,
  ChevronDown,
  Activity,
  Zap,
  Store,
  MoreVertical,
} from 'lucide-react'

interface PublishedProduct {
  id: string
  user_id: string
  content_id: string | null
  platform: string
  platform_product_id: string | null
  platform_url: string | null
  title: string
  description: string | null
  price: number
  quantity: number
  sku: string
  images: any[] | null
  platform_data: Record<string, any> | null
  status: string
  published_at: string
  updated_at: string
  last_synced_at: string
  method?: string // For Amazon template vs API
}

interface DashboardStats {
  totalProducts: number
  activeListings: number
  totalRevenue: number
  pendingListings: number
  platformBreakdown: Record<string, number>
}

export default function PublishedProductsPage() {
  const [products, setProducts] = useState<PublishedProduct[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeListings: 0,
    totalRevenue: 0,
    pendingListings: 0,
    platformBreakdown: {},
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [sortBy, setSortBy] = useState('published_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [user, setUser] = useState<any>(null)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      if (!supabase) return

      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    getCurrentUser()
  }, [supabase])

  // Load products on mount
  useEffect(() => {
    if (user?.id && supabase) {
      loadProducts()
    }
  }, [user, supabase])

  // Load published products from unified table
  const loadProducts = async () => {
    if (!user?.id || !supabase) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('published_products')
        .select('*')
        .eq('user_id', user.id)
        .order('published_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setProducts(data || [])
      calculateStats(data || [])
    } catch (err) {
      console.error('Error loading products:', err)
      setError('Failed to load published products')
    } finally {
      setLoading(false)
    }
  }

  // Calculate enhanced dashboard stats
  const calculateStats = (productList: PublishedProduct[]) => {
    const totalProducts = productList.length

    const activeListings = productList.filter(
      (p) => p.status === 'published' || p.status === 'ACTIVE'
    ).length

    const pendingListings = productList.filter(
      (p) =>
        p.status === 'pending' ||
        p.status === 'draft' ||
        p.status === 'SUBMITTED' ||
        p.status === 'PENDING'
    ).length

    const totalRevenue = productList.reduce((sum, p) => sum + (p.price || 0), 0)

    // Platform breakdown
    const platformBreakdown = productList.reduce(
      (acc, product) => {
        acc[product.platform] = (acc[product.platform] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    setStats({
      totalProducts,
      activeListings,
      pendingListings,
      totalRevenue,
      platformBreakdown,
    })
  }

  // Refresh from platforms
  const refreshFromPlatforms = async () => {
    if (!user?.id || !supabase) return

    try {
      setRefreshing(true)
      setError(null)

      console.log('🔄 Refreshing data from all platforms...')

      // For now, just reload from database
      // Later we can add platform-specific refresh APIs
      await loadProducts()

      console.log('✅ Refresh completed')
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  // Get status badge styling with enhanced statuses
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      // New standardized statuses
      published: {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: CheckCircle,
        label: 'Published',
      },
      pending: {
        bg: 'bg-gradient-to-r from-blue-50 to-sky-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: Clock,
        label: 'Pending',
      },
      draft: {
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        label: 'Draft',
      },
      error: {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: AlertCircle,
        label: 'Error',
      },
      template: {
        bg: 'bg-gradient-to-r from-purple-50 to-violet-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: Download,
        label: 'Template',
      },
      // Legacy Amazon statuses (backward compatibility)
      ACTIVE: {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: CheckCircle,
        label: 'Active',
      },
      SUBMITTED: {
        bg: 'bg-gradient-to-r from-blue-50 to-sky-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: Clock,
        label: 'Submitted',
      },
      PENDING: {
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        label: 'Pending',
      },
      INACTIVE: {
        bg: 'bg-gradient-to-r from-gray-50 to-slate-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        icon: AlertCircle,
        label: 'Inactive',
      },
      ERROR: {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: AlertCircle,
        label: 'Error',
      },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} shadow-sm`}
      >
        <Icon className="w-3 h-3 mr-1.5" />
        {config.label}
      </span>
    )
  }

  // Get platform icon and details
  const getPlatformInfo = (platform: string) => {
    const platformConfig = {
      amazon: {
        icon: '📦',
        name: 'Amazon',
        color: 'text-orange-600',
        bgColor: 'bg-gradient-to-r from-orange-50 to-amber-50',
        borderColor: 'border-orange-200',
        lightBg: 'from-orange-500 to-amber-600',
      },
      shopify: {
        icon: '🛍️',
        name: 'Shopify',
        color: 'text-green-600',
        bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
        borderColor: 'border-green-200',
        lightBg: 'from-green-500 to-emerald-600',
      },
      ebay: {
        icon: '🔨',
        name: 'eBay',
        color: 'text-blue-600',
        bgColor: 'bg-gradient-to-r from-blue-50 to-sky-50',
        borderColor: 'border-blue-200',
        lightBg: 'from-blue-500 to-sky-600',
      },
      etsy: {
        icon: '🎨',
        name: 'Etsy',
        color: 'text-purple-600',
        bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50',
        borderColor: 'border-purple-200',
        lightBg: 'from-purple-500 to-violet-600',
      },
    }

    return (
      platformConfig[platform as keyof typeof platformConfig] || {
        icon: '📱',
        name: platform,
        color: 'text-gray-600',
        bgColor: 'bg-gradient-to-r from-gray-50 to-slate-50',
        borderColor: 'border-gray-200',
        lightBg: 'from-gray-500 to-slate-600',
      }
    )
  }

  // Get method badge for Amazon
  const getMethodBadge = (product: PublishedProduct) => {
    if (product.platform !== 'amazon' || !product.method) return null

    if (product.method === 'template') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200 ml-2 shadow-sm">
          <Download className="w-3 h-3 mr-1" />
          Template
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-sky-50 text-blue-700 border border-blue-200 ml-2 shadow-sm">
        API
      </span>
    )
  }

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter
      const matchesPlatform =
        platformFilter === 'all' || product.platform === platformFilter
      return matchesSearch && matchesStatus && matchesPlatform
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof PublishedProduct] || ''
      const bValue = b[sortBy as keyof PublishedProduct] || ''

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })

  // ✅ Wait for SSR safety before rendering
  if (loading || !mounted || !supabase) {
    return (
      <DashboardPageWrapper title="Published Products">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
                  <Loader className="h-10 w-10 animate-spin text-white" />
                </div>
                <p className="text-gray-600 font-medium text-lg">
                  Loading your published products...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Fetching latest data from all platforms
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardPageWrapper>
    )
  }

  return (
    <DashboardPageWrapper title="Published Products">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Enhanced Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    Your Published Products Overview
                  </span>
                </div>
                <p className="text-gray-600 mt-2 text-lg ml-16">
                  Manage your marketplace listings
                </p>
              </div>

              <div className="flex items-center space-x-3 mt-6 lg:mt-0">
                <button
                  onClick={refreshFromPlatforms}
                  disabled={refreshing}
                  className="flex items-center px-5 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
                >
                  <RefreshCw
                    className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-600'}`}
                  />
                  <span className="font-medium">
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </span>
                </button>

                <button
                  onClick={() => (window.location.href = '/generate')}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className="font-medium">Generate New</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">
                  Error Loading Products
                </p>
              </div>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group bg-white/80 backdrop-blur-xl rounded-xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Products
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                <span>Across 4 platforms</span>
              </div>
            </div>

            <div className="group bg-white/80 backdrop-blur-xl rounded-xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {stats.activeListings}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <Activity className="h-4 w-4 mr-1 text-green-500" />
                <span>Live & active</span>
              </div>
            </div>

            <div className="group bg-white/80 backdrop-blur-xl rounded-xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">
                    {stats.pendingListings}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <Zap className="h-4 w-4 mr-1 text-yellow-500" />
                <span>Processing</span>
              </div>
            </div>

            <div className="group bg-white/80 backdrop-blur-xl rounded-xl border border-white/50 p-6 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Value
                  </p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">
                    ${stats.totalRevenue.toFixed(0)}
                  </p>
                </div>
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <BarChart3 className="h-4 w-4 mr-1 text-indigo-500" />
                <span>Listed value</span>
              </div>
            </div>
          </div>

          {/* Platform Breakdown Card */}
          {Object.keys(stats.platformBreakdown).length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Store className="h-5 w-5 mr-2 text-indigo-600" />
                Platform Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.platformBreakdown).map(
                  ([platform, count]) => {
                    const platformInfo = getPlatformInfo(platform)
                    return (
                      <div
                        key={platform}
                        className={`group relative ${platformInfo.bgColor} ${platformInfo.borderColor} border-2 rounded-xl p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden`}
                      >
                        <div
                          className={`absolute inset-0 bg-gradient-to-r ${platformInfo.lightBg} opacity-0 group-hover:opacity-10 transition-opacity`}
                        />
                        <div className="relative">
                          <div className="text-3xl mb-3">
                            {platformInfo.icon}
                          </div>
                          <div
                            className={`text-2xl font-bold ${platformInfo.color}`}
                          >
                            {count}
                          </div>
                          <div className="text-sm text-gray-600 font-medium capitalize mt-1">
                            {platformInfo.name}
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {/* Enhanced Filters */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-72 bg-white/50 backdrop-blur-sm focus:bg-white transition-all"
                  />
                </div>

                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm focus:bg-white transition-all font-medium"
                >
                  <option value="all">All Platforms</option>
                  <option value="amazon">📦 Amazon</option>
                  <option value="shopify">🛍️ Shopify</option>
                  <option value="ebay">🔨 eBay</option>
                  <option value="etsy">🎨 Etsy</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm focus:bg-white transition-all font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="ACTIVE">Active</option>
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-600">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white/50 backdrop-blur-sm focus:bg-white transition-all font-medium"
                >
                  <option value="published_at">Date</option>
                  <option value="title">Name</option>
                  <option value="price">Price</option>
                  <option value="status">Status</option>
                </select>

                <button
                  onClick={() =>
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                  className={`px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all bg-white ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Products Display */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 p-16 shadow-xl text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-8">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {products.length === 0
                  ? 'No Published Products Yet'
                  : 'No Products Found'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                {products.length === 0
                  ? 'Start by generating content and publishing your first product. Our AI will help you create professional listings in minutes.'
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
              {products.length === 0 && (
                <button
                  onClick={() => (window.location.href = '/generate')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Sparkles className="h-5 w-5 mr-2 inline" />
                  Generate Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Published
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {filteredProducts.map((product) => {
                      const platformInfo = getPlatformInfo(product.platform)
                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div
                                  className={`h-14 w-14 rounded-xl ${platformInfo.bgColor} ${platformInfo.borderColor} border-2 flex items-center justify-center shadow-sm`}
                                >
                                  <span className="text-2xl">
                                    {platformInfo.icon}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900 max-w-xs line-clamp-1">
                                  {product.title}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  ID:{' '}
                                  <span className="font-mono">
                                    {product.platform_product_id || (
                                      <span className="text-yellow-600 font-medium">
                                        Pending
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="text-xl">
                                {platformInfo.icon}
                              </span>
                              <div>
                                <span
                                  className={`text-sm font-semibold ${platformInfo.color}`}
                                >
                                  {platformInfo.name}
                                </span>
                                {getMethodBadge(product)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            {getStatusBadge(product.status)}
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              ${product.price?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Qty: {product.quantity || 0}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 inline-block">
                              {product.sku}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(
                                product.published_at
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(
                                product.published_at
                              ).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                                title="Edit Product"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {product.platform_url && (
                                <a
                                  href={product.platform_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`p-2 hover:bg-gray-50 rounded-lg transition-all ${platformInfo.color}`}
                                  title={`View on ${platformInfo.name}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                                title="More Options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Stats */}
          <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-white/50 p-4 shadow-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-6 text-gray-600">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>
                    Last sync: {refreshing ? 'Syncing...' : 'Just now'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>
                    Showing {filteredProducts.length} of {products.length}{' '}
                    products
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-indigo-600">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold">Multi-Platform Dashboard</span>
              </div>
            </div>
          </div>
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
