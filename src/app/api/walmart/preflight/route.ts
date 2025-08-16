// src/app/api/walmart/preflight/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheSpec } from '@/lib/specCache'
import {
  validateAgainstSpec,
  buildMpItemEnvelope,
  type PreflightInput,
} from '@/lib/specValidator'
import { validateGTINs } from '@/lib/gtin'
import { checkImages } from '@/lib/imageCheck'
import {
  planVariants,
  buildVariantMatrix,
  validateVariantCompleteness,
} from '@/lib/variants'
import { checkCategoryGating } from '@/lib/gating'
import { validatePricing } from '@/lib/pricing'
import { checkContentQuality } from '@/lib/contentQuality'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId: string = body.userId
    const productType: string = body.productType
    const version: string | undefined = body.version
    const sellingChannel: 'mpsetupbymatch' | 'mpitem' | undefined =
      body.sellingChannel
    const item: PreflightInput = { ...body.item, productType, version }

    if (!userId || !productType || !item) {
      return NextResponse.json(
        { error: 'userId, productType, and item are required' },
        { status: 400 }
      )
    }

    // 1) Spec
    const specMap = await getAndCacheSpec(userId, [productType], {
      version: version || '5.0',
      refresh: !!body.refresh,
    })
    const spec = specMap[productType]

    // 2) Base spec validation
    const specIssues = validateAgainstSpec(spec, item)

    // 3) GTIN guardrails
    const gtinIssues = validateGTINs(item.identifiers || [])

    // 4) Image guardrails
    const main = item.images?.find((i) => i.mainImageUrl)?.mainImageUrl
    const additional = (item.images || [])
      .map((i) => i.additionalImageUrl)
      .filter(Boolean) as string[]
    const imgIssues = await checkImages(main, additional)

    // 5) Variants (only if provided)
    let variantIssues: {
      type: 'error' | 'warning'
      message: string
      sku?: string
    }[] = []
    if (Array.isArray(body.variants) && body.variants.length > 0) {
      const plan = planVariants(body.variants)
      variantIssues = plan.issues

      // Additional variant completeness check
      const matrix = buildVariantMatrix(body.variants)
      const completenessIssues = validateVariantCompleteness(matrix)
      variantIssues.push(...completenessIssues)
    }

    // 6) Category/Brand gating warnings
    const gatingIssues = checkCategoryGating(productType, item.brand)

    // 7) Price validation
    const priceIssues = validatePricing(
      item.price || 0,
      item.msrp?.amount,
      productType
    )

    // 8) Content quality
    const contentIssues = checkContentQuality(
      item.productName || item.shortDescription || '',
      item.longDescription || '',
      extractBulletPoints(item)
    )

    // 9) Check for required docs (if applicable)
    const docIssues = checkRequiredDocuments(productType, item)

    // Combine all issues
    const allIssues = [
      ...specIssues.map((i) => ({
        type: i.level,
        message: `${i.path}: ${i.message}`,
        field: i.path,
      })),
      ...gtinIssues,
      ...imgIssues,
      ...variantIssues,
      ...gatingIssues,
      ...priceIssues,
      ...contentIssues,
      ...docIssues,
    ]

    // Group by severity
    const errors = allIssues.filter((i) => i.type === 'error')
    const warnings = allIssues.filter((i) => i.type === 'warning')
    const info = allIssues.filter((i) => i.type === 'info')

    const ok = errors.length === 0
    const mpItemEnvelope = ok
      ? buildMpItemEnvelope(item, { sellingChannel })
      : null

    return NextResponse.json({
      ok,
      issues: { errors, warnings, info },
      mpItemEnvelope,
      summary: {
        totalIssues: allIssues.length,
        blockers: errors.length,
        suggestions: warnings.length,
        notices: info.length,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e?.message || e),
      },
      { status: 400 }
    )
  }
}

function extractBulletPoints(item: PreflightInput): string[] {
  // Extract from attributes or wherever they're stored
  const bullets = []

  for (let i = 1; i <= 5; i++) {
    const bullet =
      item.attributes?.[`bulletPoint${i}`] ||
      item.attributes?.[`bullet_point${i}`] ||
      item.attributes?.[`feature${i}`]
    if (bullet) bullets.push(bullet)
  }

  return bullets
}

function checkRequiredDocuments(
  productType: string,
  item: PreflightInput
): { type: 'warning' | 'info'; field: string; message: string }[] {
  const issues: { type: 'warning' | 'info'; field: string; message: string }[] =
    []

  // Category-specific document requirements
  if (['Batteries', 'LithiumBatteries'].includes(productType)) {
    if (!item.attributes?.safetyDataSheet) {
      issues.push({
        type: 'warning',
        field: 'documents',
        message: 'Safety data sheet (SDS) recommended for battery products',
      })
    }
  }

  if (['Electronics', 'PersonalCareAppliances'].includes(productType)) {
    if (!item.attributes?.warrantyInfo) {
      issues.push({
        type: 'info',
        field: 'warranty',
        message: 'Consider adding warranty information for electronics',
      })
    }
  }

  if (['Food', 'BabyFood', 'Supplements'].includes(productType)) {
    if (!item.attributes?.nutritionFacts) {
      issues.push({
        type: 'warning',
        field: 'nutrition',
        message: 'Nutrition facts may be required for food products',
      })
    }
  }

  return issues
}
