import type { NextConfig } from 'next'

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

const nextConfig: NextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
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
        'sb_publishable_EsVN4ztP-WWjk9EpBCk4qA_UnyECi7t',
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

export default withMDX(nextConfig)
