import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Create or get Facebook Commerce Catalog
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Get user's Meta connection
    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single()

    if (!connection || !connection.commerce_account_id) {
      return NextResponse.json(
        { error: 'No commerce account connected' },
        { status: 404 }
      )
    }

    // Check for existing catalog
    const catalogsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.commerce_account_id}/product_catalogs?access_token=${connection.facebook_page_access_token}`
    )
    const catalogs = await catalogsResponse.json()

    if (catalogs.data && catalogs.data.length > 0) {
      // Update database with catalog ID
      await supabase
        .from('meta_connections')
        .update({ facebook_catalog_id: catalogs.data[0].id })
        .eq('user_id', userId)

      return NextResponse.json({
        success: true,
        catalogId: catalogs.data[0].id,
        catalogs: catalogs.data,
      })
    }

    // No catalog exists - need to create one
    return NextResponse.json({
      success: false,
      needsCreation: true,
      message: 'No catalog found. Create one to start selling.',
    })
  } catch (error) {
    console.error('Catalog fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch catalog' },
      { status: 500 }
    )
  }
}

// Create new catalog
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, catalogName = 'Listora AI Products' } = body

    const supabase = createClient()

    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single()

    if (!connection || !connection.commerce_account_id) {
      return NextResponse.json(
        { error: 'No commerce account connected' },
        { status: 404 }
      )
    }

    // Create catalog
    const createResponse = await fetch(
      `https://graph.facebook.com/v18.0/${connection.commerce_account_id}/product_catalogs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catalogName,
          vertical: 'commerce',
          access_token: connection.facebook_page_access_token,
        }),
      }
    )

    const newCatalog = await createResponse.json()

    if (newCatalog.error) {
      throw new Error(newCatalog.error.message)
    }

    // Update database with catalog ID
    await supabase
      .from('meta_connections')
      .update({
        facebook_catalog_id: newCatalog.id,
        commerce_enabled: true,
      })
      .eq('user_id', userId)

    // Create product feed for the catalog
    const feedResponse = await fetch(
      `https://graph.facebook.com/v18.0/${newCatalog.id}/product_feeds`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Main Product Feed',
          access_token: connection.facebook_page_access_token,
        }),
      }
    )

    const feed = await feedResponse.json()

    return NextResponse.json({
      success: true,
      catalogId: newCatalog.id,
      feedId: feed.id,
      message: 'Commerce catalog created successfully!',
    })
  } catch (error) {
    console.error('Catalog creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create catalog' },
      { status: 500 }
    )
  }
}
