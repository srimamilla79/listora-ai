// src/lib/walmart.ts
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

/**
 * Walmart API helpers
 * - Uses Basic auth only for the /v3/token endpoint
 * - For Marketplace APIs, passes token via WM_SEC.ACCESS_TOKEN (NOT Authorization: Bearer)
 * - Adds REQUIRED header WM_CONSUMER.CHANNEL.TYPE (fixes 403 FORBIDDEN.GMP_GATEWAY_API)
 */

// ─────────────────────────────────────────────────────────────
// Supabase admin (server-side)
// ─────────────────────────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface WalmartConnection {
  id: string
  user_id: string
  environment: 'production' | 'sandbox' | string
  access_token: string
  refresh_token?: string | null
  token_expires_at: string // ISO
  status?: string | null
  seller_id?: string | null
  partner_id?: string | null
  seller_info?: unknown | null
  created_at?: string
  updated_at?: string
}

// ─────────────────────────────────────────────────────────────
// Base URL
// ─────────────────────────────────────────────────────────────
function resolveBaseUrl(
  env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
) {
  // Allow explicit override via WALMART_API_BASE_URL
  if (process.env.WALMART_API_BASE_URL) return process.env.WALMART_API_BASE_URL
  return env === 'sandbox'
    ? 'https://sandbox.walmartapis.com'
    : 'https://marketplace.walmartapis.com'
}

// ─────────────────────────────────────────────────────────────
// DB: fetch active connection for a user
// ─────────────────────────────────────────────────────────────
export async function getWalmartConnection(
  userId: string,
  environment = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
): Promise<WalmartConnection | null> {
  const { data, error } = await supabaseAdmin
    .from('walmart_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('environment', environment)
    .maybeSingle()

  if (error)
    throw new Error(`DB error fetching walmart_connections: ${error.message}`)
  return (data as WalmartConnection) || null
}

// ─────────────────────────────────────────────────────────────
// Token refresh (uses Basic auth, x-www-form-urlencoded)
// ─────────────────────────────────────────────────────────────

async function refreshAccessToken(
  conn: WalmartConnection
): Promise<WalmartConnection> {
  const clientId = (process.env.WALMART_CLIENT_ID || '').trim()
  const clientSecret = (process.env.WALMART_CLIENT_SECRET || '').trim()
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString(
    'base64'
  )

  const r = await fetch(`${resolveBaseUrl(conn.environment)}/v3/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`, // Basic for token API
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_PARTNER.ID': process.env.WALMART_PARTNER_ID!, // ✅ NEW
      'WM_CONSUMER.CHANNEL.TYPE': process.env.WALMART_CHANNEL_TYPE!, // ✅ NEW
      'WM_QOS.CORRELATION_ID': randomUUID(), // ✅ NEW
      'WM_SVC.NAME': 'Walmart Marketplace', // ✅ NEW
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token!,
    }),
  })

  const text = await r.text()
  if (!r.ok) throw new Error(`Token refresh failed (${r.status}): ${text}`)

  const json: any = text ? JSON.parse(text) : {}
  const access_token = json.access_token as string
  const refresh_token =
    (json.refresh_token as string | undefined) ?? conn.refresh_token ?? null
  const expires_in = Number(json.expires_in || 3600)
  const token_expires_at = new Date(
    Date.now() + (expires_in - 300) * 1000
  ).toISOString() // 5 min buffer

  const updates: Partial<WalmartConnection> = {
    access_token,
    token_expires_at,
    refresh_token,
  }
  const { data: updated, error: upErr } = await supabaseAdmin
    .from('walmart_connections')
    .update(updates)
    .eq('id', conn.id)
    .select()
    .maybeSingle()
  if (upErr)
    throw new Error(`DB update error (walmart_connections): ${upErr.message}`)

  return updated as WalmartConnection
}

// ─────────────────────────────────────────────────────────────
// Ensure token is valid (refresh if <5m left)
// ─────────────────────────────────────────────────────────────
export async function ensureValidToken(
  conn: WalmartConnection
): Promise<string> {
  const now = Date.now()
  const exp = new Date(conn.token_expires_at).getTime()
  if (exp - now > 5 * 60 * 1000 && conn.access_token) return conn.access_token
  try {
    const updated = await refreshAccessToken(conn)
    return updated.access_token
  } catch (e) {
    // Fallback to existing token if refresh fails; caller will see 401/403 if truly invalid
    return conn.access_token
  }
}

// ─────────────────────────────────────────────────────────────
// Header builder (adds REQUIRED WM_CONSUMER.CHANNEL.TYPE)
// ─────────────────────────────────────────────────────────────
export function buildWalmartHeaders(
  accessToken: string,
  extra: Record<string, string> = {}
) {
  const headers: Record<string, string> = {
    'WM_SEC.ACCESS_TOKEN': accessToken,
    'WM_CONSUMER.CHANNEL.TYPE': process.env.WALMART_CHANNEL_TYPE || '', // REQUIRED
    'WM_QOS.CORRELATION_ID': randomUUID(),
    Accept: 'application/json',
    ...extra,
  }
  return headers
}

// ─────────────────────────────────────────────────────────────
// Simple GET wrapper
// ─────────────────────────────────────────────────────────────
export async function walmartGet<T = any>(
  userId: string,
  path: string,
  query?: Record<string, string | number>
): Promise<T> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection for user')
  const token = await ensureValidToken(conn)

  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString()}`
    : ''
  const r = await fetch(`${resolveBaseUrl(conn.environment)}${path}${qs}`, {
    method: 'GET',
    headers: buildWalmartHeaders(token),
    cache: 'no-store',
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`GET ${path} failed (${r.status}): ${text}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}

// ─────────────────────────────────────────────────────────────
// Feed upload (supports application/json or application/xml)
// ─────────────────────────────────────────────────────────────
export async function walmartUploadFeed(
  userId: string,
  feedType: string, // e.g., 'ITEM' | 'PRICE' | 'INVENTORY'
  filename: string, // kept for logging; API uses body not filename when JSON/XML
  input: string | Uint8Array | Blob,
  contentType: 'application/json' | 'application/xml'
): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection for user')
  const token = await ensureValidToken(conn)

  // Prepare body
  let body: any = input
  if (typeof input !== 'string' && !(input instanceof Blob)) {
    // Uint8Array → Buffer
    body = Buffer.from(input)
  }

  const headers = buildWalmartHeaders(token, {
    'Content-Type': contentType,
    'WM_SVC.NAME': 'Walmart Marketplace',
  })

  const url = `${resolveBaseUrl(conn.environment)}/v3/feeds?feedType=${encodeURIComponent(feedType)}`
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body,
  })

  const text = await resp.text()
  if (!resp.ok) {
    throw new Error(`Feed upload failed (${resp.status}): ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

// ─────────────────────────────────────────────────────────────
// Optional helpers: POST/PUT JSON
// ─────────────────────────────────────────────────────────────
export async function walmartPostJson<T = any>(
  userId: string,
  path: string,
  payload: unknown
): Promise<T> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection for user')
  const token = await ensureValidToken(conn)
  const r = await fetch(`${resolveBaseUrl(conn.environment)}${path}`, {
    method: 'POST',
    headers: buildWalmartHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload ?? {}),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`POST ${path} failed (${r.status}): ${text}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}

export async function walmartPutJson<T = any>(
  userId: string,
  path: string,
  payload: unknown
): Promise<T> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection for user')
  const token = await ensureValidToken(conn)
  const r = await fetch(`${resolveBaseUrl(conn.environment)}${path}`, {
    method: 'PUT',
    headers: buildWalmartHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload ?? {}),
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`PUT ${path} failed (${r.status}): ${text}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}
