import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('📋 Amazon Data Preparation Started')

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

    // Generate cleaned product data for Amazon
    const amazonData = generateAmazonData(productData, options, images)

    console.log('📊 Amazon data prepared:', {
      title: amazonData.title,
      price: amazonData.price,
      sku: amazonData.sku,
    })

    // Generate instructions HTML file
    const instructionsHTML = generateInstructionsHTML(amazonData)

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `amazon-listing-instructions-${timestamp}.html`

    // Create download URL
    const downloadUrl = `data:text/html;charset=utf-8,${encodeURIComponent(instructionsHTML)}`

    // Save data to database
    try {
      const { data: savedTemplate, error: saveError } = await supabase
        .from('amazon_templates')
        .insert({
          user_id: userId,
          content_id: contentId || `template-${Date.now()}`,
          template_data: amazonData,
          filename: filename,
          status: 'generated',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (saveError) {
        console.warn('⚠️ Failed to save data to database:', saveError)
      } else {
        console.log('✅ Data saved to database:', savedTemplate.id)
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
        sku: amazonData.sku,
        title: amazonData.title,
        price: amazonData.price,
        category: amazonData.category,
      },
      message: 'Amazon listing instructions generated successfully',
    }

    console.log(
      '✅ Amazon data preparation completed:',
      response.data.templateId
    )

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Amazon data preparation failed:', error)
    return NextResponse.json(
      {
        success: false,
        method: 'amazon_template',
        message: `Amazon data preparation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
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
  const brand = extractBrand(productData)
  const category = detectProductCategory(productData)

  return {
    // Core product info
    title: cleanAndTruncateTitle(title, 200),
    description: formatAmazonDescription(description, features),
    brand: brand,
    manufacturer: brand,
    price: parseFloat(options.price),
    quantity: parseInt(options.quantity) || 1,
    sku: options.sku || generateSKU(title),
    condition: 'New',
    category: category,

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

    // Additional fields
    department: detectDepartment(productData),
    target_gender: detectTargetGender(productData),
    material_type: detectMaterialType(productData),
    color_name: detectColor(productData),
    size_name: detectSize(productData),
  }
}

// 🎯 GENERATE INSTRUCTIONS HTML
function generateInstructionsHTML(amazonData: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazon Listing Instructions - ${amazonData.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #232F3E;
            border-bottom: 3px solid #FF9900;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #146EB4;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .step {
            background: #f8f9fa;
            border-left: 4px solid #FF9900;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .field {
            background: #e8f4fd;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border: 1px solid #b3d8f2;
        }
        .field-name {
            font-weight: bold;
            color: #146EB4;
            margin-bottom: 8px;
        }
        .field-value {
            background: white;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ddd;
            font-family: monospace;
            word-break: break-all;
        }
        .copy-btn {
            background: #FF9900;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            margin-left: 10px;
        }
        .copy-btn:hover {
            background: #e68900;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .bullet-points {
            max-height: 200px;
            overflow-y: auto;
        }
        .category-info {
            background: #e1f5fe;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Amazon Listing Instructions</h1>
        
        <div class="success">
            <strong>✅ Your product data has been optimized for Amazon!</strong><br>
            Follow the steps below to add your product to Amazon using their official template.
        </div>

        <div class="category-info">
            <strong>📂 Detected Category:</strong> ${amazonData.category}<br>
            <strong>🏷️ SKU:</strong> ${amazonData.sku}<br>
            <strong>💰 Price:</strong> $${amazonData.price}
        </div>

        <h2>📋 Step-by-Step Instructions</h2>

        <div class="step">
            <strong>Step 1: Download Amazon's Official Template</strong>
            <ol>
                <li>Go to Amazon Seller Central</li>
                <li>Navigate to: <strong>Catalog → Add Products via Upload</strong></li>
                <li>Click: <strong>"Download an Inventory File"</strong></li>
                <li>Select your product category: <strong>"${amazonData.category}"</strong></li>
                <li>Choose your marketplace and click <strong>"Generate Template"</strong></li>
                <li>Download the official Amazon template file</li>
            </ol>
        </div>

        <div class="step">
            <strong>Step 2: Fill in Your Product Data</strong>
            <p>Open the downloaded template in Excel and fill in the following optimized data:</p>
        </div>

        <h2>🎯 Your Optimized Product Data</h2>

        <div class="field">
            <div class="field-name">SKU (Seller SKU) <button class="copy-btn" onclick="copyToClipboard('${amazonData.sku}')">Copy</button></div>
            <div class="field-value">${amazonData.sku}</div>
        </div>

        <div class="field">
            <div class="field-name">Product Name (Item Name) <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.title)}')">Copy</button></div>
            <div class="field-value">${escapeHtml(amazonData.title)}</div>
        </div>

        <div class="field">
            <div class="field-name">Product Description <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.description)}')">Copy</button></div>
            <div class="field-value">${escapeHtml(amazonData.description)}</div>
        </div>

        <div class="field">
            <div class="field-name">Brand Name <button class="copy-btn" onclick="copyToClipboard('${amazonData.brand}')">Copy</button></div>
            <div class="field-value">${amazonData.brand}</div>
        </div>

        <div class="field">
            <div class="field-name">Manufacturer <button class="copy-btn" onclick="copyToClipboard('${amazonData.manufacturer}')">Copy</button></div>
            <div class="field-value">${amazonData.manufacturer}</div>
        </div>

        <div class="field">
            <div class="field-name">Price <button class="copy-btn" onclick="copyToClipboard('${amazonData.price}')">Copy</button></div>
            <div class="field-value">${amazonData.price}</div>
        </div>

        <div class="field">
            <div class="field-name">Quantity <button class="copy-btn" onclick="copyToClipboard('${amazonData.quantity}')">Copy</button></div>
            <div class="field-value">${amazonData.quantity}</div>
        </div>

        <div class="field">
            <div class="field-name">Condition <button class="copy-btn" onclick="copyToClipboard('${amazonData.condition}')">Copy</button></div>
            <div class="field-value">${amazonData.condition}</div>
        </div>

        <h2>🖼️ Images</h2>
        ${
          amazonData.main_image_url
            ? `
        <div class="field">
            <div class="field-name">Main Image URL <button class="copy-btn" onclick="copyToClipboard('${amazonData.main_image_url}')">Copy</button></div>
            <div class="field-value">${amazonData.main_image_url}</div>
        </div>
        `
            : ''
        }
        
        ${
          amazonData.other_image_url1
            ? `
        <div class="field">
            <div class="field-name">Other Image URL 1 <button class="copy-btn" onclick="copyToClipboard('${amazonData.other_image_url1}')">Copy</button></div>
            <div class="field-value">${amazonData.other_image_url1}</div>
        </div>
        `
            : ''
        }

        ${
          amazonData.other_image_url2
            ? `
        <div class="field">
            <div class="field-name">Other Image URL 2 <button class="copy-btn" onclick="copyToClipboard('${amazonData.other_image_url2}')">Copy</button></div>
            <div class="field-value">${amazonData.other_image_url2}</div>
        </div>
        `
            : ''
        }

        <h2>🎯 Keywords & Marketing</h2>

        <div class="field">
            <div class="field-name">Search Terms (Keywords) <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.keywords)}')">Copy</button></div>
            <div class="field-value">${escapeHtml(amazonData.keywords)}</div>
        </div>

        <h2>📝 Bullet Points</h2>
        <div class="bullet-points">
            ${
              amazonData.bullet_point1
                ? `
            <div class="field">
                <div class="field-name">Bullet Point 1 <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.bullet_point1)}')">Copy</button></div>
                <div class="field-value">${escapeHtml(amazonData.bullet_point1)}</div>
            </div>
            `
                : ''
            }
            
            ${
              amazonData.bullet_point2
                ? `
            <div class="field">
                <div class="field-name">Bullet Point 2 <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.bullet_point2)}')">Copy</button></div>
                <div class="field-value">${escapeHtml(amazonData.bullet_point2)}</div>
            </div>
            `
                : ''
            }
            
            ${
              amazonData.bullet_point3
                ? `
            <div class="field">
                <div class="field-name">Bullet Point 3 <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.bullet_point3)}')">Copy</button></div>
                <div class="field-value">${escapeHtml(amazonData.bullet_point3)}</div>
            </div>
            `
                : ''
            }
            
            ${
              amazonData.bullet_point4
                ? `
            <div class="field">
                <div class="field-name">Bullet Point 4 <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.bullet_point4)}')">Copy</button></div>
                <div class="field-value">${escapeHtml(amazonData.bullet_point4)}</div>
            </div>
            `
                : ''
            }
            
            ${
              amazonData.bullet_point5
                ? `
            <div class="field">
                <div class="field-name">Bullet Point 5 <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(amazonData.bullet_point5)}')">Copy</button></div>
                <div class="field-value">${escapeHtml(amazonData.bullet_point5)}</div>
            </div>
            `
                : ''
            }
        </div>

        <h2>🔧 Additional Fields (If Available in Template)</h2>

        ${
          amazonData.department
            ? `
        <div class="field">
            <div class="field-name">Department <button class="copy-btn" onclick="copyToClipboard('${amazonData.department}')">Copy</button></div>
            <div class="field-value">${amazonData.department}</div>
        </div>
        `
            : ''
        }

        ${
          amazonData.target_gender
            ? `
        <div class="field">
            <div class="field-name">Target Gender <button class="copy-btn" onclick="copyToClipboard('${amazonData.target_gender}')">Copy</button></div>
            <div class="field-value">${amazonData.target_gender}</div>
        </div>
        `
            : ''
        }

        ${
          amazonData.material_type
            ? `
        <div class="field">
            <div class="field-name">Material Type <button class="copy-btn" onclick="copyToClipboard('${amazonData.material_type}')">Copy</button></div>
            <div class="field-value">${amazonData.material_type}</div>
        </div>
        `
            : ''
        }

        ${
          amazonData.color_name
            ? `
        <div class="field">
            <div class="field-name">Color <button class="copy-btn" onclick="copyToClipboard('${amazonData.color_name}')">Copy</button></div>
            <div class="field-value">${amazonData.color_name}</div>
        </div>
        `
            : ''
        }

        <div class="step">
            <strong>Step 3: Upload Your Completed Template</strong>
            <ol>
                <li>Save your completed template file</li>
                <li>Go back to: <strong>Catalog → Add Products via Upload</strong></li>
                <li>Click: <strong>"Upload your inventory file"</strong></li>
                <li>Select your file type and upload your completed template</li>
                <li>Wait for Amazon to process your file</li>
                <li>Check the processing report for any errors</li>
            </ol>
        </div>

        <div class="warning">
            <strong>⚠️ Important Notes:</strong>
            <ul>
                <li>Use Amazon's official template - never modify the headers</li>
                <li>Copy the data exactly as shown above</li>
                <li>Some fields may not be available in all templates</li>
                <li>Amazon may suggest additional required fields for your category</li>
                <li>Review Amazon's processing report carefully</li>
            </ul>
        </div>

        <div class="success">
            <strong>🎉 That's it!</strong> Your product should now be listed on Amazon with optimized, clean data that complies with all Amazon requirements.
        </div>
    </div>

    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
                // Success feedback could be added here
                console.log('Copied to clipboard:', text);
            }, function(err) {
                console.error('Could not copy text: ', err);
            });
        }
    </script>
</body>
</html>
  `.trim()
}

// Helper functions for data processing
function detectProductCategory(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

  if (content.includes('book')) return 'Books'
  if (content.includes('watch') || content.includes('jewelry'))
    return 'Clothing, Shoes & Jewelry'
  if (
    content.includes('shoe') ||
    content.includes('clothing') ||
    content.includes('shirt')
  )
    return 'Clothing, Shoes & Jewelry'
  if (content.includes('kitchen') || content.includes('home'))
    return 'Home & Kitchen'
  if (content.includes('phone') || content.includes('electronic'))
    return 'Electronics'
  if (content.includes('health') || content.includes('beauty'))
    return 'Health & Personal Care'
  if (content.includes('sport') || content.includes('outdoor'))
    return 'Sports & Outdoors'
  if (content.includes('toy') || content.includes('game')) return 'Toys & Games'
  if (content.includes('auto') || content.includes('car')) return 'Automotive'
  if (content.includes('pet')) return 'Pet Supplies'
  if (content.includes('office')) return 'Office Products'

  return 'Home & Kitchen'
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
    withoutFormatting = `Premium ${withoutFormatting} - High Quality Product`
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

function detectTargetGender(productData: any): string {
  return detectDepartment(productData)
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
  return ''
}

function detectColor(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

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

function detectSize(productData: any): string {
  const content = cleanText(
    `${productData.product_name || productData.title || ''} ${productData.content || productData.description || ''}`
  ).toLowerCase()

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
  return ''
}

function generateSKU(title: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const prefix = cleanText(title)
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6)
  return `AMZ-${prefix}-${timestamp}`
}
