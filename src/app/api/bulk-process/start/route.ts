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
    const { products, userId, selectedSections } = await request.json()

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
        selected_sections: selectedSections,
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

    // Extract authentication from request
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')

    console.log(`🔑 Auth header: ${authHeader ? 'Present' : 'Missing'}`)
    console.log(`🍪 Cookies: ${cookies ? 'Present' : 'Missing'}`)

    // Start background processing with auth context
    processProductsInBackground(
      jobId,
      productsWithIds,
      userId,
      selectedSections,
      supabase,
      authHeader,
      cookies
    )

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

// Background processing function - OPTIMIZED BATCHING
async function processProductsInBackground(
  jobId: string,
  products: BulkProduct[],
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  const batchSize = 2 // Process 2 at a time - safe middle ground
  console.log(
    `🎬 Starting optimized batch processing for ${products.length} products (batches of ${batchSize})`
  )

  try {
    // Process in small batches with proper waiting
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}: products ${i + 1}-${Math.min(i + batchSize, products.length)}`
      )

      // Process batch in parallel
      await Promise.all(
        batch.map(async (product, batchIndex) => {
          const globalIndex = i + batchIndex
          console.log(
            `🚀 [${globalIndex + 1}/${products.length}] Starting: ${product.product_name}`
          )

          await processProduct(
            jobId,
            product,
            userId,
            selectedSections,
            supabase,
            authHeader,
            cookies
          )
        })
      )

      // Wait for all database writes in this batch to complete
      console.log(
        `⏳ Batch ${Math.floor(i / batchSize) + 1} completed, waiting for database sync...`
      )
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }

    console.log(`🏁 All products processed, calculating final stats...`)

    // Wait extra time for all database writes to complete
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Get final accurate stats
    const { data: finalJob } = await supabase
      .from('bulk_jobs')
      .select('products')
      .eq('id', jobId)
      .single()

    if (finalJob) {
      const allProducts = finalJob.products as BulkProduct[]
      const completedCount = allProducts.filter(
        (p: BulkProduct) => p.status === 'completed'
      ).length
      const failedCount = allProducts.filter(
        (p: BulkProduct) => p.status === 'failed'
      ).length
      const processingCount = allProducts.filter(
        (p: BulkProduct) => p.status === 'processing'
      ).length

      console.log(`📊 Final verification:`)
      console.log(`   Total: ${allProducts.length}`)
      console.log(`   Completed: ${completedCount}`)
      console.log(`   Failed: ${failedCount}`)
      console.log(`   Still Processing: ${processingCount}`)

      // If any products are still processing, mark them as failed
      if (processingCount > 0) {
        console.log(
          `⚠️ Found ${processingCount} products still processing, marking as failed`
        )
        const updatedProducts = allProducts.map((p: BulkProduct) =>
          p.status === 'processing'
            ? {
                ...p,
                status: 'failed' as const,
                error_message: 'Processing timeout',
              }
            : p
        )

        const finalCompleted = updatedProducts.filter(
          (p) => p.status === 'completed'
        ).length
        const finalFailed = updatedProducts.filter(
          (p) => p.status === 'failed'
        ).length

        await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            status: 'completed',
            completed_products: finalCompleted,
            failed_products: finalFailed,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        console.log(
          `✅ Job completed with final stats: ${finalCompleted} completed, ${finalFailed} failed`
        )
      } else {
        // All products are either completed or failed
        await supabase
          .from('bulk_jobs')
          .update({
            status: 'completed',
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        console.log(
          `✅ Job completed with final stats: ${completedCount} completed, ${failedCount} failed`
        )
      }
    }
  } catch (error) {
    console.error(`❌ Error in background processing for job ${jobId}:`, error)
    await supabase
      .from('bulk_jobs')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
  }
}

// Process individual product - SIMPLIFIED
async function processProduct(
  jobId: string,
  product: BulkProduct,
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  try {
    console.log(`🔄 Processing product: ${product.product_name}`)

    // Update product status to processing - SIMPLE UPDATE
    const { data: currentJob } = await supabase
      .from('bulk_jobs')
      .select('products')
      .eq('id', jobId)
      .single()

    if (currentJob) {
      const updatedProducts = (currentJob.products as BulkProduct[]).map(
        (p: BulkProduct) =>
          p.id === product.id ? { ...p, status: 'processing' as const } : p
      )

      await supabase
        .from('bulk_jobs')
        .update({
          products: updatedProducts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    }

    // Build headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
      console.log(`🔑 Added auth header for ${product.product_name}`)
    }

    if (cookies) {
      headers['Cookie'] = cookies
      console.log(`🍪 Added cookies for ${product.product_name}`)
    }

    // Call the generate API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productName: product.product_name,
          features: product.features,
          platform: product.platform,
          isBackgroundJob: true,
          userId: userId,
          selectedSections: selectedSections,
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Completed product: ${product.product_name}`)

      // SIMPLE: Get current job, update the specific product, write back
      const { data: currentJob } = await supabase
        .from('bulk_jobs')
        .select('products')
        .eq('id', jobId)
        .single()

      if (currentJob) {
        const updatedProducts = (currentJob.products as BulkProduct[]).map(
          (p: BulkProduct) =>
            p.id === product.id
              ? {
                  ...p,
                  status: 'completed' as const,
                  generated_content: data.result,
                }
              : p
        )

        const completedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'completed'
        ).length
        const failedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'failed'
        ).length

        await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)

        console.log(
          `📊 Updated job - Completed: ${completedCount}, Failed: ${failedCount}`
        )
      }
    } else {
      const errorText = await response.text()
      console.log(
        `❌ Failed product: ${product.product_name} - ${response.status}: ${errorText}`
      )

      // Mark as failed - SIMPLE UPDATE
      const { data: currentJob } = await supabase
        .from('bulk_jobs')
        .select('products')
        .eq('id', jobId)
        .single()

      if (currentJob) {
        const updatedProducts = (currentJob.products as BulkProduct[]).map(
          (p: BulkProduct) =>
            p.id === product.id
              ? {
                  ...p,
                  status: 'failed' as const,
                  error_message: `API Error: ${response.status} - ${errorText}`,
                }
              : p
        )

        const completedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'completed'
        ).length
        const failedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'failed'
        ).length

        await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    }
  } catch (error) {
    console.error(`❌ Error processing product ${product.product_name}:`, error)

    // Mark as failed on exception
    try {
      const { data: currentJob } = await supabase
        .from('bulk_jobs')
        .select('products')
        .eq('id', jobId)
        .single()

      if (currentJob) {
        const updatedProducts = (currentJob.products as BulkProduct[]).map(
          (p: BulkProduct) =>
            p.id === product.id
              ? {
                  ...p,
                  status: 'failed' as const,
                  error_message:
                    error instanceof Error ? error.message : 'Unknown error',
                }
              : p
        )

        const completedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'completed'
        ).length
        const failedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'failed'
        ).length

        await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
      }
    } catch (updateError) {
      console.error(`❌ Failed to update product as failed:`, updateError)
    }
  }
}
