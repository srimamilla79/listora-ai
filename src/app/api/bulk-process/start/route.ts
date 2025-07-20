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
  console.log('🚀 Emergency simple bulk process start')

  try {
    const { products, userId, selectedSections } = await request.json()

    console.log('📄 Products received:', products?.length || 0)

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required and must not be empty' },
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
    const { error: jobError } = await supabase.from('bulk_jobs').insert({
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

    if (jobError) {
      console.error('❌ Error creating bulk job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create bulk job' },
        { status: 500 }
      )
    }

    console.log(`✅ Job created: ${jobId}`)

    // Extract authentication from request
    const authHeader = request.headers.get('authorization')
    const cookies = request.headers.get('cookie')

    // Start simple background processing
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

// 🔥 SIMPLE: BASIC PROCESSING THAT ACTUALLY WORKS
async function processProductsInBackground(
  jobId: string,
  products: BulkProduct[],
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  console.log(`🚀 Starting SIMPLE processing for ${products.length} products`)

  try {
    // 🔥 BATCH OF 2 - Conservative for production
    const batchSize = 2

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)

      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}`)

      // Process batch in parallel
      await Promise.all(
        batch.map(async (product) => {
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
            console.log(`✅ Completed: ${product.product_name}`)
          } catch (error) {
            console.error(`❌ Failed: ${product.product_name}`, error)
          }
        })
      )

      // Simple wait between batches
      if (i + batchSize < products.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`🏁 All products processed, final verification...`)

    // Simple final verification
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await performSimpleFinalVerification(jobId, supabase)
  } catch (error) {
    console.error(`❌ Critical error:`, error)

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

// 🔥 SIMPLE FINAL VERIFICATION
async function performSimpleFinalVerification(jobId: string, supabase: any) {
  console.log('🔍 Simple final verification...')

  try {
    const { data: finalJob } = await supabase
      .from('bulk_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (!finalJob?.products) {
      await supabase
        .from('bulk_jobs')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', jobId)
      return
    }

    const products = finalJob.products as BulkProduct[]

    // Count final statuses and fix incomplete ones
    let completedCount = 0
    let failedCount = 0

    const finalProducts = products.map((product) => {
      if (product.status === 'processing' || product.status === 'pending') {
        failedCount++
        return {
          ...product,
          status: 'failed' as const,
          error_message: `Marked as failed in verification - was ${product.status}`,
        }
      }

      if (product.status === 'completed') completedCount++
      if (product.status === 'failed') failedCount++

      return product
    })

    console.log(`📊 Final: ${completedCount} completed, ${failedCount} failed`)

    // Single final update
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
    console.error('❌ Verification error:', error)

    await supabase
      .from('bulk_jobs')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', jobId)
  }
}

// 🔥 SIMPLE PRODUCT PROCESSING
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
    console.log(`🔄 Processing: ${product.product_name}`)

    // Mark as processing
    await updateProductStatus(jobId, product.id, 'processing', supabase)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    if (cookies) {
      headers['Cookie'] = cookies
    }

    // 90-second timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 90000)

    try {
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
        console.log(`✅ API success: ${product.product_name}`)
        await updateProductStatus(jobId, product.id, 'completed', supabase)
      } else {
        console.log(`❌ API failed: ${product.product_name}`)
        await updateProductStatus(jobId, product.id, 'failed', supabase)
      }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      console.log(`❌ Request error: ${product.product_name}`)
      await updateProductStatus(jobId, product.id, 'failed', supabase)
    }
  } catch (error) {
    console.error(`❌ Error processing ${product.product_name}:`, error)
    await updateProductStatus(jobId, product.id, 'failed', supabase)
  }
}

// 🔥 SIMPLE STATUS UPDATE - NO RETRIES
async function updateProductStatus(
  jobId: string,
  productId: string,
  newStatus: BulkProduct['status'],
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
      (p: BulkProduct) => (p.id === productId ? { ...p, status: newStatus } : p)
    )

    const completedCount = updatedProducts.filter(
      (p) => p.status === 'completed'
    ).length
    const failedCount = updatedProducts.filter(
      (p) => p.status === 'failed'
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

    console.log(`📊 Updated ${productId} to ${newStatus}`)
  } catch (error) {
    console.log(`⚠️ Status update failed, continuing...`)
  }
}
