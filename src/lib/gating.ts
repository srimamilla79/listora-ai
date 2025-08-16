// src/lib/gating.ts
export const GATED_PRODUCT_TYPES = new Set<string>([
  'Jewelry',
  'LuxuryWatches',
  'PersonalCareAppliances',
  'Food',
  'BabyFood',
  'PesticidesAndHerbicides',
  'Batteries',
  'LithiumBatteries',
  'MedicalDevices',
  'Supplements',
  'Alcohol',
  'Tobacco',
  'AdultProducts',
  'FineArt',
  'Collectibles',
  'IndustrialScientific',
  'ProfessionalHealthcare',
  'RestrictedChemicals',
])

export type GatingIssue = { type: 'warning' | 'info'; message: string }

export function checkCategoryGating(
  productType: string,
  brand?: string
): GatingIssue[] {
  const issues: GatingIssue[] = []

  if (GATED_PRODUCT_TYPES.has(productType)) {
    issues.push({
      type: 'warning',
      message: `Category "${productType}" often requires Walmart approval. Ensure this seller is approved before publishing.`,
    })
  }

  // Brand gating is seller/account-specific
  const restrictedBrands = [
    'nike',
    'apple',
    'sony',
    'samsung',
    'lego',
    'disney',
    'marvel',
    'nintendo',
    'microsoft',
    'adidas',
    'puma',
    'under armour',
    'north face',
    'louis vuitton',
    'gucci',
    'prada',
    'chanel',
  ]

  if (brand) {
    const brandLower = brand.toLowerCase()
    if (
      restrictedBrands.some((restricted) => brandLower.includes(restricted))
    ) {
      issues.push({
        type: 'info',
        message: `Brand "${brand}" may be gated or monitored. Ensure brand authorization is on file.`,
      })
    }
  }

  return issues
}
