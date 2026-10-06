import React from 'react';

/**
 * Ecosystem category definitions representing the event and sponsorship verticals
 * powered by Lynk-X.
 *
 * Used by EcosystemTicker as an authentic, zero-trademark social proof display
 * (Option 2: Vertical Category Marquee).
 */
export interface VerticalCategory {
    id: string;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION 3 INTEGRATION GUIDE: REAL ECOSYSTEM PARTNER LOGOS
// ─────────────────────────────────────────────────────────────────────────────
// Once real partner/organizer logos have been approved and sourced (SVG format):
// 1. Set `ENABLE_REAL_ECOSYSTEM_LOGOS = true` below.
// 2. Populate `REAL_ECOSYSTEM_LOGOS` with the partner SVG components or image URLs.
// 3. EcosystemTicker will automatically switch from category badges to the
//    real partner logo strip without touching layout or CSS.
// ─────────────────────────────────────────────────────────────────────────────
export const ENABLE_REAL_ECOSYSTEM_LOGOS = false;

export interface RealEcosystemLogo {
    id: string;
    name: string;
    logoSvg: React.ReactNode;
    websiteUrl?: string;
}

export const REAL_ECOSYSTEM_LOGOS: Record<'organizers' | 'advertisers' | 'attendees', RealEcosystemLogo[]> = {
    organizers: [
        // Example template for when real partner SVGs are supplied:
        // { id: 'partner-1', name: 'Partner Name', logoSvg: <svg ... /> },
    ],
    advertisers: [
        // { id: 'sponsor-1', name: 'Sponsor Brand', logoSvg: <svg ... /> },
    ],
    attendees: [
        // { id: 'festival-1', name: 'Flagship Festival', logoSvg: <svg ... /> },
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE: OPTION 2 VERTICAL CATEGORY MARQUEE DATA
// ─────────────────────────────────────────────────────────────────────────────

export const ORGANIZER_CATEGORIES: VerticalCategory[] = [
    {
        id: 'festivals',
        label: 'Music & Arts Festivals',
        sublabel: 'Multi-stage sync & gate control',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
        ),
    },
    {
        id: 'tech-summits',
        label: 'Tech & Developer Summits',
        sublabel: 'Interactive Q&A & session polls',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
        ),
    },
    {
        id: 'trail-marathons',
        label: 'Outdoor & Trail Marathons',
        sublabel: 'Weather alerts & live itineraries',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
            </svg>
        ),
    },
    {
        id: 'hackathons',
        label: 'Campus Hackathons',
        sublabel: 'Team formation & sandbox links',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
            </svg>
        ),
    },
    {
        id: 'executive-mixers',
        label: 'Executive & Founder Mixers',
        sublabel: 'Pre-event delegate introductions',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        id: 'community-meetups',
        label: 'Community Meetups',
        sublabel: 'Zero app friction & warm RSVPs',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        ),
    },
    {
        id: 'night-markets',
        label: 'Night Markets & Pop-ups',
        sublabel: 'QR gate entries & live broadcasts',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ),
    },
];

export const ADVERTISER_CATEGORIES: VerticalCategory[] = [
    {
        id: 'beverage-brands',
        label: 'Beverage & Consumer Brands',
        sublabel: 'In-venue contextual placements',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
        ),
    },
    {
        id: 'fintech-sponsors',
        label: 'Fintech & Telecom Sponsors',
        sublabel: 'High-intent attendee conversion',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
            </svg>
        ),
    },
    {
        id: 'lifestyle-merch',
        label: 'Lifestyle & Merch Partners',
        sublabel: 'Dedicated festival storefronts',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
        ),
    },
    {
        id: 'production-networks',
        label: 'Audio & Production Networks',
        sublabel: 'Live stream & stage brand sync',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
        ),
    },
    {
        id: 'brand-agencies',
        label: 'Digital Brand Agencies',
        sublabel: 'Verified engagement analytics',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
        ),
    },
    {
        id: 'creator-collectives',
        label: 'Creator & Media Collectives',
        sublabel: 'Shared media wall amplification',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
        ),
    },
];

export const ATTENDEE_CATEGORIES: VerticalCategory[] = [
    {
        id: 'live-music',
        label: 'Live Music Festivals',
        sublabel: 'Artist line-ups & crowd forums',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
        ),
    },
    {
        id: 'outdoor-adventures',
        label: 'Outdoor Adventures & Trails',
        sublabel: 'Carpool coordination & route updates',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
        ),
    },
    {
        id: 'conferences',
        label: 'Developer & Web3 Summits',
        sublabel: 'Pre-event Q&A & attendee networking',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
        ),
    },
    {
        id: 'food-markets',
        label: 'Food Fairs & Night Markets',
        sublabel: 'Vendor menus & instant entrance',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
            </svg>
        ),
    },
    {
        id: 'art-showcases',
        label: 'Art & Creative Showcases',
        sublabel: 'Shared photo feeds and live crowd reactions',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
            </svg>
        ),
    },
    {
        id: 'brand-activations',
        label: 'Brand & Creator Activations',
        sublabel: 'Interactive spaces, exclusive perks and forum buzz',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
            </svg>
        ),
    },
    {
        id: 'sports',
        label: 'Community Sports & Runs',
        sublabel: 'Instant results & photo dropboxes',
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
            </svg>
        ),
    },
];
