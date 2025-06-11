// src/app/api/amazon/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    console.log('🔄 Starting Amazon refresh for user:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Validate Amazon credentials
    if (
      !process.env.AMAZON_SP_API_CLIENT_ID ||
      !process.env.AMAZON_SP_API_CLIENT_SECRET ||
      !process.env.AMAZON_SP_API_REFRESH_TOKEN ||
      !process.env.AMAZON_SELLER_ID
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amazon SP-API credentials not configured',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Get user's published products
    const { data: products, error: fetchError } = await supabase
      .from('amazon_listings')
      .select('*')
      .eq('user_id', userId)

    if (fetchError) {
      console.error('❌ Database error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch user products' },
        { status: 500 }
      )
    }

    console.log(`📦 Found ${products?.length || 0} products to refresh`)

    // Mock Amazon API calls for now - Replace with real Amazon SP-API calls
    const refreshedProducts = []

    for (const product of products || []) {
      console.log(`🔄 Refreshing product: ${product.sku}`)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Mock Amazon data - In real implementation, call Amazon APIs:
      // 1. GetMatchingProductForId - Get current product details
      // 2. GetMyPriceForASIN - Get current selling price
      // 3. ListInventorySupply - Check stock levels
      // 4. GetMatchingProduct - Verify listing status

      const mockCurrentPrice = product.price + (Math.random() - 0.5) * 5 // Slight price variation
      const mockStockStatuses = [
        'In Stock',
        'Limited Stock',
        'Out of Stock',
        'Backorder',
      ]
      const mockListingStatuses = [
        'ACTIVE',
        'INACTIVE',
        'SUPPRESSED',
        'INCOMPLETE',
      ]

      const mockRefreshedData = {
        current_price: Math.max(0.01, mockCurrentPrice), // Ensure positive price
        stock_status:
          mockStockStatuses[
            Math.floor(Math.random() * mockStockStatuses.length)
          ],
        listing_status:
          mockListingStatuses[
            Math.floor(Math.random() * mockListingStatuses.length)
          ],
        last_synced: new Date().toISOString(),
        // Real implementation would include:
        // - Amazon ASIN verification
        // - Current marketplace price
        // - Competitor pricing data
        // - Buy box status
        // - Sales velocity
        // - Customer reviews count
        // - Search ranking position
      }

      // Update database with refreshed data
      const { error: updateError } = await supabase
        .from('amazon_listings')
        .update({
          current_price: mockRefreshedData.current_price,
          stock_status: mockRefreshedData.stock_status,
          listing_status: mockRefreshedData.listing_status,
          last_synced: mockRefreshedData.last_synced,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id)

      if (updateError) {
        console.error(
          `❌ Failed to update product ${product.sku}:`,
          updateError
        )
      } else {
        console.log(`✅ Updated product ${product.sku}`)
        refreshedProducts.push({
          ...product,
          ...mockRefreshedData,
        })
      }
    }

    console.log(
      `✅ Amazon refresh completed. Updated ${refreshedProducts.length} products`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${refreshedProducts.length} products from Amazon`,
      refreshedCount: refreshedProducts.length,
      timestamp: new Date().toISOString(),
      // Include summary of changes
      summary: {
        totalProducts: products?.length || 0,
        refreshedProducts: refreshedProducts.length,
        // In real implementation, include:
        priceChanges: refreshedProducts.filter(
          (p) => p.current_price !== p.price
        ).length,
        statusChanges: refreshedProducts.filter(
          (p) => p.listing_status !== p.status
        ).length,
        stockUpdates: refreshedProducts.filter((p) => p.stock_status).length,
      },
      note: 'This is a mock refresh while waiting for Amazon app approval. Real data will be fetched once approved.',
    })
  } catch (error) {
    console.error('❌ Amazon refresh error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh from Amazon',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to check refresh status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get last refresh timestamp for user's products
    const { data, error } = await supabase
      .from('amazon_listings')
      .select('last_synced')
      .eq('user_id', userId)
      .order('last_synced', { ascending: false })
      .limit(1)

    if (error) {
      throw error
    }

    const lastRefresh = data?.[0]?.last_synced

    return NextResponse.json({
      success: true,
      lastRefresh: lastRefresh || null,
      lastRefreshFormatted: lastRefresh
        ? new Date(lastRefresh).toLocaleString()
        : 'Never',
    })
  } catch (error) {
    console.error('❌ Refresh status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get refresh status',
      },
      { status: 500 }
    )
  }
}
