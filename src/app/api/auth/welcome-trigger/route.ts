import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🎉 Welcome trigger received:', body.type, body.record?.email)

    // Only send welcome email for confirmed users
    if (
      body.type === 'UPDATE' &&
      body.record?.email_confirmed_at &&
      body.record?.email
    ) {
      const { email } = body.record
      const name = email.split('@')[0]

      console.log('✅ Email confirmed, sending welcome email to:', email)

      // Send welcome email
      try {
        const welcomeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/emails/welcome`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              name: name,
            }),
          }
        )

        if (welcomeResponse.ok) {
          console.log('🎉 Welcome email sent successfully to:', email)
        } else {
          console.error('❌ Failed to send welcome email')
        }
      } catch (error) {
        console.error('❌ Welcome email error:', error)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Welcome trigger error:', error)
    return NextResponse.json({ error: 'Trigger failed' }, { status: 500 })
  }
}
