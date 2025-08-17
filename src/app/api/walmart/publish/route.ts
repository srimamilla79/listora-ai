import { NextRequest, NextResponse } from 'next/server'
import { walmartPost } from '@/lib/walmart'
import { hasGtinExemption } from '@/lib/exemptions'

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
      attributes, // spec attributes if you collect them (optional)
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
        // You can add these if you want Walmart to accept them in your account:
        // quantity: Number(quantity || 1),
        // condition: condition || 'New',
      }

      // Uses your walmartPost (will pick sandbox vs prod and inject headers/tokens)
      const resp = await walmartPost(userId, '/v3/items/offer-match', payload)

      // Some tenants return an object with feedId; others return the whole body.
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

    // OPTIONAL: implement GTIN-exempt content creation (MP_ITEM) here.
    // Many accounts must post XML for MP_ITEM; if so, build the XML and use your low-level fetch.
    // For now, return a clear “not implemented” so UX is explicit.
    return NextResponse.json(
      {
        ok: false,
        status: 501,
        error: 'GTIN_EXEMPT_CONTENT_NOT_IMPLEMENTED',
        message:
          'GTIN-exempt full-content creation is not implemented in this route yet. Your account is marked exempt; add a barcode for Offer-Match or extend this route to post MP_ITEM.',
      },
      { status: 501 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
