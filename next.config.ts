import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // FIXED: Production environment variables for Vercel deployment
  ...(process.env.VERCEL && {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://jhcfuvblgcznhcrpfayb.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoY2Z1dmJsZ2N6bmhjcnBmYXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyMjkyNzYsImV4cCI6MjA2NDgwNTI3Nn0.FhnCoDle6sgiBg4GCvN53MKEF7ZWgtIQ_tZQeAjglDU',
    },
  }),

  // Security Headers
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
