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
    console.log('🔍 Request data:', {
      contentId: body.contentId,
      userId: body.userId,
      hasProductData: !!body.productData,
      optionsPrice: body.options?.price,
    })

    // Extract data from request
    const { contentId, userId, productData, options } = body

    if (!productData) {
      throw new Error('Product data is required')
    }

    console.log('✅ Using provided product data:', {
      title: productData.title,
      hasContent: !!productData.content,
      hasFeatures: !!productData.features,
    })

    // Generate template data
    const templateData = generateTemplateData(productData, options)
    console.log('📊 Template data generated:', {
      title: templateData.title,
      price: templateData.price,
      sku: templateData.sku,
    })

    // Generate CSV content with proper formatting
    const csvContent = generateCleanCSV(templateData)

    // Create download URL (simplified)
    const timestamp = Date.now()
    const templateId = `template-${timestamp}`

    // Try to save to database (optional - don't fail if it doesn't work)
    try {
      await supabase.from('amazon_templates').insert({
        id: templateId,
        user_id: userId,
        content_id: contentId,
        sku: templateData.sku,
        template_data: templateData,
        status: 'generated',
        created_at: new Date().toISOString(),
      })
    } catch (dbError: any) {
      console.log('⚠️ Failed to save template to database:', dbError)
      // Continue execution - database save is optional
    }

    console.log('✅ Template generation completed:', templateId)

    return NextResponse.json({
      success: true,
      templateId,
      downloadUrl: `/api/amazon/template/download/${templateId}`,
      csvContent,
      message: 'Amazon template generated successfully!',
    })
  } catch (error: any) {
    console.error('❌ Template generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate template',
      },
      { status: 500 }
    )
  }
}

function generateTemplateData(productData: any, options: any) {
  // Clean and extract product information
  const title = cleanTitle(productData.title || 'Product')
  const description = cleanDescription(
    productData.content || productData.description || ''
  )
  const features = extractFeatures(
    productData.features || productData.content || ''
  )

  // Generate SKU
  const sku = generateSKU(title)

  // Extract brand from content
  const brand = extractBrand(productData.content || '', title)

  // Generate keywords
  const keywords = generateKeywords(title, description)

  // Extract price
  const price = parseFloat(options?.price || '29.99')

  return {
    sku,
    title,
    description,
    price,
    quantity: parseInt(options?.quantity || '1'),
    brand,
    keywords,
    features,
    images: extractImages(productData),
    productType: detectProductType(title, description),
  }
}

function cleanTitle(title: string): string {
  // Remove common formatting issues
  return title
    .replace(/^\d+\.\s*/, '') // Remove "1. " from beginning
    .replace(/PRODUCT TITLE\/HEADLINE:\s*/i, '') // Remove header text
    .replace(/[""'']/g, '"') // Fix quotes
    .replace(/[–—]/g, '-') // Fix dashes
    .trim()
    .substring(0, 200) // Amazon title limit
}

function cleanDescription(content: string): string {
  if (!content)
    return 'High-quality product with excellent features and reliable performance.'

  // Remove formatting headers and markdown
  let cleaned = content
    .replace(/^\d+\.\s*PRODUCT TITLE\/HEADLINE:.*$/gm, '') // Remove title headers
    .replace(/^\d+\.\s*KEY SELLING POINTS:.*$/gm, '') // Remove selling points headers
    .replace(/^\d+\.\s*DETAILED PRODUCT DESCRIPTION:.*$/gm, '') // Remove description headers
    .replace(/^[-*•]\s*/gm, '') // Remove bullet points
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
    .replace(/__(.*?)__/g, '$1') // Remove underline markdown
    .replace(/[""'']/g, '"') // Fix quotes
    .replace(/[–—]/g, '-') // Fix dashes
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .trim()

  // Extract first meaningful sentences
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 10)
  let description = sentences.slice(0, 3).join('. ').trim()

  // Ensure it ends with period
  if (description && !description.endsWith('.')) {
    description += '.'
  }

  // Amazon description limit (400 chars for safety)
  if (description.length > 400) {
    description = description.substring(0, 400).trim()
    // Find last complete word
    const lastSpace = description.lastIndexOf(' ')
    if (lastSpace > 300) {
      description = description.substring(0, lastSpace) + '...'
    }
  }

  return (
    description ||
    'High-quality product with excellent features and reliable performance.'
  )
}

function extractFeatures(content: string): string[] {
  if (!content) return []

  // Look for bullet points or numbered lists
  const bulletPoints = content.match(/[-*•]\s*([^-*•\n]+)/g) || []
  const numberedPoints = content.match(/\d+\.\s*([^\n]+)/g) || []

  let features = [...bulletPoints, ...numberedPoints]
    .map((point) =>
      point
        .replace(/^[-*•]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/[""'']/g, '"')
        .replace(/[–—]/g, '-')
        .trim()
    )
    .filter((point) => point.length > 10 && point.length < 200)
    .slice(0, 5) // Max 5 bullet points

  return features
}

function generateKeywords(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  // Extract meaningful words (3+ characters, not common words)
  const commonWords = [
    'the',
    'and',
    'for',
    'with',
    'you',
    'are',
    'this',
    'that',
    'have',
    'your',
    'can',
    'will',
    'not',
    'but',
    'all',
    'more',
  ]

  const words = text.match(/\b[a-z]{3,}\b/g) || []
  const uniqueWords = [...new Set(words)]
    .filter((word) => !commonWords.includes(word))
    .slice(0, 10)

  return uniqueWords.join(', ')
}

function extractBrand(content: string, title: string): string {
  // Common brand patterns
  const brandPatterns = [
    /\b(Nike|Adidas|Apple|Samsung|Sony|LG|HP|Dell|Microsoft|Google)\b/i,
    /\b([A-Z][a-z]+)\s+(brand|company|inc|corp|ltd)\b/i,
  ]

  const text = `${title} ${content}`

  for (const pattern of brandPatterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1] || match[0]
    }
  }

  // Fallback - extract first capitalized word that's not common
  const words = title.split(' ')
  for (const word of words) {
    if (
      word.length > 2 &&
      /^[A-Z]/.test(word) &&
      !['The', 'For', 'With', 'And'].includes(word)
    ) {
      return word
    }
  }

  return 'Generic'
}

function extractImages(productData: any): string[] {
  const images: string[] = []

  if (productData.images && Array.isArray(productData.images)) {
    images.push(
      ...productData.images.map((img: any) => img.url || img).filter(Boolean)
    )
  }

  if (productData.imageUrl) {
    images.push(productData.imageUrl)
  }

  return images.slice(0, 5) // Max 5 images for Amazon
}

function detectProductType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase()

  if (
    text.includes('shoe') ||
    text.includes('sneaker') ||
    text.includes('boot') ||
    text.includes('footwear')
  ) {
    return 'Shoes'
  }
  if (
    text.includes('shirt') ||
    text.includes('dress') ||
    text.includes('pants') ||
    text.includes('clothing')
  ) {
    return 'Clothing'
  }
  if (
    text.includes('book') ||
    text.includes('novel') ||
    text.includes('guide')
  ) {
    return 'Books'
  }
  if (
    text.includes('electronic') ||
    text.includes('phone') ||
    text.includes('computer') ||
    text.includes('device')
  ) {
    return 'Electronics'
  }

  return 'Sports'
}

function generateSKU(title: string): string {
  const prefix = 'AMZ'
  const titlePart = title
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 6)
    .toUpperCase()
  const randomNum = Math.floor(100000 + Math.random() * 900000)

  return `${prefix}-${titlePart}-${randomNum}`
}

function generateCleanCSV(data: any): string {
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

  // Prepare row data
  const row = [
    data.sku,
    '', // product-id (Amazon will assign)
    '', // product-id-type
    data.title,
    data.description,
    data.price.toString(),
    data.quantity.toString(),
    data.productType,
    data.brand,
    data.brand, // manufacturer same as brand
    'New', // condition
    data.images[0] || '', // main image
    data.images[1] || '', // other images
    data.images[2] || '',
    data.images[3] || '',
    data.images[4] || '',
    data.keywords,
    data.features[0] || '', // bullet points
    data.features[1] || '',
    data.features[2] || '',
    data.features[3] || '',
    data.features[4] || '',
  ]

  // Generate CSV with proper escaping
  const csvRows = [
    headers.join('\t'), // Use tabs for better Excel compatibility
    row
      .map((field) => {
        // Escape fields that contain commas or quotes
        if (
          field.includes(',') ||
          field.includes('"') ||
          field.includes('\n')
        ) {
          return `"${field.replace(/"/g, '""')}"`
        }
        return field
      })
      .join('\t'),
  ]

  return csvRows.join('\n')
}
