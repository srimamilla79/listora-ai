// app/api/walmart/items/offer-match/route.ts
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

    // Prepare offer data
    const offer = {
      sku: publishingOptions.sku || `LISTORA-${Date.now()}`,
      productIdentifiers: [
        {
          productIdType: publishingOptions.identifierType || 'SKU',
          productId: publishingOptions.identifier || publishingOptions.sku,
        },
      ],
      price: {
        currency: 'USD',
        amount: parseFloat(publishingOptions.price),
      },
      shippingWeight: {
        unit: 'LB',
        value: 1,
      },
    }

    // Submit using MP_ITEM_MATCH feed
    const feedPayload = {
      MPItemMatchFeedHeader: {
        version: '1.0',
        sellingChannel: 'mpsetupbymatch',
        locale: 'en',
      },
      MPItemMatch: [offer],
    }

    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=MP_ITEM_MATCH',
      feedPayload
    )

    console.log('✅ Feed submitted:', result.feedId)

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      sku: offer.sku,
      message: 'Product submitted to Walmart. Check status in 15-30 minutes.',
    })
  } catch (error) {
    console.error('❌ Walmart publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish' },
      { status: 500 }
    )
  }
}
