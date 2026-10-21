import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/dashboard/',
                    '/api/',
                    '/checkout/',
                    '/cart/',
                    '/onboarding/',
                    '/verify-success/',
                    '/callback/',
                    '/invite/',
                ],
            },
            {
                userAgent: [
                    'GPTBot',
                    'ChatGPT-User',
                    'PerplexityBot',
                    'ClaudeBot',
                    'Google-Extended',
                    'Applebot-Extended',
                ],
                allow: [
                    '/',
                    '/for/',
                    '/event/',
                    '/resources/',
                    '/contact',
                    '/privacy',
                    '/terms',
                    '/llms.txt',
                    '/llms-full.txt',
                ],
                disallow: [
                    '/dashboard/',
                    '/api/',
                    '/checkout/',
                    '/cart/',
                    '/onboarding/',
                    '/verify-success/',
                    '/callback/',
                    '/invite/',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
