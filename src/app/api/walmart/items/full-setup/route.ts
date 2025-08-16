// app/api/walmart/items/full-setup/route.ts
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

    console.log('📦 Walmart full item setup request')

    // Map to Walmart's expected structure
    const item = {
      sku: publishingOptions.sku || `LISTORA-${Date.now()}`,
      Orderable: {
        productIdentifiers: [
          {
            productIdType: 'SKU',
            productId: publishingOptions.sku || `LISTORA-${Date.now()}`,
          },
        ],
        productName: productContent.product_name || 'Product',
        brand: publishingOptions.brand || 'Generic',
        shortDescription:
          productContent.content?.substring(0, 500) || 'Product description',
        mainImageUrl: images?.[0] || '',
        price: parseFloat(publishingOptions.price),
        productType: 'Home',
        // Add category-specific fields based on product type
        Home: {
          shortDescription:
            productContent.content?.substring(0, 500) || 'Product description',
          brand: publishingOptions.brand || 'Generic',
          mainImageUrl: images?.[0] || '',
          material: 'Mixed Materials',
          assemblyRequired: 'No',
        },
      },
      Images: images?.map((url: string) => ({ url })) || [],
    }

    // Submit using MP_ITEM feed
    const feedPayload = {
      MPItem: [item],
    }

    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=MP_ITEM',
      feedPayload
    )

    console.log('✅ Feed submitted:', result.feedId)

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      sku: item.sku,
      message: 'Product submitted to Walmart. Full setup may take 24-48 hours.',
    })
  } catch (error) {
    console.error('❌ Walmart full setup error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to setup item',
      },
      { status: 500 }
    )
  }
}
