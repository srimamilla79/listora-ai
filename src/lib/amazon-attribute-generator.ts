// Smart Conditional Amazon Attribute Generator
// Uses universal attributes + conditional attributes based on product type

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
  if (content.includes('fryer') || content.includes('air fryer'))
    return 'air fryer'
  if (content.includes('shirt') || content.includes('clothing'))
    return 'clothing'
  if (content.includes('electronic') || content.includes('device'))
    return 'electronics'

  return 'product'
}

// Define product type categories
function getProductTypeCategory(productType: string): string {
  const categories = {
    FASHION: [
      'WATCH',
      'SHOES',
      'CLOTHING',
      'JEWELRY',
      'HANDBAG',
      'BELT',
      'HAT',
    ],
    APPLIANCES: [
      'AIR_FRYER',
      'BLENDER',
      'COFFEE_MAKER',
      'TOASTER',
      'MICROWAVE',
    ],
    ELECTRONICS: ['ELECTRONICS', 'COMPUTER', 'PHONE', 'TABLET', 'HEADPHONES'],
    HOME: ['FURNITURE', 'BEDDING', 'KITCHEN', 'BATHROOM', 'DECOR'],
    BEAUTY: ['BEAUTY', 'SKINCARE', 'MAKEUP', 'FRAGRANCE'],
    SPORTS: ['SPORTS', 'FITNESS', 'OUTDOOR', 'EXERCISE'],
    BOOKS: ['BOOKS', 'EBOOKS', 'AUDIOBOOKS'],
    TOYS: ['TOYS', 'GAMES', 'PUZZLES'],
  }

  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(productType)) {
      return category
    }
  }

  return 'GENERAL'
}

// Get universal attributes that work for ALL product types
function getUniversalAttributes(
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  marketplaceId: string,
  imageAttributes: any
): any {
  return {
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
      (productData.features || '').split('\n').filter((f) => f.trim()).length >
      0
        ? (productData.features || '')
            .split('\n')
            .filter((f) => f.trim())
            .slice(0, 5)
            .map((feature) => ({
              value: feature.trim(),
              marketplace_id: marketplaceId,
            }))
        : [{ value: 'High quality product', marketplace_id: marketplaceId }],

    // Universal compliance
    country_of_origin: [{ value: 'US', marketplace_id: marketplaceId }],
    age_range_description: [{ value: 'Adult', marketplace_id: marketplaceId }],
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
}

// Get conditional attributes based on product type category
function getConditionalAttributes(
  productType: string,
  productData: ProductData,
  marketplaceId: string
): any {
  const category = getProductTypeCategory(productType)
  const conditionalAttributes: any = {}

  console.log('🏷️ Product category:', category, 'for type:', productType)

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

  switch (category) {
    case 'FASHION':
      // Only fashion items need gender/department/color
      conditionalAttributes.target_gender = [
        { value: gender, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.department = [
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
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]

      // Fashion-specific attributes
      if (productType === 'WATCH') {
        conditionalAttributes.calendar_type = [
          { value: 'Analog', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.item_shape = [
          { value: 'Round', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.water_resistance_level = [
          { value: 'not_water_resistant', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.warranty_type = [
          { value: 'Limited', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.watch_movement_type = [
          { value: 'Quartz', marketplace_id: marketplaceId },
        ]
      } else if (productType === 'SHOES') {
        conditionalAttributes.footwear_size = [
          { value: 'One Size', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.sole_material = [
          { value: 'Rubber', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.heel = [
          { value: 'flat', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.closure = [
          { value: 'slip-on', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.outer = [
          { value: 'Synthetic', marketplace_id: marketplaceId },
        ]
      } else if (productType === 'CLOTHING') {
        conditionalAttributes.size = [
          { value: 'One Size', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.material_type = [
          { value: 'Cotton', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.sleeve_type = [
          { value: 'Short Sleeve', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.neck_style = [
          { value: 'Crew Neck', marketplace_id: marketplaceId },
        ]
      }
      break

    case 'APPLIANCES':
      // Appliances need technical specs, no gender/department
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.material = [
        { value: 'Stainless Steel', marketplace_id: marketplaceId },
      ]

      if (productType === 'AIR_FRYER') {
        conditionalAttributes.wattage = [
          { value: '1500', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.voltage = [
          { value: '120', marketplace_id: marketplaceId },
        ]
        conditionalAttributes.capacity = [
          { value: '5 Quarts', marketplace_id: marketplaceId },
        ]
      }
      break

    case 'ELECTRONICS':
      // Electronics need technical specs, no gender/department
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.model_name = [
        { value: 'Generic', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.power_source_type = [
        { value: 'Battery Powered', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.connectivity_technology = [
        { value: 'Wired', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.operating_system = [
        { value: 'Not Applicable', marketplace_id: marketplaceId },
      ]
      break

    case 'BEAUTY':
      // Beauty products need specific attributes
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.scent = [
        { value: 'Unscented', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.skin_type = [
        { value: 'All Skin Types', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.item_form = [
        { value: 'Liquid', marketplace_id: marketplaceId },
      ]
      break

    case 'HOME':
      // Home items need basic attributes
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.material = [
        { value: 'Mixed Materials', marketplace_id: marketplaceId },
      ]
      conditionalAttributes.size = [
        { value: 'One Size', marketplace_id: marketplaceId },
      ]
      break

    default:
      // General products get minimal attributes
      conditionalAttributes.color = [
        { value: color, marketplace_id: marketplaceId },
      ]
      conditionalAttributes.material = [
        { value: 'Mixed Materials', marketplace_id: marketplaceId },
      ]
      break
  }

  return conditionalAttributes
}

// Main function to generate smart conditional attributes
export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log('🔧 Smart Conditional Generator starting for:', productType)

    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'

    // Get universal attributes (work for ALL product types)
    const universalAttributes = getUniversalAttributes(
      productData,
      options,
      sku,
      marketplaceId,
      imageAttributes
    )

    // Get conditional attributes based on product type category
    const conditionalAttributes = getConditionalAttributes(
      productType,
      productData,
      marketplaceId
    )

    // Combine universal + conditional
    const finalAttributes = { ...universalAttributes, ...conditionalAttributes }

    console.log('✅ Generated attributes:', {
      productType,
      category: getProductTypeCategory(productType),
      universal: Object.keys(universalAttributes).length,
      conditional: Object.keys(conditionalAttributes).length,
      total: Object.keys(finalAttributes).length,
    })

    return finalAttributes
  } catch (error) {
    console.error('❌ Error in smart conditional generation:', error)

    // Ultimate fallback - minimal working set
    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'
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
