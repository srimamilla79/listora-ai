// src/lib/pricing.ts
export type PriceIssue = { type: 'error' | 'warning'; message: string }

export function validatePricing(
  price: number,
  msrp?: number,
  category?: string
): PriceIssue[] {
  const issues: PriceIssue[] = []

  if (price <= 0) {
    issues.push({ type: 'error', message: 'Price must be greater than 0' })
  }

  if (price > 10000) {
    issues.push({
      type: 'warning',
      message: 'High price point may require additional verification',
    })
  }

  if (msrp && price > msrp) {
    issues.push({
      type: 'warning',
      message: 'Price exceeds MSRP - may affect Buy Box eligibility',
    })
  }

  // Category-specific price ranges
  const categoryPriceRanges: Record<string, [number, number]> = {
    Clothing: [5, 500],
    Electronics: [10, 5000],
    Toys: [5, 200],
    Home: [10, 1000],
    Footwear: [20, 500],
    Jewelry: [10, 5000],
    Sports: [5, 1000],
    Beauty: [3, 200],
    Automotive: [10, 2000],
    Books: [5, 100],
  }

  if (category && categoryPriceRanges[category]) {
    const [min, max] = categoryPriceRanges[category]
    if (price < min || price > max) {
      issues.push({
        type: 'warning',
        message: `Price outside typical range for ${category} ($${min}-$${max})`,
      })
    }
  }

  return issues
}
