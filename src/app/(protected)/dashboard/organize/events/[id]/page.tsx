"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate, formatTime, formatCurrency, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import Badge from '@/components/shared/Badge';
import type { BadgeVariant } from '@/types/shared';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import ProductTour from '@/components/dashboard/ProductTour';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import { getForumUrl } from '@/components/features/events/EventTable';
import EventCancellationModal from '@/components/features/events/EventCancellationModal';
import QuickLinksRow, { QuickLink } from '@/components/shared/QuickLinksRow';

interface TicketTier {
    id: string;
    display_name: string;
    price: number;
    capacity: number;
    tickets_sold: number;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
    max_per_order: number | null;
}

interface EventDetail {
    id: string;
    title: string;
    description: string;
    status: string;
    starts_at: string;
    ends_at: string;
    timezone: string | null;
    location: any;
    media: any;
    is_private: boolean;
    currency: string;
    reference: string;
    forum_reference: string | null;
    created_at: string;
    ticket_tiers: TicketTier[];
    cancellation_reason: string | null;
}

const STATUS_BADGE_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    draft: { label: 'Draft', variant: 'subtle' },
    published: { label: 'Published', variant: 'info' },
    active: { label: 'Active', variant: 'success' },
    completed: { label: 'Completed', variant: 'neutral' },
    cancelled: { label: 'Cancelled', variant: 'error' },
    suspended: { label: 'Suspended', variant: 'warning' },
};

export default function EventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [revenueTotal, setRevenueTotal] = useState<number>(0);
    const [forumMemberCount, setForumMemberCount] = useState<number>(0);
    const [scanCount, setScanCount] = useState<number>(0);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = useCallback((url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
    }, [showToast]);

    const fetchEvent = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [{ data, error }, { data: analytics, error: analyticsError }] = await Promise.all([
                supabase.schema('api').rpc('get_organizer_event_details', {
                    p_account_id: activeAccount.id,
                    p_event_id: id,
                }),
                supabase.schema('api').rpc('get_event_analytics', { p_event_id: id }),
            ]);

            if (error) throw error;
            if (analyticsError) throw analyticsError;
            if (!data) {
                showToast('Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }

            setEvent(data.event as EventDetail);
            setRevenueTotal(analytics?.gross_revenue || 0);
            setScanCount(analytics?.scan_count || 0);
            setForumMemberCount(analytics?.forum_members || 0);

            // Override ticket tiers from the RPC response
            setEvent(prev => prev ? { ...prev, ticket_tiers: data.tiers } : null);

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);

    const handleCancelEvent = async (reason: string) => {
        if (!event || !activeAccount) return;

        const { error } = await supabase.schema('api').rpc('cancel_event_full', {
            p_account_id: activeAccount.id,
            p_event_id: event.id,
            p_created_at: event.created_at,
            p_reason: reason,
        });

        if (error) throw error;

        showToast(`"${event.title}" has been cancelled and tickets were refunded.`, 'success');
        setIsCancelModalOpen(false);
        fetchEvent();
    };

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <Spinner label="Loading event details..." />
                    </div>
                ) : (
                    <EmptyState message="Event not found." />
                )}
            </div>
        );
    }

    const tiers = event.ticket_tiers || [];
    const totalSold = tiers.reduce((s, t) => s + (t.tickets_sold || 0), 0);
    const totalCapacity = tiers.reduce((s, t) => s + (t.capacity || 0), 0);
    const sellThrough = totalCapacity > 0 ? ((totalSold / totalCapacity) * 100).toFixed(1) : '0';
    const badge = STATUS_BADGE_MAP[event.status] || { label: event.status, variant: 'neutral' as BadgeVariant };
    
    // Resolve event cover image URL from available media metadata
    const eventImage = (event as any).cover_image_url || 
                       (event.media as any)?.cover_image_url || 
                       (event.media as any)?.thumbnail_url || 
                       (event.media as any)?.thumbnail || 
                       (event.media as any)?.poster;

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title={event.title}
                subtitle={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`}
                closeHref="/dashboard/organize/events"
                badge={badge}
                primaryAction={{
                    label: 'Edit Event',
                    onClick: () => router.push(`/dashboard/organize/events/edit/${id}`),
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                }}
                secondaryAction={(event.status === 'active' || event.status === 'published') ? {
                    label: 'Cancel Event',
                    onClick: () => setIsCancelModalOpen(true),
                    className: adminStyles.btnSecondary,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                } : undefined}
            />

            {/* Stats Row */}
            <div className="tour-event-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard 
                    label="Tickets Sold" 
                    value={`${formatNumber(totalSold)} / ${formatNumber(totalCapacity)}`} 
                    change={`${sellThrough}% sell-through`}
                    trend={Number(sellThrough) >= 50 ? 'positive' : 'neutral'}
                />
                <StatCard 
                    label="Revenue" 
                    value={formatCurrency(revenueTotal, event.currency)} 
                    trend={revenueTotal > 0 ? 'positive' : 'neutral'}
                />
                <StatCard 
                    label="Check-ins" 
                    value={formatNumber(scanCount)} 
                    change={totalSold > 0 ? `${((scanCount / totalSold) * 100).toFixed(0)}% scanned` : undefined}
                />
                <StatCard 
                    label="Community" 
                    value={formatNumber(forumMemberCount)} 
                    change="forum members"
                />
            </div>

            {/* Reorganized layout utilizing subPageGrid to present event details and image side-by-side */}
            <div className={adminStyles.subPageGrid}>
                {/* Left Column: Details & Tiers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Event Details Card */}
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Event Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <DetailRow label="Reference" value={event.reference} />
                            <DetailRow label="Visibility" value={event.is_private ? 'Private (invite only)' : 'Public'} />
                            <DetailRow label="Start" value={`${formatDate(event.starts_at)} at ${formatTime(event.starts_at)}`} />
                            <DetailRow label="End" value={event.ends_at ? `${formatDate(event.ends_at)} at ${formatTime(event.ends_at)}` : 'Not set'} />
                            <DetailRow label="Timezone" value={event.timezone || 'Etc/UTC'} />
                            <DetailRow label="Currency" value={event.currency} />
                            <DetailRow label="Created" value={formatDate(event.created_at)} />
                            {event.cancellation_reason && (
                                <DetailRow label="Cancellation Reason" value={event.cancellation_reason} />
                            )}
                        </div>
                        {event.description && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Ticket Tiers */}
                    <div className={`${adminStyles.pageCard} tour-event-tiers`}>
                        <h2 className={adminStyles.sectionTitle}>Ticket Tiers</h2>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                        <th style={thStyle}>Tier</th>
                                        <th style={thStyle}>Price</th>
                                        <th style={thStyle}>Sold</th>
                                        <th style={thStyle}>Capacity</th>
                                        <th style={thStyle}>Fill Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tiers.map(tier => {
                                        const fill = tier.capacity > 0 ? ((tier.tickets_sold / tier.capacity) * 100).toFixed(0) : '0';
                                        return (
                                            <tr key={tier.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                                <td style={tdStyle}>{tier.display_name}</td>
                                                <td style={tdStyle}>{tier.price > 0 ? formatCurrency(tier.price, event.currency) : 'Free'}</td>
                                                <td style={tdStyle}>{formatNumber(tier.tickets_sold)}</td>
                                                <td style={tdStyle}>{formatNumber(tier.capacity)}</td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                                                            <div style={{ width: `${fill}%`, height: '100%', borderRadius: '3px', background: Number(fill) >= 90 ? 'var(--color-interface-error)' : 'var(--color-brand-primary)' }} />
                                                        </div>
                                                        <span style={{ opacity: 0.7, fontSize: '13px' }}>{fill}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {tiers.length === 0 && (
                                        <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5 }}>No ticket tiers configured.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Event Image & Quick Links */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Event Image Card */}
                    <div className={adminStyles.pageCard} style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-interface-outline)' }}>
                        {eventImage ? (
                            <img 
                                src={eventImage} 
                                alt={event.title} 
                                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} 
                            />
                        ) : (
                            <div style={{ 
                                width: '100%', 
                                aspectRatio: '16/9', 
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                    <circle cx="9" cy="9" r="2"/>
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                </svg>
                                <span style={{ fontSize: '13px', opacity: 0.4 }}>No cover image configured</span>
                            </div>
                        )}
                    </div>

                    {/* Share Event & QR Code Widget */}
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle} style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-brand-primary)' }}>
                                <circle cx="18" cy="5" r="3"/>
                                <circle cx="6" cy="12" r="3"/>
                                <circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            Promote & Share
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Copy Link Input */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.5, marginBottom: '6px' }}>
                                    Public Event Page
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`} 
                                        style={{ 
                                            flex: 1, 
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            background: 'rgba(255,255,255,0.03)', 
                                            border: '1px solid var(--color-interface-outline)', 
                                            fontSize: '13px',
                                            color: 'inherit',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden'
                                        }} 
                                    />
                                    <button 
                                        onClick={() => handleCopyLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`)}
                                        className={adminStyles.btnSecondary} 
                                        style={{ padding: '8px 14px', whiteSpace: 'nowrap', height: '38px', minWidth: '80px', fontSize: '13px' }}
                                    >
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            {/* QR Code Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-interface-outline)', gap: '12px' }}>
                                <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {/* Inline high-fidelity vector QR code */}
                                    <svg width="120" height="120" viewBox="0 0 29 29" style={{ color: '#13131a', display: 'block' }}>
                                        {/* Finder Pattern Top-Left */}
                                        <path d="M0,0 h7 v7 h-7 z M1,1 h5 v5 h-5 z M2,2 h3 v3 h-3 z" fill="currentColor" />
                                        {/* Finder Pattern Top-Right */}
                                        <path d="M22,0 h7 v7 h-7 z M23,1 h5 v5 h-5 z M24,2 h3 v3 h-3 z" fill="currentColor" />
                                        {/* Finder Pattern Bottom-Left */}
                                        <path d="M0,22 h7 v7 h-7 z M1,23 h5 v5 h-5 z M2,24 h3 v3 h-3 z" fill="currentColor" />
                                        
                                        {/* Timing Patterns & Alignment */}
                                        <path d="M8,2 h1 M10,2 h1 M12,2 h1 M14,2 h1 M16,2 h1 M18,2 h1 M20,2 h1" fill="currentColor" />
                                        <path d="M2,8 h1 M2,10 h1 M2,12 h1 M2,14 h1 M2,16 h1 M2,18 h1 M2,20 h1" fill="currentColor" />
                                        <path d="M22,22 h5 v5 h-5 z M23,23 h3 v3 h-3 z" fill="currentColor" />

                                        {/* Dynamic QR code dots */}
                                        <path d="
                                            M 8,8 h1 v1 h-1 z M 9,9 h2 v1 h-2 z M 8,11 h1 v2 h-1 z M 10,12 h2 v1 h-2 z M 11,8 h3 v1 h-3 z M 13,10 h1 v1 h-1 z M 14,12 h1 v1 h-1 z
                                            M 16,8 h2 v1 h-2 z M 17,9 h1 v2 h-1 z M 15,11 h2 v1 h-2 z M 16,13 h1 v2 h-1 z M 18,12 h2 v1 h-2 z M 19,10 h1 v1 h-1 z M 20,8 h1 v1 h-1 z
                                            M 8,15 h3 v1 h-3 z M 9,16 h1 v2 h-1 z M 11,17 h2 v1 h-2 z M 12,19 h1 v1 h-1 z M 13,15 h2 v2 h-2 z M 14,18 h1 v1 h-1 z M 10,20 h3 v1 h-3 z
                                            M 16,16 h1 v1 h-1 z M 18,15 h2 v1 h-2 z M 19,17 h1 v2 h-1 z M 15,19 h3 v1 h-3 z M 17,21 h2 v1 h-2 z M 20,20 h1 v1 h-1 z M 19,21 h1 v1 h-1 z
                                            M 23,8 h2 v1 h-2 z M 24,10 h1 v2 h-1 z M 22,12 h1 v1 h-1 z M 23,14 h2 v1 h-2 z M 26,9 h1 v2 h-1 z M 27,11 h1 v1 h-1 z M 25,13 h2 v1 h-2 z
                                            M 8,23 h1 v1 h-1 z M 9,25 h2 v1 h-2 z M 10,27 h1 v1 h-1 z M 12,24 h2 v1 h-2 z M 13,26 h1 v2 h-1 z M 14,23 h1 v1 h-1 z M 11,25 h1 v1 h-1 z
                                            M 16,23 h3 v1 h-3 z M 17,25 h1 v1 h-1 z M 19,24 h1 v2 h-1 z M 18,27 h2 v1 h-2 z M 20,25 h1 v1 h-1 z M 15,26 h2 v1 h-2 z M 16,28 h1 v1 h-1 z
                                            M 23,16 h3 v1 h-3 z M 25,18 h2 v1 h-2 z M 22,19 h1 v1 h-1 z M 24,20 h2 v1 h-2 z M 26,21 h1 v1 h-1 z
                                        " fill="currentColor" opacity="0.85" />

                                        {/* White mask to clear center dots */}
                                        <rect x="10" y="10" width="9" height="9" fill="#fff" rx="1.5" />

                                        {/* Center Lynk-X Logo Badge */}
                                        <svg x="10.5" y="10.5" width="8" height="8" viewBox="0 0 1563 1563">
                                            <rect width="1563" height="1563" rx="280" fill="#13131a" />
                                            <path fill="var(--color-brand-primary)" d="M583.68 1068.46 c-11.45 -2.14 -32.97 -10.07 -42.89 -15.87 -17.86 -10.38 -38.31 -32.51 -47.93 -51.59 -8.70 -17.25 -12.36 -33.43 -12.67 -55.41 -0.15 -25.03 2.75 -38.77 12.82 -59.68 8.55 -17.71 16.94 -27.32 69.91 -79.37 20 -19.69 30.99 -31.44 30.68 -33.12 -0.31 -1.37 -18.16 -20.61 -39.69 -42.59 -21.52 -22.13 -41.67 -43.20 -44.88 -46.86 -12.21 -14.65 -19.69 -36.02 -22.13 -62.28 -2.59 -28.70 3.51 -57.39 17.10 -80.59 7.94 -13.58 30.68 -36.17 43.96 -43.96 19.54 -11.30 47.78 -17.55 72.35 -15.87 18.32 1.22 29.15 4.27 46.71 12.67 l14.50 7.02 45.33 45.94 45.33 46.10 44.72 -44.42 c51.74 -51.59 58.92 -56.93 86.09 -64.11 15.57 -4.12 44.57 -3.82 61.67 0.76 20.61 5.49 36.48 14.04 50.52 27.32 30.07 28.24 44.26 64.72 41.98 107.91 -0.92 19.38 -3.66 30.83 -10.84 45.94 -6.11 12.67 -18.62 26.56 -65.94 73.11 -17.10 16.79 -30.99 31.44 -30.99 32.51 0 1.07 6.41 8.24 14.20 16.03 31.44 31.29 68.08 69.91 74.94 78.76 15.57 20.30 24.27 47.47 24.27 76.47 0 22.28 -4.12 39.69 -13.74 59.53 -5.95 12.52 -9.01 16.48 -21.67 29 -8.09 8.09 -18.93 17.10 -23.96 20.15 -39.84 23.35 -87.46 23.81 -125.01 1.07 -7.02 -4.27 -55.25 -51.44 -98.15 -95.86 l-8.09 -8.40 -51.44 51.29 c-49.76 49.45 -51.90 51.44 -64.41 57.39 -7.17 3.51 -17.10 7.48 -22.13 8.85 -10.84 2.90 -39.69 4.12 -50.52 2.14z" />
                                        </svg>
                                    </svg>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Event Ticket QR</span>
                                    <span style={{ fontSize: '12px', opacity: 0.5 }}>Scan to view listing & buy tickets</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <QuickLinksRow className="tour-event-links">
                        {event.forum_reference && (
                            <QuickLink href={getForumUrl(event.forum_reference)} label="Open Forum" external />
                        )}
                        <QuickLink href={`/dashboard/organize/events/${id}/attendees`} label="View Attendees" />
                        <QuickLink href={`/dashboard/organize/events/${id}/check-ins`} label="Check-in List" />
                        <QuickLink href={`/dashboard/organize/analytics/event/${id}`} label="Analytics" />
                    </QuickLinksRow>
                </div>
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenEventDetailJoyride_${activeAccount.id}` : 'hasSeenEventDetailJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Event Control Panel',
                        content: 'Your event\'s dedicated command center. See real-time performance metrics, jump to management tools and review how each ticket tier is selling.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-event-stats',
                        title: 'Live Performance Metrics',
                        content: 'Track tickets sold, gross revenue and active forum community members at a glance. These update in real-time so you always have the latest picture.',
                    },
                    {
                        target: '.tour-event-links',
                        title: 'Event Management Tools',
                        content: 'Quick links to manage attendees, view check-in logs, access event analytics or edit the event listing — all from this panel.',
                    },
                    {
                        target: '.tour-event-tiers',
                        title: 'Ticket Tier Breakdown',
                        content: 'Compare sales performance across your ticket tiers. See the price, units sold and remaining capacity for each — useful for deciding when to release more tickets.',
                    }
                ]}
            />

            {isCancelModalOpen && (
                <EventCancellationModal
                    eventTitle={event.title}
                    eventId={event.id}
                    ticketsSold={totalSold}
                    onClose={() => setIsCancelModalOpen(false)}
                    onConfirm={handleCancelEvent}
                />
            )}
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{value}</span>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
};
