// src/app/(dashboard)/published-products/page.tsx - Complete with Walmart Support and Search
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
  TrendingDown,
  X,
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

  // New states for price/inventory updates
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedProduct, setSelectedProduct] =
    useState<PublishedProduct | null>(null)
  const [newPrice, setNewPrice] = useState('')
  const [newQuantity, setNewQuantity] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

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

  // Search for Walmart product
  const searchWalmartProduct = async (product: PublishedProduct) => {
    // Skip search for non-Walmart products
    if (product.platform !== 'walmart') {
      console.log('Search only available for Walmart products')
      return
    }

    const walmartData = product.platform_data as any
    const gtin = walmartData?.gtin

    if (!gtin) {
      // Use custom toast or console for now
      console.error('No GTIN found for this product')
      alert('No GTIN found for this product')
      return
    }

    console.log('Searching for product on Walmart...')

    try {
      const response = await fetch('/api/walmart/search-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          gtin: gtin,
        }),
      })

      const data = await response.json()

      if (data.items && data.items.length > 0) {
        const item = data.items[0]
        console.log('Product found on Walmart!')
        alert('Product found on Walmart! Opening product page...')

        // Open Walmart URL in new tab
        if (item.walmartUrl) {
          window.open(item.walmartUrl, '_blank')
        }

        // Refresh to show updated data
        await loadProducts()
      } else {
        console.warn(
          'Product not found on Walmart yet. It may still be processing.'
        )
        alert('Product not found on Walmart yet. It may still be processing.')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Failed to search for product')
    }
  }

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

      // Check Walmart feed statuses for pending products
      const pendingWalmartProducts = products.filter(
        (p) =>
          p.platform === 'walmart' &&
          (p.status === 'pending' || p.status === 'SUBMITTED')
      )

      console.log(
        `📦 Checking ${pendingWalmartProducts.length} pending Walmart products...`
      )

      for (const product of pendingWalmartProducts) {
        if (product.platform_data?.feedId) {
          try {
            // Check feed status
            const response = await fetch(
              `/api/walmart/check-feed-status?feedId=${product.platform_data.feedId}&userId=${user.id}`
            )

            if (response.ok) {
              const status = await response.json()

              // Update product status if feed is processed
              if (
                status.feedStatus === 'PROCESSED' ||
                status.feedStatus === 'ERROR'
              ) {
                const newStatus =
                  status.feedStatus === 'PROCESSED' ? 'published' : 'error'

                // Update in database
                await supabase
                  .from('published_products')
                  .update({
                    status: newStatus,
                    last_synced_at: new Date().toISOString(),
                    platform_data: {
                      ...product.platform_data,
                      feedStatus: status.feedStatus,
                      lastChecked: new Date().toISOString(),
                    },
                  })
                  .eq('id', product.id)

                console.log(
                  `✅ Updated ${product.sku}: ${product.status} → ${newStatus}`
                )
              }
            }
          } catch (err) {
            console.error(`Error checking status for ${product.sku}:`, err)
          }
        }
      }

      // Reload all products from database
      await loadProducts()

      console.log('✅ Refresh completed')
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  // Update Walmart Price
  const updateWalmartPrice = async () => {
    if (!selectedProduct || !newPrice || !user) return

    try {
      setIsUpdating(true)

      const response = await fetch('/api/walmart/update-price', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedProduct.sku,
          newPrice: newPrice,
          userId: user.id,
          productId: selectedProduct.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to update price')

      const result = await response.json()

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, price: parseFloat(newPrice) }
            : p
        )
      )

      setShowPriceModal(false)
      setSelectedProduct(null)
      setNewPrice('')

      // Show success message
      console.log('✅ Price updated successfully:', result)
      alert('Price update submitted successfully!')
    } catch (error) {
      console.error('Error updating price:', error)
      setError('Failed to update price')
      alert('Failed to update price')
    } finally {
      setIsUpdating(false)
    }
  }

  // Update Walmart Inventory
  const updateWalmartInventory = async () => {
    if (!selectedProduct || !newQuantity || !user) return

    try {
      setIsUpdating(true)

      const response = await fetch('/api/walmart/update-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: selectedProduct.sku,
          newQuantity: newQuantity,
          userId: user.id,
          productId: selectedProduct.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to update inventory')

      const result = await response.json()

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, quantity: parseInt(newQuantity) }
            : p
        )
      )

      setShowInventoryModal(false)
      setSelectedProduct(null)
      setNewQuantity('')

      console.log('✅ Inventory updated successfully:', result)
      alert('Inventory update submitted successfully!')
    } catch (error) {
      console.error('Error updating inventory:', error)
      setError('Failed to update inventory')
      alert('Failed to update inventory')
    } finally {
      setIsUpdating(false)
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

  // Get platform icon and details - UPDATED WITH WALMART
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
      walmart: {
        icon: '🏪',
        name: 'Walmart',
        color: 'text-blue-700',
        bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        borderColor: 'border-blue-300',
        lightBg: 'from-blue-600 to-indigo-600',
      },
      meta: {
        icon: '📱',
        name: 'Facebook/Instagram',
        color: 'text-blue-600',
        bgColor: 'bg-gradient-to-r from-blue-50 to-purple-50',
        borderColor: 'border-blue-200',
        lightBg: 'from-blue-600 to-purple-600',
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

  // Get method badge for Amazon/Walmart
  const getMethodBadge = (product: PublishedProduct) => {
    if (product.platform === 'walmart') {
      // Check if it's via Feed API or direct
      if (product.platform_data?.feedId) {
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 ml-2 shadow-sm">
            <Zap className="w-3 h-3 mr-1" />
            Feed API
          </span>
        )
      }
    }

    if (product.platform === 'amazon' && product.method) {
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

    return null
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
                  Manage your marketplace listings across all platforms
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
                <span>Across all platforms</span>
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

          {/* Platform Breakdown Card - UPDATED WITH WALMART */}
          {Object.keys(stats.platformBreakdown).length > 0 && (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <Store className="h-5 w-5 mr-2 text-indigo-600" />
                Platform Distribution
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

          {/* Enhanced Filters - UPDATED WITH WALMART */}
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
                  <option value="walmart">🏪 Walmart</option>
                  <option value="meta">📱 Meta (FB/IG)</option>
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

          {/* Products Display - UPDATED WITH WALMART AND FIXED TABLE */}
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
              <div
                className="overflow-x-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overflowX: 'auto',
                  scrollbarWidth: 'auto',
                  msOverflowStyle: 'auto',
                }}
              >
                <table className="min-w-full divide-y divide-gray-100 table-fixed">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="w-48 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="w-20 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="w-28 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="w-24 px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Published
                      </th>
                      <th className="w-36 px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
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
                                  <span className="font-mono text-xs">
                                    {product.platform_product_id ? (
                                      product.platform === 'walmart' &&
                                      product.platform_product_id.length >
                                        20 ? (
                                        <span
                                          title={product.platform_product_id}
                                        >
                                          {product.platform_product_id.substring(
                                            0,
                                            12
                                          )}
                                          ...
                                        </span>
                                      ) : (
                                        product.platform_product_id
                                      )
                                    ) : (
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
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setShowDetailsModal(true)
                                }}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setShowPriceModal(true)
                                }}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                                title="Update Price"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedProduct(product)
                                  setShowInventoryModal(true)
                                }}
                                className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-all"
                                title="Update Inventory"
                              >
                                <Package className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => searchWalmartProduct(product)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                title="Find on Marketplace"
                              >
                                <Search className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                                title="Edit Product"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <a
                                href={
                                  product.platform_url ||
                                  (product.platform === 'walmart'
                                    ? `https://seller.walmart.com/items-and-inventory/manage-items?searchType=ALL_ITEMS&searchQuery=${product.sku}`
                                    : product.platform === 'meta'
                                      ? 'https://business.facebook.com/commerce/'
                                      : '#')
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-2 hover:bg-gray-50 rounded-lg transition-all ${platformInfo.color}`}
                                title={`View on ${platformInfo.name}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
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

        {/* Product Details Modal */}
        {showDetailsModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
                <h3 className="text-xl font-bold text-gray-900">
                  Product Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedProduct(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Product Header */}
                <div className="flex items-start space-x-4">
                  {selectedProduct.images &&
                    selectedProduct.images.length > 0 && (
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.title}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                    )}
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedProduct.title}
                    </h4>
                    <div className="flex items-center space-x-4 mt-2">
                      <span
                        className={`text-sm font-medium ${getPlatformInfo(selectedProduct.platform).color}`}
                      >
                        {getPlatformInfo(selectedProduct.platform).icon}{' '}
                        {getPlatformInfo(selectedProduct.platform).name}
                      </span>
                      {getStatusBadge(selectedProduct.status)}
                      {getMethodBadge(selectedProduct)}
                    </div>
                  </div>
                </div>

                {/* Key Information Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">SKU</p>
                    <p className="font-mono text-sm font-semibold">
                      {selectedProduct.sku}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Platform ID</p>
                    <p className="font-mono text-xs font-semibold break-all">
                      {selectedProduct.platform_product_id || 'Pending'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Price</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${selectedProduct.price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Inventory</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedProduct.quantity || 0} units
                    </p>
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </h5>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedProduct.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Images Gallery */}
                {selectedProduct.images &&
                  selectedProduct.images.length > 0 && (
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">
                        Images ({selectedProduct.images.length})
                      </h5>
                      <div className="grid grid-cols-4 gap-3">
                        {selectedProduct.images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image}
                              alt={`${selectedProduct.title} - Image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border hover:border-blue-500 transition-all cursor-pointer"
                              onClick={() => window.open(image, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Timestamps */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Published</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedProduct.published_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Updated</p>
                    <p className="text-sm font-medium">
                      {new Date(selectedProduct.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Synced</p>
                    <p className="text-sm font-medium">
                      {new Date(
                        selectedProduct.last_synced_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedProduct.platform === 'walmart' && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false)
                          setNewPrice(selectedProduct.price?.toString() || '')
                          setShowPriceModal(true)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Update Price</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false)
                          setNewQuantity(
                            selectedProduct.quantity?.toString() || ''
                          )
                          setShowInventoryModal(true)
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                      >
                        <Package className="h-4 w-4" />
                        <span>Update Inventory</span>
                      </button>
                    </>
                  )}
                  {(selectedProduct.platform_url ||
                    selectedProduct.platform === 'walmart') && (
                    <a
                      href={
                        selectedProduct.platform_url ||
                        (selectedProduct.platform === 'walmart'
                          ? `https://seller.walmart.com/items-and-inventory/manage-items?searchType=ALL_ITEMS&searchQuery=${selectedProduct.sku}`
                          : '#')
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>
                        View on {getPlatformInfo(selectedProduct.platform).name}
                      </span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedProduct(null)
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Update Modal */}
        {showPriceModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Update Price
                </h3>
                <button
                  onClick={() => {
                    setShowPriceModal(false)
                    setSelectedProduct(null)
                    setNewPrice('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Product</p>
                  <p className="font-semibold text-gray-900">
                    {selectedProduct.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    SKU: {selectedProduct.sku}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Price
                  </label>
                  <div className="flex items-center space-x-2 text-lg">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold">
                      {selectedProduct.price?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Price
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new price"
                    />
                  </div>
                </div>

                {newPrice && parseFloat(newPrice) !== selectedProduct.price && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        Price Change:
                      </span>
                      <div className="flex items-center space-x-2">
                        {parseFloat(newPrice) > (selectedProduct.price || 0) ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span
                          className={`font-semibold ${
                            parseFloat(newPrice) > (selectedProduct.price || 0)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {(
                            ((parseFloat(newPrice) -
                              (selectedProduct.price || 0)) /
                              (selectedProduct.price || 1)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPriceModal(false)
                    setSelectedProduct(null)
                    setNewPrice('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateWalmartPrice}
                  disabled={
                    !newPrice ||
                    isUpdating ||
                    parseFloat(newPrice) === selectedProduct.price
                  }
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Update Price</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Update Modal */}
        {showInventoryModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Update Inventory
                </h3>
                <button
                  onClick={() => {
                    setShowInventoryModal(false)
                    setSelectedProduct(null)
                    setNewQuantity('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Product</p>
                  <p className="font-semibold text-gray-900">
                    {selectedProduct.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    SKU: {selectedProduct.sku}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Inventory
                  </label>
                  <div className="flex items-center space-x-2 text-lg">
                    <Package className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold">
                      {selectedProduct.quantity || 0} units
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Quantity
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="number"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new quantity"
                      min="0"
                    />
                  </div>
                </div>

                {newQuantity &&
                  parseInt(newQuantity) !== selectedProduct.quantity && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                          Inventory Change:
                        </span>
                        <div className="flex items-center space-x-2">
                          {parseInt(newQuantity) >
                          (selectedProduct.quantity || 0) ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span
                            className={`font-semibold ${
                              parseInt(newQuantity) >
                              (selectedProduct.quantity || 0)
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {parseInt(newQuantity) >
                            (selectedProduct.quantity || 0)
                              ? '+'
                              : ''}
                            {parseInt(newQuantity) -
                              (selectedProduct.quantity || 0)}{' '}
                            units
                          </span>
                        </div>
                      </div>
                      {parseInt(newQuantity) === 0 && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Setting inventory to 0 will mark the item as out of
                          stock
                        </p>
                      )}
                    </div>
                  )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowInventoryModal(false)
                    setSelectedProduct(null)
                    setNewQuantity('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateWalmartInventory}
                  disabled={
                    !newQuantity ||
                    isUpdating ||
                    parseInt(newQuantity) === selectedProduct.quantity
                  }
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Update Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
