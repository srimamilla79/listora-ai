// src/app/api/walmart/items/offer-match/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'
import { getAndCacheSpec } from '@/lib/specCache'
import { validateAgainstSpec, buildMpItemEnvelope } from '@/lib/specValidator'

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

    // Determine product type
    const productType = publishingOptions.walmartProductType || 'Home'

    // Get spec and validate
    const specMap = await getAndCacheSpec(userId, [productType])
    const spec = specMap[productType]

    // Prepare input for validation
    const preflightInput = {
      productType,
      sku: publishingOptions.sku || `LISTORA-${Date.now()}`,
      identifiers: publishingOptions.identifier
        ? [
            {
              productIdType: (publishingOptions.identifierType ||
                'GTIN') as any,
              productId: publishingOptions.identifier,
            },
          ]
        : [
            {
              productIdType: 'SKU' as const,
              productId: publishingOptions.sku || `LISTORA-${Date.now()}`,
            },
          ],
      brand: publishingOptions.brand || 'Generic',
      productName: productContent.product_name,
      shortDescription: productContent.content?.substring(0, 500),
      price: parseFloat(publishingOptions.price),
      shippingWeightLb: publishingOptions.shippingWeight || 1,
      productTaxCode: publishingOptions.taxCode,
      images: images?.map((url: string, index: number) =>
        index === 0 ? { mainImageUrl: url } : { additionalImageUrl: url }
      ),
      attributes: publishingOptions.walmartAttributes || {},
    }

    // Validate
    const issues = validateAgainstSpec(spec, preflightInput)
    const errors = issues.filter((i) => i.level === 'error')

    if (errors.length > 0) {
      console.error('Validation errors:', errors)
      return NextResponse.json(
        {
          error: 'Validation failed',
          issues: errors,
        },
        { status: 400 }
      )
    }

    // Build envelope
    const payload = buildMpItemEnvelope(preflightInput, {
      sellingChannel: 'mpsetupbymatch',
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
      sku: preflightInput.sku,
      message: 'Product submitted to Walmart. Check status in 15-30 minutes.',
    })
  } catch (error) {
    console.error('❌ Walmart offer-match error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish' },
      { status: 500 }
    )
  }
}
