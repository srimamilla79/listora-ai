'use client'

import { useState, useEffect } from 'react'
import ProductForm from '@/components/ProductForm'
import UsageDisplay from '@/components/UsageDisplay'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function GeneratePage() {
  const [user, setUser] = useState<any>(undefined)
  const [userPlan, setUserPlan] = useState<string>('starter')
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true

    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (isMounted) {
          setUser(session?.user ?? null)
          setLoading(false)

          if (!session?.user) {
            setRedirecting(true)
            router.push('/login')
          } else {
            // Fetch user plan when user is authenticated
            await fetchUserPlan(session.user.id)
          }
        }
      } catch (error) {
        console.error('Auth error:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (isMounted) {
        setUser(session?.user ?? null)
        if (!session?.user && event !== 'INITIAL_SESSION') {
          setRedirecting(true)
          router.push('/login')
        } else if (session?.user) {
          await fetchUserPlan(session.user.id)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserPlan = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (data && !error) {
        setUserPlan(data.plan_type)
        console.log('✅ User plan loaded:', data.plan_type)
      } else {
        console.log('⚠️ No plan found, defaulting to starter:', error)
        setUserPlan('starter')
      }
    } catch (error) {
      console.error('Error fetching user plan:', error)
      setUserPlan('starter')
    }
  }

  // Show loading during redirect or initial load
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // This should never show now
  if (user === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 min-h-screen">
      <main className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Generate Product Content
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create compelling product listings for any platform using AI. Just
              enter your product details and let our AI craft the perfect
              content.
            </p>
          </div>

          {/* Usage Display Component - Shows monthly usage */}
          <UsageDisplay userId={user?.id} planType={userPlan} />

          {/* Product Form */}
          <ProductForm />
        </div>
      </main>
    </div>
  )
}
