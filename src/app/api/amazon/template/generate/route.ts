// src/app/api/amazon/template/generate/route.ts
// Fixed Amazon Template Generation - Content Validation Fix

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Amazon Template Generation Started')

    const body = await request.json()
    const { contentId, userId, productData, options, images } = body

    console.log('🔍 Request data:', {
      contentId,
      userId,
      hasProductData: !!productData,
      optionsPrice: options?.price,
    })

    // Validate required fields
    if (!userId) {
      console.error('❌ Missing userId')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!productData) {
      console.error('❌ Missing productData')
      return NextResponse.json(
        { error: 'Product data is required' },
        { status: 400 }
      )
    }

    if (!productData.product_name && !productData.title) {
      console.error('❌ Missing product title')
      return NextResponse.json(
        { error: 'Product title is required' },
        { status: 400 }
      )
    }

    if (!options?.price) {
      console.error('❌ Missing price')
      return NextResponse.json({ error: 'Price is required' }, { status: 400 })
    }

    // ✅ Use productData directly instead of querying database
    console.log('✅ Using provided product data:', {
      title: productData.product_name || productData.title,
      hasContent: !!(productData.content || productData.description),
      hasFeatures: !!productData.features,
    })

    // Generate Amazon template data
    const templateData = generateAmazonTemplate(productData, options, images)

    console.log('📊 Template data generated:', {
      title: templateData.title,
      price: templateData.price,
      sku: templateData.sku,
    })

    // Convert to CSV format
    const csvData = convertToCSV(templateData)

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `amazon-template-${timestamp}.csv`

    // Create download URL (for now, we'll return the CSV data directly)
    const downloadUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`

    // Save template to database (optional - for tracking)
    try {
      const { data: savedTemplate, error: saveError } = await supabase
        .from('amazon_templates')
        .insert({
          user_id: userId,
          content_id: contentId || `template-${Date.now()}`,
          template_data: templateData,
          csv_data: csvData,
          filename: filename,
          status: 'generated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (saveError) {
        console.warn('⚠️ Failed to save template to database:', saveError)
        // Don't fail the request, template generation still works
      } else {
        console.log('✅ Template saved to database:', savedTemplate.id)
      }
    } catch (dbError) {
      console.warn('⚠️ Database save error:', dbError)
      // Continue without database save
    }

    const response = {
      success: true,
      method: 'amazon_template',
      data: {
        templateId: `template-${Date.now()}`,
        downloadUrl: downloadUrl,
        filename: filename,
        sku: templateData.sku,
        title: templateData.title,
        price: templateData.price,
      },
      message: 'Amazon template generated successfully',
    }

    console.log('✅ Template generation completed:', response.data.templateId)

    return NextResponse.json(response)
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

// Generate Amazon template data structure
function generateAmazonTemplate(
  productData: any,
  options: any,
  images: string[] = []
) {
  const title = productData.product_name || productData.title || 'Product Title'
  const description =
    productData.content || productData.description || 'Product description'
  const features = productData.features || ''
  const brand = extractBrand(productData)

  return {
    // Required Amazon fields
    title: truncateTitle(title, 200), // Amazon title limit
    description: formatAmazonDescription(description, features),
    brand: brand,
    manufacturer: brand,

    // Pricing and inventory
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    condition: options.condition || 'new',

    // Product classification
    product_type: options.productType || detectAmazonCategory(productData),
    department: detectDepartment(productData),

    // Images
    main_image_url: images[0] || '',
    other_image_url1: images[1] || '',
    other_image_url2: images[2] || '',
    other_image_url3: images[3] || '',
    other_image_url4: images[4] || '',

    // Additional fields
    keywords: generateKeywords(productData),
    bullet_point1: extractBulletPoints(features)[0] || '',
    bullet_point2: extractBulletPoints(features)[1] || '',
    bullet_point3: extractBulletPoints(features)[2] || '',
    bullet_point4: extractBulletPoints(features)[3] || '',
    bullet_point5: extractBulletPoints(features)[4] || '',
  }
}

// Convert template data to CSV format
function convertToCSV(templateData: any): string {
  const headers = [
    'sku',
    'product-id',
    'product-id-type',
    'item-name',
    'item-description',
    'price',
    'quantity',
    'product-type',
    'brand-name',
    'manufacturer',
    'item-condition',
    'main-image-url',
    'other-image-url1',
    'other-image-url2',
    'other-image-url3',
    'other-image-url4',
    'keywords',
    'bullet-point1',
    'bullet-point2',
    'bullet-point3',
    'bullet-point4',
    'bullet-point5',
  ]

  const row = [
    templateData.sku,
    '', // product-id (empty for new products)
    '', // product-id-type
    `"${templateData.title.replace(/"/g, '""')}"`, // Escape quotes
    `"${templateData.description.replace(/"/g, '""')}"`,
    templateData.price,
    templateData.quantity,
    templateData.product_type,
    templateData.brand,
    templateData.manufacturer,
    templateData.condition,
    templateData.main_image_url,
    templateData.other_image_url1,
    templateData.other_image_url2,
    templateData.other_image_url3,
    templateData.other_image_url4,
    `"${templateData.keywords.replace(/"/g, '""')}"`,
    `"${templateData.bullet_point1.replace(/"/g, '""')}"`,
    `"${templateData.bullet_point2.replace(/"/g, '""')}"`,
    `"${templateData.bullet_point3.replace(/"/g, '""')}"`,
    `"${templateData.bullet_point4.replace(/"/g, '""')}"`,
    `"${templateData.bullet_point5.replace(/"/g, '""')}"`,
  ]

  return headers.join(',') + '\n' + row.join(',')
}

// Helper functions
function extractBrand(productData: any): string {
  const content =
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`.toLowerCase()

  // Common brand extraction patterns
  if (content.includes('nike')) return 'Nike'
  if (content.includes('apple')) return 'Apple'
  if (content.includes('samsung')) return 'Samsung'
  if (content.includes('sony')) return 'Sony'

  // Try to extract from title (first word if it looks like a brand)
  const words = (productData.product_name || productData.title || '').split(' ')
  if (words[0] && words[0].length > 2 && /^[A-Z]/.test(words[0])) {
    return words[0]
  }

  return 'Generic'
}

function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength - 3) + '...'
}

function formatAmazonDescription(
  description: string,
  features: string
): string {
  let formatted = description

  if (features) {
    formatted += '\n\nKey Features:\n' + features
  }

  return formatted.substring(0, 2000) // Amazon description limit
}

function detectAmazonCategory(productData: any): string {
  const content =
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`.toLowerCase()

  if (
    content.includes('electronics') ||
    content.includes('phone') ||
    content.includes('computer')
  ) {
    return 'Electronics'
  }
  if (
    content.includes('clothing') ||
    content.includes('shirt') ||
    content.includes('dress')
  ) {
    return 'Clothing'
  }
  if (content.includes('book')) {
    return 'Books'
  }
  if (content.includes('home') || content.includes('kitchen')) {
    return 'Home & Kitchen'
  }

  return 'Miscellaneous'
}

function detectDepartment(productData: any): string {
  const content =
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`.toLowerCase()

  if (content.includes('men') || content.includes('male')) return 'mens'
  if (
    content.includes('women') ||
    content.includes('female') ||
    content.includes('ladies')
  )
    return 'womens'
  if (
    content.includes('kids') ||
    content.includes('children') ||
    content.includes('child')
  )
    return 'kids'
  if (content.includes('baby') || content.includes('infant')) return 'baby'

  return 'unisex'
}

function generateKeywords(productData: any): string {
  const content = `${productData.product_name || productData.title || ''} ${productData.features || ''} ${productData.content || productData.description || ''}`
  const words = content.toLowerCase().split(/\s+/)

  // Extract meaningful keywords
  const keywords = words
    .filter((word) => word.length > 3 && word.length < 20)
    .filter(
      (word) =>
        ![
          'the',
          'and',
          'for',
          'with',
          'this',
          'that',
          'will',
          'can',
          'your',
        ].includes(word)
    )
    .slice(0, 10)

  return keywords.join(', ')
}

function extractBulletPoints(features: string): string[] {
  if (!features) return ['', '', '', '', '']

  // Split by common separators
  const points = features
    .split(/[•\-\n]/)
    .map((point) => point.trim())
    .filter((point) => point.length > 0)

  // Ensure we have 5 bullet points
  const bullets = ['', '', '', '', '']
  for (let i = 0; i < Math.min(points.length, 5); i++) {
    bullets[i] = points[i].substring(0, 255) // Amazon bullet point limit
  }

  return bullets
}

function generateSKU(title: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = title
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `AMZ-${prefix}-${timestamp}`
}
