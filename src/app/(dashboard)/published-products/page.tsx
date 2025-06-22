// src/app/(dashboard)/published-products/page.tsx - Complete 4-Platform Support
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
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
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: CheckCircle,
        label: 'Published',
      },
      pending: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: Clock,
        label: 'Pending',
      },
      draft: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        label: 'Draft',
      },
      error: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: AlertCircle,
        label: 'Error',
      },
      template: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: Download,
        label: 'Template',
      },
      // Legacy Amazon statuses (backward compatibility)
      ACTIVE: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        icon: CheckCircle,
        label: 'Active',
      },
      SUBMITTED: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: Clock,
        label: 'Submitted',
      },
      PENDING: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        label: 'Pending',
      },
      INACTIVE: {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
        icon: AlertCircle,
        label: 'Inactive',
      },
      ERROR: {
        bg: 'bg-red-50',
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
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
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
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      },
      shopify: {
        icon: '🛍️',
        name: 'Shopify',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      },
      ebay: {
        icon: '🔨',
        name: 'eBay',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      },
      etsy: {
        icon: '🎨',
        name: 'Etsy',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
      },
    }

    return (
      platformConfig[platform as keyof typeof platformConfig] || {
        icon: '📱',
        name: platform,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      }
    )
  }

  // Get method badge for Amazon
  const getMethodBadge = (product: PublishedProduct) => {
    if (product.platform !== 'amazon' || !product.method) return null

    if (product.method === 'template') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ml-2">
          <Download className="w-3 h-3 mr-1" />
          Template
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ml-2">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <p className="text-gray-600 font-medium">
                Loading your published products...
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Fetching latest data from all platforms
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              Published Products
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Manage your listings across Amazon, Shopify, eBay, and Etsy
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <button
              onClick={refreshFromPlatforms}
              disabled={refreshing}
              className="flex items-center px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin text-blue-600' : 'text-gray-600'}`}
              />
              <span className="font-medium">
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </span>
            </button>

            <button
              onClick={() => (window.location.href = '/generate')}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="font-medium">Generate New Product</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">Error Loading Products</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Enhanced Stats Cards with Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Products
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
              <span>4 platforms</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.activeListings}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Globe className="h-4 w-4 mr-1 text-green-500" />
              <span>Live listings</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.pendingListings}
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />
              <span>Processing</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-3xl font-bold text-indigo-600">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <BarChart3 className="h-4 w-4 mr-1 text-indigo-500" />
              <span>Listed prices</span>
            </div>
          </div>
        </div>

        {/* Platform Breakdown Card */}
        {Object.keys(stats.platformBreakdown).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Platform Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.platformBreakdown).map(
                ([platform, count]) => {
                  const platformInfo = getPlatformInfo(platform)
                  return (
                    <div
                      key={platform}
                      className={`${platformInfo.bgColor} ${platformInfo.borderColor} border rounded-lg p-4 text-center`}
                    >
                      <div className="text-2xl mb-2">{platformInfo.icon}</div>
                      <div
                        className={`text-lg font-bold ${platformInfo.color}`}
                      >
                        {count}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {platformInfo.name}
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        )}

        {/* Enhanced Filters and Search with All Platforms */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64 bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              {/* Enhanced Platform Filter */}
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="all">All Platforms</option>
                <option value="amazon">📦 Amazon</option>
                <option value="shopify">🛍️ Shopify</option>
                <option value="ebay">🔨 eBay</option>
                <option value="etsy">🎨 Etsy</option>
              </select>

              {/* Enhanced Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="ACTIVE">Active</option>
                <option value="pending">Pending</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="draft">Draft</option>
                <option value="error">Error</option>
                <option value="template">Template</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-gray-600">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Sort by:</span>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="published_at">Date Published</option>
                <option value="title">Product Name</option>
                <option value="price">Price</option>
                <option value="status">Status</option>
                <option value="platform">Platform</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <span className="text-lg">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Products Display */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {products.length === 0
                ? 'No Published Products Yet'
                : 'No Products Found'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {products.length === 0
                ? 'Start by generating content and publishing your first product to Amazon, Shopify, eBay, or Etsy. Our AI will help you create professional listings in minutes.'
                : "Try adjusting your search terms or filters to find the products you're looking for."}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => (window.location.href = '/generate')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2 inline" />
                Generate Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
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
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              <div
                                className={`h-12 w-12 rounded-lg ${platformInfo.bgColor} ${platformInfo.borderColor} border flex items-center justify-center shadow-sm`}
                              >
                                <span className="text-lg">
                                  {platformInfo.icon}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 max-w-xs">
                                {product.title}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                ID:{' '}
                                {product.platform_product_id || (
                                  <span className="text-yellow-600 font-medium">
                                    Pending Assignment
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{platformInfo.icon}</span>
                            <div>
                              <span
                                className={`text-sm font-medium ${platformInfo.color}`}
                              >
                                {platformInfo.name}
                              </span>
                              {getMethodBadge(product)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(product.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            ${product.price?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            Qty: {product.quantity || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border">
                            {product.sku}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-medium">
                            {new Date(
                              product.published_at
                            ).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {new Date(
                              product.published_at
                            ).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {product.platform_url && (
                              <a
                                href={product.platform_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${platformInfo.color}`}
                                title={`View on ${platformInfo.name}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
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

        {/* Enhanced Footer Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-600">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>
                  Last refreshed: {refreshing ? 'Refreshing...' : 'Just now'}
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
            <div className="flex items-center space-x-2 text-blue-600">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">4-Platform Dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
