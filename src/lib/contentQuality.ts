// src/lib/contentQuality.ts
export type ContentIssue = {
  type: 'error' | 'warning' | 'info'
  field: string
  message: string
}

const BANNED_TERMS = [
  'best',
  'cheap',
  'discount',
  'guarantee',
  'covid',
  'pandemic',
  'cure',
  'treat',
  'free shipping',
  'limited time',
  'act now',
  'amazon',
  'ebay',
  'walmart',
]

const SUSPICIOUS_PATTERNS = [
  /[A-Z]{5,}/, // ALL CAPS words
  /!{2,}/, // Multiple exclamation marks
  /\${2,}/, // Multiple dollar signs
  /[^\x00-\x7F]/, // Non-ASCII characters
  /\b(?:www\.|https?:\/\/)\S+/i, // URLs
]

export function checkContentQuality(
  title: string,
  description: string,
  bullets: string[]
): ContentIssue[] {
  const issues: ContentIssue[] = []

  // Title checks
  if (title.length < 20) {
    issues.push({
      type: 'error',
      field: 'title',
      message: 'Title too short (min 20 characters)',
    })
  }

  if (title.length > 200) {
    issues.push({
      type: 'error',
      field: 'title',
      message: 'Title too long (max 200 characters)',
    })
  }

  // Check banned terms
  const allContent =
    `${title} ${description} ${bullets.join(' ')}`.toLowerCase()
  for (const term of BANNED_TERMS) {
    if (allContent.includes(term)) {
      issues.push({
        type: 'warning',
        field: 'content',
        message: `Contains potentially problematic term: "${term}"`,
      })
    }
  }

  // Check patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(title)) {
      issues.push({
        type: 'warning',
        field: 'title',
        message: 'Title contains unusual formatting',
      })
    }
  }

  // Description checks
  if (description && description.length < 50) {
    issues.push({
      type: 'warning',
      field: 'description',
      message: 'Description is very short (consider adding more detail)',
    })
  }

  if (description && description.length > 4000) {
    issues.push({
      type: 'error',
      field: 'description',
      message: 'Description exceeds maximum length (4000 characters)',
    })
  }

  // Bullet point checks
  bullets.forEach((bullet, i) => {
    if (bullet.length < 10) {
      issues.push({
        type: 'warning',
        field: `bullet${i + 1}`,
        message: 'Bullet point too short',
      })
    }

    if (bullet.length > 255) {
      issues.push({
        type: 'error',
        field: `bullet${i + 1}`,
        message: 'Bullet point exceeds maximum length (255 characters)',
      })
    }
  })

  return issues
}
