import React from 'react';
import { createPublicClient } from '@/utils/supabase/public';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface CmsPageContent {
    description?: string;
    subtitle?: string;
    sections: Array<{
        id: string;
        title: string;
        description: string;
        items: Array<{
            icon: string;
            title: string;
            content: string;
            details?: string[];
            imageUrl?: string;
            downloadUrl?: string;
        }>;
    }>;
}

export const revalidate = 3600;

interface Props {
    params: Promise<{ slug: string }>;
}

/**
 * Generates self-canonicalized metadata and social previews for individual
 * published CMS resource pages.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const supabase = createPublicClient();

    const { data: page } = await supabase
        .schema('api')
        .from('v1_cms_pages')
        .select('title, content')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (!page) {
        return {
            title: 'Page Not Found',
            robots: { index: false, follow: false },
        };
    }

    const description =
        (page.content as CmsPageContent | null)?.description || `Learn more about ${page.title} on Lynk-X.`;
    const canonicalPath = `/resources/${slug}`;
    const fullTitle = `${page.title} | Lynk-X`;

    return {
        title: page.title,
        description,
        alternates: {
            canonical: canonicalPath,
        },
        openGraph: {
            title: fullTitle,
            description,
            url: `https://lynk-x.app${canonicalPath}`,
            siteName: 'Lynk-X',
            locale: 'en_GB',
            images: [
                {
                    url: '/og-image.png?v=2',
                    width: 1200,
                    height: 630,
                    alt: fullTitle,
                    type: 'image/png',
                },
            ],
            type: 'article',
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            site: '@lynkxapp',
            creator: '@lynkxapp',
            images: ['/og-image.png?v=2'],
        },
    };
}

/**
 * Renders a published CMS resource article with BreadcrumbList structured data.
 */
export default async function ResourcePage({ params }: Props) {
    const { slug } = await params;
    const supabase = createPublicClient();

    const { data: page } = await supabase
        .schema('api')
        .from('v1_cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (!page) {
        notFound();
    }

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://lynk-x.app',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Resources',
                item: 'https://lynk-x.app/resources',
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: page.title,
                item: `https://lynk-x.app/resources/${slug}`,
            },
        ],
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <ResourceRenderer 
                title={page.title} 
                info={page.content as CmsPageContent} 
            />
        </div>
    );
}
