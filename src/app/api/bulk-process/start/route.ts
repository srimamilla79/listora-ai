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
  processing_started_at?: string
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
  console.log('🚀 Bulk process start endpoint called')

  try {
    const { products, userId, selectedSections } = await request.json()

    console.log('📄 Products received:', products?.length || 0, 'records')
    console.log('👤 User ID:', userId)
    console.log('🎯 Selected sections:', selectedSections)

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error('❌ Products validation failed')
      return NextResponse.json(
        { error: 'Products array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.error('❌ User ID missing')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('✅ Validation passed')

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

    console.log('📝 Prepared products with IDs:', productsWithIds.length)

    const supabase = createServiceRoleClient()

    // Create bulk job in database
    console.log('💾 Creating job in database...')
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
      console.error('❌ Error creating bulk job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create bulk job' },
        { status: 500 }
      )
    }

    console.log(`✅ Job created successfully: ${jobId}`)
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
    ).catch((error) => {
      console.error('❌ Background processing failed:', error)
    })

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: `Background job started for ${products.length} products`,
      productsCount: products.length,
    })
  } catch (error) {
    console.error('❌ Error in bulk process start:', error)
    return NextResponse.json(
      { error: 'Failed to start bulk processing' },
      { status: 500 }
    )
  }
}

// 🚀 LIGHTNING FAST: OPTIMIZED PROCESSING WITH MINIMAL STATUS UPDATES
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
    `🚀 Starting LIGHTNING FAST processing for ${products.length} products`
  )

  try {
    // 🔥 BATCH OF 3 - Fast parallel processing
    const batchSize = 3
    let statusUpdateCounter = 0

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

      // 🔥 INSTANT STATUS UPDATE - Mark as processing quickly
      await quickBatchStatusUpdate(jobId, batch, 'processing', supabase)

      // Process batch in parallel with timeout protection
      const batchPromises = batch.map(async (product, batchIndex) => {
        const globalIndex = i + batchIndex
        console.log(
          `🚀 [${globalIndex + 1}/${products.length}] Processing: ${product.product_name}`
        )

        try {
          // 🔒 TIMEOUT PROTECTION - 2 minutes max per product
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error('Product processing timeout')),
              120000
            )
          })

          const processingPromise = processProduct(
            jobId,
            product,
            userId,
            selectedSections,
            supabase,
            authHeader,
            cookies
          )

          await Promise.race([processingPromise, timeoutPromise])
          console.log(
            `✅ [${globalIndex + 1}/${products.length}] Completed: ${product.product_name}`
          )
        } catch (error) {
          console.error(
            `❌ [${globalIndex + 1}/${products.length}] Failed: ${product.product_name}`,
            error
          )

          // 🔥 INSTANT FAIL UPDATE
          await quickProductStatusUpdate(jobId, product.id, 'failed', supabase)
        }
      })

      // Wait for batch with global timeout
      try {
        const batchTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Batch timeout')), 300000) // 5 minutes max per batch
        })

        await Promise.race([Promise.all(batchPromises), batchTimeoutPromise])
      } catch (batchError) {
        console.error(
          '❌ Batch processing timeout, marking remaining as failed'
        )

        // 🔥 INSTANT BATCH FAIL UPDATE
        await quickBatchStatusUpdate(jobId, batch, 'failed', supabase)
      }

      // 🔥 BATCH STATUS UPDATE - Update counts every batch instead of every product
      statusUpdateCounter++
      if (statusUpdateCounter % 2 === 0 || i + batchSize >= products.length) {
        await quickJobStatusUpdate(jobId, supabase)
      }

      // 🔥 MINIMAL WAIT - Just 500ms for ultra-fast processing
      if (i + batchSize < products.length) {
        console.log(`⏳ Lightning sync pause...`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    console.log(
      `🏁 All ${products.length} products processed, final verification...`
    )

    // 🔥 INSTANT FINAL VERIFICATION
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Just 1 second
    await performFinalVerificationWithTimeoutRecovery(jobId, supabase)
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

// 🔥 NEW: LIGHTNING FAST BATCH STATUS UPDATE
async function quickBatchStatusUpdate(
  jobId: string,
  batch: BulkProduct[],
  status: BulkProduct['status'],
  supabase: any
) {
  try {
    const { data: currentJob } = await supabase
      .from('bulk_jobs')
      .select('products')
      .eq('id', jobId)
      .single()

    if (!currentJob?.products) return

    const updatedProducts = (currentJob.products as BulkProduct[]).map(
      (p: BulkProduct) => {
        const batchProduct = batch.find((bp) => bp.id === p.id)
        return batchProduct
          ? { ...p, status, processing_started_at: new Date().toISOString() }
          : p
      }
    )

    await supabase
      .from('bulk_jobs')
      .update({
        products: updatedProducts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`⚡ Batch status updated to ${status}`)
  } catch (error) {
    console.log(`⚠️ Batch status update failed, continuing...`)
  }
}

// 🔥 NEW: LIGHTNING FAST SINGLE PRODUCT UPDATE
async function quickProductStatusUpdate(
  jobId: string,
  productId: string,
  status: BulkProduct['status'],
  supabase: any
) {
  try {
    const { data: currentJob } = await supabase
      .from('bulk_jobs')
      .select('products')
      .eq('id', jobId)
      .single()

    if (!currentJob?.products) return

    const updatedProducts = (currentJob.products as BulkProduct[]).map(
      (p: BulkProduct) => (p.id === productId ? { ...p, status } : p)
    )

    await supabase
      .from('bulk_jobs')
      .update({
        products: updatedProducts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(`⚡ ${productId} updated to ${status}`)
  } catch (error) {
    console.log(`⚠️ Product status update failed, continuing...`)
  }
}

// 🔥 NEW: LIGHTNING FAST JOB STATUS UPDATE
async function quickJobStatusUpdate(jobId: string, supabase: any) {
  try {
    const { data: currentJob } = await supabase
      .from('bulk_jobs')
      .select('products')
      .eq('id', jobId)
      .single()

    if (!currentJob?.products) return

    const products = currentJob.products as BulkProduct[]
    const completedCount = products.filter(
      (p) => p.status === 'completed'
    ).length
    const failedCount = products.filter((p) => p.status === 'failed').length

    await supabase
      .from('bulk_jobs')
      .update({
        completed_products: completedCount,
        failed_products: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(
      `⚡ Job counts updated: ${completedCount} completed, ${failedCount} failed`
    )
  } catch (error) {
    console.log(`⚠️ Job status update failed, continuing...`)
  }
}

// 🔧 STREAMLINED FINAL VERIFICATION
async function performFinalVerificationWithTimeoutRecovery(
  jobId: string,
  supabase: any
) {
  console.log('🔍 Lightning final verification...')

  try {
    const { data: finalJob, error: finalJobError } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (finalJobError || !finalJob?.products) {
      console.error('❌ Final job fetch failed, marking as completed anyway')
      await supabase
        .from('bulk_jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', jobId)
      return
    }

    const products = finalJob.products as BulkProduct[]
    const now = new Date()
    const timeoutThreshold = 5 * 60 * 1000 // 5 minutes

    // 🔥 FAST TIMEOUT DETECTION AND COUNT
    let completedCount = 0
    let failedCount = 0

    const finalProducts = products.map((product) => {
      // Handle stuck products
      if (product.status === 'processing' && product.processing_started_at) {
        const startTime = new Date(product.processing_started_at)
        const elapsed = now.getTime() - startTime.getTime()

        if (elapsed > timeoutThreshold) {
          console.log(`⏰ ${product.product_name} timed out`)
          failedCount++
          return {
            ...product,
            status: 'failed' as const,
            error_message: 'Processing timeout - exceeded 5 minutes',
          }
        }
      }

      // Handle incomplete products
      if (product.status === 'processing' || product.status === 'pending') {
        failedCount++
        return {
          ...product,
          status: 'failed' as const,
          error_message: `Marked as failed in verification - was ${product.status}`,
        }
      }

      // Count final statuses
      if (product.status === 'completed') completedCount++
      if (product.status === 'failed') failedCount++

      return product
    })

    console.log(`📊 Final: ${completedCount} completed, ${failedCount} failed`)

    // 🔥 SINGLE FINAL UPDATE
    await supabase
      .from('bulk_jobs')
      .update({
        products: finalProducts,
        status: 'completed',
        completed_products: completedCount,
        failed_products: failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    console.log(
      `✅ Job completed: ${completedCount}/${completedCount + failedCount}`
    )
  } catch (error) {
    console.error('❌ Verification error, marking as completed:', error)

    await supabase
      .from('bulk_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', jobId)
  }
}

// 🔥 STREAMLINED PRODUCT PROCESSING
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ListoraAI-BulkProcessor/1.0',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    if (cookies) {
      headers['Cookie'] = cookies
    }

    // 🔥 2-minute timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout reached for ${product.product_name}`)
      controller.abort()
    }, 120000)

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

        // 🔥 INSTANT SUCCESS UPDATE
        await quickProductStatusUpdate(jobId, product.id, 'completed', supabase)

        // 🔍 DOUBLE-CHECK SUCCESS UPDATE (ensures accuracy)
        setTimeout(async () => {
          try {
            const { data: currentJob } = await supabase
              .from('bulk_jobs')
              .select('products')
              .eq('id', jobId)
              .single()

            if (currentJob?.products) {
              const products = currentJob.products as BulkProduct[]
              const targetProduct = products.find((p) => p.id === product.id)

              if (targetProduct && targetProduct.status !== 'completed') {
                console.log(
                  `🔧 Fixing status for ${product.product_name}: ${targetProduct.status} → completed`
                )
                await quickProductStatusUpdate(
                  jobId,
                  product.id,
                  'completed',
                  supabase
                )
              }
            }
          } catch (verifyError) {
            console.log(
              `⚠️ Status verification failed for ${product.product_name}`,
              verifyError
            )
          }
        }, 3000) // Check after 3 seconds to ensure status is correct
      } else {
        const errorText = await response.text()
        console.log(
          `❌ API failed for ${product.product_name}: ${response.status}`
        )

        // 🔥 INSTANT FAIL UPDATE
        await quickProductStatusUpdate(jobId, product.id, 'failed', supabase)
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log(`⏰ Request timeout for ${product.product_name}`)
      }

      // 🔥 INSTANT FAIL UPDATE
      await quickProductStatusUpdate(jobId, product.id, 'failed', supabase)
    }
  } catch (error) {
    console.error(`❌ Error processing ${product.product_name}:`, error)

    // 🔥 INSTANT FAIL UPDATE
    await quickProductStatusUpdate(jobId, product.id, 'failed', supabase)
  }
}
