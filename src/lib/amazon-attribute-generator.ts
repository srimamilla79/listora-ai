// src/lib/amazon-attribute-generator.ts
// Enhanced Universal Dynamic Attribute Generator with Complex Field Support

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

// ✅ ENHANCED UNIVERSAL DYNAMIC ATTRIBUTE GENERATOR
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log(
      '🔧 Enhanced Dynamic Attribute Generator starting for',
      productType
    )

    // 1. Get detailed schema for this product type
    const schemaData = await getProductTypeSchema(productType)

    if (!schemaData.success) {
      console.log(
        '⚠️ Schema fetch failed, using enhanced fallback for',
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

    // 2. Extract required attributes from schema
    const requiredAttributes = schemaData.analysis.requiredAttributes || []
    const attributeDetails = schemaData.analysis.attributeDetails || {}

    console.log(
      '📊 Found',
      requiredAttributes.length,
      'required attributes for',
      productType
    )

    // 3. Generate ALL required attributes with enhanced complex structures
    const dynamicAttributes: any = {}

    for (const attributeName of requiredAttributes) {
      const attributeSchema = attributeDetails[attributeName]
      const value = generateEnhancedAttributeValue(
        attributeName,
        attributeSchema,
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
      'enhanced attributes for',
      productType
    )

    return dynamicAttributes
  } catch (error: any) {
    console.error('❌ Error in enhanced dynamic attribute generation:', error)
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

// ✅ ENHANCED SMART ATTRIBUTE VALUE GENERATOR WITH COMPLEX STRUCTURES
function generateEnhancedAttributeValue(
  attributeName: string,
  attributeSchema: AttributeSchema | undefined,
  productData: ProductData,
  options: PublishingOptions,
  sku: string
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  // Enhanced attribute mapping with complex structures
  switch (attributeName) {
    // Core product identity (simple fields)
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

    // Pricing and fulfillment (simple fields)
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

    // Product identifiers (simple fields)
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

    // ✅ ENHANCED: Complex Weight Attributes
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

    // ✅ ENHANCED: Complex Dimension Attributes
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

    case 'item_display_dimensions':
      const displayDims = extractDimensions(productData)
      return [
        {
          length: { value: displayDims.length, unit: 'inches' },
          width: { value: displayDims.width, unit: 'inches' },
          height: { value: displayDims.height, unit: 'inches' },
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Battery Attributes with Complex Structures
    case 'batteries_required':
      return [
        {
          value: 'false',
          marketplace_id: marketplaceId,
        },
      ]

    case 'batteries_included':
      return [
        {
          value: 'false',
          marketplace_id: marketplaceId,
        },
      ]

    case 'num_batteries':
      return [
        {
          quantity: '0',
          type: 'no_battery_used',
          marketplace_id: marketplaceId,
        },
      ]

    case 'number_of_lithium_metal_cells':
      return [
        {
          value: '0',
          marketplace_id: marketplaceId,
        },
      ]

    case 'number_of_lithium_ion_cells':
      return [
        {
          value: '0',
          marketplace_id: marketplaceId,
        },
      ]

    case 'contains_battery_or_cell':
      return [
        {
          value: 'false',
          marketplace_id: marketplaceId,
        },
      ]

    case 'non_lithium_battery_energy_content':
      return [
        {
          value: '0',
          unit: 'watt_hours',
          marketplace_id: marketplaceId,
        },
      ]

    case 'non_lithium_battery_packaging':
      return [
        {
          value: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Compliance Attributes
    case 'california_proposition_65':
      return [
        {
          compliance_type: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    case 'regulatory_compliance_certification':
      return [
        {
          regulation_type: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    case 'compliance_media':
      return [
        {
          content_type: 'not_applicable',
          content_language: 'english',
          source_location: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    case 'fcc_radio_frequency_emission_compliance':
      return [
        {
          registration_status: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    case 'hazmat':
      return [
        {
          aspect: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Date Attributes
    case 'merchant_release_date':
      return [
        {
          value: new Date().toISOString().split('T')[0],
          marketplace_id: marketplaceId,
        },
      ]

    case 'product_site_launch_date':
      return [
        {
          value: new Date().toISOString().split('T')[0],
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Watch-Specific Complex Attributes
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

    case 'water_resistance_level':
      return [
        {
          value: 'splash_resistant',
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Variation Theme
    case 'variation_theme':
      return [
        {
          name: 'Color',
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Merchant Policies
    case 'map_policy':
      return [
        {
          value: 'no_restrictions',
          marketplace_id: marketplaceId,
        },
      ]

    case 'merchant_shipping_group':
      return [
        {
          value: 'standard',
          marketplace_id: marketplaceId,
        },
      ]

    // ✅ ENHANCED: Count and Quantity Fields
    case 'unit_count':
      return [
        {
          value: '1',
          marketplace_id: marketplaceId,
        },
      ]

    case 'number_of_items':
      return [
        {
          value: '1',
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_package_quantity':
      return [
        {
          value: '1',
          marketplace_id: marketplaceId,
        },
      ]

    // Universal attributes with smart content analysis
    case 'color':
      return [
        {
          value: extractColor(productData) || 'Black',
          marketplace_id: marketplaceId,
        },
      ]

    case 'target_gender':
      return [
        {
          value: detectGender(productData) || 'unisex',
          marketplace_id: marketplaceId,
        },
      ]

    case 'age_range_description':
      return [
        {
          value: 'Adult',
          marketplace_id: marketplaceId,
        },
      ]

    case 'country_of_origin':
      return [
        {
          value: 'US',
          marketplace_id: marketplaceId,
        },
      ]

    case 'department':
      return [
        {
          value: getDepartment(productData) || 'unisex',
          marketplace_id: marketplaceId,
        },
      ]

    // Watch-specific simple attributes
    case 'calendar_type':
      return [
        {
          value: detectCalendarType(productData) || 'Analog',
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_shape':
      return [
        {
          value: extractShape(productData) || 'Round',
          marketplace_id: marketplaceId,
        },
      ]

    case 'warranty_type':
      return [
        {
          value: 'Limited',
          marketplace_id: marketplaceId,
        },
      ]

    case 'supplier_declared_dg_hz_regulation':
      return [
        {
          value: 'not_applicable',
          marketplace_id: marketplaceId,
        },
      ]

    // Material and construction
    case 'material':
    case 'material_type':
      return [
        {
          value:
            extractMaterial(productData) || getDefaultMaterial(attributeName),
          marketplace_id: marketplaceId,
        },
      ]

    // Size and dimensions
    case 'size':
      return [
        {
          value: extractSize(productData) || 'One Size',
          marketplace_id: marketplaceId,
        },
      ]

    // Style and design
    case 'style':
      return [
        {
          value: extractStyle(productData) || 'classic',
          marketplace_id: marketplaceId,
        },
      ]

    // Generic fallback for unknown attributes
    default:
      return generateEnhancedGenericAttributeValue(
        attributeName,
        attributeSchema,
        productData,
        marketplaceId
      )
  }
}

// ✅ ENHANCED EXTRACTION FUNCTIONS
function extractWeight(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const weightMatch = text.match(
    /(\d+\.?\d*)\s*(lb|lbs|pound|pounds|oz|ounces|kg|grams?)/i
  )
  if (weightMatch) {
    const value = parseFloat(weightMatch[1])
    const unit = weightMatch[2].toLowerCase()

    // Convert to pounds
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

  // Look for dimension patterns
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

  // Default dimensions based on product type
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

// ✅ ENHANCED GENERIC ATTRIBUTE VALUE GENERATOR
function generateEnhancedGenericAttributeValue(
  attributeName: string,
  attributeSchema: AttributeSchema | undefined,
  productData: ProductData,
  marketplaceId: string | undefined
): any {
  const marketplace = marketplaceId || process.env.AMAZON_MARKETPLACE_ID

  // Enhanced enum handling
  if (attributeSchema?.enum && attributeSchema.enum.length > 0) {
    // Smart enum selection
    const smartEnum = selectSmartEnum(
      attributeName,
      attributeSchema.enum,
      productData
    )
    return [
      {
        value: smartEnum,
        marketplace_id: marketplace,
      },
    ]
  }

  // Enhanced complex structure detection
  if (attributeSchema?.properties) {
    const complexValue: any = { marketplace_id: marketplace }

    Object.entries(attributeSchema.properties).forEach(
      ([key, prop]: [string, any]) => {
        if (prop.enum && prop.enum.length > 0) {
          complexValue[key] = prop.enum[0]
        } else if (prop.type === 'string') {
          complexValue[key] = getSmartDefaultForKey(key, attributeName)
        } else if (prop.type === 'number') {
          complexValue[key] = '0'
        }
      }
    )

    return [complexValue]
  }

  // Enhanced type-based defaults
  if (attributeSchema?.type === 'boolean') {
    return [{ value: 'false' }]
  }

  if (attributeSchema?.type === 'number') {
    return [
      {
        value: getNumericDefault(attributeName),
        marketplace_id: marketplace,
      },
    ]
  }

  // Enhanced string fallback
  return [
    {
      value: getEnhancedAttributeDefault(attributeName),
      marketplace_id: marketplace,
    },
  ]
}

// ✅ HELPER FUNCTIONS FOR ENHANCED LOGIC
function selectSmartEnum(
  attributeName: string,
  enums: string[],
  productData: ProductData
): string {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  // Smart enum selection based on content
  for (const enumValue of enums) {
    if (text.includes(enumValue.toLowerCase().replace('_', ' '))) {
      return enumValue
    }
  }

  // Fallback to first enum or smart default
  return enums[0] || 'not_applicable'
}

function getSmartDefaultForKey(key: string, attributeName: string): string {
  const keyDefaults: { [key: string]: string } = {
    unit: 'pounds',
    type: 'not_applicable',
    compliance_type: 'not_applicable',
    regulation_type: 'not_applicable',
    content_type: 'not_applicable',
    content_language: 'english',
    source_location: 'not_applicable',
    registration_status: 'not_applicable',
    aspect: 'not_applicable',
    name: attributeName.includes('variation') ? 'Color' : 'standard',
    quantity: '0',
    value: '0',
  }

  return keyDefaults[key] || 'not_applicable'
}

function getNumericDefault(attributeName: string): string {
  if (attributeName.includes('weight')) return '1'
  if (attributeName.includes('dimension') || attributeName.includes('size'))
    return '10'
  if (attributeName.includes('count') || attributeName.includes('quantity'))
    return '1'
  if (attributeName.includes('depth')) return '30'
  if (attributeName.includes('battery') || attributeName.includes('cell'))
    return '0'
  return '1'
}

function getEnhancedAttributeDefault(attributeName: string): string {
  // Enhanced attribute name pattern matching
  if (
    attributeName.includes('compliance') ||
    attributeName.includes('regulation')
  )
    return 'not_applicable'
  if (attributeName.includes('battery')) return 'false'
  if (attributeName.includes('policy')) return 'no_restrictions'
  if (attributeName.includes('shipping')) return 'standard'
  if (attributeName.includes('resistance')) return 'splash_resistant'
  if (attributeName.includes('count') || attributeName.includes('quantity'))
    return '1'
  if (attributeName.includes('weight')) return '1'
  if (attributeName.includes('dimension')) return '10'
  if (attributeName.includes('date'))
    return new Date().toISOString().split('T')[0]
  if (attributeName.includes('color')) return 'Black'
  if (attributeName.includes('material')) return 'mixed'
  if (attributeName.includes('style')) return 'classic'
  if (attributeName.includes('theme')) return 'Color'

  return 'not_applicable'
}

// Keep all existing helper functions (extractColor, detectGender, etc.) from previous version
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

function extractSize(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const sizePatterns = [
    /size\s*(\w+)/,
    /(\d+\.?\d*)\s*(inch|cm|mm)/,
    /(small|medium|large|xl|xs)/,
  ]

  for (const pattern of sizePatterns) {
    const match = text.match(pattern)
    if (match) return match[1] || match[0]
  }

  return null
}

function extractMaterial(
  productData: ProductData,
  type?: string
): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const materials = [
    'leather',
    'cotton',
    'polyester',
    'wool',
    'silk',
    'denim',
    'canvas',
    'rubber',
    'plastic',
    'metal',
    'steel',
    'aluminum',
    'wood',
    'glass',
  ]

  for (const material of materials) {
    if (text.includes(material)) {
      return material.charAt(0).toUpperCase() + material.slice(1)
    }
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

function getDefaultMaterial(attributeName: string): string {
  const materialDefaults: { [key: string]: string } = {
    sole_material: 'rubber',
    upper_material: 'synthetic',
    material_type: 'cotton',
    material: 'mixed',
  }

  return materialDefaults[attributeName] || 'synthetic'
}

function extractStyle(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const styles = [
    'casual',
    'formal',
    'sport',
    'athletic',
    'vintage',
    'modern',
    'classic',
  ]
  for (const style of styles) {
    if (text.includes(style)) return style
  }

  return null
}

function getDepartment(productData: ProductData): string {
  const gender = detectGender(productData)
  return gender === 'male' ? 'mens' : gender === 'female' ? 'womens' : 'unisex'
}

function detectCalendarType(productData: ProductData): string {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  if (text.includes('digital')) return 'Digital'
  if (text.includes('smart')) return 'Digital'

  return 'Analog'
}

function extractShape(productData: ProductData): string {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const shapes = ['round', 'square', 'rectangular', 'oval']
  for (const shape of shapes) {
    if (text.includes(shape)) {
      return shape.charAt(0).toUpperCase() + shape.slice(1)
    }
  }

  return 'Round'
}

// Schema fetcher and fallback functions remain the same as previous version
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

  // Enhanced fallback with complex structures
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
    target_gender: [
      {
        value: detectGender(productData) || 'unisex',
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

    // Enhanced complex attributes for fallback
    item_weight: [
      { value: '1', unit: 'pounds', marketplace_id: marketplaceId },
    ],
    item_package_weight: [
      { value: '1.5', unit: 'pounds', marketplace_id: marketplaceId },
    ],
    item_package_dimensions: [
      {
        length: { value: '10', unit: 'inches' },
        width: { value: '8', unit: 'inches' },
        height: { value: '3', unit: 'inches' },
        marketplace_id: marketplaceId,
      },
    ],
    batteries_required: [{ value: 'false', marketplace_id: marketplaceId }],
    batteries_included: [{ value: 'false', marketplace_id: marketplaceId }],
    unit_count: [{ value: '1', marketplace_id: marketplaceId }],
    number_of_items: [{ value: '1', marketplace_id: marketplaceId }],

    ...imageAttributes,
  }

  // Add product-specific enhanced fallbacks
  const productSpecific = getEnhancedProductSpecificFallback(
    productType,
    productData,
    sku,
    marketplaceId
  )

  return { ...baseAttributes, ...productSpecific }
}

function getEnhancedProductSpecificFallback(
  productType: string,
  productData: ProductData,
  sku: string,
  marketplaceId: string | undefined
): any {
  const marketplace = marketplaceId || process.env.AMAZON_MARKETPLACE_ID

  switch (productType) {
    case 'WATCH':
      return {
        calendar_type: [{ value: 'Analog', marketplace_id: marketplace }],
        item_shape: [{ value: 'Round', marketplace_id: marketplace }],
        warranty_type: [{ value: 'Limited', marketplace_id: marketplace }],
        part_number: [{ value: `LISTORA-${sku}`, marketplace_id: marketplace }],
        water_resistance_level: [
          { value: 'splash_resistant', marketplace_id: marketplace },
        ],
        dial_size: [
          { value: '40', unit: 'millimeters', marketplace_id: marketplace },
        ],
      }

    case 'SHOES':
      return {
        footwear_size: [{ value: 'One Size', marketplace_id: marketplace }],
        sole_material: [{ value: 'rubber', marketplace_id: marketplace }],
        closure: [{ value: 'lace-up', marketplace_id: marketplace }],
        heel: [{ value: 'flat', marketplace_id: marketplace }],
      }

    case 'AIR_FRYER':
      return {
        capacity: [{ value: '5', unit: 'quarts', marketplace_id: marketplace }],
        wattage: [{ value: '1500', marketplace_id: marketplace }],
        model_number: [
          { value: `LISTORA-${sku}`, marketplace_id: marketplace },
        ],
        voltage: [{ value: '120', marketplace_id: marketplace }],
      }

    default:
      return {
        model_number: [
          { value: `LISTORA-${sku}`, marketplace_id: marketplace },
        ],
      }
  }
}
