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

// 🚀 FIXED: SUPER FAST PROCESSING WITH PROPER BATCHING
async function processProductsInBackground(
  jobId: string,
  products: BulkProduct[],
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  console.log(`🚀 Starting FAST processing for ${products.length} products`)

  try {
    // 🔥 BATCH OF 3 - Fast parallel processing
    const batchSize = 3

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      const batchEnd = Math.min(i + batchSize, products.length)

      console.log(
        `📦 Processing batch ${Math.floor(i / batchSize) + 1}: products ${i + 1}-${batchEnd}`
      )
      console.log(
        `📋 Batch contains ${batch.length} products:`,
        batch.map((p) => p.product_name)
      )

      // Process batch in parallel
      await Promise.all(
        batch.map(async (product, batchIndex) => {
          const globalIndex = i + batchIndex
          console.log(
            `🚀 [${globalIndex + 1}/${products.length}] Processing: ${product.product_name}`
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
              `✅ [${globalIndex + 1}/${products.length}] Completed: ${product.product_name}`
            )
          } catch (error) {
            console.error(
              `❌ [${globalIndex + 1}/${products.length}] Failed: ${product.product_name}`,
              error
            )
          }
        })
      )

      // 🔥 MINIMAL WAIT - Just 1 second for database sync
      if (i + batchSize < products.length) {
        console.log(`⏳ Quick sync pause...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(
      `🏁 All ${products.length} products processed, starting verification...`
    )

    // 🔥 REDUCED FINAL WAIT - Just 2 seconds
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Quick final verification
    await performFinalVerification(jobId, supabase)
  } catch (error) {
    console.error(`❌ Critical error in processing for job ${jobId}:`, error)

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

// 🔥 FAST FINAL VERIFICATION
async function performFinalVerification(jobId: string, supabase: any) {
  console.log('🔍 Quick final verification...')

  try {
    // 🔥 SINGLE ATTEMPT - No retries for speed
    const { data: finalJob, error: finalJobError } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (finalJobError) {
      console.error('❌ Error fetching final job:', finalJobError)
      return // Just return, don't retry
    }

    if (!finalJob?.products) {
      console.error('❌ Final job or products not found')
      return
    }

    // Count products by status
    const products = finalJob.products as BulkProduct[]
    let completedCount = 0
    let failedCount = 0
    let processingCount = 0
    let pendingCount = 0

    for (const product of products) {
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

    console.log('📊 Final counts:')
    console.log(`   Completed: ${completedCount}, Failed: ${failedCount}`)
    console.log(
      `   Still Processing: ${processingCount}, Pending: ${pendingCount}`
    )

    // Fix any products not in final state
    let updatedProducts = products
    let needsUpdate = false

    if (processingCount > 0 || pendingCount > 0) {
      console.log(
        `⚠️ Fixing ${processingCount + pendingCount} incomplete products...`
      )

      updatedProducts = products.map((product) => {
        if (product.status === 'processing' || product.status === 'pending') {
          needsUpdate = true
          return {
            ...product,
            status: 'failed' as const,
            error_message: `Marked as failed in verification - was ${product.status}`,
          }
        }
        return product
      })

      failedCount = updatedProducts.filter((p) => p.status === 'failed').length
      completedCount = updatedProducts.filter(
        (p) => p.status === 'completed'
      ).length
    }

    // Final update
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
      console.error('❌ Final update error:', finalUpdateError)
    } else {
      console.log(
        `✅ Job completed: ${completedCount} completed, ${failedCount} failed`
      )
    }
  } catch (error) {
    console.error('❌ Verification error:', error)

    // Fallback: Just mark as completed
    try {
      await supabase
        .from('bulk_jobs')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
      console.log('✅ Fallback: Marked as completed')
    } catch (fallbackError) {
      console.error('❌ Fallback failed:', fallbackError)
    }
  }
}

// 🔥 FAST PRODUCT PROCESSING
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

    // 🔥 FAST TIMEOUT: 2 minutes instead of 3
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout reached for ${product.product_name}`)
      controller.abort()
    }, 120000) // 2 minutes timeout

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
            error_message: 'Request timeout after 2 minutes',
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

// 🔥 FAST STATUS UPDATES - Reduced retries
async function updateProductStatusSafe(
  jobId: string,
  productId: string,
  newStatus: BulkProduct['status'],
  additionalData: Partial<BulkProduct>,
  supabase: any
) {
  const maxRetries = 2 // 🔥 REDUCED from 3 to 2
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      const { data: currentJob, error: fetchError } = await supabase
        .from('bulk_jobs')
        .select('products, completed_products, failed_products')
        .eq('id', jobId)
        .single()

      if (fetchError) {
        throw new Error('Database fetch failed')
      }

      if (!currentJob?.products) {
        throw new Error('No products found')
      }

      const updatedProducts = (currentJob.products as BulkProduct[]).map(
        (p: BulkProduct) =>
          p.id === productId
            ? { ...p, status: newStatus, ...additionalData }
            : p
      )

      const completedCount = updatedProducts.filter(
        (p) => p.status === 'completed'
      ).length
      const failedCount = updatedProducts.filter(
        (p) => p.status === 'failed'
      ).length

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
        throw new Error('Database update failed')
      }

      console.log(`📊 Updated ${productId} to ${newStatus}`)
      return // Success
    } catch (error) {
      retryCount++

      if (retryCount >= maxRetries) {
        console.error(
          `❌ Failed to update ${productId} after ${maxRetries} attempts`
        )
        return
      }

      // 🔥 FASTER RETRY - Reduced wait time
      const waitTime = 500 * retryCount // 500ms, 1s instead of 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}
