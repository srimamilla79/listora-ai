// src/app/api/walmart/items/offer-match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, productContent, publishingOptions, images } =
      await request.json()
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('📦 Walmart offer-match publish request')
    console.log('📋 Skipping spec validation for offer-match')

    // Basic validation only
    if (!publishingOptions.sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 })
    }

    if (!publishingOptions.price || parseFloat(publishingOptions.price) <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      )
    }

    // Determine product type (not critical for offer-match)
    const productType = publishingOptions.walmartProductType || 'General'

    // Prepare minimal data for offer-match
    const sku = publishingOptions.sku || `LISTORA-${Date.now()}`
    const identifiers = publishingOptions.identifier
      ? [
          {
            productIdType: publishingOptions.identifierType || 'GTIN',
            productId: publishingOptions.identifier,
          },
        ]
      : [
          {
            productIdType: 'SKU',
            productId: sku,
          },
        ]

    // Build minimal payload for offer-match
    // Offer-match only needs: SKU, identifiers, and price
    const payload = {
      MPItemFeedHeader: {
        version: '4.2',
        locale: 'en',
        sellingChannel: 'mpsetupbymatch',
      },
      MPItem: [
        {
          sku: sku,
          productIdentifiers: identifiers,
          MPOffer: {
            price: Number(publishingOptions.price),
            shippingWeight: {
              measure: Number(publishingOptions.shippingWeight || 1),
              unit: 'lb',
            },
          },
        },
      ],
    }

    console.log('📤 Submitting offer-match payload:', {
      sku: sku,
      identifiers: identifiers,
      price: publishingOptions.price,
    })

    // Submit to Walmart
    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=MP_ITEM_MATCH',
      payload
    )

    console.log('✅ Feed submitted:', result.feedId)

    // Save to published_products table
    const supabase = await createServerSideClient()

    // Extract GTIN from identifiers
    const gtin =
      identifiers.find((id) => id.productIdType === 'GTIN')?.productId || null

    const { data: savedProduct, error: saveError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: productContent?.id || null,
        platform: 'walmart',
        platform_product_id: null, // Will be updated later when feed is processed
        platform_url: null, // Will be updated later
        title: productContent?.product_name || 'Walmart Product',
        description:
          productContent?.generated_content || productContent?.features || '',
        price: parseFloat(publishingOptions.price),
        quantity: parseInt(publishingOptions.quantity) || 1,
        sku: sku,
        images: images || [],
        platform_data: {
          feedId: result.feedId,
          gtin: gtin,
          productType: productType,
          identifiers: identifiers,
        },
        status: 'pending', // Since Walmart processes feeds asynchronously
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.error('⚠️ Failed to save to published_products:', saveError)
    } else {
      console.log('✅ Saved to published_products table:', savedProduct?.id)
    }

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      sku: sku,
      message: 'Product submitted to Walmart. Check status in 15-30 minutes.',
      data: {
        feedId: result.feedId,
        sku: sku,
        gtin: gtin,
        price: publishingOptions.price,
        quantity: publishingOptions.quantity || 1,
      },
    })
  } catch (error) {
    console.error('❌ Walmart offer-match error:', error)
    // Better error handling
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to publish'
    const isProductTypeError =
      errorMessage.includes('CONTENT_NOT_FOUND') || errorMessage.includes('404')

    if (isProductTypeError) {
      return NextResponse.json(
        {
          error:
            'Please select a valid Walmart product category from the dropdown. The selected category may not be valid.',
          detail: errorMessage,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
