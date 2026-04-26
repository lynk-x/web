import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';
    return {
        rules: {
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
                '/update-password/',
                '/ticket-scanning/',
                '/invite/'
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
