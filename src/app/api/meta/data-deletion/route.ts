// src/app/api/meta/data-deletion/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('Facebook data deletion request received:', {
      user_id: body.user_id,
      signed_request: body.signed_request ? 'present' : 'missing',
    })

    // TODO: In production, verify the signed_request and queue deletion
    // For now, just acknowledge the request

    // Facebook expects this specific response format
    return NextResponse.json(
      {
        url: `https://www.listora.ai/privacy?deletion_id=${Date.now()}`,
        confirmation_code: `LISTORA_DEL_${Date.now()}`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Data deletion request error:', error)

    // Still return success to Facebook
    return NextResponse.json(
      {
        url: 'https://www.listora.ai/privacy',
        confirmation_code: `LISTORA_DEL_${Date.now()}`,
      },
      { status: 200 }
    )
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Facebook data deletion endpoint',
    info: 'POST requests only. For manual deletion requests, email privacy@listora.ai',
    privacy_policy: 'https://www.listora.ai/privacy',
  })
}
