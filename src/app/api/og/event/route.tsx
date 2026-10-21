/**
 * Dynamic Event Open Graph Image Generator — generates 1200 × 630 px branded
 * social share cards for public Lynk-X events using next/og (Satori).
 *
 * Query parameters:
 *   reference - Unique event reference code (e.g. 'SUMMIT26'). When present,
 *               event details, cover image and lowest ticket price are fetched
 *               from api.v1_event_detail.
 *   title     - Optional override or fallback title.
 *   date      - Optional override date string.
 *   venue     - Optional override venue or city name.
 *   price     - Optional override price label (e.g. 'From KES 500' or 'Free RSVP').
 *   category  - Optional override category badge text.
 *   cover     - Optional override cover image URL.
 *
 * Used by event detail metadata (openGraph.images and twitter.images) for rich
 * previews across WhatsApp, X (Twitter), Facebook, LinkedIn and iMessage.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@/utils/supabase/server';
import { getEventImage } from '@/utils/eventImage';

export const runtime = 'nodejs';

// Load transparent combined logo for high-speed local node rendering
let COMBINED_LOGO_DATA_URI = '';
try {
    const logoFilePath = path.join(process.cwd(), 'public', 'lynk-x_combined_logo.svg');
    if (fs.existsSync(logoFilePath)) {
        const svgContent = fs.readFileSync(logoFilePath, 'utf8');
        COMBINED_LOGO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    }
} catch {
    COMBINED_LOGO_DATA_URI = '/lynk-x_combined_logo.svg';
}

/**
 * Format ISO datetime string into a readable date label (e.g. "Sat, 24 Oct 2026").
 */
function formatEventDate(dateStr?: string | null): string {
    if (!dateStr) return 'Upcoming Date';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Upcoming Date';
        return d.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return 'Upcoming Date';
    }
}

/**
 * Format ISO datetime string into a 12-hour time string (e.g. "7:00 PM").
 */
function formatEventTime(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return '';
    }
}

/**
 * Parse location JSON or string into a clean display venue.
 */
function formatLocation(location: unknown): string {
    if (!location) return 'Venue Announced Soon';
    if (typeof location === 'string') {
        try {
            const parsed = JSON.parse(location);
            if (parsed.is_online) return 'Online Event';
            return parsed.name || parsed.address || 'Venue Announced Soon';
        } catch {
            return location;
        }
    }
    if (typeof location === 'object' && location !== null) {
        const loc = location as Record<string, any>;
        if (loc.is_online) return 'Online Event';
        return loc.name || loc.address || 'Venue Announced Soon';
    }
    return 'Venue Announced Soon';
}

/**
 * Formats starting price or RSVP status for display badge.
 */
function formatPriceBadge(lowPrice?: number | null, currency?: string | null): string {
    if (lowPrice === 0) return 'Free RSVP';
    if (typeof lowPrice === 'number' && lowPrice > 0) {
        const curr = currency || 'KES';
        return `From ${curr} ${lowPrice.toLocaleString()}`;
    }
    return 'Tickets on Lynk-X';
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    // Default card values
    let title = searchParams.get('title') || 'Discover Events on Lynk-X';
    let dateStr = searchParams.get('date') || '';
    let timeStr = '';
    let venueStr = searchParams.get('venue') || 'Live on Lynk-X';
    let priceStr = searchParams.get('price') || 'Tickets Available';
    let categoryStr = searchParams.get('category') || 'EVENT';
    let coverUrl = searchParams.get('cover') || '';
    let organizerStr = '';

    // If an event reference was supplied, hydrate from Supabase
    if (reference) {
        try {
            const supabase = await createClient();
            const { data: event } = await supabase
                .schema('api')
                .from('v1_event_detail')
                .select('title, starts_at, start_datetime, location, media, cover_image_url, category, organizer_name, low_price, currency')
                .eq('reference', reference)
                .single();

            if (event) {
                if (event.title) title = event.title;
                const rawDate = event.starts_at || event.start_datetime;
                dateStr = formatEventDate(rawDate);
                timeStr = formatEventTime(rawDate);
                venueStr = formatLocation(event.location);
                priceStr = formatPriceBadge(event.low_price, event.currency);
                if (event.category) categoryStr = event.category.toUpperCase();
                if (event.organizer_name) organizerStr = event.organizer_name;

                const resolvedImage = getEventImage(event);
                if (resolvedImage) {
                    coverUrl = resolvedImage;
                }
            }
        } catch {
            // Fail gracefully to query parameters or fallback values
        }
    }

    if (!dateStr) {
        dateStr = 'Upcoming Event';
    }

    const displayUrl = reference ? `lynk-x.app/event/${reference.toLowerCase()}` : 'lynk-x.app';
    const hasCover = Boolean(coverUrl);

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    backgroundColor: '#09090B',
                    backgroundImage:
                        'radial-gradient(circle at 85% 15%, rgba(32, 249, 40, 0.12) 0%, transparent 45%), radial-gradient(circle at 15% 90%, rgba(249, 201, 32, 0.08) 0%, transparent 40%)',
                    padding: '52px 60px',
                    fontFamily: 'sans-serif',
                    color: '#FFFFFF',
                    boxSizing: 'border-box',
                }}
            >
                {/* Header row: Brand mark + Category pill */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Lynk-X Combined Brand Logo */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={COMBINED_LOGO_DATA_URI || '/lynk-x_combined_logo.svg'}
                            alt="Lynk-X"
                            height="76"
                            style={{
                                height: '76px',
                                objectFit: 'contain',
                            }}
                        />
                        {organizerStr ? (
                            <span
                                style={{
                                    fontSize: '18px',
                                    color: '#A1A1AA',
                                    fontWeight: 500,
                                }}
                            >
                                presents
                            </span>
                        ) : null}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: 'rgba(32, 249, 40, 0.12)',
                            border: '1px solid rgba(32, 249, 40, 0.35)',
                            padding: '8px 18px',
                            borderRadius: '9999px',
                            fontSize: '15px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: '#20F928',
                            textTransform: 'uppercase',
                        }}
                    >
                        <span>{categoryStr}</span>
                    </div>
                </div>

                {/* Main Body: Event Content & Visual */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '40px',
                        width: '100%',
                        flex: 1,
                        margin: '28px 0',
                    }}
                >
                    {/* Left text column */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            flex: 1,
                            maxWidth: hasCover ? '560px' : '100%',
                        }}
                    >
                        {/* Title */}
                        <div
                            style={{
                                fontSize: title.length > 45 ? '42px' : '48px',
                                fontWeight: 800,
                                lineHeight: 1.15,
                                color: '#FFFFFF',
                                letterSpacing: '-0.025em',
                                marginBottom: '24px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {title}
                        </div>

                        {/* Metadata pills stack */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* Date & Time Row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '20px',
                                    color: '#E4E4E7',
                                    fontWeight: 600,
                                }}
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: '#1C1D24',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <rect
                                            x="3"
                                            y="4"
                                            width="18"
                                            height="18"
                                            rx="2"
                                            stroke="#20F928"
                                            strokeWidth="2"
                                        />
                                        <path d="M16 2V6M8 2V6M3 10H21" stroke="#20F928" strokeWidth="2" />
                                    </svg>
                                </div>
                                <span>{dateStr}</span>
                                {timeStr ? <span style={{ color: '#71717A' }}>•</span> : null}
                                {timeStr ? <span style={{ color: '#A1A1AA' }}>{timeStr}</span> : null}
                            </div>

                            {/* Venue / City Row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '20px',
                                    color: '#E4E4E7',
                                    fontWeight: 600,
                                }}
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: '#1C1D24',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z"
                                            stroke="#F9C920"
                                            strokeWidth="2"
                                        />
                                        <circle cx="12" cy="9" r="3" stroke="#F9C920" strokeWidth="2" />
                                    </svg>
                                </div>
                                <span
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {venueStr}
                                </span>
                            </div>

                            {/* Price / RSVP Pill */}
                            <div style={{ display: 'flex', marginTop: '6px' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        backgroundColor: '#181922',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '17px',
                                        fontWeight: 700,
                                        color: '#20F928',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M3 9V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V9C19.8954 9 19 9.89543 19 11C19 12.1046 19.8954 13 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C4.10457 13 5 12.1046 5 11C5 9.89543 4.10457 9 3 9Z"
                                            stroke="#20F928"
                                            strokeWidth="2"
                                        />
                                    </svg>
                                    <span>{priceStr}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right column: Event Cover Image (or decorative frame) */}
                    {hasCover ? (
                        <div
                            style={{
                                display: 'flex',
                                width: '480px',
                                height: '270px',
                                borderRadius: '18px',
                                overflow: 'hidden',
                                border: '2px solid rgba(255, 255, 255, 0.15)',
                                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                                backgroundColor: '#13141C',
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={coverUrl}
                                alt={title}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '440px',
                                height: '260px',
                                borderRadius: '18px',
                                backgroundColor: '#12131C',
                                border: '1px dashed rgba(32, 249, 40, 0.35)',
                                padding: '24px',
                                textAlign: 'center',
                            }}
                        >
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M4 4L20 20M20 4L4 20"
                                    stroke="#20F928"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div
                                style={{
                                    marginTop: '16px',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    color: '#FFFFFF',
                                }}
                            >
                                Event on Lynk-X
                            </div>
                            <div
                                style={{
                                    marginTop: '6px',
                                    fontSize: '14px',
                                    color: '#A1A1AA',
                                }}
                            >
                                RSVP · Chat · Media Wall
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer bar: Benefits strip + Canonical brand domain */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        width: '100%',
                    }}
                >
                    {/* Benefits text — Strictly NO Oxford commas */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '16px',
                            color: '#A1A1AA',
                            fontWeight: 500,
                        }}
                    >
                        <span style={{ color: '#20F928' }}>✓</span>
                        <span>Notified updates</span>
                        <span style={{ color: '#52525B' }}>•</span>
                        <span style={{ color: '#20F928' }}>✓</span>
                        <span>Dedicated live chat</span>
                        <span style={{ color: '#52525B' }}>•</span>
                        <span style={{ color: '#20F928' }}>✓</span>
                        <span>Shared media wall</span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#E4E4E7',
                            letterSpacing: '0.01em',
                        }}
                    >
                        <span>{displayUrl}</span>
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            headers: {
                // Cache dynamic OG cards on edge CDN for 1 hour, stale-while-revalidate for 1 day
                'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
            },
        }
    );
}
