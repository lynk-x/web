import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://www.gstatic.com https://apis.google.com https://static.cloudflareinsights.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live https://*.vercel.live",
      "font-src 'self' https://fonts.gstatic.com https://vercel.live https://*.vercel.live",
      "img-src 'self' data: blob: https://cdn.lynk-x.app https://*.supabase.co https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://api.qrserver.com https://vercel.live https://*.vercel.live https://vercel.com https://*.vercel.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fcm.googleapis.com https://vercel.live https://*.vercel.live wss://*.vercel.live https://*.vercel.com https://*.r2.cloudflarestorage.com https://cdn.lynk-x.app",
      "frame-src 'self' https://vercel.live https://*.vercel.live",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
    devIndicators: false,
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: securityHeaders,
            },
        ];
    },
    images: {
        loader: 'custom',
        loaderFile: './src/utils/imageLoader.ts',
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.lynk-x.app',
            },
        ],
    },
};

export default nextConfig;
