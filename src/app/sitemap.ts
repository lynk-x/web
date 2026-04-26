import { createClient } from '@/utils/supabase/server';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';
    const supabase = await createClient();

    // 1. Static routes
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/for/attendees`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/for/organizers`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/for/advertisers`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    // 2. Fetch public events for the sitemap
    const { data: events } = await supabase
        .from('vw_public_events')
        .select('reference, starts_at')
        .limit(100);

    const eventRoutes: MetadataRoute.Sitemap = (events || []).map((event) => ({
        url: `${baseUrl}/event/${event.reference}`,
        lastModified: new Date(event.starts_at),
        changeFrequency: 'weekly',
        priority: 0.6,
    }));

    return [...staticRoutes, ...eventRoutes];
}
