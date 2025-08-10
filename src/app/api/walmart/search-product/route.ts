// src/app/api/walmart/search-product/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { rateLimiter } from '@/lib/walmart-rate-limiter'

interface SearchResponse {
  totalResults: number
  items: Array<{
    itemId: string
    itemType: string
    gtin?: string
    upc?: string
    productName: string
    shelf?: string
    brand?: string
    productUrl?: string
  }>
  relatedQueries?: string[]
}

export async function POST(request: Request) {
  console.log('🔍 Walmart product search route called')

  try {
    const { userId, gtin, upc, query } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!gtin && !upc && !query) {
      return NextResponse.json(
        { error: 'GTIN, UPC, or query required' },
        { status: 400 }
      )
    }

    // Get Walmart connection
    const supabase = createClient()
    const { data: connection } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!connection) {
      return NextResponse.json(
        { error: 'Walmart not connected' },
        { status: 400 }
      )
    }

    // Check rate limit
    const endpoint = 'search:items'
    const rateLimitKey = `${endpoint}:${userId}`

    if (!(await rateLimiter.checkRateLimit(rateLimitKey))) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Refresh token if needed
    async function refreshTokenIfNeeded(
      connection: any,
      supabase: any
    ): Promise<string> {
      const expiresAt = new Date(connection.token_expires_at)
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

      if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
        console.log('🔄 Refreshing Walmart token...')

        const refreshResponse = await fetch(
          'https://sandbox.walmartapis.com/v3/token/refresh',
          {
            method: 'POST',
            headers: {
              'WM_PARTNER.ID':
                connection.seller_id || process.env.WALMART_PARTNER_ID!,
              Authorization: `Basic ${Buffer.from(`${process.env.WALMART_CLIENT_ID}:${process.env.WALMART_CLIENT_SECRET}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
              'WM_SVC.NAME': 'Walmart Marketplace',
              'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
              WM_MARKET: 'us',
            },
            body: `grant_type=refresh_token&refresh_token=${connection.refresh_token}`,
          }
        )

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json()
          await supabase
            .from('walmart_connections')
            .update({
              access_token: tokenData.access_token,
              token_expires_at: new Date(
                Date.now() + tokenData.expires_in * 1000
              ).toISOString(),
            })
            .eq('id', connection.id)

          return tokenData.access_token
        }
      }

      return connection.access_token
    }

    const accessToken = await refreshTokenIfNeeded(connection, supabase)

    // Build search URL
    let searchUrl =
      'https://marketplace.walmartapis.com/v3/items/walmart/search?'
    if (gtin) searchUrl += `gtin=${gtin}`
    else if (upc) searchUrl += `upc=${upc}`
    else if (query) searchUrl += `query=${encodeURIComponent(query)}`

    console.log('🔍 Searching Walmart catalog:', searchUrl)

    // Search for product
    const correlationId = crypto.randomUUID()
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_CONSUMER.CHANNEL.TYPE':
          process.env.WALMART_CHANNEL_TYPE || 'SWAGGER_CHANNEL_TYPE',
        'WM_QOS.CORRELATION_ID': correlationId,
        'WM_SVC.NAME': 'Walmart Marketplace',
        Accept: 'application/json',
        WM_MARKET: 'us',
      },
    })

    // Update rate limit from response headers
    const remainingTokens = searchResponse.headers.get('x-current-token-count')
    if (remainingTokens) {
      await rateLimiter.updateFromHeaders(rateLimitKey, searchResponse.headers)
      console.log(
        `📊 Rate limit update for ${endpoint}: ${remainingTokens} tokens remaining`
      )
    }

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ Search failed:', errorText)
      return NextResponse.json(
        {
          error: 'Search failed',
          details: errorText,
        },
        { status: searchResponse.status }
      )
    }

    const searchData: SearchResponse = await searchResponse.json()
    console.log('✅ Search results:', searchData.totalResults, 'items found')

    // Format results with Walmart URLs
    const results =
      searchData.items?.map((item) => ({
        ...item,
        walmartUrl: item.itemId
          ? `https://www.walmart.com/ip/${item.itemId}`
          : null,
        sandboxUrl: item.itemId
          ? `https://seller.walmart.com/items-and-inventory/manage-items?itemId=${item.itemId}`
          : null,
      })) || []

    // If we found the product, update our database with the Walmart item ID
    if (results.length > 0 && gtin) {
      const firstItem = results[0]

      // Find the product in our database by GTIN
      const { data: product } = await supabase
        .from('walmart_listings')
        .select('id, product_id')
        .eq('gtin', gtin)
        .eq('user_id', userId)
        .single()

      if (product && firstItem.itemId) {
        // Update with Walmart item ID
        await supabase
          .from('walmart_listings')
          .update({
            walmart_item_id: firstItem.itemId,
            walmart_url: firstItem.walmartUrl,
          })
          .eq('id', product.id)

        console.log(
          '✅ Updated product with Walmart item ID:',
          firstItem.itemId
        )
      }
    }

    return NextResponse.json({
      success: true,
      totalResults: searchData.totalResults || 0,
      items: results,
      relatedQueries: searchData.relatedQueries,
      remainingTokens: remainingTokens || null,
    })
  } catch (error) {
    console.error('❌ Search error:', error)
    return NextResponse.json(
      {
        error: 'Failed to search Walmart catalog',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
