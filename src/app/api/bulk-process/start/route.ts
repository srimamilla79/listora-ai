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
  console.log('🚀 Simple sequential bulk process start')

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

    // 🔥 PROCESS FIRST PRODUCT ONLY - Sequential chain
    if (productsWithIds.length > 0) {
      processProductSequentially(
        jobId,
        productsWithIds,
        0, // Start with index 0
        userId,
        selectedSections,
        supabase,
        authHeader,
        cookies
      ).catch((error) => {
        console.error('❌ Sequential processing failed:', error)
      })
    }

    return NextResponse.json({
      success: true,
      jobId: jobId,
      message: `Sequential job started for ${products.length} products`,
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

// 🔥 SIMPLE SEQUENTIAL PROCESSING - One at a time
async function processProductSequentially(
  jobId: string,
  products: BulkProduct[],
  currentIndex: number,
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  console.log(`🔄 Processing product ${currentIndex + 1}/${products.length}`)

  // If we've processed all products, finish up
  if (currentIndex >= products.length) {
    console.log('🏁 All products processed, final verification...')
    await performFinalVerification(jobId, supabase)
    return
  }

  const product = products[currentIndex]

  try {
    // Process this one product
    await processSingleProduct(
      jobId,
      product,
      userId,
      selectedSections,
      supabase,
      authHeader,
      cookies
    )

    console.log(
      `✅ Completed product ${currentIndex + 1}: ${product.product_name}`
    )
  } catch (error) {
    console.error(`❌ Failed to process product ${currentIndex + 1}:`, error)

    // Mark as failed and continue
    await updateProductStatus(
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

  // Wait 2 seconds then process next product
  setTimeout(async () => {
    try {
      await processProductSequentially(
        jobId,
        products,
        currentIndex + 1,
        userId,
        selectedSections,
        supabase,
        authHeader,
        cookies
      )
    } catch (error) {
      console.error(`❌ Failed to continue sequential processing:`, error)
    }
  }, 2000) // 2 second delay between products
}

// 🔥 PROCESS SINGLE PRODUCT
async function processSingleProduct(
  jobId: string,
  product: BulkProduct,
  userId: string,
  selectedSections: any,
  supabase: any,
  authHeader?: string | null,
  cookies?: string | null
) {
  console.log(`🔄 Processing: ${product.product_name}`)

  // Mark as processing
  await updateProductStatus(jobId, product.id, 'processing', {}, supabase)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  if (cookies) {
    headers['Cookie'] = cookies
  }

  // 2-minute timeout per product (very generous)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    console.log(`⏰ Timeout for ${product.product_name}`)
    controller.abort()
  }, 120000) // 2 minutes

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
      await updateProductStatus(jobId, product.id, 'completed', {}, supabase)
    } else {
      console.log(`❌ API failed: ${product.product_name} - ${response.status}`)
      await updateProductStatus(
        jobId,
        product.id,
        'failed',
        { error_message: `API error: ${response.status}` },
        supabase
      )
    }
  } catch (fetchError) {
    clearTimeout(timeoutId)

    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      console.log(`⏰ Request timeout: ${product.product_name}`)
      await updateProductStatus(
        jobId,
        product.id,
        'failed',
        { error_message: 'Request timeout after 2 minutes' },
        supabase
      )
    } else {
      throw fetchError
    }
  }
}

// 🔥 SIMPLE STATUS UPDATE
async function updateProductStatus(
  jobId: string,
  productId: string,
  newStatus: BulkProduct['status'],
  additionalData: Partial<BulkProduct>,
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
      (p: BulkProduct) =>
        p.id === productId ? { ...p, status: newStatus, ...additionalData } : p
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

    console.log(
      `📊 Updated ${productId} to ${newStatus} (${completedCount} completed, ${failedCount} failed)`
    )
  } catch (error) {
    console.log(`⚠️ Status update failed for ${productId}`)
  }
}

// 🔥 FINAL VERIFICATION
async function performFinalVerification(jobId: string, supabase: any) {
  console.log('🔍 Final verification...')

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

    let completedCount = 0
    let failedCount = 0

    // Handle any products still in non-final states
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
