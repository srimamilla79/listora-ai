// app/api/walmart/inventory/update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'

export async function POST(request: NextRequest) {
  try {
    const { userId, sku, quantity } = await request.json()

    if (!userId || !sku || quantity === undefined) {
      return NextResponse.json(
        { error: 'User ID, SKU, and quantity are required' },
        { status: 400 }
      )
    }

    console.log('📦 Walmart inventory update request')

    const inventoryPayload = {
      InventoryHeader: {
        version: '1.4',
        feedDate: new Date().toISOString(),
      },
      Inventory: [
        {
          sku: sku,
          quantity: {
            unit: 'EACH',
            amount: parseInt(quantity),
          },
          fulfillmentLagTime: 1,
        },
      ],
    }

    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=MP_INVENTORY',
      inventoryPayload
    )

    console.log('✅ Inventory update submitted:', result.feedId)

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      message: 'Inventory update submitted successfully',
    })
  } catch (error) {
    console.error('❌ Inventory update error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update inventory',
      },
      { status: 500 }
    )
  }
}
