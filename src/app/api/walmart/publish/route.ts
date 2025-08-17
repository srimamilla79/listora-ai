// src/app/api/walmart/publish/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartPost, walmartPostXml } from '@/lib/walmart' // ← import BOTH
import { hasGtinExemption } from '@/lib/exemptions' // if this errors, switch to: '../../../../lib/exemptions'

type Identifier = {
  productIdType: 'GTIN' | 'UPC' | 'EAN' | 'ISBN' | 'SKU'
  productId: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      sku,
      price,
      quantity,
      condition,
      productType, // category/product-type name (optional)
      attributes, // spec attributes if collected (optional)
      identifiers = [], // Identifier[]
      noBarcode = false, // boolean
    } = body || {}

    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 401 }
      )
    if (!sku)
      return NextResponse.json(
        { ok: false, error: 'Missing sku' },
        { status: 400 }
      )
    if (price == null)
      return NextResponse.json(
        { ok: false, error: 'Missing price' },
        { status: 400 }
      )

    // PATH A: barcode present → Offer-Match (v3 JSON)
    if (!noBarcode && Array.isArray(identifiers) && identifiers.length > 0) {
      const payload = {
        sku: String(sku),
        identifiers: identifiers.map((i) => ({
          productIdType: i.productIdType,
          productId: i.productId,
        })),
        price: Number(price),
        // quantity: Number(quantity || 1),
        // condition: condition || 'New',
      }

      const resp = await walmartPost(userId, '/v3/items/offer-match', payload)
      return NextResponse.json({
        ok: true,
        method: 'offer-match',
        feedId: resp?.feedId || resp?.id || null,
        raw: resp,
      })
    }

    // PATH B: no barcode → must be GTIN-exempt (otherwise block)
    const exempt = await hasGtinExemption(userId, productType)
    if (!exempt) {
      return NextResponse.json(
        {
          ok: false,
          status: 412,
          error: 'GTIN_EXEMPTION_REQUIRED',
          message:
            'This category requires a GTIN/UPC/EAN unless your account is approved for a GTIN-exemption. Add a barcode or request exemption.',
        },
        { status: 412 }
      )
    }

    // Exempt path: create catalog content via MP_ITEM (XML), then price & inventory
    const required = pickRequiredFields(attributes)
    const missing = validateRequired(required)

    if (missing.length) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error: 'MISSING_REQUIRED_CONTENT_FIELDS',
          missing,
          message: `Missing required fields for content creation: ${missing.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const xml = buildMpItemXml({
      sku: String(sku),
      productType: productType || 'Footwear',
      brand: required.brand!,
      title: required.title!,
      shortDescription: required.shortDescription!,
      mainImageUrl: required.mainImageUrl!,
      attributes: attributes || {},
    })

    // 1) Create content (MP_ITEM)
    const itemFeed = await walmartPostXml(
      userId,
      '/v3/feeds?feedType=MP_ITEM',
      xml
    )

    // 2) Price
    await walmartPost(userId, '/v3/feeds?feedType=PRICE_AND_PROMOTION', {
      sku: String(sku),
      price: Number(price),
    })

    // 3) Inventory
    await walmartPost(userId, '/v3/feeds?feedType=MP_INVENTORY', {
      sku: String(sku),
      quantity: Number(quantity ?? 1),
    })

    return NextResponse.json({
      ok: true,
      method: 'content',
      itemFeedId: itemFeed?.feedId || itemFeed?.id || null,
      raw: itemFeed,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}

/* ===== helper functions (MUST be outside POST) ===== */

function pickRequiredFields(attrs: any) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = attrs?.[k]
      if (v != null && String(v).trim() !== '') return String(v)
    }
    return ''
  }
  return {
    brand: get('brand', 'Brand'),
    title: get('productName', 'ProductName', 'title', 'name'),
    shortDescription: get(
      'shortDescription',
      'ShortDescription',
      'description'
    ),
    mainImageUrl: get(
      'mainImageUrl',
      'mainImageURL',
      'MainImageUrl',
      'mainImage'
    ),
  }
}

function validateRequired(r: {
  brand: string
  title: string
  shortDescription: string
  mainImageUrl: string
}) {
  const missing: string[] = []
  if (!r.brand) missing.push('brand')
  if (!r.title) missing.push('title')
  if (!r.shortDescription) missing.push('shortDescription')
  if (!r.mainImageUrl) missing.push('mainImageUrl')
  return missing
}

function xmlEscape(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildMpItemXml(input: {
  sku: string
  productType: string
  brand: string
  title: string
  shortDescription: string
  mainImageUrl: string
  attributes: any
}) {
  const { sku, productType, brand, title, shortDescription, mainImageUrl } =
    input

  return `<?xml version="1.0" encoding="UTF-8"?>
<MPItemFeed xmlns="http://walmart.com/">
  <MPItemFeedHeader>
    <version>5.0</version>
    <mart>WALMART_US</mart>
  </MPItemFeedHeader>
  <MPItem>
    <sku>${xmlEscape(sku)}</sku>
    <productIdentifiers/> <!-- empty because GTIN-exempt -->
    <productCategory>${xmlEscape(productType)}</productCategory>
    <Brand>${xmlEscape(brand)}</Brand>
    <ProductName>${xmlEscape(title)}</ProductName>
    <ShortDescription>${xmlEscape(shortDescription)}</ShortDescription>
    <MainImageUrl>${xmlEscape(mainImageUrl)}</MainImageUrl>
  </MPItem>
</MPItemFeed>`
}
