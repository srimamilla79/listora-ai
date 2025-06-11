'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

/**
 * Hook to track the current logged-in user session using Supabase Auth.
 */
export function useUserSession() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ SSR-safe Supabase state management
  const [supabase, setSupabase] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  // ✅ Initialize Supabase client after component mounts
  useEffect(() => {
    setMounted(true)
    const supabaseClient = createClient()
    setSupabase(supabaseClient)
  }, [])

  useEffect(() => {
    if (!supabase || !mounted) return

    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      console.log('Session:', session) // 🔍 Debug log to check session
      if (error) console.error('Session Error:', error)

      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed. New session:', session) // 🔍 Debug log
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, mounted])

  return { user, loading }
}
