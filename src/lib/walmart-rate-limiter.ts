// src/lib/walmart-rate-limiter.ts
// Rate limiting utility for Walmart API calls

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  feedType?: string
}

interface TokenBucket {
  tokens: number
  lastRefill: number
  maxTokens: number
  refillRate: number // tokens per millisecond
}

class WalmartRateLimiter {
  private buckets: Map<string, TokenBucket> = new Map()

  // Rate limits based on Walmart documentation
  private readonly rateLimits: Record<string, RateLimitConfig> = {
    // Feed Management
    'feeds:submit:MP_ITEM': { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
    'feeds:submit:price': { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
    'feeds:submit:inventory': { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
    'feeds:submit:promo': { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
    'feeds:status:all': { maxRequests: 5000, windowMs: 60 * 1000 }, // 5000/min
    'feeds:status:single': { maxRequests: 5000, windowMs: 60 * 1000 }, // 5000/min

    // Item Management
    'items:get:all': { maxRequests: 300, windowMs: 60 * 1000 }, // 300/min
    'items:get:single': { maxRequests: 900, windowMs: 60 * 1000 }, // 900/min
    'items:retire': { maxRequests: 900, windowMs: 60 * 1000 }, // 900/min

    // Inventory Management
    'inventory:get': { maxRequests: 200, windowMs: 60 * 1000 }, // 200/min
    'inventory:update': { maxRequests: 200, windowMs: 60 * 1000 }, // 200/min

    // Price Management
    'price:update': { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour

    // Order Management
    'orders:get:all': { maxRequests: 5000, windowMs: 60 * 1000 }, // 5000/min
    'orders:get:single': { maxRequests: 5000, windowMs: 60 * 1000 }, // 5000/min
  }

  constructor() {
    this.initializeBuckets()
  }

  private initializeBuckets() {
    for (const [key, config] of Object.entries(this.rateLimits)) {
      this.buckets.set(key, {
        tokens: config.maxRequests, // Start with full tokens
        lastRefill: Date.now(),
        maxTokens: config.maxRequests,
        refillRate: config.maxRequests / config.windowMs,
      })
    }
  }

  // Reset tokens for testing
  resetTokens(endpoint: string) {
    const bucket = this.buckets.get(endpoint)
    if (bucket) {
      bucket.tokens = bucket.maxTokens
      bucket.lastRefill = Date.now()
      console.log(`🔄 Reset ${endpoint} to ${bucket.maxTokens} tokens`)
    }
  }

  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = timePassed * bucket.refillRate

    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }

  async checkRateLimit(endpoint: string): Promise<boolean> {
    const bucket = this.buckets.get(endpoint)

    if (!bucket) {
      console.warn(`⚠️ No rate limit configured for endpoint: ${endpoint}`)
      return true // Allow if no limit configured
    }

    // Refill tokens based on time passed
    this.refillTokens(bucket)

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1
      console.log(
        `✅ Rate limit check passed for ${endpoint}: ${Math.floor(bucket.tokens)} tokens remaining`
      )
      return true
    }

    console.log(`❌ Rate limit exceeded for ${endpoint}: 0 tokens remaining`)
    return false
  }

  // New method to check without consuming
  canMakeRequest(endpoint: string): boolean {
    const bucket = this.buckets.get(endpoint)

    if (!bucket) {
      return true
    }

    // Refill tokens based on time passed
    this.refillTokens(bucket)

    return bucket.tokens >= 1
  }

  async waitForRateLimit(endpoint: string): Promise<void> {
    const bucket = this.buckets.get(endpoint)

    if (!bucket) {
      return // No limit, proceed
    }

    while (!(await this.checkRateLimit(endpoint))) {
      // Calculate wait time until next token
      const timeToNextToken = Math.ceil(1 / bucket.refillRate)
      console.log(
        `⏳ Rate limit reached for ${endpoint}. Waiting ${timeToNextToken}ms...`
      )

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(timeToNextToken, 5000))
      )
    }
  }

  // Get remaining tokens for an endpoint
  getRemainingTokens(endpoint: string): number {
    const bucket = this.buckets.get(endpoint)
    if (!bucket) return -1

    this.refillTokens(bucket)
    return Math.floor(bucket.tokens)
  }

  // Parse rate limit headers from Walmart response
  updateFromHeaders(endpoint: string, headers: Headers) {
    const currentTokens = headers.get('x-current-token-count')
    const nextReplenish = headers.get('x-next-replenish-time')

    if (currentTokens) {
      const bucket = this.buckets.get(endpoint)
      if (bucket) {
        bucket.tokens = parseInt(currentTokens)
        console.log(
          `📊 Rate limit update for ${endpoint}: ${currentTokens} tokens remaining`
        )
      }
    }

    if (nextReplenish) {
      console.log(
        `⏰ Next token replenish at: ${new Date(parseInt(nextReplenish)).toISOString()}`
      )
    }
  }
}

// Create singleton instance
export const rateLimiter = new WalmartRateLimiter()

// Helper function for rate-limited API calls
export async function walmartApiCall<T>(
  endpoint: string,
  rateLimitKey: string,
  fetchFn: () => Promise<Response>
): Promise<T> {
  // Wait for rate limit if needed
  await rateLimiter.waitForRateLimit(rateLimitKey)

  try {
    const response = await fetchFn()

    // Update rate limits from response headers
    rateLimiter.updateFromHeaders(rateLimitKey, response.headers)

    // Handle rate limit errors
    if (response.status === 429) {
      console.error('🚫 Rate limit exceeded (429). Waiting before retry...')
      await new Promise((resolve) => setTimeout(resolve, 60000)) // Wait 1 minute
      return walmartApiCall(endpoint, rateLimitKey, fetchFn) // Retry
    }

    if (response.status === 413) {
      throw new Error('Payload too large. Reduce file size and try again.')
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API call failed: ${response.status} - ${errorText}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      return await response.json()
    } else {
      return (await response.text()) as any
    }
  } catch (error) {
    console.error(`❌ API call to ${endpoint} failed:`, error)
    throw error
  }
}

// File size validation for feeds
export function validateFeedFileSize(
  feedType: string,
  fileSizeBytes: number
): boolean {
  const maxSizes: Record<string, number> = {
    inventory: 5 * 1024 * 1024, // 5 MB
    mp_item: 26 * 1024 * 1024, // 26 MB
    price: 10 * 1024 * 1024, // 10 MB
    promo: 10 * 1024 * 1024, // 10 MB
    mp_inventory: 10 * 1024 * 1024, // 10 MB
    mp_maintenance: 26 * 1024 * 1024, // 26 MB
    mp_wfs_item: 26 * 1024 * 1024, // 26 MB
    shipping_overrides: 26 * 1024 * 1024, // 26 MB
  }

  const maxSize = maxSizes[feedType.toLowerCase()]
  if (!maxSize) {
    console.warn(`⚠️ No file size limit configured for feed type: ${feedType}`)
    return true
  }

  if (fileSizeBytes > maxSize) {
    console.error(
      `❌ File size ${fileSizeBytes} bytes exceeds limit of ${maxSize} bytes for ${feedType}`
    )
    return false
  }

  return true
}

// Export rate limit configurations for reference
export const WALMART_RATE_LIMITS = {
  FEED: {
    MP_ITEM: '10/hour',
    PRICE: '10/hour',
    INVENTORY: '50/hour',
    PROMO: '10/hour',
  },
  API: {
    FEED_STATUS: '5000/min',
    ITEMS_GET: '300-900/min',
    INVENTORY_UPDATE: '200/min',
    PRICE_UPDATE: '100/hour',
  },
}
