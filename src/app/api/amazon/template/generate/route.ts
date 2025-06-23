import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Amazon Universal Template Generation Started')

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

    // ✅ Use productData directly
    console.log('✅ Using provided product data:', {
      title: productData.product_name || productData.title,
      hasContent: !!(productData.content || productData.description),
      hasFeatures: !!productData.features,
    })

    // 🎯 DETECT PRODUCT CATEGORY AUTOMATICALLY
    const detectedCategory = detectProductCategory(productData)
    console.log('🔍 Detected category:', detectedCategory)

    // Generate template data based on detected category
    const templateData = generateUniversalTemplate(
      productData,
      options,
      images,
      detectedCategory
    )

    console.log('📊 Template data generated:', {
      title: templateData.title,
      price: templateData.price,
      sku: templateData.sku,
      category: templateData.category,
    })

    // Convert to appropriate CSV format
    const csvData = convertToUniversalCSV(templateData, detectedCategory)

    // Generate filename based on category
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `amazon-${detectedCategory.toLowerCase()}-template-${timestamp}.csv`

    // Create download URL
    const downloadUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`

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
        category: detectedCategory,
      },
      message: `Amazon ${detectedCategory} template generated successfully`,
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

// 🎯 SMART CATEGORY DETECTION
function detectProductCategory(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  // Electronics
  if (
    content.match(
      /\b(phone|laptop|computer|tablet|headphone|speaker|camera|tv|monitor|electronics|gadget|device|smartphone|smartwatch|bluetooth|wifi|usb|hdmi)\b/
    )
  ) {
    return 'Electronics'
  }

  // Clothing, Shoes & Jewelry
  if (
    content.match(
      /\b(watch|jewelry|necklace|ring|earring|bracelet|shoe|boot|sneaker|shirt|dress|pants|jacket|hat|clothing|apparel|fashion)\b/
    )
  ) {
    return 'Clothing'
  }

  // Home & Kitchen
  if (
    content.match(
      /\b(kitchen|cookware|pot|pan|knife|plate|cup|mug|furniture|chair|table|bed|lamp|home|decor|cleaning|storage)\b/
    )
  ) {
    return 'Home'
  }

  // Health & Personal Care
  if (
    content.match(
      /\b(vitamin|supplement|skincare|lotion|shampoo|soap|toothbrush|health|beauty|cosmetic|makeup|perfume)\b/
    )
  ) {
    return 'Health'
  }

  // Sports & Outdoors
  if (
    content.match(
      /\b(sport|fitness|gym|exercise|outdoor|camping|hiking|bike|ball|equipment|athletic|workout)\b/
    )
  ) {
    return 'Sports'
  }

  // Toys & Games
  if (
    content.match(
      /\b(toy|game|puzzle|doll|action figure|board game|card game|kids|children|play)\b/
    )
  ) {
    return 'Toys'
  }

  // Books
  if (
    content.match(
      /\b(book|novel|guide|manual|textbook|ebook|author|publisher|isbn|pages)\b/
    )
  ) {
    return 'Books'
  }

  // Automotive
  if (
    content.match(
      /\b(car|auto|vehicle|tire|motor|engine|brake|automotive|truck|motorcycle)\b/
    )
  ) {
    return 'Automotive'
  }

  // Pet Supplies
  if (
    content.match(
      /\b(pet|dog|cat|bird|fish|animal|collar|leash|food|treat|toy|cage)\b/
    )
  ) {
    return 'Pet'
  }

  // Office Products
  if (
    content.match(
      /\b(office|pen|paper|notebook|printer|desk|chair|stapler|folder|business)\b/
    )
  ) {
    return 'Office'
  }

  // Default to General (safest option)
  return 'General'
}

// 🎯 UNIVERSAL TEMPLATE GENERATOR
function generateUniversalTemplate(
  productData: any,
  options: any,
  images: string[] = [],
  category: string
) {
  const title = productData.product_name || productData.title || 'Product Title'
  const description =
    productData.content || productData.description || 'Product description'
  const features = productData.features || ''
  const brand = extractBrand(productData)

  const baseTemplate = {
    // Core fields (all categories)
    title: cleanAndTruncateTitle(title, 200),
    description: formatAmazonDescription(description, features),
    brand: brand,
    manufacturer: brand,
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    condition: 'New',
    category: category,

    // Images (all categories)
    main_image_url: images[0] || '',
    other_image_url1: images[1] || '',
    other_image_url2: images[2] || '',
    other_image_url3: images[3] || '',
    other_image_url4: images[4] || '',

    // Marketing (all categories)
    keywords: generateCleanKeywords(productData),
    bullet_point1: extractCleanBulletPoints(features)[0] || '',
    bullet_point2: extractCleanBulletPoints(features)[1] || '',
    bullet_point3: extractCleanBulletPoints(features)[2] || '',
    bullet_point4: extractCleanBulletPoints(features)[3] || '',
    bullet_point5: extractCleanBulletPoints(features)[4] || '',
  }

  // Add category-specific fields
  return addCategorySpecificFields(baseTemplate, productData, category)
}

// 🎯 ADD CATEGORY-SPECIFIC FIELDS
function addCategorySpecificFields(
  template: any,
  productData: any,
  category: string
): any {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  switch (category) {
    case 'Clothing':
      return {
        ...template,
        item_type: detectItemType(content),
        department: detectDepartment(productData),
        target_gender: detectTargetGender(productData),
        material_type: detectMaterialType(productData),
        color_name: detectColor(content),
        size_name: detectSize(content),
      }

    case 'Electronics':
      return {
        ...template,
        item_type: 'Electronics',
        product_type: 'Electronics',
        model_name: extractModel(content),
        color_name: detectColor(content),
        connectivity: detectConnectivity(content),
      }

    case 'Home':
      return {
        ...template,
        item_type: 'Home',
        product_type: 'Home & Kitchen',
        material_type: detectMaterialType(productData),
        color_name: detectColor(content),
        room_type: detectRoomType(content),
      }

    case 'Health':
      return {
        ...template,
        item_type: 'Health',
        product_type: 'Health & Personal Care',
        scent_name: detectScent(content),
        size_name: detectSize(content),
        age_range: detectAgeRange(content),
      }

    case 'Sports':
      return {
        ...template,
        item_type: 'Sports',
        product_type: 'Sports & Outdoors',
        sport_type: detectSportType(content),
        target_gender: detectTargetGender(productData),
        color_name: detectColor(content),
      }

    case 'Toys':
      return {
        ...template,
        item_type: 'Toy',
        product_type: 'Toys & Games',
        age_range: detectAgeRange(content),
        target_gender: detectTargetGender(productData),
        material_type: detectMaterialType(productData),
      }

    case 'Books':
      return {
        ...template,
        item_type: 'Book',
        product_type: 'Books',
        author: extractAuthor(content),
        binding: 'Paperback',
        language: 'English',
      }

    default: // General
      return {
        ...template,
        item_type: 'General',
        product_type: 'General',
        material_type: detectMaterialType(productData),
        color_name: detectColor(content),
      }
  }
}

// 🎯 UNIVERSAL CSV GENERATOR
function convertToUniversalCSV(templateData: any, category: string): string {
  // Universal headers that work for most categories
  const baseHeaders = [
    'sku',
    'product-id',
    'product-id-type',
    'item-name',
    'external-product-id',
    'external-product-id-type',
    'brand-name',
    'product-description',
    'item-type',
    'product-type',
    'item-condition',
    'standard-price',
    'quantity',
    'main-image-url',
    'other-image-url1',
    'other-image-url2',
    'other-image-url3',
    'other-image-url4',
    'search-terms',
    'bullet-point1',
    'bullet-point2',
    'bullet-point3',
    'bullet-point4',
    'bullet-point5',
    'manufacturer',
    'part-number',
    'model-name',
    'model-number',
    'color-name',
    'size-name',
    'material-type',
    'department-name',
    'target-gender',
    'special-features',
    'item-weight',
    'item-dimensions-length',
    'item-dimensions-width',
    'item-dimensions-height',
    'package-weight',
    'warranty-description',
    'fulfillment-center-id',
    'max-order-quantity',
    'sale-price',
    'sale-from-date',
    'sale-end-date',
  ]

  // Add category-specific headers
  const headers = [...baseHeaders, ...getCategorySpecificHeaders(category)]

  // Base row data
  const baseRow = [
    cleanText(templateData.sku), // sku
    '', // product-id
    '', // product-id-type
    escapeCSVField(templateData.title), // item-name
    '', // external-product-id
    '', // external-product-id-type
    cleanText(templateData.brand), // brand-name
    escapeCSVField(templateData.description), // product-description
    cleanText(templateData.item_type || 'General'), // item-type
    cleanText(templateData.product_type || 'General'), // product-type
    cleanText(templateData.condition), // item-condition
    templateData.price, // standard-price
    templateData.quantity, // quantity
    cleanText(templateData.main_image_url), // main-image-url
    cleanText(templateData.other_image_url1), // other-image-url1
    cleanText(templateData.other_image_url2), // other-image-url2
    cleanText(templateData.other_image_url3), // other-image-url3
    cleanText(templateData.other_image_url4), // other-image-url4
    escapeCSVField(templateData.keywords), // search-terms
    escapeCSVField(templateData.bullet_point1), // bullet-point1
    escapeCSVField(templateData.bullet_point2), // bullet-point2
    escapeCSVField(templateData.bullet_point3), // bullet-point3
    escapeCSVField(templateData.bullet_point4), // bullet-point4
    escapeCSVField(templateData.bullet_point5), // bullet-point5
    cleanText(templateData.manufacturer), // manufacturer
    '', // part-number
    cleanText(templateData.model_name || ''), // model-name
    '', // model-number
    cleanText(templateData.color_name || ''), // color-name
    cleanText(templateData.size_name || ''), // size-name
    cleanText(templateData.material_type || ''), // material-type
    cleanText(templateData.department || ''), // department-name
    cleanText(templateData.target_gender || ''), // target-gender
    cleanText(templateData.special_features || ''), // special-features
    '', // item-weight
    '', // item-dimensions-length
    '', // item-dimensions-width
    '', // item-dimensions-height
    '', // package-weight
    '', // warranty-description
    '', // fulfillment-center-id
    '', // max-order-quantity
    '', // sale-price
    '', // sale-from-date
    '', // sale-end-date
  ]

  // Add category-specific data
  const row = [...baseRow, ...getCategorySpecificData(templateData, category)]

  // Use tab-separated format
  return (
    headers.join('\t') +
    '\n' +
    row.map((field) => String(field || '')).join('\t')
  )
}

// 🎯 CATEGORY-SPECIFIC HEADERS
function getCategorySpecificHeaders(category: string): string[] {
  switch (category) {
    case 'Clothing':
      return [
        'watch-movement-type',
        'band-material-type',
        'occasion-lifestyle',
        'pattern-name',
      ]
    case 'Electronics':
      return [
        'connectivity',
        'display-size',
        'battery-type',
        'operating-system',
      ]
    case 'Home':
      return ['room-type', 'assembly-required', 'care-instructions', 'style']
    case 'Health':
      return ['scent-name', 'age-range-description', 'volume', 'ingredients']
    case 'Sports':
      return ['sport-type', 'activity-type', 'skill-level', 'season']
    case 'Toys':
      return [
        'age-range-description',
        'educational-objective',
        'assembly-required',
        'battery-required',
      ]
    case 'Books':
      return ['author', 'binding', 'language', 'publication-date']
    default:
      return []
  }
}

// 🎯 CATEGORY-SPECIFIC DATA
function getCategorySpecificData(
  templateData: any,
  category: string
): string[] {
  switch (category) {
    case 'Clothing':
      return [
        templateData.watch_movement_type || '',
        templateData.band_material_type || templateData.material_type || '',
        templateData.occasion_lifestyle || 'Casual',
        '',
      ]
    case 'Electronics':
      return [templateData.connectivity || '', '', '', '']
    case 'Home':
      return [templateData.room_type || '', '', '', '']
    case 'Health':
      return [
        templateData.scent_name || '',
        templateData.age_range || '',
        '',
        '',
      ]
    case 'Sports':
      return [templateData.sport_type || '', '', '', '']
    case 'Toys':
      return [templateData.age_range || '', '', '', '']
    case 'Books':
      return [templateData.author || '', 'Paperback', 'English', '']
    default:
      return []
  }
}

// 🎯 DETECTION HELPER FUNCTIONS
function detectItemType(content: string): string {
  if (content.includes('watch')) return 'Watch'
  if (content.includes('shoe') || content.includes('boot')) return 'Shoes'
  if (content.includes('shirt') || content.includes('top')) return 'Shirts'
  if (content.includes('pants') || content.includes('jeans')) return 'Pants'
  if (content.includes('dress')) return 'Dresses'
  if (content.includes('jewelry') || content.includes('necklace'))
    return 'Jewelry'
  return 'Apparel'
}

function detectTargetGender(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  if (content.match(/\b(ladies|women|female|her|womens)\b/)) return 'womens'
  if (content.match(/\b(men|male|him|mens|gentleman)\b/)) return 'mens'
  if (content.match(/\b(kids|children|child|boys|girls)\b/)) return 'kids'
  return 'unisex'
}

function detectMaterialType(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  if (content.includes('wood') || content.includes('wooden')) return 'Wood'
  if (
    content.includes('metal') ||
    content.includes('steel') ||
    content.includes('aluminum')
  )
    return 'Metal'
  if (content.includes('plastic')) return 'Plastic'
  if (content.includes('leather')) return 'Leather'
  if (content.includes('cotton')) return 'Cotton'
  if (content.includes('polyester')) return 'Polyester'
  if (content.includes('glass')) return 'Glass'
  if (content.includes('ceramic')) return 'Ceramic'
  return 'Other'
}

function detectColor(content: string): string {
  const colors = [
    'black',
    'white',
    'red',
    'blue',
    'green',
    'yellow',
    'purple',
    'pink',
    'orange',
    'brown',
    'gray',
    'silver',
    'gold',
    'navy',
    'natural',
  ]
  for (const color of colors) {
    if (content.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1)
    }
  }
  return ''
}

function detectSize(content: string): string {
  if (content.match(/\b(small|medium|large|xl|xxl|s|m|l)\b/i)) {
    const match = content.match(/\b(small|medium|large|xl|xxl|s|m|l)\b/i)
    return match ? match[0].toUpperCase() : ''
  }
  if (content.match(/\b\d+(\.\d+)?\s*(oz|ml|lb|kg|inch|cm|ft|mm)\b/i)) {
    const match = content.match(
      /\b\d+(\.\d+)?\s*(oz|ml|lb|kg|inch|cm|ft|mm)\b/i
    )
    return match ? match[0] : ''
  }
  return 'One Size'
}

function detectDepartment(productData: any): string {
  return detectTargetGender(productData)
}

// Additional detection functions
function extractModel(content: string): string {
  const modelMatch = content.match(/model\s+([a-zA-Z0-9\-]+)/i)
  return modelMatch ? modelMatch[1] : ''
}

function detectConnectivity(content: string): string {
  if (content.includes('bluetooth')) return 'Bluetooth'
  if (content.includes('wifi') || content.includes('wireless'))
    return 'Wireless'
  if (content.includes('usb')) return 'USB'
  return ''
}

function detectRoomType(content: string): string {
  const rooms = [
    'kitchen',
    'bedroom',
    'bathroom',
    'living room',
    'dining room',
    'office',
  ]
  for (const room of rooms) {
    if (content.includes(room)) {
      return room.charAt(0).toUpperCase() + room.slice(1)
    }
  }
  return ''
}

function detectScent(content: string): string {
  const scents = [
    'lavender',
    'vanilla',
    'citrus',
    'mint',
    'rose',
    'coconut',
    'unscented',
  ]
  for (const scent of scents) {
    if (content.includes(scent)) {
      return scent.charAt(0).toUpperCase() + scent.slice(1)
    }
  }
  return ''
}

function detectAgeRange(content: string): string {
  if (content.match(/\b(baby|infant|0-12 months)\b/i)) return '0-12 months'
  if (content.match(/\b(toddler|1-3 years)\b/i)) return '1-3 years'
  if (content.match(/\b(kids|children|3-8 years)\b/i)) return '3-8 years'
  if (content.match(/\b(teen|8-13 years)\b/i)) return '8-13 years'
  if (content.match(/\b(adult|18\+)\b/i)) return 'Adult'
  return ''
}

function detectSportType(content: string): string {
  const sports = [
    'football',
    'basketball',
    'tennis',
    'golf',
    'running',
    'cycling',
    'swimming',
    'yoga',
    'fitness',
  ]
  for (const sport of sports) {
    if (content.includes(sport)) {
      return sport.charAt(0).toUpperCase() + sport.slice(1)
    }
  }
  return ''
}

function extractAuthor(content: string): string {
  const authorMatch = content.match(/by\s+([a-zA-Z\s]+)/i)
  return authorMatch ? authorMatch[1].trim() : ''
}

// Core helper functions remain the same
function cleanText(text: string): string {
  if (!text) return ''

  return text
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9D/g, '"')
    .replace(/â€"/g, '—')
    .replace(/â€\x93/g, '–')
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

function escapeCSVField(text: string): string {
  if (!text) return ''

  const cleaned = cleanText(text)

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

  if (withoutFormatting.length < 20) {
    const words = withoutFormatting.toLowerCase().split(' ')

    if (
      words.some((w) => ['watch', 'shoe', 'shirt', 'phone', 'book'].includes(w))
    ) {
      withoutFormatting = `Premium ${withoutFormatting} - High Quality Design`
    } else {
      withoutFormatting = `Premium ${withoutFormatting} - Excellent Quality`
    }
  }

  // Remove duplicate words
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
        ].includes(word)
    )

  const uniqueKeywords = [...new Set(words)].slice(0, 6)

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

  // Look for specific brands
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

  // Try to extract from title
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

function generateSKU(title: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = cleanText(title)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `AMZ-${prefix}-${timestamp}`
}
