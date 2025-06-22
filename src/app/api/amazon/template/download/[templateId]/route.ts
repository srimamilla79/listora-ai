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

    // Get CSV content
    const csvContent = template.csv_content

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
