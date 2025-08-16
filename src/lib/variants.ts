// src/lib/variants.ts
export type VariantInput = {
  sku: string
  attrs: { color?: string; size?: string; [k: string]: any }
  images?: {
    mainImageUrl?: string
    additionalImageUrl?: string
    swatchImageUrl?: string
  }[]
}

export type VariantAxis = 'color' | 'size'
export type VariantIssue = {
  type: 'error' | 'warning'
  message: string
  sku?: string
}

export type VariantPlan = {
  axis: VariantAxis
  values: string[]
  issues: VariantIssue[]
}

export type VariantMatrix = {
  primaryAxis: 'color' | 'size'
  secondaryAxis?: 'size' | 'color'
  matrix: Map<string, Map<string, VariantInput>>
}

/** Decide the axis and check constraints. */
export function planVariants(variants: VariantInput[]): VariantPlan {
  const issues: VariantIssue[] = []
  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      axis: 'size',
      values: [],
      issues: [{ type: 'error', message: 'No variants provided.' }],
    }
  }

  const hasColor = variants.some((v) => !!v.attrs?.color)
  const hasSize = variants.some((v) => !!v.attrs?.size)

  // Pick axis: prefer color if present, otherwise size.
  const axis: VariantAxis = hasColor ? 'color' : hasSize ? 'size' : 'size'
  if (!hasColor && !hasSize) {
    issues.push({
      type: 'error',
      message: 'At least one variant attribute (color or size) is required.',
    })
  }

  // Ensure all variants have the chosen axis value
  const valuesSet = new Set<string>()
  for (const v of variants) {
    const val = (v.attrs as any)?.[axis]
    if (!val)
      issues.push({
        type: 'error',
        message: `Variant missing ${axis}.`,
        sku: v.sku,
      })
    else valuesSet.add(String(val))
  }

  // If color axis → require swatch or at least a main image per child
  if (axis === 'color') {
    for (const v of variants) {
      const hasSwatch = (v.images || []).some((i) => i.swatchImageUrl)
      const hasMain = (v.images || []).some((i) => i.mainImageUrl)
      if (!hasSwatch)
        issues.push({
          type: 'warning',
          message: `Color variant should include a swatchImageUrl.`,
          sku: v.sku,
        })
      if (!hasMain)
        issues.push({
          type: 'error',
          message: `Each variant needs a mainImageUrl.`,
          sku: v.sku,
        })
    }
  } else {
    // size axis still needs images
    for (const v of variants) {
      const hasMain = (v.images || []).some((i) => i.mainImageUrl)
      if (!hasMain)
        issues.push({
          type: 'error',
          message: `Each variant needs a mainImageUrl.`,
          sku: v.sku,
        })
    }
  }

  return { axis, values: Array.from(valuesSet), issues }
}

// Support two-axis variants (color + size)
export function buildVariantMatrix(variants: VariantInput[]): VariantMatrix {
  const hasColor = variants.some((v) => v.attrs?.color)
  const hasSize = variants.some((v) => v.attrs?.size)

  const matrix = new Map<string, Map<string, VariantInput>>()

  if (hasColor && hasSize) {
    // Two-axis variant family
    for (const v of variants) {
      const color = v.attrs?.color || 'default'
      const size = v.attrs?.size || 'default'

      if (!matrix.has(color)) {
        matrix.set(color, new Map())
      }
      matrix.get(color)!.set(size, v)
    }

    return {
      primaryAxis: 'color',
      secondaryAxis: 'size',
      matrix,
    }
  }

  // Single axis...
  const axis = hasColor ? 'color' : 'size'
  for (const v of variants) {
    const value = v.attrs?.[axis] || 'default'
    if (!matrix.has(value)) {
      matrix.set(value, new Map())
    }
    matrix.get(value)!.set('default', v)
  }

  return { primaryAxis: axis as VariantAxis, matrix }
}

// Validate variant family completeness
export function validateVariantCompleteness(
  matrix: VariantMatrix
): VariantIssue[] {
  const issues: VariantIssue[] = []

  if (matrix.secondaryAxis) {
    // Check for missing combinations
    const allSizes = new Set<string>()
    matrix.matrix.forEach((sizeMap) => {
      sizeMap.forEach((_, size) => allSizes.add(size))
    })

    matrix.matrix.forEach((sizeMap, color) => {
      allSizes.forEach((size) => {
        if (!sizeMap.has(size)) {
          issues.push({
            type: 'warning',
            message: `Missing variant: ${color} / ${size}`,
          })
        }
      })
    })
  }

  return issues
}

/** Example: transform VariantInput[] into MPItem children (basic mapping). */
export function mapVariantsToMPItemChildren(
  axis: VariantAxis,
  variants: VariantInput[]
) {
  return variants.map((v) => ({
    sku: v.sku,
    MPProduct: {
      [axis]: (v.attrs as any)?.[axis],
    },
    Images: v.images || [],
  }))
}
