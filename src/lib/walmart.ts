// src/lib/walmart.ts — updated with WM_PARTNER.ID, WM_MARKET, WM_SVC.VERSION, and Basic auth on feeds
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export interface WalmartConnection {
  id: string
  user_id: string
  environment: 'production' | 'sandbox' | string
  access_token: string
  refresh_token?: string | null
  token_expires_at: string
  status?: string | null
  seller_id?: string | null
  partner_id?: string | null
  seller_info?: unknown | null
  created_at?: string
  updated_at?: string
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function apiBase(
  env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
) {
  return (
    process.env.WALMART_API_BASE_URL ||
    (env === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com')
  )
}

export async function getWalmartConnection(
  userId: string,
  environment = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
): Promise<WalmartConnection | null> {
  const { data, error } = await admin
    .from('walmart_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('environment', environment)
    .maybeSingle()
  if (error) throw new Error(`DB error: ${error.message}`)
  return (data as WalmartConnection) || null
}

async function refreshAccessToken(
  conn: WalmartConnection
): Promise<WalmartConnection> {
  if (!conn.refresh_token)
    throw new Error('No refresh_token on Walmart connection')
  const clientId = (process.env.WALMART_CLIENT_ID || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const clientSecret = (process.env.WALMART_CLIENT_SECRET || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString(
    'base64'
  )

  const r = await fetch(`${apiBase(conn.environment)}/v3/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_QOS.CORRELATION_ID': randomUUID(),
      'WM_SVC.NAME': 'Walmart Marketplace',
      'WM_PARTNER.ID': process.env.WALMART_PARTNER_ID || '10001127277',
      WM_MARKET: 'US',
      'WM_SVC.VERSION': '1.0.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token!,
      redirect_uri: process.env.WALMART_REDIRECT_URI!,
    }),
  })

  const text = await r.text()
  if (!r.ok) throw new Error(`Token refresh failed (${r.status}): ${text}`)
  const json: any = text ? JSON.parse(text) : {}
  const access_token = json.access_token as string
  const refresh_token =
    (json.refresh_token as string | undefined) ?? conn.refresh_token ?? null
  const expires_in = Number(json.expires_in || 1800)
  const token_expires_at = new Date(
    Date.now() + (expires_in - 300) * 1000
  ).toISOString()

  const { data: updated, error: upErr } = await admin
    .from('walmart_connections')
    .update({
      access_token,
      refresh_token,
      token_expires_at,
      updated_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', conn.id)
    .select()
    .maybeSingle()
  if (upErr) throw new Error(`DB update error: ${upErr.message}`)

  return updated as WalmartConnection
}

export async function ensureValidToken(
  conn: WalmartConnection
): Promise<string> {
  const now = Date.now()
  const exp = new Date(conn.token_expires_at).getTime()
  if (exp - now > 5 * 60_000 && conn.access_token) return conn.access_token

  try {
    const updated = await refreshAccessToken(conn)
    return updated.access_token
  } catch (e) {
    console.error('Walmart token refresh failed:', e)
    throw new Error(
      'TOKEN_REFRESH_FAILED:' + (e instanceof Error ? e.message : String(e))
    )
  }
}

export function buildWalmartHeaders(
  accessToken: string,
  extra: Record<string, string> = {}
) {
  const clientId = (process.env.WALMART_CLIENT_ID || '').trim()
  const clientSecret = (process.env.WALMART_CLIENT_SECRET || '').trim()
  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString(
    'base64'
  )

  return {
    'WM_SEC.ACCESS_TOKEN': accessToken,
    Authorization: `Basic ${basic}`,
    'WM_QOS.CORRELATION_ID': randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
    Accept: 'application/json',
    ...extra,
  }
}

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
  const r = await fetch(`${apiBase(conn.environment)}${path}${qs}`, {
    method: 'GET',
    headers: buildWalmartHeaders(token),
    cache: 'no-store',
  })
  const text = await r.text()
  if (!r.ok) throw new Error(`GET ${path} failed (${r.status}): ${text}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}

export async function walmartUploadFeed(
  userId: string,
  feedType: string,
  filename: string,
  input: string | Uint8Array | Blob,
  contentType: 'application/json' | 'application/xml'
): Promise<any> {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection for user')
  const token = await ensureValidToken(conn)

  const body =
    typeof input === 'string' || input instanceof Blob
      ? input
      : Buffer.from(input)
  const headers = buildWalmartHeaders(token, {
    'Content-Type': contentType,
  })

  const r = await fetch(
    `${apiBase(conn.environment)}/v3/feeds?feedType=${encodeURIComponent(feedType)}`,
    {
      method: 'POST',
      headers,
      body,
    }
  )
  const text = await r.text()
  if (!r.ok) throw new Error(`Feed upload failed (${r.status}): ${text}`)
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export async function getTaxonomy(userId: string) {
  return walmartGet(userId, '/v3/items/taxonomy')
}
