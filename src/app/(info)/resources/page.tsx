import React from 'react';
import styles from './ResourceIndex.module.css';
import Link from 'next/link';
import { createPublicClient } from '@/utils/supabase/public';
import type { Metadata } from 'next';

interface CmsResourceRow {
    title: string;
    slug: string;
    content?: { description?: string } | null;
}

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Guides, pricing, safety protocols and support for event organizers and attendees on Lynk-X.',
    alternates: {
        canonical: '/resources',
    },
    openGraph: {
        title: 'Resources | Lynk-X',
        description: 'Guides, pricing, safety protocols and support for event organizers and attendees on Lynk-X.',
        url: 'https://lynk-x.app/resources',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X Resource Hub',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Resources | Lynk-X',
        description: 'Guides, pricing, safety protocols and support for event organizers and attendees on Lynk-X.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Public Resource Hub index listing published CMS guides, pricing and safety
 * documentation cached via 1-hour ISR.
 */
export default async function ResourceIndex() {
    const supabase = createPublicClient();

    const { data: resources } = await supabase
        .schema('api')
        .from('v1_cms_pages')
        .select('title, slug, content')
        .eq('type', 'resource')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    const displayResources = (resources as CmsResourceRow[] | null) || [];

    // Sort: "Hosting guide" first, "Our Mission" and "Brand Assets" last
    displayResources.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        const aIsHosting = aTitle.includes('hosting guide');
        const bIsHosting = b.title.toLowerCase().includes('hosting guide');
        const aIsLast = aTitle.includes('our mission') || aTitle.includes('brand assets');
        const bIsLast = b.title.toLowerCase().includes('our mission') || b.title.toLowerCase().includes('brand assets');

        if (aIsHosting && !bIsHosting) return -1;
        if (!aIsHosting && bIsHosting) return 1;
        if (aIsLast && !bIsLast) return 1;
        if (!aIsLast && bIsLast) return -1;
        return 0;
    });

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
        ],
    };

    return (
        <div className={styles.page}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <h1 className={styles.title}>Welcome to the Resource Hub</h1>
            <p className={styles.subtitle}>Our mission is to empower event organizers with the best tools, safety protocols and insights to run smoother events and keep attendees connected on Lynk-X.</p>
            
            <div className={styles.categoryGrid}>
                {displayResources.map((item, idx) => (
                    <Link key={idx} href={`/resources/${item.slug}`} className={styles.categoryCard}>
                        <h2 className={styles.cardTitle}>{item.title}</h2>
                        <p className={styles.cardDesc}>{item.content?.description}</p>
                        <span className={styles.cardLink}>Read Guide →</span>
                    </Link>
                ))}
                
                {displayResources.length === 0 && (
                    <p style={{ opacity: 0.5, gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                        No resources available at this time.
                    </p>
                )}
            </div>
        </div>
    );
}
