/**
 * Web Robots Configuration — defines crawler access rules and sitemap location
 * for search engines, generative AI answer engines and social media scrapers.
 *
 * Rules:
 *   1. Global fallback (*) - allows public crawling, protects private apps and APIs.
 *   2. AI & Search Crawlers - explicitly permits full public indexing of marketing,
 *      event detail pages and structured LLM context (/llms.txt, /llms-full.txt),
 *      while safeguarding dashboard, checkout, cart and onboarding workflows.
 */

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';

    // Disallowed private application and transaction routes
    const privateRoutes = [
        '/dashboard/',
        '/api/',
        '/checkout/',
        '/cart/',
        '/onboarding/',
        '/verify-success/',
        '/callback/',
        '/invite/',
    ];

    // Allowed public discovery and documentation routes for AI engines
    const publicDiscoveryRoutes = [
        '/',
        '/for/',
        '/event/',
        '/resources/',
        '/contact',
        '/privacy',
        '/terms',
        '/llms.txt',
        '/llms-full.txt',
    ];

    // Targeted AI, search, social and archive crawlers
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
        'BingBot',
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
        'Baidu',
        'Baiduspider',

        // ByteDance & TikTok
        'Bytespider',
        'TikTok Spider',
        'TikTokSpider',

        // Cloudflare & Specialized Crawlers
        'Cloudflare Crawler',
        'Cloudflare-Evergreen',
        'Anchor Browser',
        'AnchorBrowser',
        'PetalBot',
        'ProRataInc',
        'Timpibot',
        'Novellum AI Crawl',
        'Novellum',

        // Web Archives & Common Crawl
        'CCBot',
        'archive.org_bot',
        'Arquivo Web Crawler',
        'Arquivo-Web-Crawler',
    ];

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
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
