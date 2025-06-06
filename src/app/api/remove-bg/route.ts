// src/app/api/remove-bg/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await req.formData()
    const imageFile = formData.get('image_file') as File
    const size = formData.get('size') || 'auto'

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    // Your Remove.bg API key
    const removeBgApiKey =
      process.env.REMOVE_BG_API_KEY || 'sqHyGB2hoFUbhT8wY47fhePL'

    console.log('Processing image with Remove.bg API...')

    // Create FormData for Remove.bg API
    const removeBgFormData = new FormData()
    removeBgFormData.append('image_file', imageFile)
    removeBgFormData.append('size', size as string)

    // Call Remove.bg API
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': removeBgApiKey,
      },
      body: removeBgFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Remove.bg API error:', response.status, errorText)

      // Return error details for debugging
      return NextResponse.json(
        {
          error: 'Remove.bg API failed',
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      )
    }

    console.log('Remove.bg processing successful!')

    // Return the processed image
    const processedImageBuffer = await response.arrayBuffer()

    return new NextResponse(processedImageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': processedImageBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Remove.bg processing error:', error)

    // Return a detailed error response
    return NextResponse.json(
      {
        error: 'Image processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: 'Remove.bg API endpoint active',
      status: 'ready',
      hasApiKey: true,
    },
    { status: 200 }
  )
}
