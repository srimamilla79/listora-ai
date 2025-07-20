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

// 🚀 OPTIMIZED: FAST PROCESSING WITH TIMEOUT PROTECTION
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

      // 🔒 ADD TIMEOUT DETECTION - Mark products as processing with timestamp
      await Promise.all(
        batch.map(async (product) => {
          await updateProductStatusSafe(
            jobId,
            product.id,
            'processing',
            { processing_started_at: new Date().toISOString() },
            supabase
          )
        })
      )

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

          // Mark as failed
          await updateProductStatusSafe(
            jobId,
            product.id,
            'failed',
            {
              error_message:
                error instanceof Error ? error.message : 'Processing failed',
            },
            supabase
          )
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

        // Mark any still-processing products as failed
        await Promise.all(
          batch.map(async (product) => {
            await updateProductStatusSafe(
              jobId,
              product.id,
              'failed',
              { error_message: 'Batch processing timeout' },
              supabase
            )
          })
        )
      }

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

    // Final verification with timeout recovery
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

// 🔧 ENHANCED FINAL VERIFICATION WITH TIMEOUT RECOVERY
async function performFinalVerificationWithTimeoutRecovery(
  jobId: string,
  supabase: any
) {
  console.log('🔍 Final verification with timeout recovery...')

  try {
    const { data: finalJob, error: finalJobError } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (finalJobError) {
      console.error('❌ Error fetching final job:', finalJobError)
      return
    }

    if (!finalJob?.products) {
      console.error('❌ Final job or products not found')
      return
    }

    // Count products by status with timeout detection
    const products = finalJob.products as BulkProduct[]
    const now = new Date()
    const timeoutThreshold = 5 * 60 * 1000 // 5 minutes

    let completedCount = 0
    let failedCount = 0
    let processingCount = 0
    let pendingCount = 0

    // Check for products stuck in processing and mark as failed if timeout
    const updatedProducts = products.map((product) => {
      if (product.status === 'processing' && product.processing_started_at) {
        const startTime = new Date(product.processing_started_at)
        const elapsed = now.getTime() - startTime.getTime()

        if (elapsed > timeoutThreshold) {
          console.log(
            `⏰ Product ${product.product_name} timed out, marking as failed`
          )
          failedCount++
          return {
            ...product,
            status: 'failed' as const,
            error_message: 'Processing timeout - exceeded 5 minutes',
          }
        }
      }

      // Count final statuses
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

      return product
    })

    console.log('📊 Final counts:')
    console.log(`   Completed: ${completedCount}, Failed: ${failedCount}`)
    console.log(
      `   Still Processing: ${processingCount}, Pending: ${pendingCount}`
    )

    // Fix any remaining incomplete products
    let needsUpdate = false
    const finalProducts = updatedProducts.map((product) => {
      if (product.status === 'processing' || product.status === 'pending') {
        needsUpdate = true
        if (product.status === 'processing') {
          processingCount--
        } else {
          pendingCount--
        }
        failedCount++

        return {
          ...product,
          status: 'failed' as const,
          error_message: `Marked as failed in verification - was ${product.status}`,
        }
      }
      return product
    })

    if (processingCount > 0 || pendingCount > 0) {
      console.log(
        `⚠️ Fixed ${processingCount + pendingCount} incomplete products...`
      )
      needsUpdate = true
    }

    // Final update
    const updateData: any = {
      status: 'completed',
      completed_products: completedCount,
      failed_products: failedCount,
      updated_at: new Date().toISOString(),
    }

    if (needsUpdate) {
      updateData.products = finalProducts
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

// 🔥 OPTIMIZED PRODUCT PROCESSING
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

    // 🔥 2-minute timeout
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

// 🔥 OPTIMIZED STATUS UPDATES
async function updateProductStatusSafe(
  jobId: string,
  productId: string,
  newStatus: BulkProduct['status'],
  additionalData: Partial<BulkProduct>,
  supabase: any
) {
  const maxRetries = 2
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

      console.log(
        `📊 Updated ${productId} to ${newStatus} (Completed: ${completedCount}, Failed: ${failedCount})`
      )
      return // Success
    } catch (error) {
      retryCount++

      if (retryCount >= maxRetries) {
        console.error(
          `❌ Failed to update ${productId} after ${maxRetries} attempts`
        )
        return
      }

      // Fast retry
      const waitTime = 500 * retryCount // 500ms, 1s
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}
