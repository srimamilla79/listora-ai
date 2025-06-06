// src/app/(dashboard)/profile/page.tsx - UPDATED VERSION
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

export default function ProfilePage() {
  const supabase = createClient()
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
    if (!user) return

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
    if (!subscription?.stripe_customer_id) {
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
    if (!subscription?.stripe_subscription_id) {
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
      return 'bg-purple-100 text-purple-800 border-purple-200'
    if (plan?.includes('premium'))
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (plan?.includes('business'))
      return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  const getPlanPrice = (planName: string) => {
    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise')) return '$199'
    if (plan?.includes('premium')) return '$79'
    if (plan?.includes('business')) return '$29'
    return 'Free'
  }

  if (loading) {
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
    // FIXED: Consistent background, removed individual header
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      {/* REMOVED: Individual header - now using UniversalHeader from layout */}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`max-w-md p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-400 text-green-800'
                : notification.type === 'error'
                  ? 'bg-red-50 border-red-400 text-red-800'
                  : 'bg-blue-50 border-blue-400 text-blue-800'
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              {fullName
                ? fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                : email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {fullName || 'User Profile'}
              </h1>
              <p className="text-gray-600">{email}</p>
              {user?.email_confirmed_at ? (
                <span className="inline-flex items-center mt-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Email Not Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'account', label: 'Account', icon: User },
                { id: 'billing', label: 'Billing', icon: CreditCard },
                { id: 'security', label: 'Security', icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => router.push(`/profile?tab=${tab.id}`)}
                    className={`flex items-center space-x-2 py-4 border-b-2 transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Account Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={handleUpdateProfile}
                      disabled={savingProfile}
                      className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Account Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Member Since:</span>
                      <span className="ml-2 font-medium">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="ml-2 font-medium">
                        {user?.updated_at
                          ? new Date(user.updated_at).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Current Plan */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Current Subscription
                  </h3>
                  {subscription && (
                    <div
                      className={`border rounded-lg p-6 ${getPlanColor(
                        subscription.plan_name
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getPlanIcon(subscription.plan_name)}
                          <div>
                            <h4 className="text-xl font-bold">
                              {subscription.plan_name} Plan
                            </h4>
                            <p className="text-sm opacity-75">
                              {getPlanPrice(subscription.plan_name)}
                              {subscription.plan_name !== 'Starter'
                                ? '/month'
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                            <p className="text-sm opacity-75 mt-1">
                              {subscription.status === 'active'
                                ? 'Next billing'
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Billing Management
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscription?.stripe_customer_id && (
                      <button
                        onClick={handleBillingPortal}
                        disabled={loadingBilling}
                        className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {loadingBilling ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <ExternalLink className="h-4 w-4 mr-2" />
                        )}
                        {loadingBilling ? 'Loading...' : 'Manage Billing'}
                      </button>
                    )}

                    <button
                      onClick={() => router.push('/pricing')}
                      className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </button>
                  </div>

                  {subscription?.stripe_subscription_id &&
                    subscription.status === 'active' && (
                      <div className="border-t border-gray-200 pt-6">
                        <h4 className="text-md font-medium text-gray-900 mb-3">
                          Cancel Subscription
                        </h4>
                        <p className="text-sm text-gray-600 mb-4">
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
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Change Password
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={
                        changingPassword ||
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword
                      }
                      className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Account Security
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          Email Verification
                        </h4>
                        <p className="text-sm text-gray-600">
                          {user?.email_confirmed_at
                            ? 'Your email is verified'
                            : 'Please verify your email address'}
                        </p>
                      </div>
                      <div>
                        {user?.email_confirmed_at ? (
                          <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Verified
                          </span>
                        ) : (
                          <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm cursor-pointer">
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
