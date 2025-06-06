// src/app/api/bulk-process/user-jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface BulkJobSummary {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_products: number
  completed_products: number
  failed_products: number
  created_at: string
  updated_at: string
}

function createServiceRoleClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => null,
        set: () => {},
        remove: () => {},
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 User jobs API called')

    // Try multiple authentication methods
    let userId: string | null = null

    // Method 1: Try Authorization header (for explicit token)
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      console.log('🔑 Found authorization header')
      const token = authHeader.replace('Bearer ', '')

      const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: () => null,
            set: () => {},
            remove: () => {},
          },
        }
      )

      await userSupabase.auth.setSession({
        access_token: token,
        refresh_token: '',
      })

      const {
        data: { user },
        error: authError,
      } = await userSupabase.auth.getUser()

      if (user && !authError) {
        userId = user.id
        console.log('✅ Auth header authentication successful:', userId)
      } else {
        console.log('❌ Auth header failed:', authError)
      }
    }

    // Method 2: Try cookies (for regular session)
    if (!userId) {
      console.log('🍪 Trying cookie authentication')
      const cookieStore = await cookies()

      const userSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              cookieStore.set(name, value, options)
            },
            remove(name: string, options: any) {
              cookieStore.delete(name)
            },
          },
        }
      )

      const {
        data: { user },
        error: cookieError,
      } = await userSupabase.auth.getUser()

      if (user && !cookieError) {
        userId = user.id
        console.log('✅ Cookie authentication successful:', userId)
      } else {
        console.log('❌ Cookie auth failed:', cookieError)
      }
    }

    // If no authentication worked
    if (!userId) {
      console.log('❌ All authentication methods failed')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('👤 Authenticated user:', userId)

    // Use service role client for database operations
    const supabase = createServiceRoleClient()

    // Get user's bulk jobs from last 24 hours
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    console.log('📊 Fetching jobs for user:', userId)

    const { data: jobs, error: jobsError } = await supabase
      .from('bulk_jobs')
      .select(
        'id, status, total_products, completed_products, failed_products, created_at, updated_at'
      )
      .eq('user_id', userId)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('❌ Error fetching user jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      )
    }

    console.log(`📋 Found ${jobs?.length || 0} jobs for user`)

    // Find active jobs (processing or recently created)
    const activeJobs =
      jobs?.filter(
        (job: BulkJobSummary) =>
          job.status === 'processing' || job.status === 'pending'
      ) || []

    // All recent jobs for reference
    const recentJobs = jobs || []

    console.log(`🔄 Active jobs: ${activeJobs.length}`)

    return NextResponse.json({
      success: true,
      activeJobs,
      recentJobs,
      hasActiveJobs: activeJobs.length > 0,
      userId: userId, // For debugging
    })
  } catch (error) {
    console.error('💥 Error in user jobs endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to check user jobs' },
      { status: 500 }
    )
  }
}
