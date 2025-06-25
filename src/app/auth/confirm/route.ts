import { createServerSideClient } from '@/lib/supabase'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/reset-password'

  console.log('Auth confirm:', {
    token_hash: token_hash?.substring(0, 10) + '...',
    type,
    next,
  })

  if (token_hash && type) {
    const supabase = await createServerSideClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error) {
      console.log('✅ OTP verified successfully, redirecting to:', next)
      redirect(next)
    } else {
      console.error('❌ OTP verification failed:', error.message)
      redirect(`/login?error=Invalid or expired reset link`)
    }
  }

  console.log('❌ Missing token_hash or type')
  redirect('/login?error=Invalid reset link')
}
