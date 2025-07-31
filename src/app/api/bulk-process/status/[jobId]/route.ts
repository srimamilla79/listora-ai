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

    // Get products from the JSONB column
    const products = (job.products as any[]) || []

    // For completed products, fetch the generated content from product_contents table
    const completedProductNames = products
      .filter((p) => p.status === 'completed')
      .map((p) => p.product_name)

    let contentMap: Record<string, string> = {}

    if (completedProductNames.length > 0) {
      // Fetch generated content for completed products
      const { data: contents, error: contentError } = await supabase
        .from('product_contents')
        .select('product_name, generated_content')
        .eq('user_id', job.user_id)
        .in('product_name', completedProductNames)
        .order('created_at', { ascending: false })

      if (!contentError && contents) {
        // Create a map of product_name to generated_content
        // Use the most recent content for each product
        contents.forEach((content) => {
          if (!contentMap[content.product_name]) {
            contentMap[content.product_name] = content.generated_content
          }
        })
      }

      console.log(
        `📝 Fetched content for ${Object.keys(contentMap).length} products`
      )
    }

    // Merge the generated content into the products array
    const productsWithContent = products.map((product) => {
      if (product.status === 'completed' && contentMap[product.product_name]) {
        return {
          ...product,
          generated_content: contentMap[product.product_name],
        }
      }
      return product
    })

    // Count products by status
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
        products: productsWithContent, // Use the products with content
        stats: {
          total: job.total_products,
          completed: statusCounts.completed || 0,
          failed: statusCounts.failed || 0,
          processing: statusCounts.processing || 0,
          pending: statusCounts.pending || 0,
        },
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
