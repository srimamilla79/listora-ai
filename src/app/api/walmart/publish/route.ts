import { NextRequest, NextResponse } from 'next/server'
import { walmartPost, walmartUploadFeed } from '@/lib/walmart'
import { hasGtinExemption } from '@/lib/exemptions'

type Identifier = {
  productIdType: 'GTIN' | 'UPC' | 'EAN' | 'ISBN' | 'SKU'
  productId: string
}

type PublishBody = {
  userId: string
  sku: string
  price: number | string
  quantity?: number | string
  condition?: string
  productType?: string | null
  attributes?: Record<string, any>
  identifiers?: Identifier[]
  noBarcode?: boolean
}

/** POST /api/walmart/publish
 *  A) has identifiers & not "noBarcode" → Offer-Match
 *  B) no identifiers & "noBarcode" → require GTIN exemption → MP_ITEM XML → price & inventory feeds
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishBody

    const userId = String(body.userId || '').trim()
    const sku = String(body.sku || '').trim()
    const price = Number(body.price)
    const quantity = body.quantity != null ? Number(body.quantity) : 1
    const condition = String(body.condition || 'New')
    const productType = (body.productType || '').toString().trim()
    const attributes = body.attributes || {}
    const identifiers = Array.isArray(body.identifiers) ? body.identifiers : []
    const noBarcode = !!body.noBarcode

    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 400 }
      )
    if (!sku)
      return NextResponse.json(
        { ok: false, error: 'Missing sku' },
        { status: 400 }
      )
    if (!Number.isFinite(price)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid price' },
        { status: 400 }
      )
    }

    // ──────────────────────────────────────────────────────────────────────────
    // A) identifiers present (and not explicitly "noBarcode") → Offer Match
    // ──────────────────────────────────────────────────────────────────────────
    if (!noBarcode && identifiers.length > 0) {
      const payload = { sku, identifiers, price: Number(price) }
      const resp = await walmartPost(userId, '/v3/items/offer-match', payload)
      return NextResponse.json({
        ok: true,
        method: 'offer-match',
        feedId: resp?.feedId || resp?.id || null,
        raw: resp,
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // B) no barcode → must be GTIN-exempt → upload MP_ITEM XML + price + inventory
    // ──────────────────────────────────────────────────────────────────────────
    const exemption = await hasGtinExemption(userId, productType || '')
    const isApproved =
      typeof exemption === 'boolean'
        ? exemption
        : !!(exemption && (exemption as any).approved)

    if (!isApproved) {
      return NextResponse.json(
        {
          ok: false,
          status: 412,
          error: 'GTIN_EXEMPTION_REQUIRED',
          message:
            'This category requires a GTIN/UPC/EAN unless your account has a GTIN-exemption. Add a barcode or request exemption.',
        },
        { status: 412 }
      )
    }

    // Minimal required content fields for a Walmart item
    const required = pickRequiredFields(attributes)
    const missing = validateRequired(required)
    if (missing.length) {
      return NextResponse.json(
        {
          ok: false,
          status: 400,
          error: 'MISSING_REQUIRED_FIELDS',
          fields: missing,
          message: `Missing required fields: ${missing.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Build MP_ITEM v5 XML (with optional footwear fields if provided)
    const xml = buildMpItemXml({
      sku: String(sku),
      productType: productType || 'Footwear',
      brand: required.brand!,
      title: required.title!,
      shortDescription: required.shortDescription!,
      mainImageUrl: required.mainImageUrl!,
      attributes: attributes || {},
    })

    // Upload content as MP_ITEM (multipart). Your helper expects: userId, feedType, fileName, fileContents, [contentType]
    const itemFeed = await walmartUploadFeed(
      userId,
      'MP_ITEM',
      'mp_item.xml',
      xml,
      'application/xml'
    )

    // Post price & inventory as JSON feeds (works with your existing walmartPost)
    const priceFeed = await walmartPost(
      userId,
      '/v3/feeds?feedType=PRICE_AND_PROMOTION',
      { sku, price: Number(price) }
    )

    const invFeed = await walmartPost(
      userId,
      '/v3/feeds?feedType=MP_INVENTORY',
      { sku, quantity: Number(quantity || 1) }
    )

    return NextResponse.json({
      ok: true,
      method: 'content',
      itemFeedId: itemFeed?.feedId || itemFeed?.id || null,
      priceFeedId: priceFeed?.feedId || priceFeed?.id || null,
      inventoryFeedId: invFeed?.feedId || invFeed?.id || null,
      raw: { itemFeed, priceFeed, invFeed },
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}

/* ───────────────────────── helpers ───────────────────────── */

function pickRequiredFields(attrs: Record<string, any>) {
  // map common synonyms into the fields our XML builder expects
  const brand = attrs.brand ?? attrs.Brand ?? attrs.manufacturerBrand
  const title =
    attrs.title ?? attrs.productName ?? attrs.name ?? attrs.ProductName
  const shortDescription =
    attrs.shortDescription ?? attrs.description ?? attrs.ShortDescription
  const mainImageUrl =
    attrs.mainImageUrl ?? attrs.MainImageUrl ?? attrs.mainImage ?? attrs.image

  return { brand, title, shortDescription, mainImageUrl }
}

function validateRequired(r: {
  brand: string | undefined
  title: string | undefined
  shortDescription: string | undefined
  mainImageUrl: string | undefined
}) {
  const missing: string[] = []
  if (!r.brand) missing.push('brand')
  if (!r.title) missing.push('title')
  if (!r.shortDescription) missing.push('shortDescription')
  if (!r.mainImageUrl) missing.push('mainImageUrl')
  return missing
}

function xmlEscape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Build minimal MP_ITEM v5 XML and include optional footwear fields when provided */
function buildMpItemXml(input: {
  sku: string
  productType: string
  brand: string
  title: string
  shortDescription: string
  mainImageUrl: string
  attributes: any
}) {
  const {
    sku,
    productType,
    brand,
    title,
    shortDescription,
    mainImageUrl,
    attributes = {},
  } = input

  const x = (v: any) => xmlEscape(String(v ?? ''))

  // Optional, common Footwear fields
  const gender = attributes.gender || attributes.Gender
  const color = attributes.color || attributes.Color
  const size = attributes.size || attributes.ShoeSize || attributes.shoeSize
  const ageGroup = attributes.ageGroup || attributes.AgeGroup
  const shoeWidth = attributes.shoeWidth || attributes.ShoeWidth
  const additionalImg =
    attributes.additionalImageUrls ||
    attributes.AdditionalImageUrls ||
    attributes.additionalImages

  const extraLines: string[] = []
  if (gender) extraLines.push(`    <Gender>${x(gender)}</Gender>`)
  if (color) extraLines.push(`    <Color>${x(color)}</Color>`)
  if (size) extraLines.push(`    <ShoeSize>${x(size)}</ShoeSize>`)
  if (ageGroup) extraLines.push(`    <AgeGroup>${x(ageGroup)}</AgeGroup>`)
  if (shoeWidth) extraLines.push(`    <ShoeWidth>${x(shoeWidth)}</ShoeWidth>`)

  if (Array.isArray(additionalImg)) {
    for (const u of additionalImg) {
      if (u)
        extraLines.push(`    <AdditionalImageUrl>${x(u)}</AdditionalImageUrl>`)
    }
  } else if (additionalImg) {
    extraLines.push(
      `    <AdditionalImageUrl>${x(additionalImg)}</AdditionalImageUrl>`
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<MPItemFeed xmlns="http://walmart.com/">
  <MPItemFeedHeader>
    <version>5.0</version>
    <mart>WALMART_US</mart>
  </MPItemFeedHeader>
  <MPItem>
    <sku>${x(sku)}</sku>
    <ProductIdentifiers/>
    <ProductCategory>${x(productType)}</ProductCategory>
    <Brand>${x(brand)}</Brand>
    <ProductName>${x(title)}</ProductName>
    <ShortDescription>${x(shortDescription)}</ShortDescription>
    <MainImageUrl>${x(mainImageUrl)}</MainImageUrl>
${extraLines.length ? extraLines.join('\n') + '\n' : ''}  </MPItem>
</MPItemFeed>`
}
