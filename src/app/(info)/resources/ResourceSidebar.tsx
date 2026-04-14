"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './ResourceSidebar.module.css';

const ResourceSidebar: React.FC = () => {
    const pathname = usePathname();


    const mainTopics = [
        { name: 'Hosting Guide', href: '/resources/guide', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
        )},
        { name: 'Safety & Privacy', href: '/resources/safety', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
        )},
        { name: 'Pricing & Fees', href: '/resources/pricing', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
        )},
        { name: 'Help Center', href: '/resources/help', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
        )}
    ];

    const getLocalSections = () => {
        const isSafety = pathname.includes('/safety');
        const isGuide = pathname.includes('/guide');
        const isPricing = pathname.includes('/pricing');
        const isHelp = pathname.includes('/help');

        if (isHelp) return [
            { name: 'FAQ', href: '#faq' },
            { name: 'Contact Us', href: '#contact' }
        ];
        if (isSafety) return [
            { name: 'For Organizers', href: '#organizer' },
            { name: 'For Attendees', href: '#attendee' }
        ];
        if (isGuide) return [
            { name: 'Hosting Events', href: '#events' },
            { name: 'Hosting Ads', href: '#ads' }
        ];
        if (isPricing) return [
            { name: 'Platform Fees', href: '#fees' },
            { name: 'Payouts', href: '#payouts' }
        ];
        return [];
    };

    const localSections = getLocalSections();

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <div className={styles.navGroup}>
                    <h3 className={styles.groupTitle}>TOPICS</h3>
                    <div className={styles.groupItems}>
                        {mainTopics.map((topic) => (
                            <Link 
                                key={topic.href} 
                                href={topic.href} 
                                className={`${styles.navItem} ${pathname === topic.href ? styles.navItemActive : ''}`}
                            >
                                <span className={styles.icon}>{topic.icon}</span>
                                <span className={styles.name}>{topic.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {localSections.length > 0 && (
                    <div className={styles.navGroup}>
                        <h3 className={styles.groupTitle}>ON THIS PAGE</h3>
                        <div className={styles.groupItems}>
                            {localSections.map((section) => (
                                <Link 
                                    key={section.href} 
                                    href={section.href} 
                                    className={`${styles.navItem} ${styles.sectionNavItem}`}
                                >
                                    <span className={styles.name}>{section.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </nav>
        </aside>
    );
};

export default ResourceSidebar;
