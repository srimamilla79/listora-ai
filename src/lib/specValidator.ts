// src/lib/specValidator.ts

/**
 * Spec-driven validator + MPItem builder
 */

export type ValidationIssue = {
  path: string
  message: string
  level: 'error' | 'warning'
}

export type PreflightInput = {
  productType: string
  version?: string
  // Core content from Listora
  sku: string
  identifiers?: Array<{
    productIdType: 'GTIN' | 'UPC' | 'EAN' | 'ISBN' | 'SKU'
    productId: string
  }>
  brand?: string
  productName?: string
  shortDescription?: string
  longDescription?: string
  modelNumber?: string
  msrp?: { currency: string; amount: number }
  price?: number
  shippingWeightLb?: number
  productTaxCode?: number
  images?: Array<{
    mainImageUrl?: string
    additionalImageUrl?: string
  }>
  // Category-specific attributes
  attributes?: Record<string, any>
}

export type PreflightResult = {
  ok: boolean
  issues: ValidationIssue[]
  mpItemEnvelope: any
}

/** Validate against Walmart spec */
export function validateAgainstSpec(
  spec: any,
  input: PreflightInput
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Core validations
  if (!input.sku) {
    issues.push({ path: 'sku', message: 'SKU is required', level: 'error' })
  }

  if (!input.identifiers || input.identifiers.length === 0) {
    issues.push({
      path: 'identifiers',
      message: 'At least one product identifier is required',
      level: 'error',
    })
  }

  // Common required fields
  if (!input.brand) {
    issues.push({ path: 'brand', message: 'Brand is required', level: 'error' })
  }

  if (!input.productName && !input.shortDescription) {
    issues.push({
      path: 'productName',
      message: 'Product name or short description is required',
      level: 'error',
    })
  }

  if (!input.price && !input.msrp) {
    issues.push({
      path: 'price',
      message: 'Price or MSRP is required',
      level: 'error',
    })
  }

  if (!input.images || !input.images.some((i) => i.mainImageUrl)) {
    issues.push({
      path: 'images',
      message: 'Main image URL is required',
      level: 'error',
    })
  }

  // Validate identifiers format
  if (input.identifiers) {
    for (const id of input.identifiers) {
      if (id.productIdType !== 'SKU' && !/^\d{8,14}$/.test(id.productId)) {
        issues.push({
          path: 'identifiers',
          message: `${id.productIdType} must be 8-14 digits`,
          level: 'warning',
        })
      }
    }
  }

  // Validate images
  if (input.images) {
    for (const img of input.images) {
      if (img.mainImageUrl && !/^https:\/\//i.test(img.mainImageUrl)) {
        issues.push({
          path: 'images.mainImageUrl',
          message: 'Image URLs must use HTTPS',
          level: 'error',
        })
      }
    }
  }

  // Extract and validate spec-specific requirements
  const required = extractRequiredAttributesFromSpec(spec, input.productType)
  for (const key of required) {
    const hasValue =
      (input as any)[key] != null ||
      (input.attributes && input.attributes[key] != null)

    if (!hasValue) {
      issues.push({
        path: `attributes.${key}`,
        message: `Required attribute missing: ${key}`,
        level: 'error',
      })
    }
  }

  return issues
}

/** Build MPItem envelope */
export function buildMpItemEnvelope(
  input: PreflightInput,
  opts?: { sellingChannel?: 'mpsetupbymatch' | 'mpitem' }
) {
  const header: any = {
    version: input.version || '4.2',
    locale: 'en',
  }

  if (opts?.sellingChannel === 'mpsetupbymatch') {
    header.sellingChannel = 'mpsetupbymatch'
  }

  const MPOffer: any = {}
  if (input.price != null) MPOffer.price = Number(input.price)
  if (input.msrp?.amount != null)
    MPOffer.MinimumAdvertisedPrice = Number(input.msrp.amount)
  if (input.productTaxCode != null)
    MPOffer.productTaxCode = Number(input.productTaxCode)
  if (input.shippingWeightLb != null) {
    MPOffer.shippingWeight = {
      measure: Number(input.shippingWeightLb),
      unit: 'lb',
    }
  }

  const MPProduct: any = {
    productType: input.productType,
    productName: input.productName || input.shortDescription,
    brand: input.brand,
    shortDescription: input.shortDescription,
    longDescription: input.longDescription,
    modelNumber: input.modelNumber,
    ...(input.attributes || {}),
  }

  // Format images correctly
  const Images: any[] = []
  if (input.images) {
    for (const img of input.images) {
      if (img.mainImageUrl) {
        Images.push({ mainImageUrl: img.mainImageUrl })
      } else if (img.additionalImageUrl) {
        Images.push({ additionalImageUrl: img.additionalImageUrl })
      }
    }
  }

  const mpItem = {
    sku: input.sku,
    productIdentifiers: input.identifiers || [],
    MPProduct,
    MPOffer,
    ...(Images.length > 0 ? { Images } : {}),
  }

  return {
    MPItemFeedHeader: header,
    MPItem: [mpItem],
  }
}

/** Extract required attributes from spec */
function extractRequiredAttributesFromSpec(
  specJson: any,
  productType: string
): string[] {
  if (!specJson) return []

  const required: string[] = []

  // Try multiple spec formats
  // Format 1: { productTypes: { [PT]: { attributes: [...] } } }
  if (specJson.productTypes?.[productType]?.attributes) {
    const attrs = specJson.productTypes[productType].attributes
    if (Array.isArray(attrs)) {
      for (const attr of attrs) {
        if (attr?.required === true && typeof attr.name === 'string') {
          required.push(attr.name)
        }
      }
    }
  }

  // Format 2: { properties: { ... }, required: [...] }
  if (Array.isArray(specJson.required)) {
    required.push(...specJson.required)
  }

  // Format 3: Direct attributes array
  if (Array.isArray(specJson.attributes)) {
    for (const attr of specJson.attributes) {
      if (attr?.required && attr.name) {
        required.push(attr.name)
      }
    }
  }

  return Array.from(new Set(required))
}
