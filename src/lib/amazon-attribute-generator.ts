// Universal Amazon Dynamic Attribute Generator
// Generates all 139+ required attributes for any Amazon product type

interface ProductData {
  title: string
  description: string
  features: string
  brand?: string
  manufacturer?: string
}

interface PublishingOptions {
  price: string
  quantity: string
  condition: string
  productType?: string
}

// Enhanced content analysis functions
function extractColorFromContent(content: string): string {
  const colors = [
    'black',
    'white',
    'red',
    'blue',
    'green',
    'yellow',
    'orange',
    'purple',
    'pink',
    'brown',
    'gray',
    'silver',
    'gold',
    'navy',
    'maroon',
    'beige',
    'rose gold',
    'space gray',
    'midnight',
    'starlight',
    'multi-color',
  ]

  const lowerContent = (content || '').toLowerCase()
  const foundColor = colors.find((color) => lowerContent.includes(color))
  return foundColor
    ? foundColor.replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Multi-Color'
}

function extractSizeFromContent(content: string): string {
  const sizeMatches = (content || '').match(
    /\b(\d+(?:\.\d+)?)\s*(?:mm|cm|inch|inches|"|')\b/i
  )
  if (sizeMatches) return sizeMatches[0]

  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size']
  const foundSize = standardSizes.find((size) =>
    content?.toUpperCase().includes(size)
  )
  return foundSize || 'One Size'
}

function extractMaterialFromContent(content: string): string {
  const materials = [
    'leather',
    'metal',
    'plastic',
    'rubber',
    'fabric',
    'cotton',
    'polyester',
    'stainless steel',
    'aluminum',
    'titanium',
    'ceramic',
    'wood',
    'glass',
    'silicone',
    'nylon',
    'canvas',
    'denim',
    'wool',
    'silk',
  ]

  const lowerContent = (content || '').toLowerCase()
  const foundMaterial = materials.find((material) =>
    lowerContent.includes(material)
  )
  return foundMaterial
    ? foundMaterial.replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Mixed Materials'
}

function detectGenderFromContent(content: string): string {
  const lowerContent = (content || '').toLowerCase()

  if (
    lowerContent.includes('men') ||
    lowerContent.includes('male') ||
    lowerContent.includes('gentleman')
  ) {
    return 'male'
  }
  if (
    lowerContent.includes('women') ||
    lowerContent.includes('female') ||
    lowerContent.includes('lady')
  ) {
    return 'female'
  }
  return 'unisex'
}

function extractWeightFromContent(content: string): {
  value: string
  unit: string
} {
  const weightMatch = (content || '').match(
    /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilograms?|oz|ounces?|g|grams?)/i
  )
  if (weightMatch) {
    let unit = weightMatch[2].toLowerCase()
    // Convert to pounds for Amazon
    if (unit.includes('kg'))
      return {
        value: (parseFloat(weightMatch[1]) * 2.20462).toFixed(2),
        unit: 'pounds',
      }
    if (unit.includes('oz'))
      return {
        value: (parseFloat(weightMatch[1]) / 16).toFixed(2),
        unit: 'pounds',
      }
    if (unit.includes('g') && !unit.includes('kg'))
      return {
        value: (parseFloat(weightMatch[1]) / 453.592).toFixed(4),
        unit: 'pounds',
      }
    if (unit.includes('lb') || unit.includes('pound'))
      return { value: weightMatch[1], unit: 'pounds' }
  }
  return { value: '1', unit: 'pounds' }
}

function extractDimensionsFromContent(content: string): {
  length: string
  width: string
  height: string
  unit: string
} {
  // Look for patterns like "10x8x3 inches" or "25.4 x 20.3 x 7.6 cm"
  const dimensionMatch = (content || '').match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(inches?|in|cm|mm)/i
  )
  if (dimensionMatch) {
    let unit = dimensionMatch[4].toLowerCase()
    let length = dimensionMatch[1]
    let width = dimensionMatch[2]
    let height = dimensionMatch[3]

    // Convert to inches for Amazon
    if (unit.includes('cm')) {
      length = (parseFloat(length) / 2.54).toFixed(2)
      width = (parseFloat(width) / 2.54).toFixed(2)
      height = (parseFloat(height) / 2.54).toFixed(2)
      unit = 'inches'
    } else if (unit.includes('mm')) {
      length = (parseFloat(length) / 25.4).toFixed(2)
      width = (parseFloat(width) / 25.4).toFixed(2)
      height = (parseFloat(height) / 25.4).toFixed(2)
      unit = 'inches'
    } else {
      unit = 'inches'
    }

    return { length, width, height, unit }
  }

  return { length: '10', width: '8', height: '3', unit: 'inches' }
}

// Main function to generate all 139+ dynamic attributes
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log(
      '🔧 Universal Dynamic Attribute Generator starting for:',
      productType
    )

    // Get the detailed schema for this product type
    const schemaResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://listora.ai'}/api/amazon/product-types/${productType}?detailed=true`
    )
    const schemaData = await schemaResponse.json()

    let requiredAttributes: string[] = []
    let attributeDetails: any = {}

    if (schemaData.success && schemaData.analysis) {
      requiredAttributes = schemaData.analysis.requiredAttributes || []
      attributeDetails = schemaData.analysis.attributeDetails || {}
      console.log(
        '✅ Retrieved',
        requiredAttributes.length,
        'required attributes from Amazon schema'
      )
    } else {
      console.log('⚠️ Schema fetch failed, using enhanced fallback')
      requiredAttributes = getEnhancedFallbackAttributeNames(productType)
    }

    // Extract content analysis
    const color = extractColorFromContent(
      productData.description + ' ' + productData.features
    )
    const material = extractMaterialFromContent(
      productData.description + ' ' + productData.features
    )
    const gender = detectGenderFromContent(
      productData.description +
        ' ' +
        productData.features +
        ' ' +
        productData.title
    )
    const weight = extractWeightFromContent(
      productData.description + ' ' + productData.features
    )
    const dimensions = extractDimensionsFromContent(
      productData.description + ' ' + productData.features
    )
    const size = extractSizeFromContent(
      productData.description + ' ' + productData.features
    )

    console.log('🧠 Content Analysis:', {
      color,
      material,
      gender,
      weight,
      dimensions,
      size,
    })

    // Build all required attributes dynamically
    const dynamicAttributes: any = {}
    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

    // Process each required attribute
    requiredAttributes.forEach((attributeName) => {
      try {
        const attributeValue = generateAttributeValue(
          attributeName,
          productData,
          options,
          sku,
          {
            color,
            material,
            gender,
            weight,
            dimensions,
            size,
            marketplaceId,
          }
        )

        if (attributeValue !== null) {
          dynamicAttributes[attributeName] = attributeValue
        }
      } catch (error) {
        console.error(`❌ Error generating attribute ${attributeName}:`, error)
        // Continue with other attributes
      }
    })

    // Add images
    Object.assign(dynamicAttributes, imageAttributes)

    console.log(
      '✅ Generated',
      Object.keys(dynamicAttributes).length,
      'dynamic attributes for',
      productType
    )
    console.log(
      '🎯 Sample attributes:',
      Object.keys(dynamicAttributes).slice(0, 10)
    )

    return dynamicAttributes
  } catch (error) {
    console.error('❌ Error in dynamic attribute generation:', error)
    // Fallback to enhanced static attributes
    return getEnhancedFallbackAttributes(
      productType,
      productData,
      options,
      sku,
      imageAttributes
    )
  }
}

// Smart attribute value generator based on Amazon's requirements
function generateAttributeValue(
  attributeName: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  context: any
): any {
  const { color, material, gender, weight, dimensions, size, marketplaceId } =
    context

  // Core required attributes
  switch (attributeName) {
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

    case 'condition_type':
      return [{ value: 'new_new' }]

    case 'list_price':
      return [
        {
          value: parseFloat(options.price) || 49.99,
          currency_code: 'USD',
          marketplace_id: marketplaceId,
        },
      ]

    case 'fulfillment_availability':
      return [
        {
          fulfillment_channel_code: 'DEFAULT',
          quantity: parseInt(options.quantity) || 10,
        },
      ]

    // Product identity attributes
    case 'externally_assigned_product_identifier':
      return [
        {
          product_identity: 'UPC',
          value: '123456789012',
          marketplace_id: marketplaceId,
        },
      ]

    case 'merchant_suggested_asin':
      return [{ value: 'B000000000', marketplace_id: marketplaceId }]

    case 'supplier_declared_has_product_identifier_exemption':
      return [{ value: 'false', marketplace_id: marketplaceId }]

    case 'item_type_keyword':
      return [
        {
          value: getItemTypeKeyword(productData),
          marketplace_id: marketplaceId,
        },
      ]

    case 'model_number':
    case 'part_number':
      return [{ value: `LISTORA-${sku}`, marketplace_id: marketplaceId }]

    case 'model_name':
      return [
        {
          value: productData.title?.split(' ').slice(0, 3).join(' ') || 'Model',
          marketplace_id: marketplaceId,
        },
      ]

    case 'skip_offer':
      return [{ value: 'false', marketplace_id: marketplaceId }]

    // Content attributes
    case 'product_description':
      return [
        {
          value: productData.description || 'Quality product',
          marketplace_id: marketplaceId,
        },
      ]

    case 'bullet_point':
      const features = (productData.features || '')
        .split('\n')
        .filter((f) => f.trim())
      return features.length > 0
        ? features.slice(0, 5).map((feature) => ({
            value: feature.trim(),
            marketplace_id: marketplaceId,
          }))
        : [{ value: 'High quality product', marketplace_id: marketplaceId }]

    // Physical attributes
    case 'color':
      return [{ value: color, marketplace_id: marketplaceId }]

    case 'material':
    case 'material_type':
      return [{ value: material, marketplace_id: marketplaceId }]

    case 'target_gender':
      return [{ value: gender, marketplace_id: marketplaceId }]

    case 'department':
      return [
        {
          value:
            gender === 'male'
              ? 'mens'
              : gender === 'female'
                ? 'womens'
                : 'unisex',
          marketplace_id: marketplaceId,
        },
      ]

    case 'age_range_description':
      return [{ value: 'Adult', marketplace_id: marketplaceId }]

    // Weight and dimensions with proper units
    case 'item_weight':
      return [
        {
          value: weight.value,
          unit: weight.unit,
          marketplace_id: marketplaceId,
        },
      ]

    case 'item_package_dimensions':
      return [
        {
          length: { value: dimensions.length, unit: dimensions.unit },
          width: { value: dimensions.width, unit: dimensions.unit },
          height: { value: dimensions.height, unit: dimensions.unit },
          marketplace_id: marketplaceId,
        },
      ]

    // Location and origin
    case 'country_of_origin':
      return [{ value: 'US', marketplace_id: marketplaceId }]

    // Complex compliance and safety attributes
    case 'parentage_level':
      return [{ value: 'child', marketplace_id: marketplaceId }]

    case 'variation_theme':
      return [
        {
          name: 'Color',
          marketplace_id: marketplaceId,
        },
      ]

    case 'map_policy':
      return [{ value: 'no_restrictions', marketplace_id: marketplaceId }]

    case 'merchant_shipping_group':
      return [{ value: 'default', marketplace_id: marketplaceId }]

    // Battery and hazmat attributes (complex structures)
    case 'hazmat':
      return [
        {
          aspect: 'not_hazmat',
          marketplace_id: marketplaceId,
        },
      ]

    case 'num_batteries':
      return [
        {
          type: 'does_not_contain',
          quantity: 0,
          marketplace_id: marketplaceId,
        },
      ]

    case 'batteries_required':
    case 'batteries_included':
    case 'contains_battery_or_cell':
      return [{ value: 'false', marketplace_id: marketplaceId }]

    case 'compliance_media':
      return [
        {
          content_language: 'English',
          source_location: 'not_applicable',
          content_type: 'not_applicable',
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

    case 'california_proposition_65':
      return [
        {
          compliance_type: 'not_applicable',
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

    case 'supplier_declared_dg_hz_regulation':
      return [{ value: 'not_applicable', marketplace_id: marketplaceId }]

    case 'ghs_chemical_h_code':
      return [{ value: 'not_applicable', marketplace_id: marketplaceId }]

    case 'non_lithium_battery_energy_content':
      return [
        {
          value: 0,
          unit: 'watt_hours',
          marketplace_id: marketplaceId,
        },
      ]

    case 'non_lithium_battery_packaging':
      return [{ value: 'not_applicable', marketplace_id: marketplaceId }]

    case 'number_of_lithium_metal_cells':
    case 'number_of_lithium_ion_cells':
      return [{ value: 0, marketplace_id: marketplaceId }]

    case 'max_order_quantity':
      return [{ value: 100, marketplace_id: marketplaceId }]

    case 'series_number':
      return [{ value: '1', marketplace_id: marketplaceId }]

    // Product-specific fallbacks
    default:
      return getProductSpecificFallback(
        attributeName,
        productData,
        sku,
        marketplaceId
      )
  }
}

// Get item type keyword based on product content
function getItemTypeKeyword(productData: ProductData): string {
  const content = (
    productData.title +
    ' ' +
    productData.description
  ).toLowerCase()

  if (content.includes('watch')) return 'watch'
  if (content.includes('shoe')) return 'shoes'
  if (content.includes('shirt') || content.includes('clothing'))
    return 'clothing'
  if (content.includes('electronic') || content.includes('device'))
    return 'electronics'

  return 'product'
}
// NEW: Simple fallback for attribute names only (when schema fetch fails)
function getEnhancedFallbackAttributeNames(productType: string): string[] {
  const fallbacks: { [key: string]: string[] } = {
    WATCH: [
      'item_name',
      'brand',
      'condition_type',
      'list_price',
      'target_gender',
      'calendar_type',
      'item_shape',
      'warranty_type',
      'country_of_origin',
      'department',
      'age_range_description',
      'externally_assigned_product_identifier',
      'part_number',
      'merchant_suggested_asin',
      'supplier_declared_dg_hz_regulation',
      'parentage_level',
      'variation_theme',
      'water_resistance_level',
      'map_policy',
      'merchant_shipping_group',
      'hazmat',
      'num_batteries',
      'compliance_media',
      'regulatory_compliance_certification',
      'california_proposition_65',
      'fcc_radio_frequency_emission_compliance',
      'batteries_required',
      'batteries_included',
      'contains_battery_or_cell',
    ],
    SHOES: [
      'item_name',
      'brand',
      'condition_type',
      'list_price',
      'footwear_size',
      'target_gender',
      'color',
      'sole_material',
      'heel',
      'closure',
      'country_of_origin',
    ],
  }

  return fallbacks[productType] || fallbacks['WATCH']
}
// Enhanced fallback attributes when schema is unavailable
function getEnhancedFallbackAttributes(
  productType: string,
  productData?: ProductData,
  options?: PublishingOptions,
  sku?: string,
  imageAttributes?: any
): any {
  const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  const baseAttributes = {
    condition_type: [{ value: 'new_new' }],
    item_name: [
      { value: productData?.title || 'Product', marketplace_id: marketplaceId },
    ],
    brand: [
      {
        value: productData?.brand || 'Listora AI',
        marketplace_id: marketplaceId,
      },
    ],
    list_price: [
      {
        value: parseFloat(options?.price || '49.99'),
        currency_code: 'USD',
        marketplace_id: marketplaceId,
      },
    ],
    fulfillment_availability: [
      {
        fulfillment_channel_code: 'DEFAULT',
        quantity: parseInt(options?.quantity || '10'),
      },
    ],
    externally_assigned_product_identifier: [
      {
        product_identity: 'UPC',
        value: '123456789012',
        marketplace_id: marketplaceId,
      },
    ],
    parentage_level: [{ value: 'child', marketplace_id: marketplaceId }],
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

// Product-specific attribute fallbacks
function getProductSpecificFallback(
  productType: string | undefined,
  productData: ProductData | undefined,
  sku: string | undefined,
  marketplaceId: string | undefined
): any {
  if (!marketplaceId) marketplaceId = process.env.AMAZON_MARKETPLACE_ID

  switch (productType) {
    case 'WATCH':
      return {
        calendar_type: [{ value: 'analog', marketplace_id: marketplaceId }],
        item_shape: [{ value: 'round', marketplace_id: marketplaceId }],
        target_gender: [{ value: 'unisex', marketplace_id: marketplaceId }],
        warranty_type: [{ value: 'limited', marketplace_id: marketplaceId }],
        water_resistance_level: [
          { value: 'splash_resistant', marketplace_id: marketplaceId },
        ],
      }
    case 'SHOES':
      return {
        footwear_size: [{ value: 'One Size', marketplace_id: marketplaceId }],
        target_gender: [{ value: 'unisex', marketplace_id: marketplaceId }],
        sole_material: [{ value: 'rubber', marketplace_id: marketplaceId }],
        heel: [{ value: 'flat', marketplace_id: marketplaceId }],
        closure: [{ value: 'slip-on', marketplace_id: marketplaceId }],
      }
    default:
      return {
        color: [{ value: 'Multi-Color', marketplace_id: marketplaceId }],
        country_of_origin: [{ value: 'US', marketplace_id: marketplaceId }],
      }
  }
}
