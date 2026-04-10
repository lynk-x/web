import React from 'react';
import styles from './ResourceIndex.module.css';
import Link from 'next/link';
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

export default function ResourceIndex() {
    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Welcome to the Resource Hub</h1>
            <p className={styles.subtitle}>Our mission is to empower event organizers with the best tools, safety protocols, and insights to build successful communities on Lynk-X.</p>
            
            <div className={styles.categoryGrid}>
                {[
                    { title: 'Hosting Guide', href: '/resources/guide', desc: 'Step-by-step to launching your first event.' },
                    { title: 'Pricing & Fees', href: '/resources/pricing', desc: 'Understanding commissions and payouts.' },
                    { title: 'Safety & Security', href: '/resources/safety', desc: 'How we keep our community safe.' },
                    { title: 'Help Center', href: '/resources/help', desc: 'Get support and find answers to common questions.' },
                ].map((item, idx) => (
                    <Link key={idx} href={item.href} className={styles.categoryCard}>
                        <h2 className={styles.cardTitle}>{item.title}</h2>
                        <p className={styles.cardDesc}>{item.desc}</p>
                        <span className={styles.cardLink}>Learn More →</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
