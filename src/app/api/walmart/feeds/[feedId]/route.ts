// app/api/walmart/feeds/[feedId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { walmartApiRequest } from '@/lib/walmart'

export async function GET(
  request: NextRequest,
  { params }: { params: { feedId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const result = await walmartApiRequest(
      userId,
      'GET',
      `/v3/feeds/${params.feedId}?includeDetails=true`
    )

    // Add interpretation
    const interpretation = {
      isComplete: false,
      isError: false,
      message: '',
      progress: 0,
    }

    switch (result.feedStatus) {
      case 'RECEIVED':
        interpretation.message = 'Feed received and queued'
        interpretation.progress = 25
        break
      case 'INPROGRESS':
        interpretation.message = 'Processing your products'
        interpretation.progress = 50
        break
      case 'PROCESSED':
        interpretation.message = 'Successfully processed!'
        interpretation.isComplete = true
        interpretation.progress = 100
        break
      case 'ERROR':
        interpretation.message = 'Processing failed'
        interpretation.isComplete = true
        interpretation.isError = true
        interpretation.progress = 100
        break
    }

    return NextResponse.json({
      ...result,
      interpretation,
    })
  } catch (error) {
    console.error('❌ Feed status check error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to check status',
      },
      { status: 500 }
    )
  }
}
