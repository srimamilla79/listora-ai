// app/api/walmart/price/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'

export async function POST(request: NextRequest) {
  try {
    const { userId, sku, price } = await request.json()

    if (!userId || !sku || !price) {
      return NextResponse.json(
        { error: 'User ID, SKU, and price are required' },
        { status: 400 }
      )
    }

    console.log('💰 Walmart price update request')

    const pricePayload = {
      PriceHeader: {
        version: '1.7',
        feedDate: new Date().toISOString(),
      },
      Price: [
        {
          itemIdentifier: {
            sku: sku,
          },
          pricingList: {
            pricing: [
              {
                currentPriceType: 'BASE',
                currentPrice: {
                  currency: 'USD',
                  amount: parseFloat(price),
                },
              },
            ],
          },
        },
      ],
    }

    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=PRICE_AND_PROMOTION',
      pricePayload
    )

    console.log('✅ Price update submitted:', result.feedId)

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      message: 'Price update submitted successfully',
    })
  } catch (error) {
    console.error('❌ Price update error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update price',
      },
      { status: 500 }
    )
  }
}
