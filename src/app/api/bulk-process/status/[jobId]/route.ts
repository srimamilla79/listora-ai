// src/app/api/bulk-process/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface RouteParams {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Fix: Await params before using
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const supabase = createServerClient(
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

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Count products by status
    const products = (job.products as any[]) || []
    const statusCounts = products.reduce((acc, product) => {
      acc[product.status] = (acc[product.status] || 0) + 1
      return acc
    }, {})

    const response = {
      success: true,
      job: {
        id: job.id,
        status: job.status,
        total_products: job.total_products,
        completed_products: statusCounts.completed || 0,
        failed_products: statusCounts.failed || 0,
        processing_products: statusCounts.processing || 0,
        pending_products: statusCounts.pending || 0,
        created_at: job.created_at,
        updated_at: job.updated_at,
        products: products,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching job status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}
