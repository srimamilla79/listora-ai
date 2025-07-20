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

// 🔧 PRODUCTION-OPTIMIZED SEQUENTIAL PROCESSING
async function processProductsInBackground(
  jobId: string,
  products: BulkProduct[],
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  console.log(
    `🎬 Starting SEQUENTIAL processing for ${products.length} products (one at a time for production stability)`
  )

  try {
    // 🔄 Process ONE product at a time - completely eliminates race conditions
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(
        `🚀 [${i + 1}/${products.length}] Processing: ${product.product_name}`
      )

      try {
        await processProduct(
          jobId,
          product,
          userId,
          selectedSections,
          supabase,
          authHeader,
          cookies
        )
        console.log(
          `✅ [${i + 1}/${products.length}] Completed: ${product.product_name}`
        )
      } catch (error) {
        console.error(
          `❌ [${i + 1}/${products.length}] Failed: ${product.product_name}`,
          error
        )
      }

      // 🔒 PRODUCTION SAFETY: Wait between each product for database consistency
      if (i < products.length - 1) {
        // Don't wait after the last product
        console.log(
          `⏳ Waiting 3 seconds for database sync before next product...`
        )
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    console.log(
      `🏁 All products processed sequentially, starting final verification...`
    )

    // 🔒 PRODUCTION SAFETY: Wait for all database writes to settle
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 🔧 BULLETPROOF FINAL VERIFICATION
    await performFinalVerification(jobId, supabase)
  } catch (error) {
    console.error(
      `❌ Critical error in sequential processing for job ${jobId}:`,
      error
    )

    // Fallback: Mark job as failed
    try {
      await supabase
        .from('bulk_jobs')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
    } catch (updateError) {
      console.error('❌ Failed to mark job as failed:', updateError)
    }
  }
}

// 🔧 BULLETPROOF FINAL VERIFICATION WITH PRODUCTION SAFEGUARDS
async function performFinalVerification(jobId: string, supabase: any) {
  const maxRetries = 5
  let retryCount = 0

  console.log('🔍 Starting bulletproof final verification...')

  while (retryCount < maxRetries) {
    try {
      console.log(
        `🔄 Final verification attempt ${retryCount + 1}/${maxRetries}`
      )

      // 🔒 PRODUCTION SAFETY: Extra delay to ensure database consistency
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const { data: finalJob, error: finalJobError } = await supabase
        .from('bulk_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (finalJobError) {
        console.error('❌ Error fetching final job:', finalJobError)
        throw new Error(
          typeof finalJobError === 'string'
            ? finalJobError
            : JSON.stringify(finalJobError)
        )
      }

      if (!finalJob?.products) {
        console.error('❌ Final job or products not found')
        throw new Error('Job data not found')
      }

      // Count products by status with detailed logging
      const products = finalJob.products as BulkProduct[]
      let completedCount = 0
      let failedCount = 0
      let processingCount = 0
      let pendingCount = 0

      console.log('📊 Analyzing product statuses:')

      for (const product of products) {
        console.log(`   ${product.product_name}: ${product.status}`)
        switch (product.status) {
          case 'completed':
            completedCount++
            break
          case 'failed':
            failedCount++
            break
          case 'processing':
            processingCount++
            break
          case 'pending':
            pendingCount++
            break
        }
      }

      console.log('📊 Final verification counts:')
      console.log(`   Total: ${products.length}`)
      console.log(`   Completed: ${completedCount}`)
      console.log(`   Failed: ${failedCount}`)
      console.log(`   Still Processing: ${processingCount}`)
      console.log(`   Still Pending: ${pendingCount}`)

      // 🔧 FIX: Handle any products not in final state
      let updatedProducts = products
      let needsUpdate = false

      if (processingCount > 0 || pendingCount > 0) {
        console.log(
          `⚠️ Found ${processingCount + pendingCount} products not in final state, fixing...`
        )

        updatedProducts = products.map((product) => {
          if (product.status === 'processing' || product.status === 'pending') {
            console.log(
              `🔧 Marking ${product.product_name} as failed (was ${product.status})`
            )
            needsUpdate = true
            return {
              ...product,
              status: 'failed' as const,
              error_message: `Marked as failed in final verification - was ${product.status}`,
            }
          }
          return product
        })

        // Recalculate counts
        failedCount = updatedProducts.filter(
          (p) => p.status === 'failed'
        ).length
        completedCount = updatedProducts.filter(
          (p) => p.status === 'completed'
        ).length
        processingCount = 0
        pendingCount = 0
      }

      // 🔒 ATOMIC FINAL UPDATE
      const updateData: any = {
        status: 'completed',
        completed_products: completedCount,
        failed_products: failedCount,
        updated_at: new Date().toISOString(),
      }

      if (needsUpdate) {
        updateData.products = updatedProducts
      }

      const { error: finalUpdateError } = await supabase
        .from('bulk_jobs')
        .update(updateData)
        .eq('id', jobId)

      if (finalUpdateError) {
        console.error('❌ Error in final job update:', finalUpdateError)
        throw new Error(
          typeof finalUpdateError === 'string'
            ? finalUpdateError
            : JSON.stringify(finalUpdateError)
        )
      }

      console.log(
        `✅ Job completed successfully: ${completedCount} completed, ${failedCount} failed`
      )
      console.log('🎉 Final verification completed successfully!')
      return // Success, exit retry loop
    } catch (error) {
      console.error(
        `❌ Final verification error (attempt ${retryCount + 1}):`,
        error
      )
      retryCount++

      if (retryCount >= maxRetries) {
        console.error(
          `❌ Final verification failed after ${maxRetries} attempts`
        )

        // 🔧 FALLBACK: Mark job as completed anyway to prevent infinite processing
        try {
          await supabase
            .from('bulk_jobs')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId)
          console.log('✅ Fallback: Marked job as completed')
        } catch (fallbackError) {
          console.error('❌ Fallback update also failed:', fallbackError)
        }
        return
      }

      // Wait longer between retries in production
      console.log(`⏳ Waiting 5 seconds before retry ${retryCount + 1}...`)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

// 🔧 PRODUCTION-SAFE PRODUCT PROCESSING
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

    // Mark as processing
    await updateProductStatusSafe(jobId, product.id, 'processing', {}, supabase)

    // Build headers with authentication
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ListoraAI-BulkProcessor/1.0',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
      console.log(`🔑 Using auth header for ${product.product_name}`)
    }

    if (cookies) {
      headers['Cookie'] = cookies
      console.log(`🍪 Using cookies for ${product.product_name}`)
    }

    // 🔧 PRODUCTION TIMEOUT: Longer timeout for serverless environments
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout reached for ${product.product_name}`)
      controller.abort()
    }, 180000) // 3 minutes timeout for production

    try {
      console.log(`📡 Making API call for ${product.product_name}...`)

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
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ API success for ${product.product_name}`)

        // Mark as completed with generated content
        await updateProductStatusSafe(
          jobId,
          product.id,
          'completed',
          {
            generated_content: data.result,
          },
          supabase
        )
      } else {
        const errorText = await response.text()
        console.log(
          `❌ API failed for ${product.product_name}: ${response.status} - ${errorText.substring(0, 200)}`
        )

        // Mark as failed with error details
        await updateProductStatusSafe(
          jobId,
          product.id,
          'failed',
          {
            error_message: `API Error: ${response.status} - ${errorText.substring(0, 500)}`,
          },
          supabase
        )
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log(`⏰ Request timeout for ${product.product_name}`)
        await updateProductStatusSafe(
          jobId,
          product.id,
          'failed',
          {
            error_message: 'Request timeout after 3 minutes',
          },
          supabase
        )
      } else {
        throw new Error(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unknown fetch error'
        )
      }
    }
  } catch (error) {
    console.error(`❌ Error processing product ${product.product_name}:`, error)

    // Mark as failed on exception
    await updateProductStatusSafe(
      jobId,
      product.id,
      'failed',
      {
        error_message:
          error instanceof Error ? error.message : 'Unknown processing error',
      },
      supabase
    )
  }
}

// 🔧 PRODUCTION-SAFE STATUS UPDATE WITH RETRY
async function updateProductStatusSafe(
  jobId: string,
  productId: string,
  newStatus: BulkProduct['status'],
  additionalData: Partial<BulkProduct>,
  supabase: any
) {
  const maxRetries = 3
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      // Get current job state
      const { data: currentJob, error: fetchError } = await supabase
        .from('bulk_jobs')
        .select('products, completed_products, failed_products')
        .eq('id', jobId)
        .single()

      if (fetchError) {
        console.error(
          `❌ Error fetching job for status update (attempt ${retryCount + 1}):`,
          fetchError
        )
        throw new Error(
          typeof fetchError === 'string'
            ? fetchError
            : JSON.stringify(fetchError)
        )
      }

      if (!currentJob?.products) {
        console.error('❌ No products found in job')
        throw new Error('No products found')
      }

      // Update the specific product
      const updatedProducts = (currentJob.products as BulkProduct[]).map(
        (p: BulkProduct) =>
          p.id === productId
            ? { ...p, status: newStatus, ...additionalData }
            : p
      )

      // Calculate accurate counts
      const completedCount = updatedProducts.filter(
        (p) => p.status === 'completed'
      ).length
      const failedCount = updatedProducts.filter(
        (p) => p.status === 'failed'
      ).length

      // Single atomic update
      const { error: updateError } = await supabase
        .from('bulk_jobs')
        .update({
          products: updatedProducts,
          completed_products: completedCount,
          failed_products: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      if (updateError) {
        console.error(
          `❌ Error updating product status (attempt ${retryCount + 1}):`,
          updateError
        )
        throw new Error(
          typeof updateError === 'string'
            ? updateError
            : JSON.stringify(updateError)
        )
      }

      console.log(
        `📊 Updated ${productId} to ${newStatus} (Completed: ${completedCount}, Failed: ${failedCount})`
      )
      return // Success, exit retry loop
    } catch (error) {
      retryCount++

      if (retryCount >= maxRetries) {
        console.error(
          `❌ Failed to update ${productId} status after ${maxRetries} attempts:`,
          error
        )
        return // Give up after max retries
      }

      // Wait before retry with exponential backoff
      const waitTime = 1000 * Math.pow(2, retryCount - 1) // 1s, 2s, 4s
      console.log(`⏳ Retrying status update in ${waitTime}ms...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}
