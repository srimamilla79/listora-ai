// Amazon Template-Based Feed Generator
// Uses Amazon's official template structure for guaranteed compatibility

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

interface TemplateFieldConfig {
  value?: string | number
  source?: string
  fallback?: string
  prefix?: string
  suffix?: string
  analyzer?: string
}

type TemplateMapping = Record<string, TemplateFieldConfig>

// Amazon's official template field mappings
const AMAZON_TEMPLATE_MAPPINGS: Record<string, TemplateMapping> = {
  AIR_FRYER: {
    'Product Type': { value: 'AIR_FRYER' },
    'Brand Name': { source: 'brand', fallback: 'Listora AI' },
    'Product Name': { source: 'title' },
    'Product Description': { source: 'description' },
    Manufacturer: { source: 'manufacturer', fallback: 'brand' },
    'Manufacturer Part Number': { source: 'sku', prefix: 'MPN-' },
    'Item Type Keyword': { value: 'air fryer' },
    model: { source: 'sku', prefix: 'MODEL-' },
    'Model Name': { source: 'title', suffix: ' Pro' },
    'Material Type': { value: 'Stainless Steel' },
    Wattage: { value: '1500' },
    Color: {
      source: 'content_analysis',
      analyzer: 'extractColor',
      fallback: 'Black',
    },
    Capacity: { value: '5 quarts' },
    'List Price': { source: 'price' },
    'Quantity (US, CA, MX)': { source: 'quantity' },
    'Product Exemption Reason': { value: 'Generic product' },
    'Update Delete': { value: '' },
    'Care Instructions': { value: 'Follow manufacturer instructions' },
    'Model Year': { value: new Date().getFullYear().toString() },
    'Age Range Description': { value: 'Adult' },
    'Safety Warning': { value: 'Read all instructions before use' },
    'Warranty Description': { value: '1 Year Limited Warranty' },
    'Package Quantity': { value: '1' },
    'Item Weight': { value: '10' },
    'Item Weight Unit Of Measure': { value: 'pounds' },
    'Item Dimensions': { value: '12 x 12 x 14' },
    'Item Dimensions Unit Of Measure': { value: 'inches' },
    'Special Features': { value: 'Digital Display, Timer, Non-stick Coating' },
    'Recommended Uses For Product': {
      value: 'Frying, Baking, Roasting, Reheating',
    },
    'Included Components': { value: 'Air Fryer, Basket, Manual, Recipe Book' },
    'Number Of Items': { value: '1' },
    'Required Assembly': { value: 'No' },
    'Output Wattage': { value: '1500' },
    Size: { value: 'Medium' },
    'Item Dimensions D x W x H': { value: '12 x 12 x 14 inches' },
    'Bullet Point': {
      source: 'features',
      fallback: 'High quality air fryer with digital controls',
    },
    'Country Of Origin': { value: 'US' },
    'Harmonized System Code': { value: '8516719000' },
    'Main Image URL': { source: 'main_image' },
    'Other Image URL1': { source: 'image_2' },
    'Other Image URL2': { source: 'image_3' },
  },

  WATCH: {
    'Product Type': { value: 'WATCH' },
    'Brand Name': { source: 'brand', fallback: 'Listora AI' },
    'Product Name': { source: 'title' },
    'Product Description': { source: 'description' },
    Manufacturer: { source: 'manufacturer', fallback: 'brand' },
    'Item Type Keyword': { value: 'watch' },
    model: { source: 'sku', prefix: 'WATCH-' },
    'Model Name': { source: 'title', suffix: ' Edition' },
    'Material Type': {
      source: 'content_analysis',
      analyzer: 'extractMaterial',
      fallback: 'Stainless Steel',
    },
    Color: {
      source: 'content_analysis',
      analyzer: 'extractColor',
      fallback: 'Black',
    },
    'Target Gender': {
      source: 'content_analysis',
      analyzer: 'extractGender',
      fallback: 'Unisex',
    },
    Department: {
      source: 'content_analysis',
      analyzer: 'extractDepartment',
      fallback: 'Unisex',
    },
    'Calendar Type': { value: 'Analog' },
    'Water Resistance Level': { value: 'not_water_resistant' },
    'Watch Movement Type': { value: 'Quartz' },
    'Item Shape': { value: 'Round' },
    'Warranty Type': { value: 'Limited' },
    'List Price': { source: 'price' },
    'Quantity (US, CA, MX)': { source: 'quantity' },
  },
}

// Content analysis functions
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
    'grey',
    'silver',
    'gold',
    'navy',
    'maroon',
    'beige',
    'rose gold',
    'space gray',
    'midnight',
    'starlight',
  ]

  const lowerContent = (content || '').toLowerCase()
  const foundColor = colors.find((color) => lowerContent.includes(color))
  return foundColor
    ? foundColor.replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Black'
}

function extractMaterialFromContent(content: string): string {
  const materials = [
    'wood',
    'wooden',
    'metal',
    'steel',
    'stainless steel',
    'plastic',
    'glass',
    'leather',
    'fabric',
    'cotton',
    'polyester',
    'silicon',
    'ceramic',
    'rubber',
    'aluminum',
    'titanium',
  ]

  const lowerContent = (content || '').toLowerCase()
  const foundMaterial = materials.find((material) =>
    lowerContent.includes(material)
  )
  return foundMaterial
    ? foundMaterial.replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Stainless Steel'
}

function extractGenderFromContent(content: string): string {
  const lowerContent = (content || '').toLowerCase()

  if (
    lowerContent.includes('men') ||
    lowerContent.includes('male') ||
    lowerContent.includes('gentleman')
  ) {
    return 'Male'
  }
  if (
    lowerContent.includes('women') ||
    lowerContent.includes('female') ||
    lowerContent.includes('lady')
  ) {
    return 'Female'
  }
  return 'Unisex'
}

function extractDepartmentFromContent(content: string): string {
  const gender = extractGenderFromContent(content)
  return gender === 'Male' ? 'Mens' : gender === 'Female' ? 'Womens' : 'Unisex'
}

const CONTENT_ANALYZERS: Record<string, (content: string) => string> = {
  extractColor: extractColorFromContent,
  extractMaterial: extractMaterialFromContent,
  extractGender: extractGenderFromContent,
  extractDepartment: extractDepartmentFromContent,
}

function generateTemplateBasedAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageUrls: string[] = []
): Record<string, string> {
  const templateMapping = AMAZON_TEMPLATE_MAPPINGS[productType]

  if (!templateMapping) {
    throw new Error(
      `No template mapping found for product type: ${productType}`
    )
  }

  const result: Record<string, string> = {}
  const fullContent =
    `${productData.title} ${productData.description} ${productData.features}`.toLowerCase()

  for (const [amazonField, config] of Object.entries(templateMapping)) {
    let value = ''

    if (config.value !== undefined) {
      value = config.value.toString()
    } else if (config.source) {
      switch (config.source) {
        case 'sku':
          value = sku
          break
        case 'title':
          value = productData.title || 'Product'
          break
        case 'description':
          value = productData.description || 'Quality product'
          break
        case 'brand':
          value = productData.brand || config.fallback || 'Listora AI'
          break
        case 'manufacturer':
          value =
            productData.manufacturer ||
            productData.brand ||
            config.fallback ||
            'Listora AI'
          break
        case 'price':
          value = options.price || '49.99'
          break
        case 'quantity':
          value = options.quantity || '10'
          break
        case 'features':
          value = productData.features || config.fallback || ''
          break
        case 'main_image':
          value = imageUrls[0] || ''
          break
        case 'image_2':
          value = imageUrls[1] || ''
          break
        case 'image_3':
          value = imageUrls[2] || ''
          break
        case 'content_analysis':
          if (config.analyzer && CONTENT_ANALYZERS[config.analyzer]) {
            value = CONTENT_ANALYZERS[config.analyzer](fullContent)
          } else {
            value = config.fallback || ''
          }
          break
        default:
          value = config.fallback || ''
      }

      if (config.prefix) value = config.prefix + value
      if (config.suffix) value = value + config.suffix
    }

    result[amazonField] = value
  }

  return result
}

function convertTemplateToAPIFormat(
  templateAttributes: Record<string, string>,
  marketplaceId: string
): any {
  const apiAttributes: any = {}

  const fieldMapping: Record<string, string> = {
    'Product Name': 'item_name',
    'Brand Name': 'brand',
    'Product Description': 'product_description',
    Manufacturer: 'manufacturer',
    'Material Type': 'material',
    Wattage: 'wattage',
    Color: 'color',
    Capacity: 'capacity',
    'List Price': 'list_price',
    'Quantity (US, CA, MX)': 'fulfillment_availability',
    'Item Type Keyword': 'item_type_keyword',
    model: 'model_number',
    'Model Name': 'model_name',
    'Required Assembly': 'is_assembly_required',
    'Output Wattage': 'output_wattage',
    Size: 'size',
    'Item Dimensions D x W x H': 'item_depth_width_height',
    'Bullet Point': 'bullet_point',
    'Special Features': 'special_feature',
    'Recommended Uses For Product': 'recommended_uses_for_product',
    'Included Components': 'included_components',
    'Number Of Items': 'number_of_items',
    'Target Gender': 'target_gender',
    Department: 'department',
    'Calendar Type': 'calendar_type',
    'Water Resistance Level': 'water_resistance_level',
    'Watch Movement Type': 'watch_movement_type',
    'Item Shape': 'item_shape',
    'Warranty Type': 'warranty_type',
    'Main Image URL': 'main_product_image_locator',
  }

  for (const [templateField, apiField] of Object.entries(fieldMapping)) {
    const value = templateAttributes[templateField]

    if (value && value.trim() !== '') {
      if (apiField === 'list_price') {
        apiAttributes[apiField] = [
          {
            value: parseFloat(value) || 49.99,
            currency_code: 'USD',
            marketplace_id: marketplaceId,
          },
        ]
      } else if (apiField === 'fulfillment_availability') {
        apiAttributes[apiField] = [
          {
            fulfillment_channel_code: 'DEFAULT',
            quantity: parseInt(value) || 10,
          },
        ]
      } else if (apiField === 'main_product_image_locator') {
        if (value && value.startsWith('http')) {
          apiAttributes[apiField] = [
            {
              media_location: value,
              marketplace_id: marketplaceId,
            },
          ]
        }
      } else if (apiField === 'is_assembly_required') {
        apiAttributes[apiField] = [
          {
            value: value.toLowerCase() === 'no' ? false : true,
            marketplace_id: marketplaceId,
          },
        ]
      } else if (apiField === 'bullet_point') {
        const bulletPoints = value
          .split('\n')
          .filter((point: string) => point.trim())
          .slice(0, 5)
        if (bulletPoints.length > 0) {
          apiAttributes[apiField] = bulletPoints.map((point: string) => ({
            value: point.trim(),
            marketplace_id: marketplaceId,
          }))
        }
      } else if (apiField === 'item_depth_width_height') {
        apiAttributes[apiField] = [
          {
            depth: { value: 12, unit: 'inches' },
            width: { value: 12, unit: 'inches' },
            height: { value: 14, unit: 'inches' },
            marketplace_id: marketplaceId,
          },
        ]
      } else if (apiField === 'capacity') {
        // Handle capacity with separate value and unit
        apiAttributes[apiField] = [
          {
            value: 5,
            unit: 'quarts',
            marketplace_id: marketplaceId,
          },
        ]
      } else {
        apiAttributes[apiField] = [
          {
            value: value,
            marketplace_id: marketplaceId,
          },
        ]
      }
    }
  }

  // Add required universal fields
  apiAttributes.condition_type = [{ value: 'new_new' }]
  apiAttributes.country_of_origin = [
    { value: 'US', marketplace_id: marketplaceId },
  ]
  apiAttributes.age_range_description = [
    { value: 'Adult', marketplace_id: marketplaceId },
  ]
  apiAttributes.supplier_declared_dg_hz_regulation = [
    { value: 'not_applicable', marketplace_id: marketplaceId },
  ]
  apiAttributes.parentage_level = [
    { value: 'child', marketplace_id: marketplaceId },
  ]

  // Add child_parent_sku_relationship
  apiAttributes.child_parent_sku_relationship = [
    {
      child_sku: templateAttributes['Seller SKU'] || 'UNKNOWN',
      parent_sku: templateAttributes['Seller SKU'] || 'UNKNOWN',
      relationship_type: 'standalone',
      marketplace_id: marketplaceId,
    },
  ]

  // Add product exemption instead of invalid UPC
  apiAttributes.supplier_declared_has_product_identifier_exemption = [
    {
      value: true,
      marketplace_id: marketplaceId,
    },
  ]

  return apiAttributes
}

export async function generateDynamicAttributes(
  productType: string,
  productData: ProductData,
  options: PublishingOptions,
  sku: string,
  imageAttributes: any = {}
): Promise<any> {
  try {
    console.log('🔧 Template-Based Generator starting for:', productType)

    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER'

    const imageUrls: string[] = []
    if (imageAttributes.main_product_image_locator) {
      const mainImage = imageAttributes.main_product_image_locator[0]
      if (mainImage && mainImage.media_location) {
        imageUrls.push(mainImage.media_location)
      }
    }

    const templateAttributes = generateTemplateBasedAttributes(
      productType,
      productData,
      options,
      sku,
      imageUrls
    )

    const apiAttributes = convertTemplateToAPIFormat(
      templateAttributes,
      marketplaceId
    )

    Object.assign(apiAttributes, imageAttributes)

    console.log(
      '✅ Generated',
      Object.keys(apiAttributes).length,
      'attributes using Amazon template for',
      productType
    )
    console.log(
      "🎯 Template-based generation - using Amazon's official structure"
    )
    console.log(
      '📋 Key template fields:',
      Object.keys(templateAttributes).slice(0, 10).join(', ')
    )

    return apiAttributes
  } catch (error) {
    console.error('❌ Error in template-based generation:', error)

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
      supplier_declared_has_product_identifier_exemption: [
        { value: true, marketplace_id: marketplaceId },
      ],
      ...imageAttributes,
    }
  }
}
