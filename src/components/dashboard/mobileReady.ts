import type { DashboardMode } from '@/types/shared';

/**
 * Master switch for the phone and tablet dashboard (top bar, bottom tabs, per-page layouts).
 *
 * While false, the events and ads workspaces show the full-screen "Desktop Only" notice below 1024 px, exactly as
 * before the mobile work; the mobile code stays in place and switches on by setting this to true.
 */
export const MOBILE_DASHBOARD_ENABLED = false;

/** True when [mode] gets the mobile shell below 1024 px. Only the events and ads workspaces have one. */
export function usesMobileShell(mode: DashboardMode): boolean {
    return MOBILE_DASHBOARD_ENABLED && (mode === 'events' || mode === 'ads');
}

/**
 * Dashboard routes whose layout has been redesigned for phones and tablets.
 *
 * Below 1024 px every other route shows the non-blocking "better on a larger screen" banner (DesktopHandoff).
 * Add a path here when its page works at phone width; a trailing '*' matches the path and everything under it.
 */
export const MOBILE_READY_PATHS: readonly string[] = [
    '/dashboard/organize', // overview
    '/dashboard/ads', // overview
    '/dashboard/organize/events', // events list
    '/dashboard/ads/campaigns', // campaigns list
    '/dashboard/organize/revenue', // revenue and payouts
    '/dashboard/ads/finance', // finance and ad spend
    '/dashboard/organize/settings', // organizer settings
    '/dashboard/ads/settings', // ads settings
    '/dashboard/organize/analytics', // organizer analytics
    '/dashboard/ads/analytics', // ads analytics
];

/**
 * Pattern entries for routes with a dynamic segment. An event's overview and sub-pages are listed here; the create
 * and edit forms are not, because they stay desktop-first.
 */
const MOBILE_READY_PATTERNS: readonly RegExp[] = [
    /^\/dashboard\/organize\/events\/(?!create$)[^/]+(\/(tiers|attendees|check-ins|promo-codes|refunds|waitlist))?$/,
    /^\/dashboard\/organize\/analytics\/event\/[^/]+$/,
    /^\/dashboard\/ads\/analytics\/campaign\/[^/]+$/,
];

/** True when [pathname] has been redesigned for small screens. */
export function isMobileReady(pathname: string): boolean {
    const normalized = pathname
        .replace(/^\/ads/, '/dashboard/ads');
    return (
        MOBILE_READY_PATHS.some((entry) =>
            entry.endsWith('*') ? normalized.startsWith(entry.slice(0, -1)) : normalized === entry,
        ) || MOBILE_READY_PATTERNS.some((pattern) => pattern.test(normalized))
    );
}
