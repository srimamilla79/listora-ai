// src/app/api/walmart/items/offer-match/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'
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

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      sku: sku,
      message: 'Product submitted to Walmart. Check status in 15-30 minutes.',
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
