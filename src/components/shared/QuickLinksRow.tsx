"use client";

import React from 'react';
import Link from 'next/link';

interface QuickLinkProps {
    href: string;
    label: string;
    external?: boolean;
}

/** A single pill-shaped navigation link, used inside a QuickLinksRow. */
export function QuickLink({ href, label, external }: QuickLinkProps) {
    return (
        <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-interface-outline)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-utility-primaryText)',
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }}
        >
            {label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </Link>
    );
}

interface QuickLinksRowProps {
    children: React.ReactNode;
    /** Passed through so ProductTour can target this row (e.g. "tour-event-links"). */
    className?: string;
}

/**
 * Row of pill-shaped quick-navigation links, shown near the top of a detail
 * page (event detail, campaign detail, etc) to jump to related sub-pages.
 */
export default function QuickLinksRow({ children, className }: QuickLinksRowProps) {
    return (
        <div
            className={className}
            style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}
        >
            {children}
        </div>
    );
}
