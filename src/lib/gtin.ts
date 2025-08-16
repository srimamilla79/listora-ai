// src/lib/gtin.ts
export type GTINType = 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14'

export function detectGTINType(id: string): GTINType | null {
  const n = id.replace(/\s+/g, '')
  if (!/^\d+$/.test(n)) return null
  switch (n.length) {
    case 8:
      return 'GTIN-8'
    case 12:
      return 'GTIN-12'
    case 13:
      return 'GTIN-13'
    case 14:
      return 'GTIN-14'
    default:
      return null
  }
}

// Standard Mod-10 (GS1) checksum validation
export function isValidGTIN(id: string): boolean {
  const n = id.replace(/\s+/g, '')
  if (!/^\d+$/.test(n)) return false
  if (![8, 12, 13, 14].includes(n.length)) return false

  const digits = n.split('').map((d) => parseInt(d, 10))
  const check = digits[digits.length - 1]
  let sum = 0
  let weight = 3

  for (let i = digits.length - 2; i >= 0; i--) {
    sum += digits[i] * weight
    weight = weight === 3 ? 1 : 3
  }
  const calc = (10 - (sum % 10)) % 10
  return calc === check
}

export function validateGTINs(
  ids: { productIdType: string; productId: string }[]
) {
  const issues: { type: 'error' | 'warning'; message: string }[] = []
  if (!Array.isArray(ids) || ids.length === 0) {
    issues.push({
      type: 'error',
      message: 'At least one product identifier is required.',
    })
    return issues
  }
  for (const id of ids) {
    const t = detectGTINType(id.productId)
    if (!t)
      issues.push({
        type: 'warning',
        message: `Identifier "${id.productId}" is not 8/12/13/14 digits.`,
      })
    if (!isValidGTIN(id.productId)) {
      issues.push({
        type: 'warning',
        message: `Identifier "${id.productId}" failed GTIN checksum.`,
      })
    }
  }
  return issues
}

// Add GTIN format validation for specific types
export function formatGTIN(id: string, targetType?: GTINType): string {
  const cleaned = id.replace(/\s+/g, '')
  if (!targetType) return cleaned

  // Pad with leading zeros if needed
  const targetLength = parseInt(targetType.split('-')[1])
  return cleaned.padStart(targetLength, '0')
}

// Add UPC-E to UPC-A conversion
export function convertUPCEtoUPCA(upce: string): string {
  if (upce.length !== 8) return upce

  const manufacturer = upce.substring(1, 6)
  const lastDigit = upce[6]

  // UPC-E expansion rules
  if (lastDigit === '0' || lastDigit === '1' || lastDigit === '2') {
    return (
      '0' +
      manufacturer.substring(0, 2) +
      lastDigit +
      '0000' +
      manufacturer.substring(2, 5) +
      upce[7]
    )
  } else if (
    lastDigit === '3' ||
    lastDigit === '4' ||
    lastDigit === '5' ||
    lastDigit === '6' ||
    lastDigit === '7' ||
    lastDigit === '8' ||
    lastDigit === '9'
  ) {
    return (
      '0' +
      manufacturer.substring(0, 3) +
      lastDigit +
      '000' +
      manufacturer.substring(3, 5) +
      upce[7]
    )
  }

  return upce
}

// Add manufacturer code extraction
export function extractManufacturerCode(gtin: string): string | null {
  const type = detectGTINType(gtin)
  if (!type) return null

  switch (type) {
    case 'GTIN-12':
      return gtin.substring(0, 6)
    case 'GTIN-13':
      return gtin.substring(0, 7)
    case 'GTIN-14':
      return gtin.substring(1, 7)
    default:
      return null
  }
}
