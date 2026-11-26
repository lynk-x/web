/**
 * Web Robots Configuration — defines crawler access rules and sitemap location
 * for search engines, generative AI answer engines and social media scrapers.
 *
 * Rules:
 *   1. Global fallback (*) - allows public crawling and dynamic OG cards (/api/og/),
 *      while protecting private apps, auth endpoints and internal APIs.
 *   2. AI & Search Crawlers - explicitly permits full public indexing of marketing,
 *      category discovery, event detail pages and structured LLM context,
 *      while safeguarding dashboard, checkout, sponsorship invite and auth workflows.
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';

    // Disallowed private application, auth and transaction routes
    const privateRoutes = [
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

    // Allowed public discovery and documentation routes for AI engines
    const publicDiscoveryRoutes = [
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

    // Targeted AI, search, social and archive crawlers (valid RFC 9309 user-agent tokens)
    const aiAndSearchCrawlers = [
        // OpenAI & ChatGPT
        'GPTBot',
        'ChatGPT-User',
        'OAI-SearchBot',

        // Anthropic / Claude
        'ClaudeBot',
        'Claude-User',
        'Claude-SearchBot',

        // Perplexity AI
        'PerplexityBot',
        'Perplexity-User',

        // Google Search & AI
        'Googlebot',
        'Google-Extended',
        'Google-CloudVertexBot',

        // Microsoft & Bing
        'bingbot',

        // Apple
        'Applebot',
        'Applebot-Extended',

        // Meta (Facebook, Instagram & Meta AI)
        'FacebookBot',
        'Meta-ExternalAgent',
        'Meta-ExternalFetcher',

        // Amazon & Mistral
        'Amazonbot',
        'MistralAI-User',

        // DuckDuckGo & Baidu
        'DuckAssistBot',
        'Baiduspider',

        // ByteDance & TikTok
        'Bytespider',
        'TikTokSpider',

        // Cloudflare & Specialized Crawlers
        'Cloudflare-Crawler',
        'Cloudflare-Evergreen',
        'AnchorBrowser',
        'PetalBot',
        'ProRataInc',
        'Timpibot',
        'Novellum',

        // Web Archives & Common Crawl
        'CCBot',
        'archive.org_bot',
        'Arquivo-Web-Crawler',
    ];

    return {
        rules: [
            {
                userAgent: '*',
                allow: ['/', '/api/og/'],
                disallow: privateRoutes,
            },
            {
                userAgent: aiAndSearchCrawlers,
                allow: publicDiscoveryRoutes,
                disallow: privateRoutes,
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
