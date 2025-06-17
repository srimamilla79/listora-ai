// src/app/api/published-products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Define the published product type
interface PublishedProduct {
  id: string
  user_id: string
  content_id: string | null
  platform: string
  platform_product_id: string | null
  platform_url: string | null
  title: string
  description: string | null
  price: number | null
  quantity: number | null
  sku: string | null
  images: any[] | null
  platform_data: Record<string, any> | null
  status: string | null
  published_at: string
  updated_at: string
  last_synced_at: string
  content?: {
    product_name: string
    created_at: string
  } | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') // 'amazon', 'shopify', 'all'

    const supabase = createClient()

    // Get current user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('published_products')
      .select(
        `
        *,
        content:product_contents(
          product_name,
          created_at
        )
      `
      )
      .eq('user_id', session.user.id)
      .order('published_at', { ascending: false })

    // Filter by platform if specified
    if (platform && platform !== 'all') {
      query = query.eq('platform', platform)
    }

    const { data: products, error } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    const typedProducts = (products as PublishedProduct[]) || []

    // Calculate stats with proper typing
    const stats = {
      totalProducts: typedProducts.length,
      activeListings: typedProducts.filter(
        (p: PublishedProduct) => p.status === 'published'
      ).length,
      pendingListings: typedProducts.filter(
        (p: PublishedProduct) => p.status === 'pending'
      ).length,
      platforms: typedProducts.reduce(
        (acc: Record<string, number>, item: PublishedProduct) => {
          acc[item.platform] = (acc[item.platform] || 0) + 1
          return acc
        },
        {}
      ),
    }

    return NextResponse.json({
      success: true,
      data: {
        products: typedProducts,
        stats,
      },
    })
  } catch (error) {
    console.error('❌ Published products API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
