// src/lib/walmart.ts
import { createClient } from '@supabase/supabase-js'

/** ─────────────────────────────────────────────────────────────
 * Supabase admin (server-side)
 * ───────────────────────────────────────────────────────────── */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** DB row shape */
export interface WalmartConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string // ISO
  seller_id?: string | null
  partner_id?: string | null
  seller_info?: any
  status: string // 'active', etc.
  environment?: 'production' | 'sandbox' | null
  updated_at?: string
}

function resolveBaseUrl(env?: string | null) {
  return env === 'sandbox'
    ? 'https://sandbox.walmartapis.com'
    : 'https://marketplace.walmartapis.com'
}

/** ─────────────────────────────────────────────────────────────
 * Fetch active connection
 * ───────────────────────────────────────────────────────────── */
export async function getWalmartConnection(
  userId: string
): Promise<WalmartConnection | null> {
  const { data, error } = await supabaseAdmin
    .from('walmart_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data as WalmartConnection
}

/** ─────────────────────────────────────────────────────────────
 * Ensure token (refresh with 5-min buffer)
 * ───────────────────────────────────────────────────────────── */
export async function ensureValidToken(
  conn: WalmartConnection
): Promise<string> {
  const expiresAt = new Date(conn.token_expires_at)
  const fiveMin = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt > fiveMin && conn.access_token) {
    return conn.access_token
  }

  // No refresh token? Return whatever we have (some tenants do short-lived only)
  if (!conn.refresh_token) return conn.access_token

  const tokenUrl =
    conn.environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com/v3/token'
      : 'https://marketplace.walmartapis.com/v3/token'

  const clientId = process.env.WALMART_CLIENT_ID!
  const clientSecret = process.env.WALMART_CLIENT_SECRET!
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const headers: HeadersInit = {
    Authorization: `Basic ${basic}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
  }
  // Some orgs require partner header even on refresh:
  const partner = (conn.seller_id || conn.partner_id || undefined) as
    | string
    | undefined
  if (partner) (headers as any)['WM_PARTNER.ID'] = partner

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: conn.refresh_token || '',
  }).toString()

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} - ${text}`)
  }

  const json = text ? JSON.parse(text) : {}
  const newAccess = String(json.access_token || '')
  const expiresIn = Number(json.expires_in ?? 3600)

  await supabaseAdmin
    .from('walmart_connections')
    .update({
      access_token: newAccess,
      token_expires_at: new Date(
        Date.now() + (expiresIn - 300) * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conn.id)

  return newAccess
}

/** ─────────────────────────────────────────────────────────────
 * Standard Walmart headers
 * NOTE: For feeds, DO NOT set request-level Content-Type.
 * ───────────────────────────────────────────────────────────── */
export function buildWalmartHeaders(
  accessToken: string,
  partnerId?: string
): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/json',
    'WM_SEC.ACCESS_TOKEN': accessToken,
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
    // Authorization is usually not required, but harmless:
    Authorization: `Bearer ${accessToken}`,
  }
  if (partnerId) h['WM_PARTNER.ID'] = partnerId
  return h
}

/** ─────────────────────────────────────────────────────────────
 * GET helper (JSON)
 * ───────────────────────────────────────────────────────────── */
export async function walmartGet(userId: string, path: string): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const access = await ensureValidToken(conn)
  const url = `${resolveBaseUrl(conn.environment)}${path}`

  const res = await fetch(url, {
    method: 'GET',
    headers: buildWalmartHeaders(
      access,
      conn.seller_id || conn.partner_id || undefined
    ),
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? safeJson(text) : {}
  if (!res.ok) {
    console.error(`Walmart GET error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }
  return json
}

/** Try multiple GET paths until one works */
export async function walmartGetFirstOk(userId: string, paths: string[]) {
  let lastErr: unknown
  for (const p of paths) {
    try {
      return await walmartGet(userId, p)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('No candidate path succeeded')
}

/** JSON POST helper (non-feed) */
export async function walmartPost(
  userId: string,
  path: string,
  body: any
): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const access = await ensureValidToken(conn)
  const url = `${resolveBaseUrl(conn.environment)}${path}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildWalmartHeaders(
        access,
        conn.seller_id || conn.partner_id || undefined
      ),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? safeJson(text) : {}
  if (!res.ok) {
    console.error(`Walmart POST error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }
  return json
}

/** Optional XML POST helper (non-feed) */
export async function walmartPostXml(
  userId: string,
  path: string,
  xml: string
): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const access = await ensureValidToken(conn)
  const url = `${resolveBaseUrl(conn.environment)}${path}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildWalmartHeaders(
        access,
        conn.seller_id || conn.partner_id || undefined
      ),
      'Content-Type': 'application/xml',
    },
    body: xml,
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? safeJson(text) : {}
  if (!res.ok) {
    console.error(`Walmart POST XML error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }
  return json
}

/** ─────────────────────────────────────────────────────────────
 * Multipart feed uploader (the important one)
 * - DO NOT set request-level Content-Type; FormData sets boundary
 * - feedType must match XML root:
 *     MP_ITEM         ⟷ <MPItemFeed>
 *     MP_ITEM_MATCH   ⟷ <MPItemMatchFeed>
 *     PRICE           ⟷ <PriceFeed>
 *     INVENTORY       ⟷ <InventoryFeed>
 * ───────────────────────────────────────────────────────────── */
export async function walmartUploadFeed(
  userId: string,
  feedType: 'MP_ITEM' | 'MP_ITEM_MATCH' | 'PRICE' | 'INVENTORY',
  fileName: string,
  fileContents: string | Uint8Array | Blob,
  contentType: 'application/xml' | 'application/json' = 'application/xml'
): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const access = await ensureValidToken(conn)
  const base = resolveBaseUrl(conn.environment)

  // Build Blob safely (avoid SharedArrayBuffer typing issues)
  const form = new FormData()
  const blob = blobFromMixed(fileContents, contentType)
  form.set('file', blob, fileName)

  const url = `${base}/v3/feeds?feedType=${encodeURIComponent(feedType)}&feedSource=MW_GS`

  const headers: HeadersInit = {
    Accept: 'application/json',
    'WM_SEC.ACCESS_TOKEN': access,
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
  }
  const partner = (conn.seller_id || conn.partner_id || undefined) as
    | string
    | undefined
  if (partner) (headers as any)['WM_PARTNER.ID'] = partner

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: form,
    cache: 'no-store',
  })

  const text = await res.text()
  const json = text ? safeJson(text) : {}
  if (!res.ok) {
    throw new Error(`Walmart API error: ${res.status} - ${text}`)
  }
  return json
}

/** ─────────────────────────────────────────────────────────────
 * Tiny TPM limiter for spec endpoints (if you call them)
 * ───────────────────────────────────────────────────────────── */
export const specRateLimiter = {
  calls: [] as number[],
  canCall(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60_000
    this.calls = this.calls.filter((t) => t > oneMinuteAgo)
    return this.calls.length < 3
  },
  recordCall() {
    this.calls.push(Date.now())
  },
  async waitForSlot() {
    while (!this.canCall()) {
      await new Promise((r) => setTimeout(r, 1000))
    }
    this.recordCall()
  },
}

/* ───────────────────────── helpers ───────────────────────── */

function safeJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

/** Always produce a Blob of the right MIME type (fixes SharedArrayBuffer typing) */
function blobFromMixed(
  input: string | Uint8Array | Blob,
  type: 'application/xml' | 'application/json'
): Blob {
  if (input instanceof Blob) {
    return input.type ? input : new Blob([input], { type })
  }
  if (typeof input === 'string') {
    return new Blob([input], { type })
  }
  // Uint8Array → copy into a brand-new ArrayBuffer (never SharedArrayBuffer)
  const ab = new ArrayBuffer(input.byteLength)
  new Uint8Array(ab).set(input)
  return new Blob([ab], { type })
}
