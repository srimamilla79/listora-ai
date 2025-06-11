// src/components/AvatarHeader.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  User,
  Settings,
  CreditCard,
  Shield,
  LogOut,
  ChevronDown,
  Crown,
  Sparkles,
} from 'lucide-react'

interface UserSubscription {
  plan_name: string
  status: string
  current_period_end: string
}

interface AvatarHeaderProps {
  user: any
  onSignOut: () => void
}

export default function AvatarHeader({ user, onSignOut }: AvatarHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  // Get user's name from metadata or email
  const userName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  // Generate initials from name or email
  const getInitials = (name: string): string => {
    if (!name) return 'U'

    const words = name.split(' ')
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(userName)

  // Check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id || !supabase) return

      try {
        const { data: adminCheck } = await supabase.rpc('is_admin', {
          user_uuid: user.id,
        })
        setIsAdmin(adminCheck || false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }

    if (user?.id && supabase) {
      checkAdminStatus()
    }
  }, [user?.id, supabase])

  // Load subscription data from user_plans table
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.id || !supabase) return

      try {
        console.log('🔍 AvatarHeader - Loading plan for user:', user.id)

        // Read from user_plans table instead of user_subscriptions
        const { data, error } = await supabase
          .from('user_plans')
          .select('plan_type, is_active, created_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        console.log('🔍 AvatarHeader - Plan query result:', { data, error })

        if (error) {
          console.log('No plan found, defaulting to starter:', error)
          setSubscription({
            plan_name: 'Starter',
            status: 'active',
            current_period_end: '',
          })
        } else {
          console.log('✅ AvatarHeader - Plan loaded:', data.plan_type)
          // Map plan_type to plan_name format
          setSubscription({
            plan_name:
              data.plan_type.charAt(0).toUpperCase() + data.plan_type.slice(1), // business -> Business
            status: 'active',
            current_period_end: '',
          })
        }
      } catch (error) {
        console.error('Error loading plan:', error)
        setSubscription({
          plan_name: 'Starter',
          status: 'active',
          current_period_end: '',
        })
      } finally {
        setLoading(false)
      }
    }

    if (user?.id && supabase) {
      loadSubscription()
    }
  }, [user?.id, supabase])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProfileClick = () => {
    setIsOpen(false)
    router.push('/profile')
  }

  const handleBillingClick = () => {
    setIsOpen(false)
    router.push('/profile?tab=billing')
  }

  const handleSecurityClick = () => {
    setIsOpen(false)
    router.push('/profile?tab=security')
  }

  const handleSignOutClick = () => {
    setIsOpen(false)
    onSignOut()
  }

  // Admin-aware plan icon
  const getPlanIcon = (planName: string) => {
    if (isAdmin) return <Crown className="h-4 w-4 text-purple-600" />

    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise'))
      return <Crown className="h-4 w-4 text-purple-600" />
    if (plan?.includes('premium'))
      return <Crown className="h-4 w-4 text-yellow-600" />
    if (plan?.includes('business'))
      return <Crown className="h-4 w-4 text-blue-600" />
    return <Crown className="h-4 w-4 text-gray-400" />
  }

  // Admin-aware plan color
  const getPlanColor = (planName: string) => {
    if (isAdmin)
      return 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 border border-purple-200'

    const plan = planName?.toLowerCase()
    if (plan?.includes('enterprise')) return 'bg-purple-100 text-purple-800'
    if (plan?.includes('premium')) return 'bg-yellow-100 text-yellow-800'
    if (plan?.includes('business')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-600'
  }

  // Get display plan name
  const getDisplayPlanName = () => {
    if (isAdmin) return 'Owner'
    return subscription?.plan_name || 'Starter'
  }

  // ✅ Wait for SSR safety before rendering
  if (!mounted || !supabase) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="hidden md:block">
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 transition-colors group cursor-pointer"
      >
        {/* Avatar Circle - Enhanced: Admin styling */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm group-hover:shadow-md transition-shadow ${
            isAdmin
              ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600'
          }`}
        >
          {initials}
        </div>

        {/* User Info (Desktop) */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{userName}</div>
          {!loading && subscription && (
            <div
              className={`text-xs ${isAdmin ? 'text-purple-600 font-medium' : 'text-gray-500'}`}
            >
              {isAdmin && <span className="mr-1">👑</span>}
              {getDisplayPlanName()} Plan
            </div>
          )}
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in slide-in-from-top-1 duration-200">
          {/* User Info Header - Enhanced: Admin styling */}
          <div
            className={`px-4 py-3 border-b border-gray-100 ${isAdmin ? 'bg-gradient-to-r from-purple-50 to-indigo-50' : ''}`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${
                  isAdmin
                    ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                }`}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">
                  {userName}
                  {isAdmin && (
                    <Crown className="inline h-4 w-4 ml-1 text-purple-600" />
                  )}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {user?.email}
                </div>
                {!loading && subscription && (
                  <div className="flex items-center mt-1">
                    {getPlanIcon(subscription.plan_name)}
                    <span
                      className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPlanColor(
                        subscription.plan_name
                      )}`}
                    >
                      {isAdmin && <Sparkles className="h-3 w-3 mr-1" />}
                      {getDisplayPlanName()} Plan
                      {isAdmin && <span className="ml-1">∞</span>}
                    </span>
                    {subscription.status !== 'active' && !isAdmin && (
                      <span className="ml-2 text-xs text-red-600">
                        ({subscription.status})
                      </span>
                    )}
                    {isAdmin && (
                      <span className="ml-2 text-xs text-purple-600 font-medium">
                        Unlimited Access
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin privileges section */}
          {isAdmin && (
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
              <div className="flex items-center space-x-2 text-xs">
                <Shield className="h-3 w-3 text-purple-600" />
                <span className="text-purple-700 font-medium">
                  Owner Privileges Active
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1 text-xs text-purple-600">
                <div className="flex items-center space-x-1">
                  <span>✓</span>
                  <span>Unlimited generations</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>✓</span>
                  <span>All features</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>✓</span>
                  <span>Admin dashboard</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>✓</span>
                  <span>Priority support</span>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={handleProfileClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <User className="h-4 w-4 mr-3 text-gray-400 group-hover:text-indigo-600" />
              <div className="text-left">
                <div className="font-medium">Profile Settings</div>
                <div className="text-xs text-gray-500">
                  Update your account info
                </div>
              </div>
            </button>

            <button
              onClick={handleBillingClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <CreditCard className="h-4 w-4 mr-3 text-gray-400 group-hover:text-green-600" />
              <div className="text-left">
                <div className="font-medium">
                  {isAdmin ? 'Business Management' : 'Billing & Plans'}
                </div>
                <div className="text-xs text-gray-500">
                  {isAdmin
                    ? 'Manage business settings'
                    : 'Manage subscription & billing'}
                </div>
              </div>
            </button>

            <button
              onClick={handleSecurityClick}
              className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <Shield className="h-4 w-4 mr-3 text-gray-400 group-hover:text-yellow-600" />
              <div className="text-left">
                <div className="font-medium">Security</div>
                <div className="text-xs text-gray-500">
                  Password & account security
                </div>
              </div>
            </button>
          </div>

          {/* Subscription Status */}
          {!loading && subscription && (
            <div className="px-4 py-2 border-t border-gray-100">
              {isAdmin ? (
                <div className="text-xs text-purple-600">
                  <div className="flex items-center space-x-1">
                    <Crown className="h-3 w-3" />
                    <span className="font-medium">
                      Owner account - No restrictions
                    </span>
                  </div>
                </div>
              ) : subscription.current_period_end ? (
                <div className="text-xs text-gray-500">
                  {subscription.status === 'active' ? (
                    <>
                      Next billing:{' '}
                      {new Date(
                        subscription.current_period_end
                      ).toLocaleDateString()}
                    </>
                  ) : (
                    <>
                      Plan expires:{' '}
                      {new Date(
                        subscription.current_period_end
                      ).toLocaleDateString()}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Sign Out */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleSignOutClick}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors group cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-3 text-red-400 group-hover:text-red-600" />
              <div className="font-medium">Sign Out</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
