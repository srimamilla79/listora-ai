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

    console.log('✅ Using provided product data:', {
      title: productData.product_name || productData.title,
      hasContent: !!(productData.content || productData.description),
      hasFeatures: !!productData.features,
    })

    // Generate optimized product data
    const amazonData = generateAmazonData(productData, options, images)

    console.log('📊 Template data generated:', {
      title: amazonData.title,
      price: amazonData.price,
      sku: amazonData.sku,
    })

    // Generate CSV content with proper Amazon format
    const csvContent = generateAmazonCSV(amazonData)

    // Generate filename
    const timestamp = Date.now()
    const filename = `amazon-template-${timestamp}.csv`

    // Store file in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('amazon-templates')
      .upload(`${userId}/${filename}`, csvContent, {
        contentType: 'text/csv',
        upsert: true,
      })

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError)
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('amazon-templates')
      .getPublicUrl(`${userId}/${filename}`)

    if (!urlData.publicUrl) {
      throw new Error('Failed to generate public URL')
    }

    // Save metadata to database
    const { data: savedTemplate, error: saveError } = await supabase
      .from('amazon_templates')
      .insert({
        user_id: userId, // Your table expects UUID
        content_id: contentId || `template-${timestamp}`,
        template_data: amazonData,
        csv_content: csvContent, // Use existing csv_content column
        sku: amazonData.sku, // Use existing sku column
        product_type: amazonData.category, // Use existing product_type column
        status: 'generated',
      })
      .select()
      .single()

    if (saveError) {
      console.warn('⚠️ Failed to save template metadata:', saveError)
    }

    const response = {
      success: true,
      method: 'amazon_template',
      data: {
        templateId: `template-${timestamp}`,
        downloadUrl: urlData.publicUrl, // ✅ REAL URL, not data URL
        filename: filename,
        sku: amazonData.sku,
        title: amazonData.title,
        price: amazonData.price,
        category: amazonData.category,
        // Also include CSV content as fallback
        csvContent: csvContent,
      },
      message: 'Amazon template generated successfully',
    }

    console.log('✅ Template generation completed:', response.data.templateId)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Amazon template generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        method: 'amazon_template',
        message: `Amazon template generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}

// 🎯 GENERATE AMAZON CSV FORMAT
function generateAmazonCSV(amazonData: any): string {
  // Create CSV with proper Amazon inventory format
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
    amazonData.sku,
    '', // product-id (empty for new products)
    '', // product-id-type
    amazonData.title,
    amazonData.description,
    amazonData.price,
    amazonData.quantity,
    amazonData.category,
    amazonData.brand,
    amazonData.manufacturer,
    'New',
    amazonData.main_image_url,
    amazonData.other_image_url1,
    amazonData.other_image_url2,
    amazonData.other_image_url3,
    amazonData.other_image_url4,
    amazonData.keywords,
    amazonData.bullet_point1,
    amazonData.bullet_point2,
    amazonData.bullet_point3,
    amazonData.bullet_point4,
    amazonData.bullet_point5,
  ]

  // Escape CSV fields properly
  const escapedRow = row.map((field) => {
    const str = String(field || '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  })

  return [headers.join(','), escapedRow.join(',')].join('\n')
}

// 🎯 GENERATE CLEAN AMAZON DATA
function generateAmazonData(
  productData: any,
  options: any,
  images: string[] = []
) {
  const title = productData.product_name || productData.title || 'Product Title'
  const description =
    productData.content || productData.description || 'Product description'
  const features = productData.features || ''

  return {
    // Core product info
    title: cleanAndEnhanceTitle(title),
    description: formatAmazonDescription(description, features),
    brand: extractBrand(productData),
    manufacturer: extractBrand(productData),
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    category: detectSimpleCategory(productData),

    // Images
    main_image_url: images[0] || '',
    other_image_url1: images[1] || '',
    other_image_url2: images[2] || '',
    other_image_url3: images[3] || '',
    other_image_url4: images[4] || '',

    // Marketing
    keywords: generateCleanKeywords(productData),
    bullet_point1: generateBulletPoint(features, 0),
    bullet_point2: generateBulletPoint(features, 1),
    bullet_point3: generateBulletPoint(features, 2),
    bullet_point4: generateBulletPoint(features, 3),
    bullet_point5: generateBulletPoint(features, 4),
  }
}

// 🛠️ HELPER FUNCTIONS

function cleanAndEnhanceTitle(title: string): string {
  // Clean the title and make it Amazon compliant
  let cleaned = title
    .replace(/[^\w\s\-&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove duplicate words to meet Amazon requirements
  const words = cleaned.split(' ')
  const uniqueWords = []
  const seen = new Set()

  for (const word of words) {
    const lower = word.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      uniqueWords.push(word)
    }
  }

  let result = uniqueWords.join(' ')

  // Enhance if too simple
  if (result.length < 20) {
    result = `Premium ${result} - High Quality Design`
  }

  // Truncate if too long (Amazon limit: 200 chars)
  if (result.length > 200) {
    result = result.substring(0, 197) + '...'
  }

  return result
}

function formatAmazonDescription(
  description: string,
  features: string
): string {
  let text = description || features || ''

  // Remove all formatting artifacts
  text = text
    .replace(/PRODUCT TITLE\/HEADLINE:\s*/gi, '')
    .replace(/KEY SELLING POINTS:\s*/gi, '')
    .replace(/DETAILED PRODUCT DESCRIPTION:\s*/gi, '')
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/<[^>]*>/g, '') // Remove HTML
    .replace(/\d+\.\s*/g, '') // Remove numbered lists
    .replace(/[^\w\s\-.,!?]/g, ' ') // Keep only basic punctuation
    .replace(/\s+/g, ' ')
    .trim()

  // Extract clean sentences
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 3) // Take first 3 sentences

  let result = sentences.join('. ')
  if (result && !result.endsWith('.')) {
    result += '.'
  }

  // Amazon description limit
  if (result.length > 500) {
    result = result.substring(0, 497) + '...'
  }

  return result || 'High-quality product with excellent features and design.'
}

function detectSimpleCategory(productData: any): string {
  const content =
    `${productData.product_name || ''} ${productData.description || ''}`.toLowerCase()

  // Use safe, general categories to avoid Amazon validation issues
  if (content.includes('watch') || content.includes('jewelry')) return 'Jewelry'
  if (content.includes('shoe') || content.includes('clothing'))
    return 'Clothing'
  if (content.includes('book')) return 'Books'
  if (content.includes('electronic') || content.includes('phone'))
    return 'Electronics'
  if (content.includes('kitchen') || content.includes('home')) return 'Home'
  if (content.includes('health') || content.includes('beauty')) return 'Health'
  if (content.includes('sport')) return 'Sports'
  if (content.includes('toy')) return 'Toys'

  return 'Home' // Safe default category
}

function extractBrand(productData: any): string {
  const content = `${productData.product_name || ''} ${productData.description || ''}`

  // Look for common brand patterns
  const brandMatch = content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)
  if (brandMatch) {
    const brand = brandMatch[1]
    if (
      !['The', 'And', 'For', 'With', 'Premium', 'High', 'Quality'].includes(
        brand
      )
    ) {
      return brand
    }
  }

  return 'Generic'
}

function generateCleanKeywords(productData: any): string {
  const content = `${productData.product_name || ''} ${productData.description || ''}`

  const keywords = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && word.length < 15)
    .filter(
      (word) => !['the', 'and', 'for', 'with', 'this', 'that'].includes(word)
    )
    .slice(0, 5)

  return [...new Set(keywords)].join(', ')
}

function generateBulletPoint(features: string, index: number): string {
  const defaults = [
    'Premium quality construction and materials',
    'Excellent performance and reliability',
    'Great value for money and satisfaction',
    'Fast shipping and customer support',
    'Perfect for everyday use and occasions',
  ]

  if (!features) return defaults[index] || ''

  const sentences = features
    .replace(/[^\w\s\-.,!?]/g, ' ')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  return sentences[index] || defaults[index] || ''
}

function generateSKU(title: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = title
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `AMZ-${prefix}-${timestamp}`
}
