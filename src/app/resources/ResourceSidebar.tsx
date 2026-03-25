"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import styles from './ResourceSidebar.module.css';

const ResourceSidebar: React.FC = () => {
    const pathname = usePathname();

    const sections = [
        {
            group: 'LEARNING',
            items: [
                { name: 'Hosting Guide', href: '/resources/guide', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H2z" />
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h6z" />
                    </svg>
                )}
            ]
        },
        {
            group: 'FINANCE',
            items: [
                { name: 'Pricing & Fees', href: '/resources/pricing', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                )}
            ]
        },
        {
            group: 'SECURITY',
            items: [
                { name: 'Safety & Security', href: '/resources/safety', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                )}
            ]
        },
        {
            group: 'SUPPORT',
            items: [
                { name: 'Help Center', href: '/help', icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                )}
            ]
        }
    ];

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
                                const isActive = pathname === item.href;
                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
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
