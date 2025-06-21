// src/lib/amazon-attribute-generator.ts
// Schema-Driven Enhanced Universal Dynamic Attribute Generator with Exact Enum Values

interface ProductData {
  title?: string
  description?: string
  features?: string
  brand?: string
  manufacturer?: string
  id?: string
}

interface PublishingOptions {
  price: number
  quantity: number
  condition: string
  productType?: string
}

interface AttributeSchema {
  type: string
  description?: string
  required?: boolean
  enum?: string[]
  minItems?: number
  maxItems?: number
  examples?: string[]
  properties?: any
}

interface DetailedSchemaProperty {
  type?: string
  enum?: string[]
  properties?: any
  items?: any
  oneOf?: any[]
  anyOf?: any[]
  allOf?: any[]
}

// ✅ SCHEMA-DRIVEN ENHANCED UNIVERSAL DYNAMIC ATTRIBUTE GENERATOR
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log('🔧 Schema-Driven Enhanced Generator starting for', productType)

    // 1. Get detailed schema for this product type
    const schemaData = await getProductTypeSchema(productType)

    if (!schemaData.success || !schemaData.detailedSchema) {
      console.log(
        '⚠️ Detailed schema unavailable, using enhanced fallback for',
        productType
      )
      return generateEnhancedFallbackAttributes(
        productType,
        productData,
        options,
        sku,
        imageAttributes
      )
    }

    // 2. Extract schema properties for enum values
    const detailedSchema = schemaData.detailedSchema
    const schemaProperties = detailedSchema.properties || {}

    console.log(
      '📊 Using detailed S3 schema with',
      Object.keys(schemaProperties).length,
      'properties'
    )

    // 3. Generate attributes using exact Amazon schema
    const dynamicAttributes: any = {}

    // Get required attributes from basic analysis
    const requiredAttributes = schemaData.analysis.requiredAttributes || []

    for (const attributeName of requiredAttributes) {
      const schemaProperty = schemaProperties[attributeName]
      const value = generateSchemaBasedAttributeValue(
        attributeName,
        schemaProperty,
        productData,
        options,
        sku
      )

      if (value !== null) {
        dynamicAttributes[attributeName] = value
      }
    }

    // 4. Add image attributes
    Object.assign(dynamicAttributes, imageAttributes)

    console.log(
      '✅ Generated',
      Object.keys(dynamicAttributes).length,
      'schema-based attributes for',
      productType
    )

    return dynamicAttributes
  } catch (error: any) {
    console.error('❌ Error in schema-driven attribute generation:', error)
    console.log('🔄 Falling back to enhanced static attributes')
    return generateEnhancedFallbackAttributes(
      productType,
      productData,
      options,
      sku,
      imageAttributes
    )
  }
}

// ✅ SCHEMA-BASED ATTRIBUTE VALUE GENERATOR WITH EXACT ENUMS
function generateSchemaBasedAttributeValue(
  attributeName: string,
  schemaProperty: DetailedSchemaProperty | undefined,
  productData: ProductData,
  options: PublishingOptions,
  sku: string
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  // First, check if we have schema-defined enums
  const exactEnums = extractExactEnums(schemaProperty)

  // Core product attributes (always use our smart logic)
  switch (attributeName) {
    case 'item_name':
      return [
        {
          value: productData.title || 'Premium Product',
          marketplace_id: marketplaceId,
        },
      ]

    case 'brand':
      return [
        {
          value: productData.brand || 'Listora AI',
          marketplace_id: marketplaceId,
        },
      ]

    case 'manufacturer':
      return [
        {
          value: productData.manufacturer || productData.brand || 'Listora AI',
          marketplace_id: marketplaceId,
        },
      ]

    case 'product_description':
      return [
        {
          value: productData.description || 'Premium quality product',
          marketplace_id: marketplaceId,
        },
      ]

    case 'bullet_point':
      return (
        productData.features ||
        'High quality\nDurable construction\nGreat value'
      )
        .split('\n')
        .filter((f: string) => f.trim())
        .slice(0, 5)
        .map((feature: string) => ({
          value: feature.trim(),
          marketplace_id: marketplaceId,
        }))

    case 'list_price':
      return [
        {
          value: parseFloat(options.price.toString()) || 49.99,
          currency_code: 'USD',
          marketplace_id: marketplaceId,
        },
      ]

    case 'fulfillment_availability':
      return [
        {
          fulfillment_channel_code: 'DEFAULT',
          quantity: parseInt(options.quantity.toString()) || 10,
        },
      ]

    case 'condition_type':
      return [{ value: options.condition || 'new_new' }]

    case 'externally_assigned_product_identifier':
      return [
        {
          product_identity: 'UPC',
          value: generateUPC(),
          marketplace_id: marketplaceId,
        },
      ]

    case 'merchant_suggested_asin':
      return [
        {
          value: 'B000000000',
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_type_keyword':
      return [
        {
          value: getItemTypeKeyword(productData),
          marketplace_id: marketplaceId,
        },
      ]

    case 'model_number':
    case 'part_number':
      return [
        {
          value: `LISTORA-${sku}`,
          marketplace_id: marketplaceId,
        },
      ]

    case 'model_name':
      return [
        {
          value: extractModelName(productData) || 'Premium',
          marketplace_id: marketplaceId,
        },
      ]
  }

  // ✅ SCHEMA-DRIVEN ENUM ATTRIBUTES
  if (exactEnums.length > 0) {
    return generateSchemaEnumValue(
      attributeName,
      exactEnums,
      productData,
      marketplaceId
    )
  }

  // ✅ COMPLEX STRUCTURE ATTRIBUTES WITH SCHEMA GUIDANCE
  const complexValue = generateComplexSchemaValue(
    attributeName,
    schemaProperty,
    productData,
    options,
    sku,
    marketplaceId
  )
  if (complexValue) return complexValue

  // ✅ ENHANCED ATTRIBUTE-SPECIFIC LOGIC
  return generateEnhancedAttributeValue(
    attributeName,
    schemaProperty,
    productData,
    options,
    sku,
    marketplaceId
  )
}

// ✅ EXTRACT EXACT ENUMS FROM AMAZON SCHEMA
function extractExactEnums(
  schemaProperty: DetailedSchemaProperty | undefined
): string[] {
  if (!schemaProperty) return []

  // Direct enum values
  if (schemaProperty.enum) {
    return schemaProperty.enum
  }

  // Enum in oneOf structure
  if (schemaProperty.oneOf) {
    for (const option of schemaProperty.oneOf) {
      if (option.enum) return option.enum
    }
  }

  // Enum in anyOf structure
  if (schemaProperty.anyOf) {
    for (const option of schemaProperty.anyOf) {
      if (option.enum) return option.enum
    }
  }

  // Enum in items (for arrays)
  if (schemaProperty.items?.enum) {
    return schemaProperty.items.enum
  }

  // Enum in properties (for objects)
  if (schemaProperty.properties) {
    for (const [key, prop] of Object.entries(schemaProperty.properties)) {
      if ((prop as any).enum) {
        return (prop as any).enum
      }
    }
  }

  return []
}

// ✅ GENERATE SCHEMA-BASED ENUM VALUES
function generateSchemaEnumValue(
  attributeName: string,
  exactEnums: string[],
  productData: ProductData,
  marketplaceId: string | undefined
): any {
  // Smart enum selection based on content and attribute name
  const smartEnum = selectSmartEnumFromSchema(
    attributeName,
    exactEnums,
    productData
  )

  return [
    {
      value: smartEnum,
      marketplace_id: marketplaceId,
    },
  ]
}

// ✅ SMART ENUM SELECTION FROM AMAZON'S EXACT VALUES
function selectSmartEnumFromSchema(
  attributeName: string,
  exactEnums: string[],
  productData: ProductData
): string {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  // Attribute-specific smart selection
  switch (attributeName) {
    case 'water_resistance_level':
      // Look for water resistance indicators in content
      if (text.includes('waterproof'))
        return findEnumContaining(exactEnums, 'waterproof') || exactEnums[0]
      if (text.includes('water resistant'))
        return findEnumContaining(exactEnums, 'resistant') || exactEnums[0]
      // Default to first available (usually safest option)
      return exactEnums[0]

    case 'map_policy':
      // For pricing policy, use the most permissive option
      return (
        findEnumContaining(exactEnums, ['none', 'no', 'unrestricted']) ||
        exactEnums[0]
      )

    case 'variation_theme':
      // For variation theme, look for common themes
      if (text.includes('color'))
        return findEnumContaining(exactEnums, 'color') || exactEnums[0]
      if (text.includes('size'))
        return findEnumContaining(exactEnums, 'size') || exactEnums[0]
      return exactEnums[0]

    case 'merchant_shipping_group':
      // For shipping, look for standard/default options
      return (
        findEnumContaining(exactEnums, ['default', 'standard', 'normal']) ||
        exactEnums[0]
      )

    case 'california_proposition_65':
      // For compliance, typically want 'no warning' if available
      return (
        findEnumContaining(exactEnums, ['no', 'none', 'not_required']) ||
        exactEnums[0]
      )

    case 'target_gender':
      // Smart gender detection
      const detectedGender = detectGender(productData)
      if (detectedGender === 'male')
        return findEnumContaining(exactEnums, 'male') || exactEnums[0]
      if (detectedGender === 'female')
        return findEnumContaining(exactEnums, 'female') || exactEnums[0]
      return (
        findEnumContaining(exactEnums, ['unisex', 'adult']) || exactEnums[0]
      )

    case 'parentage_level':
      // Usually want 'child' for individual products
      return findEnumContaining(exactEnums, 'child') || exactEnums[0]

    case 'contains_battery_or_cell':
    case 'batteries_required':
    case 'batteries_included':
      // For battery fields, typically false/no
      return (
        findEnumContaining(exactEnums, ['false', 'no', 'none']) || exactEnums[0]
      )

    default:
      // Content-based matching
      for (const enumValue of exactEnums) {
        if (text.includes(enumValue.toLowerCase().replace(/_/g, ' '))) {
          return enumValue
        }
      }

      // Default to first enum (usually safest)
      return exactEnums[0]
  }
}

// ✅ HELPER FUNCTION TO FIND ENUM CONTAINING KEYWORDS
function findEnumContaining(
  exactEnums: string[],
  keywords: string | string[]
): string | null {
  const keywordArray = Array.isArray(keywords) ? keywords : [keywords]

  for (const keyword of keywordArray) {
    for (const enumValue of exactEnums) {
      if (enumValue.toLowerCase().includes(keyword.toLowerCase())) {
        return enumValue
      }
    }
  }

  return null
}

// ✅ GENERATE COMPLEX SCHEMA VALUES
function generateComplexSchemaValue(
  attributeName: string,
  schemaProperty: DetailedSchemaProperty | undefined,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  marketplaceId: string | undefined
): any {
  if (!schemaProperty?.properties) return null

  const complexValue: any = { marketplace_id: marketplaceId }

  // Build complex object based on schema properties
  Object.entries(schemaProperty.properties).forEach(
    ([key, prop]: [string, any]) => {
      if (prop.enum && prop.enum.length > 0) {
        // Use exact enum from schema
        complexValue[key] = selectSmartEnumFromSchema(
          `${attributeName}_${key}`,
          prop.enum,
          productData
        )
      } else if (prop.type === 'string') {
        complexValue[key] = getSmartDefaultForKey(
          key,
          attributeName,
          productData
        )
      } else if (prop.type === 'number') {
        complexValue[key] = getNumericDefaultForKey(
          key,
          attributeName,
          productData
        )
      } else if (prop.type === 'boolean') {
        complexValue[key] = getBooleanDefaultForKey(key, attributeName)
      }
    }
  )

  return Object.keys(complexValue).length > 1 ? [complexValue] : null
}

// ✅ ENHANCED ATTRIBUTE VALUE GENERATOR
function generateEnhancedAttributeValue(
  attributeName: string,
  schemaProperty: DetailedSchemaProperty | undefined,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  marketplaceId: string | undefined
): any {
  // Enhanced specific attribute handling
  switch (attributeName) {
    // Weight attributes with units
    case 'item_weight':
      return [
        {
          value: extractWeight(productData) || '1',
          unit: 'pounds',
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_package_weight':
      return [
        {
          value: (
            parseFloat(extractWeight(productData) || '1') + 0.5
          ).toString(),
          unit: 'pounds',
          marketplace_id: marketplaceId,
        },
      ]

    // Dimension attributes
    case 'item_package_dimensions':
      const dims = extractDimensions(productData)
      return [
        {
          length: { value: dims.length, unit: 'inches' },
          width: { value: dims.width, unit: 'inches' },
          height: { value: dims.height, unit: 'inches' },
          marketplace_id: marketplaceId,
        },
      ]

    // Watch-specific with units
    case 'dial_size':
      return [
        {
          value: extractDialSize(productData) || '40',
          unit: 'millimeters',
          marketplace_id: marketplaceId,
        },
      ]

    case 'water_resistance_depth':
      return [
        {
          value: '30',
          unit: 'meters',
          marketplace_id: marketplaceId,
        },
      ]

    // Date fields
    case 'merchant_release_date':
    case 'product_site_launch_date':
      return [
        {
          value: new Date().toISOString().split('T')[0],
          marketplace_id: marketplaceId,
        },
      ]

    // Boolean fields that need string values
    case 'skip_offer':
    case 'purchasable_offer':
      return [
        {
          value: attributeName === 'purchasable_offer' ? 'true' : 'false',
          marketplace_id: marketplaceId,
        },
      ]

    // Count fields
    case 'unit_count':
    case 'number_of_items':
    case 'item_package_quantity':
    case 'number_of_bands':
    case 'total_usb_2_0_ports':
      return [
        {
          value: getCountDefault(attributeName),
          marketplace_id: marketplaceId,
        },
      ]

    // Simple string fields
    case 'color':
      return [
        {
          value: extractColor(productData) || 'Black',
          marketplace_id: marketplaceId,
        },
      ]

    case 'series_number':
      return [
        {
          value: `SERIES-${sku.slice(-6)}`,
          marketplace_id: marketplaceId,
        },
      ]

    case 'voltage':
      return [
        {
          value: '120',
          unit: 'volts',
          marketplace_id: marketplaceId,
        },
      ]

    // Safety and compliance defaults
    case 'gpsr_safety_attestation':
    case 'is_oem_sourced_product':
    case 'has_less_than_30_percent_state_of_charge':
    case 'ships_globally':
      return [
        {
          value: 'false',
          marketplace_id: marketplaceId,
        },
      ]

    case 'supplier_declared_has_product_identifier_exemption':
      return [
        {
          value: 'false',
          marketplace_id: marketplaceId,
        },
      ]

    default:
      // Generic handling
      return [
        {
          value: getGenericDefault(attributeName, productData),
          marketplace_id: marketplaceId,
        },
      ]
  }
}

// ✅ ENHANCED HELPER FUNCTIONS
function getSmartDefaultForKey(
  key: string,
  attributeName: string,
  productData: ProductData
): string {
  const keyDefaults: { [key: string]: string } = {
    unit: attributeName.includes('weight')
      ? 'pounds'
      : attributeName.includes('dimension')
        ? 'inches'
        : 'units',
    type: 'standard',
    compliance_type: 'no_warning_applicable',
    regulation_type: 'not_regulated',
    content_type: 'none',
    content_language: 'en_US',
    source_location: 'none',
    registration_status: 'not_required',
    aspect: 'none',
    name: 'standard',
    quantity: '0',
    value: '0',
  }

  return keyDefaults[key] || 'standard'
}

function getNumericDefaultForKey(
  key: string,
  attributeName: string,
  productData: ProductData
): string {
  if (key === 'value' && attributeName.includes('weight'))
    return extractWeight(productData) || '1'
  if (key === 'value' && attributeName.includes('dimension')) return '10'
  if (key === 'value' && attributeName.includes('count')) return '1'
  if (key === 'quantity') return '0'
  return '1'
}

function getBooleanDefaultForKey(key: string, attributeName: string): string {
  // Most boolean compliance fields should be false
  return 'false'
}

function getCountDefault(attributeName: string): string {
  if (attributeName === 'number_of_bands') return '1'
  if (attributeName === 'total_usb_2_0_ports') return '0'
  if (attributeName.includes('count') || attributeName.includes('quantity'))
    return '1'
  return '1'
}

function getGenericDefault(
  attributeName: string,
  productData: ProductData
): string {
  if (attributeName.includes('battery')) return 'false'
  if (attributeName.includes('count')) return '1'
  if (attributeName.includes('weight')) return '1'
  if (attributeName.includes('date'))
    return new Date().toISOString().split('T')[0]
  if (attributeName.includes('voltage')) return '120'
  if (attributeName.includes('ships')) return 'false'
  if (attributeName.includes('oem')) return 'false'
  if (attributeName.includes('exempt')) return 'false'

  return 'standard'
}

// Keep all existing helper functions
function extractWeight(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const weightMatch = text.match(
    /(\d+\.?\d*)\s*(lb|lbs|pound|pounds|oz|ounces|kg|grams?)/i
  )
  if (weightMatch) {
    const value = parseFloat(weightMatch[1])
    const unit = weightMatch[2].toLowerCase()

    if (unit.includes('oz') || unit.includes('ounce')) {
      return (value / 16).toFixed(2)
    } else if (unit.includes('kg')) {
      return (value * 2.20462).toFixed(2)
    } else if (unit.includes('gram')) {
      return (value / 453.592).toFixed(2)
    }
    return value.toString()
  }

  return null
}

function extractDimensions(productData: ProductData): {
  length: string
  width: string
  height: string
} {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const dimMatch = text.match(
    /(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*x\s*(\d+\.?\d*)\s*(inch|inches|cm|mm)/i
  )
  if (dimMatch) {
    return {
      length: dimMatch[1],
      width: dimMatch[2],
      height: dimMatch[3],
    }
  }

  if (text.includes('watch')) {
    return { length: '1.7', width: '1.7', height: '0.4' }
  }

  return { length: '10', width: '8', height: '3' }
}

function extractDialSize(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const dialMatch = text.match(/(\d+)\s*mm/i)
  if (dialMatch) {
    return dialMatch[1]
  }

  return null
}

function extractColor(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const colors = [
    'black',
    'white',
    'red',
    'blue',
    'green',
    'yellow',
    'pink',
    'purple',
    'orange',
    'brown',
    'gray',
    'silver',
    'gold',
  ]
  for (const color of colors) {
    if (text.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1)
    }
  }
  return null
}

function detectGender(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  if (
    text.includes('men') ||
    text.includes('male') ||
    text.includes('masculine')
  ) {
    return 'male'
  }
  if (
    text.includes('women') ||
    text.includes('female') ||
    text.includes('feminine')
  ) {
    return 'female'
  }
  return null
}

function generateUPC(): string {
  return '123456789012'
}

function getItemTypeKeyword(productData: ProductData): string {
  const title = (productData.title || '').toLowerCase()

  if (title.includes('watch')) return 'watch'
  if (title.includes('shoe')) return 'shoes'
  if (title.includes('fryer')) return 'air fryer'

  return 'product'
}

function extractModelName(productData: ProductData): string | null {
  const title = productData.title || ''

  const modelMatch = title.match(/\b[A-Z]{2,}\d+[A-Z]*\b/)
  if (modelMatch) return modelMatch[0]

  return null
}

// Schema fetcher and fallback functions
async function getProductTypeSchema(productType: string): Promise<any> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/amazon/product-types/${productType}?detailed=true`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('❌ Error fetching product type schema:', error)
    return { success: false, error: error.message }
  }
}

function generateEnhancedFallbackAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  // Use known working values for fallback
  const baseAttributes = {
    condition_type: [{ value: options.condition || 'new_new' }],
    item_name: [
      {
        value: productData.title || 'Premium Product',
        marketplace_id: marketplaceId,
      },
    ],
    brand: [
      {
        value: productData.brand || 'Listora AI',
        marketplace_id: marketplaceId,
      },
    ],
    manufacturer: [
      {
        value: productData.manufacturer || 'Listora AI',
        marketplace_id: marketplaceId,
      },
    ],
    product_description: [
      {
        value: productData.description || 'Premium quality product',
        marketplace_id: marketplaceId,
      },
    ],
    bullet_point: (
      productData.features || 'High quality\nDurable construction\nGreat value'
    )
      .split('\n')
      .filter((f: string) => f.trim())
      .map((feature: string) => ({
        value: feature.trim(),
        marketplace_id: marketplaceId,
      })),
    list_price: [
      {
        value: parseFloat(options.price.toString()),
        currency_code: 'USD',
        marketplace_id: marketplaceId,
      },
    ],
    fulfillment_availability: [
      {
        fulfillment_channel_code: 'DEFAULT',
        quantity: parseInt(options.quantity.toString()),
      },
    ],
    item_type_keyword: [
      { value: getItemTypeKeyword(productData), marketplace_id: marketplaceId },
    ],
    color: [
      {
        value: extractColor(productData) || 'Black',
        marketplace_id: marketplaceId,
      },
    ],
    country_of_origin: [{ value: 'US', marketplace_id: marketplaceId }],
    externally_assigned_product_identifier: [
      {
        product_identity: 'UPC',
        value: generateUPC(),
        marketplace_id: marketplaceId,
      },
    ],
    merchant_suggested_asin: [
      { value: 'B000000000', marketplace_id: marketplaceId },
    ],

    // Safe defaults for problematic fields
    parentage_level: [{ value: 'child', marketplace_id: marketplaceId }],
    skip_offer: [{ value: 'false', marketplace_id: marketplaceId }],
    supplier_declared_has_product_identifier_exemption: [
      { value: 'false', marketplace_id: marketplaceId },
    ],

    ...imageAttributes,
  }

  return baseAttributes
}
