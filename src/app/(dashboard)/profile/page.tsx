// src/app/(dashboard)/profile/page.tsx - MINIMAL FIX FOR USAGE DATA
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  User,
  CreditCard,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  Crown,
  Calendar,
  DollarSign,
  ExternalLink,
  AlertTriangle,
  Mail,
  Lock,
  Sparkles,
  Settings,
  Bell,
  Zap,
  Star,
  TrendingUp,
  BarChart3,
  Upload,
  Activity,
  Award,
} from 'lucide-react'

interface UserSubscription {
  plan_name: string
  status: string
  current_period_end: string
  stripe_customer_id: string
  stripe_subscription_id: string
}

interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export default function EnhancedProfilePage() {
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'account'

  // User state
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  )

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [loadingBilling, setLoadingBilling] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState<ToastNotification[]>([])

  // 🔧 FIXED: Real usage stats instead of hardcoded data
  const [usageStats, setUsageStats] = useState({
    currentMonth: 0,
    limit: 10,
    totalGenerated: 0,
    savedTime: 0,
  })

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // 🔧 FIXED: Real usage data fetching function
  const fetchRealUsageStats = async (userId: string) => {
    if (!supabase || !userId) return

    console.log('🔍 Fetching real usage data for user:', userId)

    try {
      // Get current month usage (same logic as Monthly Usage section)
      const currentMonth = new Date().toISOString().slice(0, 7) // '2025-06'

      // Parallel queries for better performance
      const [usageResult, planResult, totalContentResult] = await Promise.all([
        // Current month usage
        supabase
          .from('user_usage_tracking')
          .select('usage_count')
          .eq('user_id', userId)
          .eq('month_year', currentMonth)
          .single(),

        // User plan
        supabase
          .from('user_plans')
          .select('plan_type')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single(),

        // Total generated content count
        supabase
          .from('product_contents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const { data: usageData, error: usageError } = usageResult
      const { data: planData, error: planError } = planResult
      const { count: totalGenerated, error: totalError } = totalContentResult

      console.log('🔍 Database results:', {
        usageData,
        usageError,
        planData,
        totalGenerated,
      })

      // Handle current month usage
      let currentUsage = 0
      if (usageData && !usageError) {
        currentUsage = usageData.usage_count || 0
      } else if (usageError && usageError.code !== 'PGRST116') {
        // If error is not "no rows found", try fallback count
        console.log('🔍 Using fallback count method')
        const startOfMonth = `${currentMonth}-01T00:00:00.000Z`
        const { count: fallbackCount } = await supabase
          .from('product_contents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', startOfMonth)

        currentUsage = fallbackCount || 0
      }

      // Handle plan limits
      const planLimits = {
        starter: 10,
        business: 250,
        premium: 1000,
        enterprise: 999999,
      }

      const planType = planData?.plan_type || 'starter'
      const limit = planLimits[planType as keyof typeof planLimits] || 10

      // Calculate time saved (rough estimate: 0.125 hours per content piece)
      const timeSpent = Math.floor((totalGenerated || 0) * 0.125)

      const newUsageStats = {
        currentMonth: currentUsage,
        limit: limit,
        totalGenerated: totalGenerated || 0,
        savedTime: timeSpent,
      }

      console.log('✅ Real usage stats calculated:', newUsageStats)
      setUsageStats(newUsageStats)
    } catch (error) {
      console.error('❌ Error fetching usage stats:', error)
      // Keep default values on error
      setUsageStats({
        currentMonth: 0,
        limit: 10,
        totalGenerated: 0,
        savedTime: 0,
      })
    }
  }

  // Add notification function
  const addNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = Date.now().toString()
    const notification = { id, message, type }
    setNotifications((prev) => [...prev, notification])

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  useEffect(() => {
    if (!supabase) return

    const loadUserData = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          router.push('/login')
          return
        }

        setUser(session.user)
        setEmail(session.user.email || '')
        setFullName(session.user.user_metadata?.full_name || '')

        // Load subscription data
        await loadSubscription(session.user.id)

        // 🔧 FIXED: Load real usage data
        await fetchRealUsageStats(session.user.id)
      } catch (error) {
        console.error('Error loading user data:', error)
        addNotification('Failed to load profile data', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router, supabase])

  const loadSubscription = async (userId: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.log('No subscription found:', error)
        setSubscription({
          plan_name: 'Starter',
          status: 'active',
          current_period_end: '',
          stripe_customer_id: '',
          stripe_subscription_id: '',
        })
      } else {
        setSubscription(data)
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user || !supabase) return

    setSavingProfile(true)
    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })

      if (authError) throw authError

      addNotification('Profile updated successfully!', 'success')
    } catch (error) {
      console.error('Error updating profile:', error)
      addNotification('Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!supabase) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      addNotification('Please fill in all password fields', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      addNotification('New passwords do not match', 'error')
      return
    }

    if (newPassword.length < 6) {
      addNotification('Password must be at least 6 characters', 'error')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      addNotification('Password changed successfully!', 'success')
    } catch (error) {
      console.error('Error changing password:', error)
      addNotification('Failed to change password', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleBillingPortal = async () => {
    if (!subscription?.stripe_customer_id || !supabase) {
      addNotification('No billing information found', 'error')
      return
    }

    setLoadingBilling(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create billing portal session')
      }

      const { url } = await response.json()
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      addNotification('Failed to access billing portal', 'error')
    } finally {
      setLoadingBilling(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id || !supabase) {
      addNotification('No active subscription found', 'error')
      return
    }

    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You can continue using your current plan until the end of the billing period.'
      )
    ) {
      return
    }

    setCancelingSubscription(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      await loadSubscription(user.id)
      addNotification('Subscription cancelled successfully', 'success')
    } catch (error) {
      console.error('Error canceling subscription:', error)
      addNotification('Failed to cancel subscription', 'error')
    } finally {
      setCancelingSubscription(false)
    }
  }

  const getPlanIcon = (planName: string) => {
    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise'))
      return <Crown className="h-6 w-6 text-purple-600" />
    if (plan?.includes('premium'))
      return <Crown className="h-6 w-6 text-yellow-600" />
    if (plan?.includes('business'))
      return <Crown className="h-6 w-6 text-blue-600" />
    return <Sparkles className="h-6 w-6 text-gray-400" />
  }

  const getPlanColor = (planName: string) => {
    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise'))
      return 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200'
    if (plan?.includes('premium'))
      return 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
    if (plan?.includes('business'))
      return 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
    return 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
  }

  const getPlanPrice = (planName: string) => {
    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise')) return '$199'
    if (plan?.includes('premium')) return '$79'
    if (plan?.includes('business')) return '$29'
    return 'Free'
  }

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100
    if (percentage >= 90) return 'from-red-500 to-red-600'
    if (percentage >= 70) return 'from-yellow-500 to-orange-500'
    return 'from-green-500 to-emerald-500'
  }

  if (loading || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* Enhanced Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-md p-4 rounded-xl shadow-xl border transform transition-all duration-300 ease-in-out backdrop-blur-lg ${
              notification.type === 'success'
                ? 'bg-green-50/90 border-green-200 text-green-800'
                : notification.type === 'error'
                  ? 'bg-red-50/90 border-red-200 text-red-800'
                  : 'bg-blue-50/90 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' && (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                )}
                {notification.type === 'error' && (
                  <X className="h-5 w-5 mr-2 text-red-600" />
                )}
                {notification.type === 'info' && (
                  <Mail className="h-5 w-5 mr-2 text-blue-600" />
                )}
                <span className="text-sm font-medium">
                  {notification.message}
                </span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600 ml-4 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Profile Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-8 mb-8 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full opacity-20 transform translate-x-32 -translate-y-32" />

          <div className="relative grid md:grid-cols-3 gap-8 items-center">
            {/* Profile Info */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-2xl">
                  {fullName
                    ? fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {fullName || 'Welcome Back!'}
                  </h1>
                  <p className="text-gray-600 text-lg mb-3">{email}</p>
                  <div className="flex items-center space-x-4">
                    {user?.email_confirmed_at ? (
                      <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Email Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Email Not Verified
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      Member since{' '}
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    Current Plan
                  </span>
                  {getPlanIcon(subscription?.plan_name || 'Starter')}
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {subscription?.plan_name || 'Starter'}
                </div>
                <div className="text-sm text-blue-600">
                  {getPlanPrice(subscription?.plan_name || 'Starter')}
                  {subscription?.plan_name !== 'Starter' ? '/month' : ''}
                </div>
              </div>

              {subscription?.plan_name === 'Starter' && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">
                      This Month
                    </span>
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-lg font-bold text-green-900">
                    {usageStats.currentMonth}/{usageStats.limit} used
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className={`bg-gradient-to-r ${getUsageColor(usageStats.currentMonth, usageStats.limit)} h-2 rounded-full transition-all duration-300`}
                      style={{
                        width: `${(usageStats.currentMonth / usageStats.limit) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usage Overview Cards - Only show for Starter plan */}
        {subscription?.plan_name === 'Starter' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {usageStats.currentMonth}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">This Month</h3>
              <p className="text-sm text-gray-600">Content generations used</p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {usageStats.limit - usageStats.currentMonth}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Remaining</h3>
              <p className="text-sm text-gray-600">Free generations left</p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {usageStats.totalGenerated}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Total Created
              </h3>
              <p className="text-sm text-gray-600">All-time generations</p>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {usageStats.savedTime}h
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Time Saved</h3>
              <p className="text-sm text-gray-600">Hours of manual work</p>
            </div>
          </div>
        )}

        {/* Enhanced Tabs */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="border-b border-gray-200/50">
            <nav className="flex space-x-8 px-8">
              {[
                {
                  id: 'account',
                  label: 'Account',
                  icon: User,
                  description: 'Personal information',
                },
                {
                  id: 'billing',
                  label: 'Billing',
                  icon: CreditCard,
                  description: 'Subscription & payments',
                },
                {
                  id: 'security',
                  label: 'Security',
                  icon: Shield,
                  description: 'Password & verification',
                },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => router.push(`/profile?tab=${tab.id}`)}
                    className={`group flex items-center space-x-3 py-6 border-b-2 transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg transition-all ${
                        activeTab === tab.id
                          ? 'bg-indigo-100'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{tab.label}</div>
                      <div className="text-xs opacity-75">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-8">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Account Information
                      </h3>
                      <p className="text-gray-600">
                        Update your personal details and preferences
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-xl p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center">
                          <Lock className="h-3 w-3 mr-1" />
                          Email cannot be changed. Contact support if needed.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleUpdateProfile}
                        disabled={savingProfile}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                      >
                        {savingProfile ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Account Statistics
                      </h3>
                      <p className="text-gray-600">
                        Your account journey and milestones
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <Calendar className="h-8 w-8 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Member Since
                        </span>
                      </div>
                      <div className="text-lg font-bold text-blue-900">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'Unknown'}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="h-8 w-8 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Last Active
                        </span>
                      </div>
                      <div className="text-lg font-bold text-green-900">
                        {user?.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : 'Today'}
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <div className="flex items-center justify-between mb-3">
                        <Award className="h-8 w-8 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">
                          Account Status
                        </span>
                      </div>
                      <div className="text-lg font-bold text-purple-900">
                        {user?.email_confirmed_at ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-8">
                {/* Current Plan */}
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Crown className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Current Subscription
                      </h3>
                      <p className="text-gray-600">
                        Manage your plan and billing preferences
                      </p>
                    </div>
                  </div>

                  {subscription && (
                    <div
                      className={`border-2 rounded-2xl p-8 ${getPlanColor(subscription.plan_name)} shadow-lg`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                            {getPlanIcon(subscription.plan_name)}
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold text-gray-900 mb-1">
                              {subscription.plan_name} Plan
                            </h4>
                            <p className="text-lg font-semibold text-gray-700">
                              {getPlanPrice(subscription.plan_name)}
                              {subscription.plan_name !== 'Starter'
                                ? '/month'
                                : ''}
                            </p>
                            {subscription.plan_name === 'Starter' && (
                              <p className="text-sm text-gray-600 mt-1">
                                {usageStats.limit} free content generations
                                monthly
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2 mb-2">
                            <span
                              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                subscription.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {subscription.status === 'active'
                                ? 'Active'
                                : subscription.status}
                            </span>
                          </div>
                          {subscription.current_period_end && (
                            <p className="text-sm text-gray-600">
                              {subscription.status === 'active'
                                ? 'Renews'
                                : 'Expires'}
                              :{' '}
                              {new Date(
                                subscription.current_period_end
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Billing Actions */}
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Billing Management
                      </h3>
                      <p className="text-gray-600">
                        Update payment methods and billing details
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {subscription?.stripe_customer_id && (
                      <button
                        onClick={handleBillingPortal}
                        disabled={loadingBilling}
                        className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                      >
                        {loadingBilling ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        ) : (
                          <ExternalLink className="h-5 w-5 mr-2" />
                        )}
                        {loadingBilling ? 'Loading...' : 'Manage Billing'}
                      </button>
                    )}

                    <button
                      onClick={() => router.push('/pricing')}
                      className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Upgrade Plan
                    </button>
                  </div>

                  {subscription?.stripe_subscription_id &&
                    subscription.status === 'active' && (
                      <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-200">
                        <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Cancel Subscription
                        </h4>
                        <p className="text-sm text-red-700 mb-4">
                          You can cancel your subscription at any time. You'll
                          continue to have access to your current plan until the
                          end of your billing period.
                        </p>
                        <button
                          onClick={handleCancelSubscription}
                          disabled={cancelingSubscription}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          {cancelingSubscription ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <X className="h-4 w-4 mr-2" />
                          )}
                          {cancelingSubscription
                            ? 'Canceling...'
                            : 'Cancel Subscription'}
                        </button>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Change Password
                      </h3>
                      <p className="text-gray-600">
                        Keep your account secure with a strong password
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-xl p-6 space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleChangePassword}
                        disabled={
                          changingPassword ||
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword
                        }
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                      >
                        {changingPassword ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Lock className="h-4 w-4 mr-2" />
                        )}
                        {changingPassword ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Account Security
                      </h3>
                      <p className="text-gray-600">
                        Verification status and security settings
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 rounded-xl p-6">
                    <div className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center space-x-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            user?.email_confirmed_at
                              ? 'bg-green-100'
                              : 'bg-yellow-100'
                          }`}
                        >
                          {user?.email_confirmed_at ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : (
                            <Mail className="h-6 w-6 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Email Verification
                          </h4>
                          <p className="text-sm text-gray-600">
                            {user?.email_confirmed_at
                              ? 'Your email address has been verified'
                              : 'Please verify your email address for account security'}
                          </p>
                        </div>
                      </div>
                      <div>
                        {user?.email_confirmed_at ? (
                          <span className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-xl text-sm font-medium">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <button className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-xl hover:from-yellow-700 hover:to-orange-700 transition-all text-sm font-medium cursor-pointer">
                            Verify Email
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
