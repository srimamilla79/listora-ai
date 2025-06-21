// Core Attributes Amazon Generator - Universal Success Strategy
// Generates only proven attributes that work for ALL product types

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

// Main function to generate core proven attributes only
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log('🔧 Core Attributes Generator starting for:', productType)

    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID

    // Extract content analysis
    const color = extractColorFromContent(
      productData.description + ' ' + productData.features
    )
    const gender = detectGenderFromContent(
      productData.description +
        ' ' +
        productData.features +
        ' ' +
        productData.title
    )

    console.log('🧠 Content Analysis:', { color, gender })

    // ✅ CORE UNIVERSAL ATTRIBUTES - Proven to work for ALL product types
    const coreAttributes: any = {
      // Essential product info
      condition_type: [{ value: 'new_new' }],
      item_name: [
        {
          value: productData.title || 'Product',
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
          value: productData.manufacturer || productData.brand || 'Listora AI',
          marketplace_id: marketplaceId,
        },
      ],

      // Pricing and availability
      list_price: [
        {
          value: parseFloat(options.price) || 49.99,
          currency_code: 'USD',
          marketplace_id: marketplaceId,
        },
      ],
      fulfillment_availability: [
        {
          fulfillment_channel_code: 'DEFAULT',
          quantity: parseInt(options.quantity) || 10,
        },
      ],

      // Product identity
      externally_assigned_product_identifier: [
        {
          product_identity: 'UPC',
          value: '123456789012',
          marketplace_id: marketplaceId,
        },
      ],
      merchant_suggested_asin: [
        {
          value: 'B000000000',
          marketplace_id: marketplaceId,
        },
      ],
      item_type_keyword: [
        {
          value: getItemTypeKeyword(productData),
          marketplace_id: marketplaceId,
        },
      ],
      part_number: [
        {
          value: `LISTORA-${sku}`,
          marketplace_id: marketplaceId,
        },
      ],

      // Content
      product_description: [
        {
          value: productData.description || 'Quality product',
          marketplace_id: marketplaceId,
        },
      ],
      bullet_point:
        (productData.features || '').split('\n').filter((f) => f.trim())
          .length > 0
          ? (productData.features || '')
              .split('\n')
              .filter((f) => f.trim())
              .slice(0, 5)
              .map((feature) => ({
                value: feature.trim(),
                marketplace_id: marketplaceId,
              }))
          : [{ value: 'High quality product', marketplace_id: marketplaceId }],

      // Universal attributes
      color: [{ value: color, marketplace_id: marketplaceId }],
      target_gender: [{ value: gender, marketplace_id: marketplaceId }],
      country_of_origin: [{ value: 'US', marketplace_id: marketplaceId }],
      age_range_description: [
        { value: 'Adult', marketplace_id: marketplaceId },
      ],
      department: [
        {
          value:
            gender === 'male'
              ? 'mens'
              : gender === 'female'
                ? 'womens'
                : 'unisex',
          marketplace_id: marketplaceId,
        },
      ],

      // Compliance (safe defaults)
      supplier_declared_dg_hz_regulation: [
        { value: 'not_applicable', marketplace_id: marketplaceId },
      ],
      parentage_level: [{ value: 'child', marketplace_id: marketplaceId }],
      child_parent_sku_relationship: [
        {
          child_sku: sku,
          parent_sku: sku,
          relationship_type: 'standalone',
          marketplace_id: marketplaceId,
        },
      ],

      // Images
      ...imageAttributes,
    }

    // ✅ ADD PRODUCT-SPECIFIC ATTRIBUTES (Only proven ones)
    const productSpecificAttributes = getProductSpecificAttributes(
      productType,
      marketplaceId
    )

    // Combine core + product-specific
    const finalAttributes = { ...coreAttributes, ...productSpecificAttributes }

    console.log(
      '✅ Generated',
      Object.keys(finalAttributes).length,
      'core attributes for',
      productType
    )
    console.log('🎯 Attribute breakdown:', {
      core: Object.keys(coreAttributes).length,
      productSpecific: Object.keys(productSpecificAttributes).length,
      total: Object.keys(finalAttributes).length,
    })

    return finalAttributes
  } catch (error) {
    console.error('❌ Error in core attribute generation:', error)

    // Ultimate fallback - minimal working set
    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID
    return {
      condition_type: [{ value: 'new_new' }],
      item_name: [
        {
          value: productData.title || 'Product',
          marketplace_id: marketplaceId,
        },
      ],
      brand: [
        {
          value: productData.brand || 'Listora AI',
          marketplace_id: marketplaceId,
        },
      ],
      list_price: [
        {
          value: parseFloat(options.price) || 49.99,
          currency_code: 'USD',
          marketplace_id: marketplaceId,
        },
      ],
      fulfillment_availability: [
        {
          fulfillment_channel_code: 'DEFAULT',
          quantity: parseInt(options.quantity) || 10,
        },
      ],
      ...imageAttributes,
    }
  }
}

// Product-specific attributes with PROVEN values only
function getProductSpecificAttributes(
  productType: string,
  marketplaceId: string | undefined
): any {
  // Safety check for marketplaceId
  const safeMarketplaceId =
    marketplaceId || process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'

  switch (productType) {
    case 'WATCH':
      return {
        calendar_type: [{ value: 'Analog', marketplace_id: safeMarketplaceId }],
        item_shape: [{ value: 'Round', marketplace_id: marketplaceId }],
        water_resistance_level: [
          { value: 'not_water_resistant', marketplace_id: marketplaceId },
        ],
        warranty_type: [{ value: 'Limited', marketplace_id: marketplaceId }],
        watch_movement_type: [
          { value: 'Quartz', marketplace_id: marketplaceId },
        ],
      }

    case 'SHOES':
      return {
        footwear_size: [{ value: 'One Size', marketplace_id: marketplaceId }],
        sole_material: [{ value: 'Rubber', marketplace_id: marketplaceId }],
        heel: [{ value: 'flat', marketplace_id: marketplaceId }],
        closure: [{ value: 'slip-on', marketplace_id: marketplaceId }],
        outer: [{ value: 'Synthetic', marketplace_id: marketplaceId }],
      }

    case 'CLOTHING':
      return {
        size: [{ value: 'One Size', marketplace_id: marketplaceId }],
        material_type: [{ value: 'Cotton', marketplace_id: marketplaceId }],
        sleeve_type: [{ value: 'Short Sleeve', marketplace_id: marketplaceId }],
        neck_style: [{ value: 'Crew Neck', marketplace_id: marketplaceId }],
      }

    case 'ELECTRONICS':
      return {
        model_name: [{ value: 'Generic', marketplace_id: marketplaceId }],
        power_source_type: [
          { value: 'Battery Powered', marketplace_id: marketplaceId },
        ],
        connectivity_technology: [
          { value: 'Wired', marketplace_id: marketplaceId },
        ],
        operating_system: [
          { value: 'Not Applicable', marketplace_id: marketplaceId },
        ],
      }

    case 'AIR_FRYER':
      return {
        wattage: [{ value: '1500', marketplace_id: marketplaceId }],
        voltage: [{ value: '120', marketplace_id: marketplaceId }],
        capacity: [{ value: '5 Quarts', marketplace_id: marketplaceId }],
        material: [{ value: 'Stainless Steel', marketplace_id: marketplaceId }],
      }

    case 'BEAUTY':
      return {
        scent: [{ value: 'Unscented', marketplace_id: marketplaceId }],
        skin_type: [{ value: 'All Skin Types', marketplace_id: marketplaceId }],
        item_form: [{ value: 'Liquid', marketplace_id: marketplaceId }],
      }

    default:
      // For unknown product types, return minimal safe attributes
      return {
        material: [{ value: 'Mixed Materials', marketplace_id: marketplaceId }],
        size: [{ value: 'One Size', marketplace_id: marketplaceId }],
      }
  }
}
