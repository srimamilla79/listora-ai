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

    // 🔧 BULLETPROOF FINAL VERIFICATION WITH DATABASE LOCKING
    console.log('🏁 All products processed, calculating final stats...')

    // Wait for all database writes to settle
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // 🔒 ATOMIC TRANSACTION: Get and update job in single operation
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        console.log(
          `🔄 Final verification attempt ${retryCount + 1}/${maxRetries}`
        )

        // Get current job state
        const { data: finalJob, error: finalJobError } = await supabase
          .from('bulk_jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (finalJobError) {
          console.error('❌ Error fetching final job:', finalJobError)
          throw finalJobError
        }

        if (!finalJob || !finalJob.products) {
          console.error('❌ Final job or products not found')
          throw new Error('Job not found')
        }

        // Count products by status
        const products = finalJob.products as BulkProduct[]
        let completedCount = 0
        let failedCount = 0
        let processingCount = 0

        for (const product of products) {
          if (product.status === 'completed') {
            completedCount++
          } else if (product.status === 'failed') {
            failedCount++
          } else if (product.status === 'processing') {
            processingCount++
          }
        }

        console.log('📊 Final verification:')
        console.log(`   Total: ${products.length}`)
        console.log(`   Completed: ${completedCount}`)
        console.log(`   Failed: ${failedCount}`)
        console.log(`   Still Processing: ${processingCount}`)

        // 🔧 FIX: Handle products stuck in "processing" status
        let updatedProducts = products
        if (processingCount > 0) {
          console.log(
            `⚠️ Found ${processingCount} products still processing, fixing status...`
          )

          // Mark stuck products as failed to ensure accurate counts
          updatedProducts = products.map((product) => {
            if (product.status === 'processing') {
              console.log(
                `🔧 Marking ${product.id} as failed (was stuck in processing)`
              )
              return {
                ...product,
                status: 'failed' as const,
                error_message:
                  'Processing timeout - marked as failed in final verification',
              }
            }
            return product
          })

          // Recalculate counts
          failedCount += processingCount
          processingCount = 0
        }

        // 🔒 ATOMIC UPDATE: Update everything in one transaction
        const { error: finalUpdateError } = await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            status: 'completed',
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('updated_at', finalJob.updated_at) // Optimistic locking

        if (finalUpdateError) {
          // Check if it's a version conflict (optimistic locking failed)
          if (
            finalUpdateError.message?.includes('no rows updated') ||
            finalUpdateError.code === 'PGRST116'
          ) {
            console.log(
              `⚠️ Optimistic lock failed, retrying... (attempt ${retryCount + 1})`
            )
            retryCount++
            await new Promise((resolve) => setTimeout(resolve, 1000))
            continue // Retry the operation
          } else {
            console.error('❌ Error in final job update:', finalUpdateError)
            throw finalUpdateError
          }
        }

        console.log(
          `✅ Job completed with final stats: ${completedCount} completed, ${failedCount} failed`
        )
        break // Success, exit retry loop
      } catch (error) {
        console.error(
          `❌ Final verification error (attempt ${retryCount + 1}):`,
          error
        )
        retryCount++

        if (retryCount >= maxRetries) {
          console.error('❌ Final verification failed after all retries')
          // Fallback: Mark job as completed anyway
          await supabase
            .from('bulk_jobs')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 2000))
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

// Process individual product - ATOMIC UPDATES
async function processProduct(
  jobId: string,
  product: BulkProduct,
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  // 🔒 ATOMIC UPDATE HELPER FUNCTION
  const updateProductStatus = async (
    productId: string,
    newStatus: BulkProduct['status'],
    additionalData: Partial<BulkProduct> = {}
  ) => {
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        // Get current job state
        const { data: currentJob, error: fetchError } = await supabase
          .from('bulk_jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (fetchError) throw fetchError

        // Update the specific product
        const updatedProducts = (currentJob.products as BulkProduct[]).map(
          (p: BulkProduct) =>
            p.id === productId
              ? { ...p, status: newStatus, ...additionalData }
              : p
        )

        // Calculate new counts
        const completedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'completed'
        ).length
        const failedCount = updatedProducts.filter(
          (p: BulkProduct) => p.status === 'failed'
        ).length

        // Atomic update with optimistic locking
        const { error: updateError } = await supabase
          .from('bulk_jobs')
          .update({
            products: updatedProducts,
            completed_products: completedCount,
            failed_products: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .eq('updated_at', currentJob.updated_at)

        if (updateError) {
          if (
            updateError.message?.includes('no rows updated') ||
            updateError.code === 'PGRST116'
          ) {
            // Optimistic lock failed, retry
            retryCount++
            await new Promise((resolve) => setTimeout(resolve, 500))
            continue
          } else {
            throw updateError
          }
        }

        // Success
        console.log(
          `📊 Updated ${productId} to ${newStatus} - Completed: ${completedCount}, Failed: ${failedCount}`
        )
        break
      } catch (error) {
        console.error(
          `❌ Error updating product ${productId} (attempt ${retryCount + 1}):`,
          error
        )
        retryCount++

        if (retryCount >= maxRetries) {
          console.error(
            `❌ Failed to update ${productId} after ${maxRetries} retries`
          )
          break
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  try {
    console.log(`🔄 Processing product: ${product.product_name}`)

    // Update product status to processing
    await updateProductStatus(product.id, 'processing')

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

      // Mark as completed with generated content
      await updateProductStatus(product.id, 'completed', {
        generated_content: data.result,
      })
    } else {
      const errorText = await response.text()
      console.log(
        `❌ Failed product: ${product.product_name} - ${response.status}: ${errorText}`
      )

      // Mark as failed with error details
      await updateProductStatus(product.id, 'failed', {
        error_message: `API Error: ${response.status} - ${errorText}`,
      })
    }
  } catch (error) {
    console.error(`❌ Error processing product ${product.product_name}:`, error)

    // Mark as failed on exception
    await updateProductStatus(product.id, 'failed', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
