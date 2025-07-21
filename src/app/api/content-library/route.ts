// src/app/api/content-library/route.ts - Save or update content in content library
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contentId, userId, productName, content, features } = body
    if (!userId || !productName) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or productName' },
        { status: 400 }
      )
    }
    const supabase = await createServerSideClient()
    let result
    if (contentId) {
      // Update existing content
      result = await supabase
        .from('product_contents')
        .update({
          product_name: productName,
          generated_content: content,
          features,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId)
        .eq('user_id', userId)
        .select()
        .single()
    } else {
      // Insert new content
      result = await supabase
        .from('product_contents')
        .insert({
          user_id: userId,
          product_name: productName,
          generated_content: content,
          features,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()
    }
    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 500 }
      )
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
