"use client";

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The three dashboard modes the sidebar can display. */
export type { DashboardMode } from '@/types/shared';
import type { DashboardMode } from '@/types/shared';

/** A single navigation item rendered in the sidebar. */
export interface NavItem {
    /** Visible label. */
    name: string;
    /** Route the link navigates to. */
    href: string;
    /** 20×20 SVG icon element. */
    icon: React.ReactNode;
    /** Optional permission slug required to see this item. */
    permission?: string;
}

/** A group of navigation items with an optional title. */
export interface NavGroup {
    /** Optional title for the group. */
    title?: string;
    /** List of items in this group. */
    items: NavItem[];
}

// ─── Icon Helpers ────────────────────────────────────────────────────────────
// All sidebar icons are defined here so that Sidebar.tsx stays lean.

/** Shared SVG props for consistency. */
const svgProps = {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
} as const;

// ─── Navigation Items ────────────────────────────────────────────────────────

/**
 * Nav items grouped by domain, keyed by dashboard mode.
 */
export const navGroups: Record<DashboardMode, NavGroup[]> = {
    // ── Organizer (Events) ───────────────────────────────────────────────
    events: [
        {
            items: [
                {
                    name: 'Overview', href: '/dashboard/organize', icon: (
                        <svg {...svgProps}>
                            <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                            <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                            <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                            <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Management',
            items: [
                {
                    name: 'Events', href: '/dashboard/organize/events', permission: 'can_view_events', icon: (
                        <svg {...svgProps}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Revenue', href: '/dashboard/organize/revenue', permission: 'can_view_finance', icon: (
                        <svg {...svgProps}>
                            <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Intelligence',
            items: [
                {
                    name: 'Analytics', href: '/dashboard/organize/analytics', permission: 'can_view_analytics', icon: (
                        <svg {...svgProps}>
                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Configuration',
            items: [
                {
                    name: 'Settings', href: '/dashboard/organize/settings', permission: 'can_manage_roles', icon: (
                        <svg {...svgProps}>
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
    ],

    // ── Ads ──────────────────────────────────────────────────────────────
    ads: [
        {
            items: [
                {
                    name: 'Overview', href: '/dashboard/ads', icon: (
                        <svg {...svgProps}>
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Advertising',
            items: [
                {
                    name: 'Campaigns', href: '/dashboard/ads/campaigns', permission: 'can_manage_ad_campaigns', icon: (
                        <svg {...svgProps}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Analytics', href: '/dashboard/ads/analytics', permission: 'can_view_analytics', icon: (
                        <svg {...svgProps}>
                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Finance',
            items: [
                {
                    name: 'Finance', href: '/dashboard/ads/finance', permission: 'can_view_finance', icon: (
                        <svg {...svgProps}>
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Configuration',
            items: [
                {
                    name: 'Settings', href: '/dashboard/ads/settings', permission: 'can_manage_members', icon: (
                        <svg {...svgProps}>
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
    ],

    // ── Admin ────────────────────────────────────────────────────────────
    admin: [
        {
            items: [
                {
                    name: 'Overview', href: '/dashboard/admin', icon: (
                        <svg {...svgProps}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
                            <line x1="9" y1="21" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    )
                },
                {
                    name: 'Identity', href: '/dashboard/admin/users', permission: 'can_manage_kyc', icon: (
                        <svg {...svgProps}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Events', href: '/dashboard/admin/events', permission: 'can_verify_content', icon: (
                        <svg {...svgProps}>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Forums', href: '/dashboard/admin/forums', permission: 'can_manage_forum', icon: (
                        <svg {...svgProps}>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Campaigns', href: '/dashboard/admin/campaigns', permission: 'can_manage_ad_campaigns', icon: (
                        <svg {...svgProps}>
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Finance', href: '/dashboard/admin/finance', permission: 'can_view_finance', icon: (
                        <svg {...svgProps}>
                            <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Support', href: '/dashboard/admin/support', permission: 'can_view_support', icon: (
                        <svg {...svgProps}>
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Analytics', href: '/dashboard/admin/analytics', permission: 'can_view_analytics', icon: (
                        <svg {...svgProps}>
                            <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Settings', href: '/dashboard/admin/settings', permission: 'can_manage_roles', icon: (
                        <svg {...svgProps}>
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                }
            ]
        }
    ],

    // ── Pulse (Market Intelligence) ────────────────────────────────────
    pulse: [
        {
            items: [
                {
                    name: 'Overview', href: '/dashboard/pulse', permission: 'read:community_pulse', icon: (
                        <svg {...svgProps}>
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Discovery',
            items: [
                {
                    name: 'Explorer', href: '/dashboard/pulse/explorer', permission: 'read:community_pulse', icon: (
                        <svg {...svgProps}>
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Audience', href: '/dashboard/pulse/audience', permission: 'read:community_pulse', icon: (
                        <svg {...svgProps}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Data & Exports',
            items: [
                {
                    name: 'Reports', href: '/dashboard/pulse/reports', permission: 'read:community_pulse', icon: (
                        <svg {...svgProps}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="10 9 9 9 8 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Configuration',
            items: [
                {
                    name: 'Settings', href: '/dashboard/pulse/settings', permission: 'can_manage_members', icon: (
                        <svg {...svgProps}>
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
    ],
    system: [
        {
            items: [
                {
                    name: 'Overview', href: '/dashboard/system', icon: (
                        <svg {...svgProps}>
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                            <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
                            <line x1="9" y1="21" x2="9" y2="9" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    )
                },
                {
                    name: 'Identity & Access (IAM)',
                    href: '/dashboard/system/iam',
                    icon: (
                        <svg {...svgProps}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 13c-2 0-3 1-3 2v1h6v-1c0-1-1-2-3-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Global Registries',
            items: [
                {
                    name: 'Registry', href: '/dashboard/system/registry', icon: (
                        <svg {...svgProps}>
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Compliance', href: '/dashboard/system/compliance', icon: (
                        <svg {...svgProps}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="m9 11 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Finance & Gateways', href: '/dashboard/system/finance', icon: (
                        <svg {...svgProps}>
                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                            <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
                        </svg>
                    )
                },
            ]
        },
        {
            title: 'Operations & Controls',
            items: [
                {
                    name: 'Configurations', href: '/dashboard/system/settings', icon: (
                        <svg {...svgProps}>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Activity', href: '/dashboard/system/operations', icon: (
                        <svg {...svgProps}>
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                },
                {
                    name: 'Operational Proxy', href: '/dashboard/system/proxy', icon: (
                        <svg {...svgProps}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )
                }
            ]
        }
    ],
};
