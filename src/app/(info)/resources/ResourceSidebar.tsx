"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './ResourceSidebar.module.css';

const ResourceSidebar: React.FC = () => {
    const pathname = usePathname();

    const isSafety = pathname.startsWith('/resources/safety');
    const isGuide = pathname.startsWith('/resources/guide');
    const isPricing = pathname.startsWith('/resources/pricing');
    const isHelp = pathname.startsWith('/resources/help');

    const getSections = () => {
        if (isHelp) {
            return [
                {
                    group: 'SUPPORT',
                    items: [
                        { name: 'FAQ', href: '/resources/help#faq', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        )},
                        { name: 'Contact Support', href: '/resources/help#contact', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                        )}
                    ]
                }
            ];
        }

        if (isSafety) {
            return [
                {
                    group: 'CONTENT',
                    items: [
                        { name: 'For Organizers', href: '/resources/safety#organizer', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        )},
                        { name: 'For Attendees', href: '/resources/safety#attendee', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                        )}
                    ]
                }
            ];
        }

        if (isGuide) {
            return [
                {
                    group: 'CONTENT',
                    items: [
                        { name: 'Hosting Events', href: '/resources/guide#events', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <rect x="9" y="9" width="6" height="6" />
                            </svg>
                        )},
                        { name: 'Hosting Ads', href: '/resources/guide#ads', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                            </svg>
                        )}
                    ]
                }
            ];
        }

        if (isPricing) {
            return [
                {
                    group: 'CONTENT',
                    items: [
                        { name: 'Platform Fees', href: '/resources/pricing#fees', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="6" />
                                <line x1="12" y1="8" x2="12" y2="16" />
                            </svg>
                        )},
                        { name: 'Payouts', href: '/resources/pricing#payouts', icon: (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        )}
                    ]
                }
            ];
        }

        return [];
    };

    const sections = getSections();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                {/* Logo removed as it's now in the Top Navbar */}
            </div>
            
            <nav className={styles.nav}>
                {sections.map((group) => (
                    <div key={group.group} className={styles.navGroup}>
                        <h3 className={styles.groupTitle}>{group.group}</h3>
                        <div className={styles.groupItems}>
                            {group.items.map((item) => {
                                // For section links, check if the current URL has the hash
                                const isActive = typeof window !== 'undefined' && window.location.hash === item.href.split('#')[1];
                                
                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        className={`${styles.navItem} ${styles.sectionNavItem} ${isActive ? styles.navItemActive : ''}`}
                                    >
                                        <span className={styles.icon}>{item.icon}</span>
                                        <span className={styles.name}>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default ResourceSidebar;
