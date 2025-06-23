import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Amazon Simple Template Generation Started')

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

    console.log('✅ Using provided product data:', {
      title: productData.product_name || productData.title,
      hasContent: !!(productData.content || productData.description),
      hasFeatures: !!productData.features,
    })

    // Generate simple template data
    const templateData = generateSimpleTemplate(productData, options, images)

    console.log('📊 Template data generated:', {
      title: templateData.title,
      price: templateData.price,
      sku: templateData.sku,
    })

    // Convert to simple CSV format (Amazon's most basic accepted format)
    const csvData = convertToSimpleCSV(templateData)

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `amazon-listing-template-${timestamp}.txt`

    // Create download URL
    const downloadUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(csvData)}`

    // Save template to database
    try {
      const { data: savedTemplate, error: saveError } = await supabase
        .from('amazon_templates')
        .insert({
          user_id: userId,
          content_id: contentId || `template-${Date.now()}`,
          template_data: templateData,
          filename: filename,
          status: 'generated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (saveError) {
        console.warn('⚠️ Failed to save template to database:', saveError)
      } else {
        console.log('✅ Template saved to database:', savedTemplate.id)
      }
    } catch (dbError) {
      console.warn('⚠️ Database save error:', dbError)
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
      message: 'Amazon listing template generated successfully',
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

// 🎯 SIMPLE TEMPLATE GENERATOR (Basic Amazon format)
function generateSimpleTemplate(
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
    // Basic required fields only
    title: cleanAndTruncateTitle(title, 200),
    description: formatAmazonDescription(description, features),
    brand: brand,
    manufacturer: brand,
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    condition: 'New',

    // Images
    main_image_url: images[0] || '',
    other_image_url1: images[1] || '',
    other_image_url2: images[2] || '',
    other_image_url3: images[3] || '',
    other_image_url4: images[4] || '',

    // Marketing
    keywords: generateCleanKeywords(productData),
    bullet_point1: extractCleanBulletPoints(features)[0] || '',
    bullet_point2: extractCleanBulletPoints(features)[1] || '',
    bullet_point3: extractCleanBulletPoints(features)[2] || '',
    bullet_point4: extractCleanBulletPoints(features)[3] || '',
    bullet_point5: extractCleanBulletPoints(features)[4] || '',

    // Product classification
    product_type: detectSimpleProductType(productData),
    department: detectDepartment(productData),
  }
}

// 🎯 SIMPLE CSV GENERATOR (Amazon's basic format)
function convertToSimpleCSV(templateData: any): string {
  // ✅ MINIMAL HEADERS THAT AMAZON ACCEPTS
  // These are the most basic fields Amazon will accept for new products
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
    cleanText(templateData.sku), // sku
    '', // product-id (empty for new)
    '', // product-id-type (empty for new)
    escapeField(templateData.title), // item-name
    escapeField(templateData.description), // item-description
    templateData.price, // price
    templateData.quantity, // quantity
    cleanText(templateData.product_type), // product-type
    cleanText(templateData.brand), // brand-name
    cleanText(templateData.manufacturer), // manufacturer
    cleanText(templateData.condition), // item-condition
    cleanText(templateData.main_image_url), // main-image-url
    cleanText(templateData.other_image_url1), // other-image-url1
    cleanText(templateData.other_image_url2), // other-image-url2
    cleanText(templateData.other_image_url3), // other-image-url3
    cleanText(templateData.other_image_url4), // other-image-url4
    escapeField(templateData.keywords), // keywords
    escapeField(templateData.bullet_point1), // bullet-point1
    escapeField(templateData.bullet_point2), // bullet-point2
    escapeField(templateData.bullet_point3), // bullet-point3
    escapeField(templateData.bullet_point4), // bullet-point4
    escapeField(templateData.bullet_point5), // bullet-point5
  ]

  // ✅ USE TAB-SEPARATED FORMAT (.txt file)
  return (
    headers.join('\t') +
    '\n' +
    row.map((field) => String(field || '')).join('\t')
  )
}

// 🎯 SIMPLE PRODUCT TYPE DETECTION
function detectSimpleProductType(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  // Use very basic categories to avoid complex validation
  if (content.includes('book')) return 'Books'
  if (content.includes('watch') || content.includes('jewelry')) return 'Jewelry'
  if (
    content.includes('shoe') ||
    content.includes('clothing') ||
    content.includes('shirt')
  )
    return 'Clothing'
  if (content.includes('kitchen') || content.includes('home')) return 'Home'
  if (content.includes('phone') || content.includes('electronic'))
    return 'Electronics'
  if (content.includes('health') || content.includes('beauty')) return 'Health'
  if (content.includes('sport') || content.includes('outdoor')) return 'Sports'
  if (content.includes('toy') || content.includes('game')) return 'Toys'
  if (content.includes('auto') || content.includes('car')) return 'Automotive'
  if (content.includes('pet')) return 'Pet'
  if (content.includes('office')) return 'Office'

  // Default to the safest general category
  return 'Home'
}

// 🎯 CORE HELPER FUNCTIONS (cleaned up)
function cleanText(text: string): string {
  if (!text) return ''

  return text
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9D/g, '"')
    .replace(/â€"/g, '-')
    .replace(/â€\x93/g, '-')
    .replace(/Â/g, '')
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/[^\x00-\x7F]/g, (char) => {
      const replacements: { [key: string]: string } = {
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        á: 'a',
        à: 'a',
        â: 'a',
        ä: 'a',
        í: 'i',
        ì: 'i',
        î: 'i',
        ï: 'i',
        ó: 'o',
        ò: 'o',
        ô: 'o',
        ö: 'o',
        ú: 'u',
        ù: 'u',
        û: 'u',
        ü: 'u',
        ñ: 'n',
        ç: 'c',
      }
      return replacements[char] || ''
    })
    .trim()
}

function escapeField(text: string): string {
  if (!text) return ''

  const cleaned = cleanText(text)

  // For tab-separated, escape tabs and quotes
  if (
    cleaned.includes('\t') ||
    cleaned.includes('"') ||
    cleaned.includes('\n')
  ) {
    return `"${cleaned.replace(/"/g, '""')}"`
  }

  return cleaned
}

function cleanAndTruncateTitle(title: string, maxLength: number): string {
  const cleaned = cleanText(title)

  let withoutFormatting = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/^\d+\.\s*/g, '')
    .replace(/^-\s*/g, '')
    .trim()

  // Enhance short titles
  if (withoutFormatting.length < 20) {
    withoutFormatting = `Premium ${withoutFormatting} - High Quality Product`
  }

  // Remove duplicate words (Amazon requirement)
  const titleWords = withoutFormatting.split(' ')
  const seenWords = new Set()
  const uniqueWords = []

  for (const word of titleWords) {
    const lowerWord = word.toLowerCase()
    if (!seenWords.has(lowerWord)) {
      seenWords.add(lowerWord)
      uniqueWords.push(word)
    }
  }

  const finalTitle = uniqueWords.join(' ')

  if (finalTitle.length <= maxLength) return finalTitle
  return finalTitle.substring(0, maxLength - 3) + '...'
}

function formatAmazonDescription(
  description: string,
  features: string
): string {
  let cleaned = cleanText(description)

  // Aggressive cleaning
  cleaned = cleaned
    .replace(/PRODUCT TITLE\/HEADLINE:\s*/gi, '')
    .replace(/KEY SELLING POINTS:\s*/gi, '')
    .replace(/DETAILED PRODUCT DESCRIPTION:\s*/gi, '')
    .replace(/^\d+\.\s*/gm, '')
    .replace(/\s+\d+\.\s+/g, '. ')
    .replace(/\b\d+\.\s+/g, '. ')
    .replace(/^-\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\|\s*/g, '. ')
    .replace(/&\s*/g, '. ')
    .trim()

  // Extract clean sentences
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .filter((s) => !s.match(/^\d+/))
    .filter((s) => !s.toLowerCase().includes('headline'))
    .filter((s) => !s.toLowerCase().includes('selling'))
    .filter((s) => !s.toLowerCase().includes('key'))
    .slice(0, 2)

  let result = sentences.join('. ').trim()
  if (result && !result.endsWith('.')) {
    result += '.'
  }

  // Amazon description limit
  if (result.length > 250) {
    result = result.substring(0, 247) + '...'
  }

  return (
    result ||
    'High-quality product with excellent features and reliable performance.'
  )
}

function generateCleanKeywords(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.features || ''} ${productData.content || productData.description || ''}`
  )

  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && word.length < 20)
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
          'are',
          'has',
          'have',
          'been',
          'was',
          'were',
          'product',
          'title',
          'headline',
          'description',
          'features',
          'key',
          'selling',
          'points',
          'premium',
          'quality',
          'design',
          'luxury',
          'high',
          'excellent',
        ].includes(word)
    )

  const uniqueKeywords = [...new Set(words)].slice(0, 5)

  return uniqueKeywords.join(', ')
}

function extractCleanBulletPoints(features: string): string[] {
  if (!features)
    return [
      'High-quality construction and materials',
      'Excellent performance and reliability',
      'Great value for money',
      'Customer satisfaction guaranteed',
      'Fast shipping available',
    ]

  const cleaned = cleanText(features)

  const sentences = cleaned
    .replace(/PRODUCT TITLE\/HEADLINE:\s*/gi, '')
    .replace(/KEY SELLING POINTS:\s*/gi, '')
    .replace(/\d+\.\s*/g, '')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
    .filter((s) => !s.toLowerCase().includes('headline'))
    .slice(0, 5)

  const defaults = [
    'High-quality construction and materials',
    'Excellent performance and reliability',
    'Great value for money',
    'Customer satisfaction guaranteed',
    'Fast shipping available',
  ]

  const bullets = ['', '', '', '', '']
  for (let i = 0; i < 5; i++) {
    bullets[i] = sentences[i] || defaults[i] || ''
    if (bullets[i].length > 250) {
      bullets[i] = bullets[i].substring(0, 247) + '...'
    }
  }

  return bullets
}

function extractBrand(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  )

  const lowerContent = content.toLowerCase()
  const brandKeywords = [
    'uwood',
    'nike',
    'apple',
    'samsung',
    'sony',
    'adidas',
    'rolex',
    'casio',
    'seiko',
  ]

  for (const brand of brandKeywords) {
    if (lowerContent.includes(brand)) {
      return brand.charAt(0).toUpperCase() + brand.slice(1)
    }
  }

  // Extract from title
  const title = productData.product_name || productData.title || ''
  const words = title.split(' ')
  for (const word of words) {
    if (
      word.length > 2 &&
      /^[A-Z]/.test(word) &&
      ![
        'The',
        'For',
        'With',
        'And',
        'Men',
        'Women',
        'Kids',
        'Ladies',
        'Mens',
        'Premium',
        'High',
        'Quality',
      ].includes(word)
    ) {
      return cleanText(word)
    }
  }

  return 'Premium'
}

function detectDepartment(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

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

function generateSKU(title: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = cleanText(title)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `AMZ-${prefix}-${timestamp}`
}
