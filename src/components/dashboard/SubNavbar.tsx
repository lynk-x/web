'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardShared.module.css';

interface NavItem {
    label: string;
    href: string;
}

interface SubNavbarProps {
    items: NavItem[];
}

export default function SubNavbar({ items }: SubNavbarProps) {
    const pathname = usePathname();

    return (
        <div className={styles.subNavbar}>
            {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`${styles.subNavLink} ${isActive ? styles.subNavLinkActive : ''}`}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
