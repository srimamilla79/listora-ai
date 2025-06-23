// src/app/api/amazon/template/download/[templateId]/route.ts
// Download generated Amazon template as CSV file

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const templateId = params.templateId

    console.log('📥 Template download requested:', templateId)

    // Fetch template from database
    const { data: template, error } = await supabase
      .from('amazon_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error || !template) {
      return NextResponse.json(
        {
          error: 'Template not found',
        },
        { status: 404 }
      )
    }

    // Generate fresh CSV content with Amazon's required headers
    // This ensures we always have the latest format
    const csvContent = generateAmazonCSV(template.template_data)

    if (!csvContent) {
      return NextResponse.json(
        {
          error: 'Template content not available',
        },
        { status: 404 }
      )
    }

    // Generate filename
    const filename = `amazon-template-${template.sku}-${template.product_type}.csv`

    console.log('✅ Sending template download:', filename)

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('❌ Template download error:', error)
    return NextResponse.json(
      {
        error: 'Download failed',
      },
      { status: 500 }
    )
  }
}

// Also handle POST for compatibility
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  return GET(request, { params })
}

// 🎯 GENERATE AMAZON CSV WITH REQUIRED HEADERS
function generateAmazonCSV(amazonData: any): string {
  // Amazon requires specific template headers for category-specific templates
  const templateHeader = `TemplateType=fptcustom,Version=2021.0317,Category=ce_jewelry,TemplateSignature=Q0VfSkVXRUxSWQ==`
  const instructionRow = `Below this row, populate product data using the column titles in row 3`

  // Column headers for Jewelry category (Clothing, Shoes & Jewelry)
  const headers = [
    'feed_product_type',
    'item_sku',
    'brand_name',
    'item_name',
    'external_product_id',
    'external_product_id_type',
    'item_type',
    'standard_price',
    'quantity',
    'main_image_url',
    'swatch_image_url',
    'other_image_url1',
    'other_image_url2',
    'other_image_url3',
    'other_image_url4',
    'other_image_url5',
    'other_image_url6',
    'other_image_url7',
    'other_image_url8',
    'parent_sku',
    'parent_child',
    'relationship_type',
    'variation_theme',
    'product_description',
    'bullet_point1',
    'bullet_point2',
    'bullet_point3',
    'bullet_point4',
    'bullet_point5',
    'generic_keywords',
    'platinum_keywords',
    'update_delete',
    'condition_type',
    'condition_note',
    'manufacturer',
    'part_number',
    'product_site_launch_date',
    'merchant_shipping_group_name',
  ]

  // Data row with Amazon-required field names
  const row = [
    'ce_jewelry', // feed_product_type
    amazonData.sku || '', // item_sku
    amazonData.brand || '', // brand_name
    amazonData.title || '', // item_name
    '', // external_product_id
    '', // external_product_id_type
    'watch', // item_type
    amazonData.price || '', // standard_price
    amazonData.quantity || '1', // quantity
    amazonData.main_image_url || '', // main_image_url
    '', // swatch_image_url
    amazonData.other_image_url1 || '', // other_image_url1
    amazonData.other_image_url2 || '', // other_image_url2
    amazonData.other_image_url3 || '', // other_image_url3
    amazonData.other_image_url4 || '', // other_image_url4
    '', // other_image_url5
    '', // other_image_url6
    '', // other_image_url7
    '', // other_image_url8
    '', // parent_sku
    '', // parent_child
    '', // relationship_type
    '', // variation_theme
    amazonData.description || '', // product_description
    amazonData.bullet_point1 || '', // bullet_point1
    amazonData.bullet_point2 || '', // bullet_point2
    amazonData.bullet_point3 || '', // bullet_point3
    amazonData.bullet_point4 || '', // bullet_point4
    amazonData.bullet_point5 || '', // bullet_point5
    amazonData.keywords || '', // generic_keywords
    '', // platinum_keywords
    '', // update_delete
    'New', // condition_type
    '', // condition_note
    amazonData.manufacturer || amazonData.brand || '', // manufacturer
    '', // part_number
    '', // product_site_launch_date
    '', // merchant_shipping_group_name
  ]

  // Escape CSV fields properly
  const escapedRow = row.map((field) => {
    const str = String(field || '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  })

  // Return Amazon's required format: Template header, instruction row, column headers, data row
  return [
    templateHeader,
    instructionRow,
    headers.join(','),
    escapedRow.join(','),
  ].join('\n')
}
