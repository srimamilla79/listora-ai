// src/lib/specCache.ts

import { createClient } from '@supabase/supabase-js'
import { walmartGet, specRateLimiter } from '@/lib/walmart'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Fetches & caches Get Spec for 1..N product types.
 * - Tries version 5.0 first, falls back to 4.2 if 5.0 fails
 * - Caches each productType+version row for 24h by default
 * - Respects 3 TPM rate limit
 */
export async function getAndCacheSpec(
  userId: string,
  productTypes: string[],
  opts?: { version?: string; refresh?: boolean }
) {
  const version = opts?.version ?? '5.0'
  const refresh = !!opts?.refresh

  const results: Record<string, any> = {}

  for (const pt of productTypes) {
    // Check cache first
    if (!refresh) {
      const { data } = await supabaseAdmin
        .from('walmart_specs_cache')
        .select('data, fetched_at')
        .eq('product_type', pt)
        .eq('version', version)
        .maybeSingle()

      // Use cache if less than 24 hours old
      if (data?.data && data.fetched_at) {
        const fetchedAt = new Date(data.fetched_at)
        const hoursSinceFetch =
          (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceFetch < 24) {
          console.log(`Using cached spec for ${pt} v${version}`)
          results[pt] = data.data
          continue
        }
      }
    }

    // Wait for rate limit slot
    await specRateLimiter.waitForSlot()

    // Call Walmart API
    let spec: any
    let actualVersion = version

    try {
      const path = `/v3/items/spec?feedType=MP_ITEM&version=${encodeURIComponent(version)}&productType=${encodeURIComponent(pt)}`
      console.log(`Fetching spec for ${pt} v${version}`)
      spec = await walmartGet(userId, path)
    } catch (e) {
      // Fallback to 4.2 if 5.0 fails
      if (version === '5.0') {
        console.log(`Version 5.0 failed for ${pt}, trying 4.2`)
        await specRateLimiter.waitForSlot()

        const altPath = `/v3/items/spec?feedType=MP_ITEM&version=4.2&productType=${encodeURIComponent(pt)}`
        spec = await walmartGet(userId, altPath)
        actualVersion = '4.2'
      } else {
        throw e
      }
    }

    // Cache the result
    await supabaseAdmin.from('walmart_specs_cache').upsert({
      product_type: pt,
      version: actualVersion,
      data: spec,
      fetched_at: new Date().toISOString(),
    })

    results[pt] = spec
  }

  return results
}

/** Taxonomy cache (entire PT tree) */
export async function getAndCacheTaxonomy(userId: string, refresh = false) {
  if (!refresh) {
    const { data } = await supabaseAdmin
      .from('walmart_taxonomy_cache')
      .select('data, fetched_at')
      .eq('cache_key', 'taxonomy')
      .maybeSingle()

    if (data?.data && data.fetched_at) {
      const fetchedAt = new Date(data.fetched_at)
      const hoursSinceFetch =
        (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceFetch < 24) {
        console.log('Using cached taxonomy')
        return data.data
      }
    }
  }

  console.log('Fetching fresh taxonomy from Walmart')

  // Try multiple possible endpoints
  const json = await walmartGet(userId, '/v3/items/taxonomy')

  await supabaseAdmin.from('walmart_taxonomy_cache').upsert({
    cache_key: 'taxonomy',
    data: json,
    fetched_at: new Date().toISOString(),
  })

  return json
}
