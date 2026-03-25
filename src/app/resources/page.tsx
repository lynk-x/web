"use client";

import React from 'react';
import styles from './ResourceIndex.module.css';
import Link from 'next/link';

export default function ResourceIndex() {
    return (
        <div className={styles.page}>
            <h1 className={styles.title}>Welcome to the Resource Hub</h1>
            <p className={styles.subtitle}>Our mission is to empower event organizers with the best tools, safety protocols, and insights to build successful communities on Pulse.</p>
            
            <div className={styles.categoryGrid}>
                {[
                    { title: 'Hosting Guide', href: '/resources/guide', desc: 'Step-by-step to launching your first event.' },
                    { title: 'Pricing & Fees', href: '/resources/pricing', desc: 'Understanding commissions and payouts.' },
                    { title: 'Safety & Security', href: '/resources/safety', desc: 'How we keep our community safe.' },
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
