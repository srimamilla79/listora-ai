// src/lib/imageCheck.ts
export type ImageIssue = {
  type: 'error' | 'warning'
  message: string
  url?: string
  detail?: any
}

export type ImageCheckOptions = {
  requireHttps?: boolean // default true
  minBytes?: number // e.g., 10_000 (10 KB)
  allowedMimePrefixes?: string[] // default ["image/"]
}

export type ImageRequirements = {
  minWidth?: number
  minHeight?: number
  maxSizeMB?: number
  aspectRatio?: { min: number; max: number }
  formats?: string[]
}

const WALMART_IMAGE_REQUIREMENTS: ImageRequirements = {
  minWidth: 1000,
  minHeight: 1000,
  maxSizeMB: 10,
  aspectRatio: { min: 0.9, max: 1.1 }, // Nearly square
  formats: ['jpeg', 'jpg', 'png', 'webp'],
}

export async function checkImageUrl(
  url: string,
  opts?: ImageCheckOptions
): Promise<ImageIssue[]> {
  const issues: ImageIssue[] = []
  const requireHttps = opts?.requireHttps ?? true
  const allowed = opts?.allowedMimePrefixes ?? ['image/']
  const minBytes = opts?.minBytes ?? 10_000

  try {
    if (requireHttps && !/^https:\/\//i.test(url)) {
      issues.push({ type: 'error', message: 'Image URL must be HTTPS.', url })
      return issues
    }

    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) {
      issues.push({
        type: 'error',
        message: `Image URL not reachable (HTTP ${res.status}).`,
        url,
      })
      return issues
    }
    const ctype = res.headers.get('content-type') || ''
    const clen = res.headers.get('content-length')
    const isImage = allowed.some((p) => ctype.toLowerCase().startsWith(p))
    if (!isImage) {
      issues.push({
        type: 'error',
        message: `Content-Type not image/* (got "${ctype}").`,
        url,
      })
    }
    if (clen) {
      const bytes = Number(clen)
      if (!Number.isNaN(bytes) && bytes < minBytes) {
        issues.push({
          type: 'warning',
          message: `Image likely too small (${bytes} bytes).`,
          url,
        })
      }
    } else {
      issues.push({
        type: 'warning',
        message: 'No Content-Length returned; cannot size-check.',
        url,
      })
    }

    // Add CDN optimization check
    issues.push(...checkImageOptimization(url))
  } catch (e: any) {
    issues.push({
      type: 'error',
      message: 'Image check failed.',
      url,
      detail: String(e?.message || e),
    })
  }
  return issues
}

export async function checkImages(
  mainImageUrl?: string,
  additional: string[] = []
): Promise<ImageIssue[]> {
  const issues: ImageIssue[] = []
  if (!mainImageUrl) {
    issues.push({ type: 'error', message: 'Main image URL is required.' })
    return issues
  }
  issues.push(...(await checkImageUrl(mainImageUrl)))
  for (const u of additional) {
    issues.push(...(await checkImageUrl(u)))
  }
  return issues
}

// Add dimension checking without external dependencies
export async function getImageDimensions(
  url: string
): Promise<{ width: number; height: number } | null> {
  try {
    // Use browser Image API if available
    if (typeof window !== 'undefined' && window.Image) {
      return new Promise((resolve) => {
        const img = new window.Image()
        img.onload = () => resolve({ width: img.width, height: img.height })
        img.onerror = () => resolve(null)
        img.src = url
      })
    }

    // Server-side: fetch first few KB and parse dimensions
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-8192' }, // First 8KB usually has dimensions
    })

    // For now, return null on server side
    // In production, you'd parse JPEG/PNG headers here
    return null
  } catch {
    return null
  }
}

// Add CDN optimization check
export function checkImageOptimization(url: string): ImageIssue[] {
  const issues: ImageIssue[] = []

  // Check if using a CDN
  const cdnPatterns = [
    /cloudinary\.com/,
    /imgix\.net/,
    /amazonaws\.com/,
    /cloudfront\.net/,
  ]

  if (!cdnPatterns.some((pattern) => pattern.test(url))) {
    issues.push({
      type: 'warning',
      message: 'Consider using a CDN for better performance',
      url,
    })
  }

  return issues
}
