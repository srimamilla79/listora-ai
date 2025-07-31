// src/components/layout/DashboardPageWrapper.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'

interface DashboardPageWrapperProps {
  children: React.ReactNode
  title?: string
}

export default function DashboardPageWrapper({
  children,
  title,
}: DashboardPageWrapperProps) {
  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  useEffect(() => {
    if (!supabase || !mounted) return

    let isMounted = true

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          setUser(session.user)

          // Fetch user plan
          const { data: planData } = await supabase
            .from('user_plans')
            .select('plan_type')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .single()

          if (planData && isMounted) {
            setUserPlan(planData.plan_type)
          }

          // Check admin status
          try {
            const { data: adminCheck } = await supabase.rpc('is_admin', {
              user_uuid: session.user.id,
            })
            if (isMounted) {
              setIsAdmin(adminCheck || false)
            }
          } catch (error) {
            console.error('Error checking admin status:', error)
          }
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (isMounted) {
        if (!session) {
          router.push('/login')
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase, mounted])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  if (loading || !mounted || !supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <DashboardSidebar
        user={user}
        userPlan={userPlan}
        isAdmin={isAdmin}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {title && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
