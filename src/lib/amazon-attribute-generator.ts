// src/lib/amazon-attribute-generator.ts
// Universal Dynamic Attribute Generator for ALL Amazon Product Types

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
}

// ✅ UNIVERSAL DYNAMIC ATTRIBUTE GENERATOR
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log('🔧 Generating dynamic attributes for', productType)

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

    // 3. Generate ALL required attributes with smart defaults
    const dynamicAttributes: any = {}

    for (const attributeName of requiredAttributes) {
      const attributeSchema = attributeDetails[attributeName]
      const value = generateSmartAttributeValue(
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
      'attributes for',
      productType
    )

    return dynamicAttributes
  } catch (error: any) {
    console.error('❌ Error in dynamic attribute generation:', error)
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

// ✅ SMART ATTRIBUTE VALUE GENERATOR
function generateSmartAttributeValue(
  attributeName: string,
  attributeSchema: AttributeSchema | undefined,
  productData: ProductData,
  options: PublishingOptions,
  sku: string
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  // Universal attributes that work for ALL product types
  switch (attributeName) {
    // Core product identity
    case 'item_name':
      return [
        {
          value: productData.title || 'Product',
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

    // Product description and features
    case 'product_description':
      return [
        {
          value: productData.description || 'Quality product',
          marketplace_id: marketplaceId,
        },
      ]

    case 'bullet_point':
      return (productData.features || '')
        .split('\n')
        .filter((f: string) => f.trim())
        .slice(0, 5) // Amazon allows max 5 bullet points
        .map((feature: string) => ({
          value: feature.trim(),
          marketplace_id: marketplaceId,
        }))

    // Pricing and fulfillment
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

    // Product identifiers
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
          value: 'B000000000', // 10+ character placeholder
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
          value: extractModelName(productData) || 'Generic',
          marketplace_id: marketplaceId,
        },
      ]

    // Universal attributes with smart content analysis
    case 'color':
      return [
        {
          value: extractColor(productData) || 'Multi-Color',
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

    // Product-specific attributes with smart defaults
    case 'footwear_size': // SHOES
      return [
        {
          value: extractSize(productData) || 'One Size',
          marketplace_id: marketplaceId,
        },
      ]

    case 'sole_material': // SHOES
      return [
        {
          value: extractMaterial(productData, 'sole') || 'rubber',
          marketplace_id: marketplaceId,
        },
      ]

    case 'calendar_type': // WATCH
      return [
        {
          value: detectCalendarType(productData) || 'Analog',
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_shape': // WATCH
      return [
        {
          value: extractShape(productData) || 'Round',
          marketplace_id: marketplaceId,
        },
      ]

    case 'capacity': // AIR_FRYER
      return [
        {
          value: extractCapacity(productData) || '5 quarts',
          marketplace_id: marketplaceId,
        },
      ]

    case 'wattage': // AIR_FRYER
      return [
        {
          value: extractWattage(productData) || '1500',
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
          value: extractStyle(productData) || 'casual',
          marketplace_id: marketplaceId,
        },
      ]

    case 'department':
      return [
        {
          value: getDepartment(productData) || 'Unisex',
          marketplace_id: marketplaceId,
        },
      ]

    // Technical specifications
    case 'warranty_type':
      return [
        {
          value: 'Limited',
          marketplace_id: marketplaceId,
        },
      ]

    case 'voltage':
      return [
        {
          value: '120',
          marketplace_id: marketplaceId,
        },
      ]

    // Compliance and safety
    case 'supplier_declared_dg_hz_regulation':
      return [
        {
          value: 'not_applicable',
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

    // Offer and availability
    case 'skip_offer':
      return [{ value: 'false' }]

    case 'purchasable_offer':
      return [{ value: 'true' }]

    // Generic fallback for unknown attributes
    default:
      return generateGenericAttributeValue(
        attributeName,
        attributeSchema,
        productData,
        marketplaceId
      )
  }
}

// ✅ CONTENT ANALYSIS FUNCTIONS
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

  // Look for size indicators
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

function extractCapacity(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const capacityMatch = text.match(
    /(\d+\.?\d*)\s*(quart|qt|liter|l|gallon|gal)/i
  )
  if (capacityMatch) {
    return `${capacityMatch[1]} ${capacityMatch[2]}`
  }

  return null
}

function extractWattage(productData: ProductData): string | null {
  const text =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  const wattageMatch = text.match(/(\d+)\s*w(att)?/i)
  if (wattageMatch) {
    return wattageMatch[1]
  }

  return null
}

// ✅ HELPER FUNCTIONS
function generateUPC(): string {
  // Generate a valid UPC-12 format
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

  // Look for model-like patterns in title
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

// ✅ GENERIC ATTRIBUTE VALUE GENERATOR
function generateGenericAttributeValue(
  attributeName: string,
  attributeSchema: AttributeSchema | undefined,
  productData: ProductData,
  marketplaceId: string | undefined
): any {
  const marketplace = marketplaceId || process.env.AMAZON_MARKETPLACE_ID
  // If we have enum values, pick the first one
  if (attributeSchema?.enum && attributeSchema.enum.length > 0) {
    return [
      {
        value: attributeSchema.enum[0],
        marketplace_id: marketplace,
      },
    ]
  }

  // If we have examples, use the first one
  if (attributeSchema?.examples && attributeSchema.examples.length > 0) {
    return [
      {
        value: attributeSchema.examples[0],
        marketplace_id: marketplace,
      },
    ]
  }

  // Type-based defaults
  if (attributeSchema?.type === 'boolean') {
    return [{ value: 'false' }]
  }

  if (attributeSchema?.type === 'number') {
    return [
      {
        value: '1',
        marketplace_id: marketplace,
      },
    ]
  }

  // String fallback
  return [
    {
      value: getAttributeNameDefault(attributeName),
      marketplace_id: marketplace,
    },
  ]
}

function getAttributeNameDefault(attributeName: string): string {
  // Smart defaults based on attribute name patterns
  if (attributeName.includes('count')) return '1'
  if (attributeName.includes('weight')) return '1 pound'
  if (attributeName.includes('dimension')) return '10 inches'
  if (attributeName.includes('temperature')) return '350'
  if (attributeName.includes('speed')) return 'medium'
  if (attributeName.includes('pattern')) return 'solid'
  if (attributeName.includes('finish')) return 'matte'
  if (attributeName.includes('closure')) return 'zipper'
  if (attributeName.includes('feature')) return 'standard'

  return 'not_applicable'
}

// ✅ SCHEMA FETCHER
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

// ✅ ENHANCED FALLBACK SYSTEM
function generateEnhancedFallbackAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  // Enhanced fallback with more attributes than before
  const baseAttributes = {
    condition_type: [{ value: options.condition || 'new_new' }],
    item_name: [
      { value: productData.title || 'Product', marketplace_id: marketplaceId },
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
        value: productData.description || 'Quality product',
        marketplace_id: marketplaceId,
      },
    ],
    bullet_point: (productData.features || '')
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
        value: extractColor(productData) || 'Multi-Color',
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
    ...imageAttributes,
  }

  // Add product-specific fallbacks
  const productSpecific = getProductSpecificFallback(
    productType,
    productData,
    sku,
    marketplaceId
  )

  return { ...baseAttributes, ...productSpecific }
}

function getProductSpecificFallback(
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
        capacity: [{ value: '5 quarts', marketplace_id: marketplace }],
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
