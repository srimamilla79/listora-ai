import crypto from 'crypto'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET ?? ''

function verifyWebhook(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader || !SHOPIFY_API_SECRET) return false
  const digest = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64')
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmacHeader, 'base64'),
      Buffer.from(digest, 'base64')
    )
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const hmac = req.headers.get('x-shopify-hmac-sha256')
  if (!verifyWebhook(raw, hmac))
    return new Response('Unauthorized', { status: 401 })

  // (optional) enqueue your data request processing here…
  return new Response('OK', { status: 200 })
}
