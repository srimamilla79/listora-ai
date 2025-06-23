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
    title: cleanAndTruncateTitle(title, 200), // Amazon title limit with cleaning
    description: formatAmazonDescription(description, features),
    brand: brand,
    manufacturer: brand,

    // Pricing and inventory
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    condition: mapCondition(options.condition || 'new'),

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
    keywords: generateCleanKeywords(productData),
    bullet_point1: extractCleanBulletPoints(features)[0] || '',
    bullet_point2: extractCleanBulletPoints(features)[1] || '',
    bullet_point3: extractCleanBulletPoints(features)[2] || '',
    bullet_point4: extractCleanBulletPoints(features)[3] || '',
    bullet_point5: extractCleanBulletPoints(features)[4] || '',
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
    cleanText(templateData.sku),
    '', // product-id (empty for new products)
    '', // product-id-type
    escapeCSVField(templateData.title),
    escapeCSVField(templateData.description),
    templateData.price,
    templateData.quantity,
    cleanText(templateData.product_type),
    cleanText(templateData.brand),
    cleanText(templateData.manufacturer),
    cleanText(templateData.condition),
    cleanText(templateData.main_image_url),
    cleanText(templateData.other_image_url1),
    cleanText(templateData.other_image_url2),
    cleanText(templateData.other_image_url3),
    cleanText(templateData.other_image_url4),
    escapeCSVField(templateData.keywords),
    escapeCSVField(templateData.bullet_point1),
    escapeCSVField(templateData.bullet_point2),
    escapeCSVField(templateData.bullet_point3),
    escapeCSVField(templateData.bullet_point4),
    escapeCSVField(templateData.bullet_point5),
  ]

  return headers.join(',') + '\n' + row.join(',')
}

// ✅ NEW: Clean text function to fix encoding issues
function cleanText(text: string): string {
  if (!text) return ''

  return (
    text
      // Fix common UTF-8 encoding issues
      .replace(/â€™/g, "'") // Smart apostrophe
      .replace(/â€œ/g, '"') // Smart quote open
      .replace(/â€\x9D/g, '"') // Smart quote close
      .replace(/â€"/g, '—') // Em dash
      .replace(/â€\x93/g, '–') // En dash
      .replace(/Â/g, '') // Non-breaking space artifacts
      // Fix other common issues
      .replace(/'/g, "'") // Curly apostrophe
      .replace(/"/g, '"') // Curly quote left
      .replace(/"/g, '"') // Curly quote right
      .replace(/—/g, '-') // Em dash to regular dash
      .replace(/–/g, '-') // En dash to regular dash
      // Remove or fix problematic characters
      .replace(/[^\x00-\x7F]/g, (char) => {
        // Replace non-ASCII characters with ASCII equivalents
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
  )
}

// ✅ NEW: Escape CSV fields properly
function escapeCSVField(text: string): string {
  if (!text) return ''

  const cleaned = cleanText(text)

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (
    cleaned.includes(',') ||
    cleaned.includes('"') ||
    cleaned.includes('\n')
  ) {
    return `"${cleaned.replace(/"/g, '""')}"`
  }

  return cleaned
}

// ✅ NEW: Clean and truncate title
function cleanAndTruncateTitle(title: string, maxLength: number): string {
  const cleaned = cleanText(title)

  // Remove markdown/formatting
  const withoutFormatting = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
    .replace(/#{1,6}\s/g, '') // Remove # headers
    .replace(/^\d+\.\s*/g, '') // Remove numbered lists
    .replace(/^-\s*/g, '') // Remove bullet points
    .trim()

  if (withoutFormatting.length <= maxLength) return withoutFormatting
  return withoutFormatting.substring(0, maxLength - 3) + '...'
}

// ✅ UPDATED: Format Amazon description with length limit
function formatAmazonDescription(
  description: string,
  features: string
): string {
  let cleaned = cleanText(description)

  // Remove markdown/HTML formatting
  cleaned = cleaned
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic*
    .replace(/#{1,6}\s/g, '') // Remove # headers
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/^\d+\.\s*/gm, '') // Remove numbered lists
    .replace(/^-\s*/gm, '') // Remove bullet points
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .trim()

  // If too long, truncate to Amazon's CSV limit (500 chars for CSV)
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 497) + '...'
  }

  return cleaned
}

// ✅ UPDATED: Detect Amazon category with "shoes" fix
function detectAmazonCategory(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  // ✅ FIX: Detect shoes/footwear
  if (
    content.includes('shoes') ||
    content.includes('sneakers') ||
    content.includes('boots') ||
    content.includes('sandals') ||
    content.includes('footwear')
  ) {
    return 'Shoes'
  }

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

  return 'Sports & Outdoors' // ✅ Changed from "Miscellaneous"
}

// ✅ NEW: Map condition to Amazon accepted values
function mapCondition(condition: string): string {
  const conditionMap: { [key: string]: string } = {
    new: 'New',
    used_like_new: 'UsedLikeNew',
    used_very_good: 'UsedVeryGood',
    used_good: 'UsedGood',
    used_acceptable: 'UsedAcceptable',
    refurbished: 'Refurbished',
  }

  return conditionMap[condition] || 'New'
}

// ✅ UPDATED: Generate clean keywords
function generateCleanKeywords(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.features || ''} ${productData.content || productData.description || ''}`
  )

  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
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
        ].includes(word)
    )

  // Remove duplicates and take first 8 keywords
  const uniqueKeywords = [...new Set(words)].slice(0, 8)

  return uniqueKeywords.join(', ')
}

// ✅ UPDATED: Extract clean bullet points
function extractCleanBulletPoints(features: string): string[] {
  if (!features) return ['', '', '', '', '']

  const cleaned = cleanText(features)

  // Split by common separators and clean
  const points = cleaned
    .split(/[•\-\n]/)
    .map((point) => point.trim())
    .map((point) => point.replace(/^\d+\.\s*/, '')) // Remove numbering
    .map((point) => point.replace(/^\*+\s*/, '')) // Remove asterisks
    .filter((point) => point.length > 10) // Only meaningful points
    .slice(0, 5) // Max 5 points

  // Ensure we have 5 bullet points, pad with empty strings
  const bullets = ['', '', '', '', '']
  for (let i = 0; i < points.length; i++) {
    bullets[i] = points[i].substring(0, 250) // Amazon bullet point limit
  }

  return bullets
}

// Helper functions (unchanged)
function extractBrand(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  // Common brand extraction patterns
  if (content.includes('nike')) return 'Nike'
  if (content.includes('apple')) return 'Apple'
  if (content.includes('samsung')) return 'Samsung'
  if (content.includes('sony')) return 'Sony'
  if (content.includes('adidas')) return 'Adidas'

  // Try to extract from title (first word if it looks like a brand)
  const words = (productData.product_name || productData.title || '').split(' ')
  if (words[0] && words[0].length > 2 && /^[A-Z]/.test(words[0])) {
    return cleanText(words[0])
  }

  return 'Generic'
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
