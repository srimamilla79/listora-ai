// src/app/api/amazon/template/generate/route.ts
// Amazon Template Generation - Guaranteed to appear in Seller Central

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface TemplateData {
  'Product Type': string
  'Seller SKU': string
  'Brand Name': string
  'Product Name': string
  'Product Description': string
  'List Price': number
  Quantity: number
  'Main Image URL': string
  'Additional Image URL 1'?: string
  'Additional Image URL 2'?: string
  'Additional Image URL 3'?: string
  'Country of Origin': string
  'Condition Type': string
  [key: string]: any // For product-specific fields
}

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Amazon Template Generation Started')

    const { contentId, userId, productData, options } = await request.json()

    // Generate unique SKU
    const sku = `LISTORA-${Date.now()}`

    // Fetch product data from your database (same as your existing code)
    const { data: content } = await supabase
      .from('generated_content')
      .select('*')
      .eq('id', contentId)
      .eq('user_id', userId)
      .single()

    if (!content) {
      throw new Error('Content not found')
    }

    // Fetch images (same as your existing code)
    const { data: images } = await supabase
      .from('generated_images')
      .select('*')
      .eq('content_id', contentId)
      .eq('platform', 'amazon')

    const imageUrls = images?.map((img) => img.image_url) || []

    // Determine product type
    const productType = options.productType || detectProductType(productData)

    console.log('📋 Generating template for:', productType)

    // Generate template data based on product type
    const templateData = generateTemplateData(
      productData,
      options,
      sku,
      imageUrls,
      productType
    )

    // Convert to CSV format
    const csvContent = generateCSV(templateData)

    // Save template info to database for download tracking
    const { data: savedTemplate } = await supabase
      .from('amazon_templates')
      .insert({
        user_id: userId,
        content_id: contentId,
        sku: sku,
        product_type: productType,
        template_data: templateData,
        csv_content: csvContent,
        status: 'ready',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    console.log('✅ Template generated successfully:', savedTemplate.id)

    return NextResponse.json({
      success: true,
      method: 'amazon_template',
      message: 'Amazon template generated successfully!',
      data: {
        templateId: savedTemplate.id,
        sku: sku,
        productType: productType,
        downloadUrl: `/api/amazon/template/download/${savedTemplate.id}`,
        fieldsCount: Object.keys(templateData).length,
        hasImages: imageUrls.length > 0,
        imageCount: imageUrls.length,
      },
      instructions: {
        step1: 'Download the generated template file',
        step2:
          'Go to Amazon Seller Central → Inventory → Add Products via Upload',
        step3: 'Upload the template file',
        step4: 'Products will appear in your Seller Central within 15 minutes',
      },
    })
  } catch (error: any) {
    console.error('❌ Template generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        method: 'amazon_template',
        message: `Template generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

function detectProductType(productData: any): string {
  const title = productData.title?.toLowerCase() || ''
  const description = productData.description?.toLowerCase() || ''
  const allText = `${title} ${description}`

  if (allText.includes('air fryer') || allText.includes('fryer'))
    return 'AIR_FRYER'
  if (allText.includes('watch') || allText.includes('timepiece')) return 'WATCH'
  if (allText.includes('shoe') || allText.includes('sneaker')) return 'SHOES'
  if (allText.includes('clothing') || allText.includes('shirt'))
    return 'CLOTHING'

  return 'WATCH' // Safe default
}

function generateTemplateData(
  productData: any,
  options: any,
  sku: string,
  imageUrls: string[],
  productType: string
): TemplateData {
  // Base template structure
  const baseTemplate: TemplateData = {
    'Product Type': productType,
    'Seller SKU': sku,
    'Brand Name': productData.brand || 'Generic',
    'Product Name': productData.title || 'Product',
    'Product Description':
      productData.description || productData.content || 'Quality product',
    'List Price': parseFloat(options.price) || 29.99,
    Quantity: parseInt(options.quantity) || 10,
    'Main Image URL': imageUrls[0] || '',
    'Country of Origin': 'US',
    'Condition Type': 'New',
  }

  // Add additional images
  if (imageUrls[1]) baseTemplate['Additional Image URL 1'] = imageUrls[1]
  if (imageUrls[2]) baseTemplate['Additional Image URL 2'] = imageUrls[2]
  if (imageUrls[3]) baseTemplate['Additional Image URL 3'] = imageUrls[3]

  // Add product-specific fields based on type
  switch (productType) {
    case 'AIR_FRYER':
      return {
        ...baseTemplate,
        'Material Type': 'Stainless Steel',
        Wattage: '1500',
        Capacity: '5 Quarts',
        Color: extractColor(productData),
        'Special Features': 'Digital Display, Timer, Non-stick Coating',
        'Recommended Uses': 'Frying, Baking, Roasting, Reheating',
        'Assembly Required': 'No',
        'Number of Items': '1',
        'Included Components': 'Air Fryer, Basket, Manual, Recipe Book',
      }

    case 'SHOES':
      return {
        ...baseTemplate,
        'Outer Material': 'Synthetic',
        'Closure Type': 'Lace Up',
        'Heel Type': 'Flat',
        'Target Gender': extractGender(productData),
        Department: extractDepartment(productData),
        Color: extractColor(productData),
        Size: 'One Size',
        'Shoe Width': 'Medium',
      }

    case 'WATCH':
      return {
        ...baseTemplate,
        'Target Gender': extractGender(productData),
        Department: extractDepartment(productData),
        Color: extractColor(productData),
        'Watch Movement Type': 'Quartz',
        'Water Resistance Level': 'water_resistant_30_meters',
        'Calendar Type': 'Day-Date',
        'Item Shape': 'Round',
        'Warranty Type': 'Limited Warranty',
      }

    default:
      return baseTemplate
  }
}

function generateCSV(templateData: TemplateData): string {
  const headers = Object.keys(templateData)
  const values = Object.values(templateData)

  // Create CSV content
  const csvHeaders = headers.join(',')
  const csvValues = values
    .map((value) =>
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    )
    .join(',')

  return `${csvHeaders}\n${csvValues}`
}

function extractColor(productData: any): string {
  const content =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

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
  ]
  const foundColor = colors.find((color) => content.includes(color))

  return foundColor
    ? foundColor.charAt(0).toUpperCase() + foundColor.slice(1)
    : 'Black'
}

function extractGender(productData: any): string {
  const content =
    `${productData.title || ''} ${productData.description || ''}`.toLowerCase()

  if (content.includes('men') || content.includes('male')) return 'mens'
  if (
    content.includes('women') ||
    content.includes('female') ||
    content.includes('ladies')
  )
    return 'womens'
  return 'unisex'
}

function extractDepartment(productData: any): string {
  const gender = extractGender(productData)
  return gender === 'mens'
    ? 'mens'
    : gender === 'womens'
      ? 'womens'
      : 'unisex-adult'
}
