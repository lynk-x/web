"use client";

import React from 'react';
import Link from 'next/link';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

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

interface CopyableLinkChipProps {
    /** Short uppercase label shown before the link, e.g. "EVENT LINK", "DESTINATION URL". */
    label: string;
    /** The full URL displayed and copied. Also used as the link's href unless `href` is given. */
    url: string;
    /** Href to navigate to on click, if different from `url` (e.g. a relative path vs the copied absolute URL). */
    href?: string;
}

/**
 * Pill-shaped widget pairing a clickable/truncated URL with a copy-to-clipboard
 * button, meant to sit as QuickLinksRow's second child so it's pushed to the
 * opposite side of the row from the grouped QuickLinks.
 */
export function CopyableLinkChip({ label, url, href }: CopyableLinkChipProps) {
    const { copied, copy } = useCopyToClipboard();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--color-interface-outline)',
            borderRadius: '8px',
            padding: '4px 6px 4px 12px',
            height: '40px',
            boxSizing: 'border-box',
            width: '460px',
            maxWidth: '100%',
            flex: '0 1 460px'
        }}>
            <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 600, marginRight: '2px', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>{label}</span>
            <a
                href={href ?? url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${label.toLowerCase()}`}
                style={{
                    flex: 1,
                    fontSize: '13px',
                    color: 'var(--color-utility-primaryText, #ffffff)',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    padding: 0
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
                {url}
            </a>
            <button
                onClick={() => copy(url)}
                className={adminStyles.btnSecondary}
                style={{ padding: '6px 12px', whiteSpace: 'nowrap', height: '28px', fontSize: '12px', borderRadius: '6px' }}
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
}

interface QuickLinksRowProps {
    children: React.ReactNode;
    /** Passed through so ProductTour can target this row (e.g. "tour-event-links"). */
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Row of pill-shaped quick-navigation links, shown near the top of a detail
 * page (event detail, campaign detail, etc) to jump to related sub-pages.
 */
export default function QuickLinksRow({ children, className, style }: QuickLinksRowProps) {
    return (
        <div
            className={className}
            style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '16px', 
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                ...style 
            }}
        >
            {children}
        </div>
    );
}
