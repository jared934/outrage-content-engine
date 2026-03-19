

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.reddit.com' },
      { protocol: 'https', hostname: '**.redd.it' },
      { protocol: 'https', hostname: '**.ytimg.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      { protocol: 'https', hostname: 'i.imgflip.com' },
      { protocol: 'https', hostname: '**.imgflip.com' },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') ?? '',
      ].filter(Boolean),
    },
  },
}

export default nextConfig
