/**
 * Dynamic Event Open Graph Image Generator — generates 1200 × 630 px branded
 * social share cards for public Lynk-X events using sharp (SVG → JPEG).
 *
 * Replaces the previous next/og (Satori + resvg) pipeline so output is a
 * compressed JPEG (~200–400 KB) instead of an uncompressed PNG (~1.9 MB),
 * keeping it under WhatsApp's 600 KB link-preview limit.
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

import sharp from 'sharp';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@/utils/supabase/server';
import { getEventImage } from '@/utils/eventImage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Logo data URI ──────────────────────────────────────────────────────────
let COMBINED_LOGO_SVG = '';
try {
    const logoFilePath = path.join(process.cwd(), 'public', 'lynk-x_combined_logo.svg');
    if (fs.existsSync(logoFilePath)) {
        COMBINED_LOGO_SVG = fs.readFileSync(logoFilePath, 'utf8');
    }
} catch {
    COMBINED_LOGO_SVG = '';
}

// ── Formatters ─────────────────────────────────────────────────────────────
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

function formatPriceBadge(lowPrice?: number | null, currency?: string | null): string {
    if (lowPrice === 0) return 'Free RSVP';
    if (typeof lowPrice === 'number' && lowPrice > 0) {
        const curr = currency || 'KES';
        return `From ${curr} ${lowPrice.toLocaleString()}`;
    }
    return 'Tickets on Lynk-X';
}

// ── SVG builder ────────────────────────────────────────────────────────────
function buildSvg(params: {
    title: string;
    dateStr: string;
    timeStr: string;
    venueStr: string;
    priceStr: string;
    categoryStr: string;
    coverUrl: string;
    organizerStr: string;
    displayUrl: string;
    hasCover: boolean;
    coverBuffer?: Buffer;
}): string {
    const {
        title,
        dateStr,
        timeStr,
        venueStr,
        priceStr,
        categoryStr,
        coverUrl,
        organizerStr,
        displayUrl,
        hasCover,
        coverBuffer,
    } = params;

    const W = 1200;
    const H = 630;
    const pad = 60;
    const innerW = W - pad * 2;
    const titleFontSize = title.length > 45 ? 42 : 48;
    const titleMaxW = hasCover ? 560 : innerW;

    // Escape text for SVG
    const esc = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Cover image embedded as base64 data URI if we fetched it
    const coverImgUri = coverBuffer
        ? `data:image/jpeg;base64,${coverBuffer.toString('base64')}`
        : coverUrl;

    const logoMarkup = COMBINED_LOGO_SVG
        ? `<image href="data:image/svg+xml;utf8,${encodeURIComponent(COMBINED_LOGO_SVG)}" x="0" y="0" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>`
        : `<rect x="0" y="0" width="76" height="76" rx="16" fill="#1C1D24"/><text x="38" y="48" font-family="sans-serif" font-size="24" font-weight="800" fill="#20F928" text-anchor="middle">LX</text>`;

    const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g1" cx="85%" cy="15%" r="45%">
      <stop offset="0%" stop-color="#20F928" stop-opacity="0.12"/>
      <stop offset="45%" stop-color="#20F928" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="15%" cy="90%" r="40%">
      <stop offset="0%" stop-color="#F9C920" stop-opacity="0.08"/>
      <stop offset="40%" stop-color="#F9C920" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#09090B"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>

  <!-- Header -->
  <g transform="translate(${pad}, ${pad})">
    ${logoMarkup}
    ${organizerStr ? `<text x="100" y="56" font-family="sans-serif" font-size="18" font-weight="500" fill="#A1A1AA">${esc(organizerStr)} presents</text>` : ''}
    <g transform="translate(${innerW - 220}, 0)">
      <rect x="0" y="12" rx="24" fill="rgba(32, 249, 40, 0.12)" stroke="rgba(32, 249, 40, 0.35)" stroke-width="1"/>
      <text x="16" y="44" font-family="sans-serif" font-size="15" font-weight="800" fill="#20F928" letter-spacing="0.08em" text-transform="uppercase">${esc(categoryStr)}</text>
    </g>
  </g>

  <!-- Body -->
  <g transform="translate(${pad}, ${pad + 112})">
    <!-- Left text column -->
    <g transform="translate(0, 0)">
      <text x="0" y="0" font-family="sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#FFFFFF" letter-spacing="-0.025em" dominant-baseline="hanging" style="overflow:hidden;">
        <tspan x="0" dy="0" max-width="${titleMaxW}">${esc(title)}</tspan>
      </text>
      <g transform="translate(0, 76)">
        <!-- Date & Time Row -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="32" height="32" rx="8" fill="#1C1D24"/>
          <g transform="translate(7, 7)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#20F928" stroke-width="2"/>
              <path d="M16 2V6M8 2V6M3 10H21" stroke="#20F928" stroke-width="2"/>
            </svg>
          </g>
          <text x="52" y="24" font-family="sans-serif" font-size="20" font-weight="600" fill="#E4E4E7" dominant-baseline="middle">${esc(dateStr)}</text>
          ${timeStr ? `<text x="72" y="24" font-family="sans-serif" font-size="18" fill="#71717A" dominant-baseline="middle">•</text>` : ''}
          ${timeStr ? `<text x="90" y="24" font-family="sans-serif" font-size="18" fill="#A1A1AA" dominant-baseline="middle">${esc(timeStr)}</text>` : ''}
        </g>
        <!-- Venue Row -->
        <g transform="translate(0, 52)">
          <rect x="0" y="0" width="32" height="32" rx="8" fill="#1C1D24"/>
          <g transform="translate(7, 7)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 21C16 17 20 13.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 13.4183 8 17 12 21Z" stroke="#F9C920" stroke-width="2"/>
              <circle cx="12" cy="9" r="3" stroke="#F9C920" stroke-width="2"/>
            </svg>
          </g>
          <text x="52" y="24" font-family="sans-serif" font-size="20" font-weight="600" fill="#E4E4E7" dominant-baseline="middle" style="overflow:hidden;" max-width="400">${esc(venueStr)}</text>
        </g>
        <!-- Price Pill -->
        <g transform="translate(0, 104)">
          <rect x="0" y="0" rx="8" fill="#181922" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1"/>
          <g transform="translate(14, 12)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 9V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V9C19.8954 9 19 9.89543 19 11C19 12.1046 19.8954 13 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C4.10457 13 5 12.1046 5 11C5 9.89543 4.10457 9 3 9Z" stroke="#20F928" stroke-width="2"/>
            </svg>
          </g>
          <text x="38" y="20" font-family="sans-serif" font-size="17" font-weight="700" fill="#20F928" dominant-baseline="middle">${esc(priceStr)}</text>
          <rect x="${38 + 10 + esc(priceStr).length * 9}" y="0" width="1" height="44" fill="rgba(255,255,255,0.12)"/>
        </g>
      </g>
    </g>

    <!-- Right column: Cover or decorative frame -->
    <g transform="translate(${hasCover ? 620 : 600}, 0)">
      ${hasCover ? `
        <rect x="0" y="0" width="480" height="270" rx="18" fill="#13141C" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
        <image href="${coverImgUri}" x="0" y="0" width="480" height="270" preserveAspectRatio="xMidYMid slice"/>
      ` : `
        <rect x="0" y="0" width="440" height="260" rx="18" fill="#12131C" stroke="rgba(32,249,40,0.35)" stroke-width="1" stroke-dasharray="6,6"/>
        <g transform="translate(190, 30)">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M4 4L20 20M20 4L4 20" stroke="#20F928" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </g>
        <text x="220" y="318" font-family="sans-serif" font-size="18" font-weight="700" fill="#FFFFFF" text-anchor="middle">Event on Lynk-X</text>
        <text x="220" y="342" font-family="sans-serif" font-size="14" fill="#A1A1AA" text-anchor="middle">RSVP · Chat · Media Wall</text>
      `}
    </g>
  </g>

  <!-- Footer -->
  <g transform="translate(${pad}, ${H - pad - 56})">
    <line x1="0" y1="0" x2="${innerW}" y2="0" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="0" y="32" font-family="sans-serif" font-size="16" font-weight="500" fill="#A1A1AA">
      <tspan fill="#20F928">✓</tspan> Notified updates
      <tspan x="0" dy="0" fill="#52525B"> • </tspan>
      <tspan fill="#20F928">✓</tspan> Dedicated live chat
      <tspan x="0" dy="0" fill="#52525B"> • </tspan>
      <tspan fill="#20F928">✓</tspan> Shared media wall
    </text>
    <text x="${innerW}" y="32" font-family="sans-serif" font-size="18" font-weight="700" fill="#E4E4E7" text-anchor="end" letter-spacing="0.01em">${esc(displayUrl)}</text>
  </g>
</svg>
    `.trim();

    return svg;
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
    let coverBuffer: Buffer | undefined;

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
                    // Fetch cover image to embed in SVG
                    try {
                        const imgResp = await fetch(coverUrl, { cache: 'force-cache' });
                        if (imgResp.ok) {
                            const arrBuf = await imgResp.arrayBuffer();
                            coverBuffer = Buffer.from(arrBuf);
                        }
                    } catch {
                        // proceed without embedded cover
                    }
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

    const svg = buildSvg({
        title,
        dateStr,
        timeStr,
        venueStr,
        priceStr,
        categoryStr,
        coverUrl,
        organizerStr,
        displayUrl,
        hasCover,
        coverBuffer,
    });

    const jpegBuffer = await sharp(Buffer.from(svg, 'utf8'))
        .jpeg({ quality: 85 })
        .toBuffer();

    return new NextResponse(jpegBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
    });
}
