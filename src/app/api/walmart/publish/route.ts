import { NextRequest, NextResponse } from 'next/server'
import { walmartUploadFeed } from '@/lib/walmart'
import { hasGtinExemption } from '@/lib/exemptions'

export const dynamic = 'force-dynamic'

type Identifier = {
  productIdType: 'GTIN' | 'UPC' | 'EAN' | 'ISBN' | 'ISSN'
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

/* ------------------------ XML helpers ------------------------ */
const esc = (s: any) =>
  String(s ?? '').replace(
    /[<>&'"]/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        "'": '&apos;',
        '"': '&quot;',
      })[c]!
  )
const cdata = (s: any) =>
  `<![CDATA[${String(s ?? '').replace(']]>', ']]]]><![CDATA[>')}]]>`

/** MP_ITEM content feed (root: <MPItemFeed>) */
function buildMpItemXml(input: {
  sku: string
  productType: string
  brand: string
  title: string
  shortDescription: string
  mainImageUrl: string
  attributes?: Record<string, any>
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

  // Optional footwear-like fields (safe for others too)
  const gender = attributes.gender ?? attributes.Gender
  const color = attributes.color ?? attributes.Color
  const shoeSize = attributes.size ?? attributes.shoeSize ?? attributes.ShoeSize
  const ageGroup = attributes.ageGroup ?? attributes.AgeGroup
  const shoeWidth = attributes.shoeWidth ?? attributes.ShoeWidth
  const addImgs =
    attributes.additionalImageUrls ??
    attributes.AdditionalImageUrls ??
    attributes.additionalImages

  const extraLines: string[] = []
  if (gender) extraLines.push(`    <Gender>${esc(gender)}</Gender>`)
  if (color) extraLines.push(`    <Color>${esc(color)}</Color>`)
  if (shoeSize) extraLines.push(`    <ShoeSize>${esc(shoeSize)}</ShoeSize>`)
  if (ageGroup) extraLines.push(`    <AgeGroup>${esc(ageGroup)}</AgeGroup>`)
  if (shoeWidth) extraLines.push(`    <ShoeWidth>${esc(shoeWidth)}</ShoeWidth>`)

  if (Array.isArray(addImgs)) {
    for (const u of addImgs)
      if (u)
        extraLines.push(
          `    <AdditionalImageUrl>${esc(u)}</AdditionalImageUrl>`
        )
  } else if (addImgs) {
    extraLines.push(
      `    <AdditionalImageUrl>${esc(addImgs)}</AdditionalImageUrl>`
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<MPItemFeed xmlns="http://walmart.com/">
  <MPItemFeedHeader>
    <version>5.0</version>
    <mart>WALMART_US</mart>
  </MPItemFeedHeader>
  <MPItem>
    <sku>${esc(sku)}</sku>
    <ProductIdentifiers/>
    <ProductCategory>${esc(productType)}</ProductCategory>
    <Brand>${esc(brand)}</Brand>
    <ProductName>${cdata(title)}</ProductName>
    <ShortDescription>${cdata(shortDescription)}</ShortDescription>
    <MainImageUrl>${esc(mainImageUrl)}</MainImageUrl>
${extraLines.length ? extraLines.join('\n') + '\n' : ''}  </MPItem>
</MPItemFeed>`
}

/** MP_ITEM_MATCH feed (root: <MPItemMatchFeed>) */
function buildMpItemMatchXml(
  rows: Array<{
    sku: string
    condition?: string
    price?: number
    productIdType: 'GTIN' | 'UPC' | 'EAN' | 'ISBN' | 'ISSN'
    productId: string
  }>
) {
  const items = rows
    .map(
      (r) => `
  <MPItem>
    <Item>
      <sku>${esc(r.sku)}</sku>
      <productIdentifiers>
        <productIdType>${esc(r.productIdType)}</productIdType>
        <productId>${esc(r.productId)}</productId>
      </productIdentifiers>
      ${r.condition ? `<condition>${esc(r.condition)}</condition>` : ''}
      ${r.price != null ? `<price>${esc(r.price)}</price>` : ''}
    </Item>
  </MPItem>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<MPItemMatchFeed xmlns="http://walmart.com/">
  <MPItemFeedHeader>
    <version>4.2</version>
  </MPItemFeedHeader>
  ${items}
</MPItemMatchFeed>`
}

/** PRICE feed (root: <PriceFeed>) */
function buildPriceFeedXml(
  rows: Array<{ sku: string; amount: number; currency?: string }>
) {
  const lines = rows
    .map(
      (r) => `
  <price>
    <itemIdentifier>
      <sku>${esc(r.sku)}</sku>
    </itemIdentifier>
    <pricingList>
      <currentPrice>
        <value>
          <amount>${esc(r.amount)}</amount>
          <currency>${esc(r.currency || 'USD')}</currency>
        </value>
      </currentPrice>
    </pricingList>
  </price>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<PriceFeed xmlns="http://walmart.com/">
  <PriceHeader>
    <version>1.7</version>
  </PriceHeader>
  ${lines}
</PriceFeed>`
}

/** INVENTORY feed (root: <InventoryFeed>) */
function buildInventoryFeedXml(
  rows: Array<{ sku: string; quantity: number; unit?: 'EACH' }>
) {
  const lines = rows
    .map(
      (r) => `
  <inventory>
    <sku>${esc(r.sku)}</sku>
    <quantity>
      <unit>${esc(r.unit || 'EACH')}</unit>
      <amount>${esc(r.quantity)}</amount>
    </quantity>
  </inventory>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<InventoryFeed xmlns="http://walmart.com/">
  <InventoryHeader>
    <version>1.4</version>
  </InventoryHeader>
  ${lines}
</InventoryFeed>`
}

/* ------------------------ validators ------------------------ */
function pickRequiredFields(attrs: Record<string, any>) {
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
  brand?: string
  title?: string
  shortDescription?: string
  mainImageUrl?: string
}) {
  const missing: string[] = []
  if (!r.brand) missing.push('brand')
  if (!r.title) missing.push('title')
  if (!r.shortDescription) missing.push('shortDescription')
  if (!r.mainImageUrl) missing.push('mainImageUrl')
  return missing
}

/* ------------------------ handler ------------------------ */
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
    if (!Number.isFinite(price))
      return NextResponse.json(
        { ok: false, error: 'Invalid price' },
        { status: 400 }
      )

    // ─────────────────────────────────────────────────────────────────────
    // A) BARCODE PRESENT → Offer-Match feed (MP_ITEM_MATCH) + PRICE + INVENTORY
    // ─────────────────────────────────────────────────────────────────────
    if (!noBarcode && identifiers.length > 0) {
      const matchXml = buildMpItemMatchXml(
        identifiers.map((id) => ({
          sku,
          condition,
          price,
          productIdType: id.productIdType,
          productId: id.productId,
        }))
      )

      // CORRECT ORDER: fileContents 4th, contentType 5th
      const matchFeed = await walmartUploadFeed(
        userId,
        'MP_ITEM_MATCH',
        'mp_item_match.xml',
        matchXml,
        'application/xml'
      )

      const priceXml = buildPriceFeedXml([{ sku, amount: price }])
      const invXml = buildInventoryFeedXml([{ sku, quantity }])

      const priceFeed = await walmartUploadFeed(
        userId,
        'PRICE',
        'prices.xml',
        priceXml,
        'application/xml'
      )
      const invFeed = await walmartUploadFeed(
        userId,
        'INVENTORY',
        'inventory.xml',
        invXml,
        'application/xml'
      )

      return NextResponse.json({
        ok: true,
        method: 'offer-match',
        itemMatchFeedId: matchFeed?.feedId || matchFeed?.id || null,
        priceFeedId: priceFeed?.feedId || priceFeed?.id || null,
        inventoryFeedId: invFeed?.feedId || invFeed?.id || null,
        raw: { matchFeed, priceFeed, invFeed },
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // B) NO BARCODE → GTIN-exempt content feed (MP_ITEM) + PRICE + INVENTORY
    // ─────────────────────────────────────────────────────────────────────
    const exemption = await hasGtinExemption(userId, productType || '')
    const isApproved =
      typeof exemption === 'boolean'
        ? exemption
        : !!(
            exemption &&
            ((exemption as any).approved ||
              (exemption as any).status === 'approved')
          )

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

    const reqd = pickRequiredFields(attributes)
    const missing = validateRequired(reqd)
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

    const itemXml = buildMpItemXml({
      sku,
      productType: productType || 'Footwear',
      brand: reqd.brand!,
      title: reqd.title!,
      shortDescription: reqd.shortDescription!,
      mainImageUrl: reqd.mainImageUrl!,
      attributes,
    })

    // CORRECT ORDER: fileContents 4th, contentType 5th
    const itemFeed = await walmartUploadFeed(
      userId,
      'MP_ITEM',
      'mp_item.xml',
      itemXml,
      'application/xml'
    )

    const priceXml = buildPriceFeedXml([{ sku, amount: price }])
    const invXml = buildInventoryFeedXml([{ sku, quantity }])

    const priceFeed = await walmartUploadFeed(
      userId,
      'PRICE',
      'prices.xml',
      priceXml,
      'application/xml'
    )
    const invFeed = await walmartUploadFeed(
      userId,
      'INVENTORY',
      'inventory.xml',
      invXml,
      'application/xml'
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
