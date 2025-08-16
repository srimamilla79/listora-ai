// src/app/api/walmart/items/full-setup/route.ts

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

    console.log('📦 Walmart full item setup request')

    // Determine product type
    const productType = publishingOptions.walmartProductType || 'Home'

    // Get spec and validate
    const specMap = await getAndCacheSpec(userId, [productType], {
      version: '5.0',
    })
    const spec = specMap[productType]

    // Prepare input
    const preflightInput = {
      productType,
      version: '5.0',
      sku: publishingOptions.sku || `LISTORA-${Date.now()}`,
      identifiers: [
        {
          productIdType: 'SKU' as const,
          productId: publishingOptions.sku || `LISTORA-${Date.now()}`,
        },
      ],
      brand: publishingOptions.brand || extractBrand(productContent),
      productName: productContent.product_name,
      shortDescription:
        productContent.content?.substring(0, 500) ||
        productContent.features?.substring(0, 500),
      longDescription: productContent.content || productContent.features,
      modelNumber: publishingOptions.modelNumber || publishingOptions.sku,
      price: parseFloat(publishingOptions.price),
      shippingWeightLb: publishingOptions.shippingWeight || 1,
      productTaxCode: publishingOptions.taxCode || 2038710,
      images: images?.map((url: string, index: number) =>
        index === 0 ? { mainImageUrl: url } : { additionalImageUrl: url }
      ),
      attributes: publishingOptions.walmartAttributes || {},
    }

    // Validate
    const issues = validateAgainstSpec(spec, preflightInput)
    const warnings = issues.filter((i) => i.level === 'warning')

    if (warnings.length > 0) {
      console.warn('Validation warnings:', warnings)
    }

    // Build envelope
    const payload = buildMpItemEnvelope(preflightInput)

    // Submit to Walmart
    const result = await walmartApiRequest(
      userId,
      'POST',
      '/v3/feeds?feedType=MP_ITEM',
      payload
    )

    console.log('✅ Feed submitted:', result.feedId)

    return NextResponse.json({
      success: true,
      feedId: result.feedId,
      sku: preflightInput.sku,
      message: 'Product submitted to Walmart. Full setup may take 24-48 hours.',
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    console.error('❌ Walmart full-setup error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to setup item',
      },
      { status: 500 }
    )
  }
}

function extractBrand(productContent: any): string {
  const content =
    `${productContent.product_name || ''} ${productContent.content || ''}`.toLowerCase()

  const knownBrands = [
    'nike',
    'adidas',
    'puma',
    'reebok',
    'under armour',
    'apple',
    'samsung',
    'sony',
    'lg',
    'microsoft',
    'amazon basics',
    'generic',
  ]

  for (const brand of knownBrands) {
    if (content.includes(brand)) {
      return brand
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }

  return 'Generic'
}
