import { NextResponse } from 'next/server';

export const revalidate = 3600;

const PRIVATE_ROUTES = [
    '/dashboard/',
    '/ads',
    '/ads/',
    '/api/',
    '/checkout/',
    '/cart/',
    '/onboarding/',
    '/setup-profile/',
    '/account/',
    '/verify/',
    '/verify-success/',
    '/callback/',
    '/invite/',
    '/sponsorships/',
    '/login',
    '/signup',
    '/recover',
    '/mfa-challenge',
];

const PUBLIC_DISCOVERY_ROUTES = [
    '/',
    '/events',
    '/events/',
    '/for/',
    '/event/',
    '/resources',
    '/resources/',
    '/contact',
    '/privacy',
    '/terms',
    '/refund',
    '/cookies',
    '/api/og/',
    '/llms.txt',
    '/llms-full.txt',
];

const AI_AND_SEARCH_CRAWLERS = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'Googlebot',
    'Google-Extended',
    'Google-CloudVertexBot',
    'bingbot',
    'Applebot',
    'Applebot-Extended',
    'FacebookBot',
    'Meta-ExternalAgent',
    'Meta-ExternalFetcher',
    'Amazonbot',
    'MistralAI-User',
    'DuckAssistBot',
    'Baiduspider',
    'Bytespider',
    'TikTokSpider',
    'Cloudflare-Crawler',
    'Cloudflare-Evergreen',
    'AnchorBrowser',
    'PetalBot',
    'ProRataInc',
    'Timpibot',
    'Novellum',
    'CCBot',
    'archive.org_bot',
    'Arquivo-Web-Crawler',
];

const CONTENT_SIGNAL = 'Content-Signal: ai-train=no, search=yes, ai-input=yes';

/**
 * Serves `/robots.txt` with crawler access rules, Content-Signal preferences
 * (`ai-train=no, search=yes, ai-input=yes`) and sitemap location.
 */
export function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';

    const lines: string[] = [
        'User-agent: *',
        CONTENT_SIGNAL,
        'Allow: /',
        'Allow: /api/og/',
        ...PRIVATE_ROUTES.map((route) => `Disallow: ${route}`),
        '',
        ...AI_AND_SEARCH_CRAWLERS.map((agent) => `User-agent: ${agent}`),
        CONTENT_SIGNAL,
        ...PUBLIC_DISCOVERY_ROUTES.map((route) => `Allow: ${route}`),
        ...PRIVATE_ROUTES.map((route) => `Disallow: ${route}`),
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
    ];

    return new NextResponse(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
