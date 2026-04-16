import React from 'react';
import styles from './ResourceIndex.module.css';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Resources | Lynk-X',
    description: 'Guides, pricing, safety protocols, and support for event organizers and attendees on Lynk-X.',
    openGraph: {
        title: 'Resources | Lynk-X',
        description: 'Everything you need to get started on Lynk-X.',
        type: 'website',
    },
};

export default async function ResourceIndex() {
    const supabase = await createClient();

    const { data: resources } = await supabase
        .from('cms_pages')
        .select('title, slug, info')
        .eq('type', 'resource')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    // Fallback handled by empty array if no resources found
    const displayResources = (resources as any[]) || [];

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Welcome to the Resource Hub</h1>
            <p className={styles.subtitle}>Our mission is to empower event organizers with the best tools, safety protocols, and insights to build successful communities on Lynk-X.</p>
            
            <div className={styles.categoryGrid}>
                {displayResources.map((item, idx) => (
                    <Link key={idx} href={item.slug} className={styles.categoryCard}>
                        <h2 className={styles.cardTitle}>{item.title}</h2>
                        <p className={styles.cardDesc}>{item.info?.description}</p>
                        <span className={styles.cardLink}>Learn More →</span>
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
