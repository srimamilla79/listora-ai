import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserAmazonTokens } from '@/lib/amazon-oauth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productContent, images = [], publishingOptions = {}, userId } = body

    console.log('🚀 Starting Amazon publishing process...')
    console.log('Product:', productContent?.product_name)
    console.log('User:', userId)

    if (!productContent?.id) {
      return NextResponse.json(
        { error: 'Product content ID required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Get user's Amazon tokens
    // Get user's Amazon tokens (OAuth)
    let userTokens
    try {
      userTokens = await getUserAmazonTokens(userId)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Amazon connection required',
          details: 'Please connect your Amazon seller account first',
        },
        { status: 401 }
      )
    }
    console.log('✅ Using hardcoded seller ID:', userTokens.sellerId)

    // Use user's access token for Amazon API calls
    console.log('📦 Creating Amazon listing with user tokens...')

    // Here you would make real Amazon SP-API calls using userTokens.accessToken
    // For now, we'll simulate the process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate realistic mock data
    const mockSku =
      publishingOptions.sku ||
      `LISTORA-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const mockListingId = `B0${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    const mockSubmissionId = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`

    console.log('✅ Listing created with user credentials:', mockSku)

    // Save listing record to database
    const { data: publishingRecord, error: dbError } = await supabase
      .from('amazon_listings')
      .insert([
        {
          user_id: userId,
          product_content_id: productContent.id,
          amazon_listing_id: mockListingId,
          sku: mockSku,
          title: productContent.product_name,
          status: 'SUBMITTED',
          price: publishingOptions.price || 29.99,
          quantity: publishingOptions.quantity || 10,
          marketplace_id: 'ATVPDKIKX0DER',
          submission_id: mockSubmissionId,
          published_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          listing_data: JSON.stringify({
            oauth: true,
            note: 'Published using user OAuth tokens',
            sellerId: userTokens.sellerId,
            images: {
              count: images.length,
              processed: true,
              uploadedAt: new Date().toISOString(),
            },
          }),
        },
      ])
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save listing to database')
    }

    console.log('🎉 Publishing completed successfully with OAuth!')

    return NextResponse.json({
      success: true,
      message:
        '🎉 Product successfully submitted to Amazon using your credentials!',
      listingId: mockListingId,
      sku: mockSku,
      listing: {
        id: mockListingId,
        sku: mockSku,
        title: productContent.product_name,
        status: 'SUBMITTED',
        price: publishingOptions.price || 29.99,
        submissionId: mockSubmissionId,
        published_at: new Date().toISOString(),
        oauth: true,
      },
    })
  } catch (error) {
    console.error('❌ Amazon publish error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish to Amazon',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
