import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // QA environment variables for Vercel deployment (simplified)
  ...(process.env.VERCEL && {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://sguvkhamwteaptujqftv.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndXZraGFtd3RlYXB0dWpxZnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjQ1ODIsImV4cCI6MjA2NTI0MDU4Mn0.H8MB_7lifNdVIhQ1ZMdC5sFjRrlatbCIr_bIFu9fwVE',
    },
  }),

  // NEW: Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

export default nextConfig
