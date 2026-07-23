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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.supabase.co https://www.gstatic.com https://apis.google.com https://static.cloudflareinsights.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://cdn.lynk-x.app https://*.supabase.co https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://api.qrserver.com https://*.r2.cloudflarestorage.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fcm.googleapis.com https://firebaseinstallations.googleapis.com https://*.firebaseinstallations.googleapis.com https://*.r2.cloudflarestorage.com https://cdn.lynk-x.app https://cdn.jsdelivr.net https://fonts.gstatic.com https://www.gstatic.com https://unpkg.com https://cdnjs.cloudflare.com https://*.google.com https://*.gstatic.com",
      "frame-src 'self'",
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
