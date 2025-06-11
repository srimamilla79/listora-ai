// src/app/(dashboard)/published-products/page.tsx
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
} from 'lucide-react'

interface PublishedProduct {
  id: string
  amazon_listing_id: string
  sku: string
  title: string
  status: string
  price: number
  quantity: number
  published_at: string
  updated_at: string
  last_synced?: string
  current_price?: number
  stock_status?: string
  listing_status?: string
  product_content_id: string
  marketplace_id: string
  submission_id?: string
}

interface DashboardStats {
  totalProducts: number
  activeListings: number
  totalRevenue: number
  pendingListings: number
}

export default function PublishedProductsPage() {
  const [products, setProducts] = useState<PublishedProduct[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    activeListings: 0,
    totalRevenue: 0,
    pendingListings: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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

  // Load published products
  const loadProducts = async () => {
    if (!user?.id || !supabase) return

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('amazon_listings')
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

  // Calculate dashboard stats
  const calculateStats = (productList: PublishedProduct[]) => {
    const totalProducts = productList.length

    // ✅ FIXED: Separate statuses properly
    const activeListings = productList.filter(
      (p) => p.status === 'ACTIVE'
    ).length

    const pendingListings = productList.filter(
      (p) => p.status === 'SUBMITTED' || p.status === 'PENDING'
    ).length

    const totalRevenue = productList.reduce((sum, p) => sum + (p.price || 0), 0)

    setStats({
      totalProducts,
      activeListings,
      pendingListings,
      totalRevenue,
    })
  }

  // Refresh from Amazon
  const refreshFromAmazon = async () => {
    if (!user?.id || !supabase) return

    try {
      setRefreshing(true)
      setError(null)

      console.log('🔄 Refreshing data from Amazon...')

      // Call the refresh API
      const response = await fetch('/api/amazon/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh from Amazon')
      }

      const result = await response.json()
      console.log('✅ Refresh completed:', result)

      // Reload products after refresh
      await loadProducts()
    } catch (err) {
      console.error('Error refreshing from Amazon:', err)
      setError('Failed to refresh data from Amazon')
    } finally {
      setRefreshing(false)
    }
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        icon: AlertTriangle,
      },
      INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
      ERROR: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status}
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
      return matchesSearch && matchesStatus
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-gray-600">
                Loading your published products...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Package className="h-8 w-8 mr-3 text-indigo-600" />
              Published Products
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your Amazon listings and track performance
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <button
              onClick={refreshFromAmazon}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              {refreshing ? 'Refreshing...' : 'Refresh from Amazon'}
            </button>

            <button
              onClick={() => (window.location.href = '/generate')}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate New Product
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Products
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              All time listings
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Listings
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.activeListings}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <Globe className="h-4 w-4 mr-1" />
              Live on Amazon
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pendingListings}
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Processing
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${stats.totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              Listed prices
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING">Pending</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ERROR">Error</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="published_at">Date Published</option>
                <option value="title">Product Name</option>
                <option value="price">Price</option>
                <option value="status">Status</option>
              </select>

              <button
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Products Table/Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {products.length === 0
                ? 'No Published Products'
                : 'No Products Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {products.length === 0
                ? 'Start by generating content and publishing your first product to Amazon.'
                : 'Try adjusting your search terms or filters.'}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => (window.location.href = '/generate')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Generate Your First Product
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Published
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                              <Package className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                              {product.title}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {product.amazon_listing_id || 'Pending'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(product.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${product.price?.toFixed(2) || '0.00'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Qty: {product.quantity || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(product.published_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(product.published_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-indigo-600 hover:text-indigo-900 p-1 rounded">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 p-1 rounded">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <a
                            href={`https://sellercentral.amazon.com/inventory?ref_=xx_invmgr_dnav_xx&tbla_myitable=sort:%7B%22sortOrder%22%3A%22DESCENDING%22%2C%22sortedColumnId%22%3A%22date%22%7D;search:${product.sku}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-900 p-1 rounded"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center text-gray-500 text-sm">
          <p>
            Last refreshed: {refreshing ? 'Refreshing...' : 'Just now'} •
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>
      </div>
    </div>
  )
}
