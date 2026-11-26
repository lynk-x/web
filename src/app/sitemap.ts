/**
 * Dynamic XML sitemap generator covering static marketing pages, active category
 * discovery hubs, published CMS resource articles and public upcoming events.
 */
import { createPublicClient } from '@/utils/supabase/public';
import { slugifyCategory } from '@/utils/categories';
import { MetadataRoute } from 'next';

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lynk-x.app';
    const supabase = createPublicClient();

    // 1. Static routes (omit lastModified rather than emitting fake current-time stamps)
    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/events`,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/for/attendees`,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/for/organizers`,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/for/ad-sponsors`,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/resources`,
            changeFrequency: 'weekly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/contact`,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
        {
            url: `${baseUrl}/privacy`,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/refund`,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/cookies`,
            changeFrequency: 'monthly',
            priority: 0.3,
        },
    ];

    // 2. Fetch public events, approved categories and published CMS pages in parallel
    const [
        { data: events },
        { data: categories },
        { data: cmsPages },
    ] = await Promise.all([
        supabase
            .from('vw_events')
            .select('reference, category')
            .in('status', ['published', 'active'])
            .eq('is_private', false)
            .order('starts_at', { ascending: false })
            .limit(5000),
        supabase
            .schema('api')
            .from('v1_event_categories')
            .select('id, display_name'),
        supabase
            .schema('api')
            .from('v1_cms_pages')
            .select('slug, updated_at, created_at')
            .eq('status', 'published'),
    ]);

    const activeCategoryCounts = new Map<string, number>();
    for (const event of events || []) {
        if (event.category) {
            activeCategoryCounts.set(
                event.category,
                (activeCategoryCounts.get(event.category) ?? 0) + 1
            );
        }
    }

    // Only include category pages that currently have at least one active public event (Decision 2C)
    const categoryRoutes: MetadataRoute.Sitemap = (categories || [])
        .filter((cat) => (activeCategoryCounts.get(cat.display_name) ?? 0) > 0)
        .map((cat) => ({
            url: `${baseUrl}/events/${slugifyCategory(cat.display_name)}`,
            changeFrequency: 'daily',
            priority: 0.7,
        }));

    const resourceRoutes: MetadataRoute.Sitemap = (cmsPages || [])
        .filter((page) => Boolean(page.slug))
        .map((page) => ({
            url: `${baseUrl}/resources/${page.slug}`,
            lastModified: new Date(page.updated_at || page.created_at),
            changeFrequency: 'monthly',
            priority: 0.5,
        }));

    const eventRoutes: MetadataRoute.Sitemap = (events || [])
        .filter((event) => Boolean(event.reference))
        .map((event) => ({
            url: `${baseUrl}/event/${event.reference}`,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));

    return [...staticRoutes, ...categoryRoutes, ...resourceRoutes, ...eventRoutes];
}
