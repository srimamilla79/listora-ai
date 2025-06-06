// src/app/api/bulk-process/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

interface BulkProduct {
  id: string
  product_name: string
  features: string
  platform: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  generated_content?: string
  error_message?: string
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

export async function POST(request: NextRequest) {
  try {
    const { products, userId } = await request.json()

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Create unique job ID
    const jobId = `bulk_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare products for database
    const productsWithIds: BulkProduct[] = products.map((product, index) => ({
      id: `${jobId}_product_${index}`,
      product_name:
        product.product_name || product.productName || `Product ${index + 1}`,
      features: product.features || '',
      platform: product.platform || 'amazon',
      status: 'pending' as const,
    }))

    const supabase = createServiceRoleClient()

    // Create bulk job in database
    const { data: job, error: jobError } = await supabase
      .from('bulk_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        status: 'processing',
        total_products: products.length,
        completed_products: 0,
        failed_products: 0,
        products: productsWithIds,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) {
      console.error('Error creating bulk job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create bulk job' },
        { status: 500 }
      )
    }

    console.log(`🚀 Starting background processing for job: ${jobId}`)

    // Start background processing (don't await - let it run in background)
    processProductsInBackground(jobId, productsWithIds, userId, supabase)

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: `Background job started for ${products.length} products`,
      productsCount: products.length,
    })
  } catch (error) {
    console.error('Error in bulk process start:', error)
    return NextResponse.json(
      { error: 'Failed to start bulk processing' },
      { status: 500 }
    )
  }
}

// Background processing function
async function processProductsInBackground(
  jobId: string,
  products: BulkProduct[],
  userId: string,
  supabase: any
) {
  const batchSize = 3 // Process 3 at a time
  console.log(
    `🔄 Processing ${products.length} products in batches of ${batchSize}`
  )

  try {
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}: products ${i + 1}-${Math.min(i + batchSize, products.length)}`
      )

      // Process batch in parallel
      await Promise.all(
        batch.map(async (product) => {
          await processProduct(jobId, product, userId, supabase)
        })
      )

      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    // Mark job as completed
    await supabase
      .from('bulk_jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`✅ Job ${jobId} completed successfully`)
  } catch (error) {
    console.error(`❌ Error in background processing for job ${jobId}:`, error)

    // Mark job as failed
    await supabase
      .from('bulk_jobs')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

// Process individual product
async function processProduct(
  jobId: string,
  product: BulkProduct,
  userId: string,
  supabase: any
) {
  try {
    console.log(`🔄 Processing product: ${product.product_name}`)

    // Update product status to processing
    await updateProductInJob(
      jobId,
      product.id,
      { status: 'processing' },
      supabase
    )

    // Call the generate API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: product.product_name,
          features: product.features,
          platform: product.platform,
          isBackgroundJob: true,
          userId: userId,
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Completed product: ${product.product_name}`)

      // Update product as completed
      await updateProductInJob(
        jobId,
        product.id,
        {
          status: 'completed',
          generated_content: data.result,
        },
        supabase
      )
    } else {
      const errorText = await response.text()
      console.log(`❌ Failed product: ${product.product_name} - ${errorText}`)

      // Update product as failed
      await updateProductInJob(
        jobId,
        product.id,
        {
          status: 'failed',
          error_message: `API Error: ${response.status} - ${errorText}`,
        },
        supabase
      )
    }
  } catch (error) {
    console.error(`❌ Error processing product ${product.product_name}:`, error)

    // Update product as failed
    await updateProductInJob(
      jobId,
      product.id,
      {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
      supabase
    )
  }
}

// Helper function to update individual product in job
async function updateProductInJob(
  jobId: string,
  productId: string,
  updates: Partial<BulkProduct>,
  supabase: any
) {
  try {
    // Get current job
    const { data: job } = await supabase
      .from('bulk_jobs')
      .select('products, completed_products, failed_products')
      .eq('id', jobId)
      .single()

    if (!job) return

    // Update the specific product in the products array
    const updatedProducts = (job.products as BulkProduct[]).map((product) =>
      product.id === productId ? { ...product, ...updates } : product
    )

    // Count completed and failed products
    const completedCount = updatedProducts.filter(
      (p) => p.status === 'completed'
    ).length
    const failedCount = updatedProducts.filter(
      (p) => p.status === 'failed'
    ).length

    // Update job in database
    await supabase
      .from('bulk_jobs')
      .update({
        products: updatedProducts,
        completed_products: completedCount,
        failed_products: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  } catch (error) {
    console.error('Error updating product in job:', error)
  }
}
