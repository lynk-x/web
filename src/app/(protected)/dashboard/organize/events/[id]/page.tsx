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

/**
 * Event detail control panel page for organizers. Displays live performance analytics,
 * quick action links, public event URL sharing, ticket tier breakdown, and community forum links.
 */
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
    const [inviteEmail, setInviteEmail] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [inviteError, setInviteError] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvImporting, setCsvImporting] = useState(false);

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

    const handleSendIndividualInvite = async () => {
        if (!event || !activeAccount) return;
        const email = inviteEmail.trim();
        const phone = invitePhone.trim();
        if (!email) {
            setInviteError('Email is required to send the invite.');
            setInviteStatus('error');
            return;
        }

         setInviteStatus('sending');
        setInviteError('');

        try {
            const { data: forumRow, error: forumError } = await supabase
                .schema('api')
                .from('v1_forums')
                .select('id')
                .eq('event_id', event.id)
                .maybeSingle();

            if (forumError) throw forumError;

            if (forumRow?.id) {
                const { error: inviteError } = await supabase.schema('social').rpc('invite_to_forum', {
                    p_forum_id: forumRow.id,
                    p_user_handle: phone || email,
                    p_role_id: 'member',
                });

                if (inviteError) throw inviteError;
            }

            setInviteStatus('sent');
            setInviteEmail('');
            setInvitePhone('');
            showToast('Invite sent successfully.', 'success');
        } catch (err: unknown) {
            const message = getErrorMessage(err) || 'Failed to send invite.';
            setInviteError(message);
            setInviteStatus('error');
            showToast(message, 'error');
        }
    };

    const handleCsvImport = async () => {
        if (!csvFile || !event || !activeAccount) return;
        setCsvImporting(true);
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').filter((line) => line.trim());
            if (lines.length < 2) {
                showToast('CSV must contain a header row and at least one attendee.', 'warning');
                return;
            }

            const header = lines[0].split(',').map((col) => col.trim().toLowerCase());
            const emailIdx = header.findIndex((col) => col === 'email');
            const phoneIdx = header.findIndex((col) => col === 'phone');

            if (emailIdx === -1) {
                showToast('CSV must contain an "email" column.', 'warning');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            const { data: forumRow, error: forumError } = await supabase
                .schema('api')
                .from('v1_forums')
                .select('id')
                .eq('event_id', event.id)
                .maybeSingle();

            if (forumError) throw forumError;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                const email = cols[emailIdx]?.trim();
                const phone = phoneIdx !== -1 ? cols[phoneIdx]?.trim() : '';

                if (!email) {
                    failCount++;
                    continue;
                }

                if (!forumRow?.id) {
                    failCount++;
                    continue;
                }

                try {
                    const { error: inviteError } = await supabase.schema('social').rpc('invite_to_forum', {
                        p_forum_id: forumRow.id,
                        p_user_handle: phone || email,
                        p_role_id: 'member',
                    });

                    if (inviteError) {
                        failCount++;
                        continue;
                    }

                    successCount++;
                } catch {
                    failCount++;
                }
            }

            setCsvFile(null);
            showToast(`Import complete. ${successCount} invites sent, ${failCount} failed.`, successCount > 0 ? 'success' : 'error');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to import CSV.', 'error');
        } finally {
            setCsvImporting(false);
        }
    };

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                        <Spinner label="Loading event details..." centered />
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
                subtitle="Manage event details, monitor ticket sales and track live performance analytics."
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

            {/* Quick Links */}
            <QuickLinksRow className="tour-event-links">
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <QuickLink href={`/dashboard/organize/events/${id}/tiers`} label="Manage Ticket Tiers" />
                    <QuickLink href={`/dashboard/organize/events/${id}/attendees`} label="View Attendees" />
                    <QuickLink href={`/dashboard/organize/events/${id}/check-ins`} label="Check-in List" />
                    <QuickLink href={`/dashboard/organize/analytics/event/${id}`} label="Analytics" />
                </div>
                {event && (
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
                        <span style={{ fontSize: '11px', opacity: 0.5, fontWeight: 600, marginRight: '2px', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>EVENT LINK</span>
                        <a 
                            href={`/event/${event.reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open event details page"
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
                            {`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`}
                        </a>
                        <button 
                            onClick={() => handleCopyLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.reference}`)}
                            className={adminStyles.btnSecondary} 
                            style={{ padding: '6px 12px', whiteSpace: 'nowrap', height: '28px', fontSize: '12px', borderRadius: '6px' }}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                )}
            </QuickLinksRow>

            {/* Reorganized layout utilizing subPageGrid to present event details and community forum side-by-side */}
            <div className={adminStyles.subPageGrid}>
                {/* Left Column: Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Event Details Card */}
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Event Details</h2>
                        
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                            {/* Left Side: Event Image */}
                            <div style={{ flex: '1 1 300px', maxWidth: '360px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--color-interface-outline)' }}>
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
                            
                            {/* Right Side: Details Items */}
                            <div style={{ flex: '2 1 320px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
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
                            </div>
                        </div>

                        {event.description && (
                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                <p style={{ fontSize: '13px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</p>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', opacity: 0.8, whiteSpace: 'pre-wrap' }}>{event.description}</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Right Column: Community Forum */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Community Forum Card */}
                    {event.forum_reference && (
                        <div className={adminStyles.pageCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-brand-primary)' }}>
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    Community Forum
                                </h3>
                                <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', lineHeight: '1.5' }}>
                                    Engage with your attendees, host live Q&As and coordinate event logistics directly in a private forum workspace.
                                </p>
                            </div>

                            <a 
                                href={getForumUrl(event.forum_reference)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={adminStyles.btnPrimary}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', textDecoration: 'none', height: '38px', fontSize: '13px', borderRadius: '8px' }}
                            >
                                Open Forum
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="7" y1="17" x2="17" y2="7"></line>
                                    <polyline points="7 7 17 7 17 17"></polyline>
                                </svg>
                            </a>
                        </div>
                    )}
                {/* Invite Attendees Card */}
                <div className={adminStyles.pageCard} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-brand-primary)' }}>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Invite Attendees
                        </h3>
                        <p style={{ fontSize: '13px', opacity: 0.6, margin: '8px 0 0', lineHeight: '1.5' }}>
                            Send individual invites or import a CSV to add attendees to the forum.
                        </p>
                    </div>

                    {/* Individual Invite */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input
                                type="email"
                                placeholder="attendee@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: 'var(--color-utility-primaryText)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <input
                                type="tel"
                                placeholder="+254 712 345 678"
                                value={invitePhone}
                                onChange={(e) => setInvitePhone(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    color: 'var(--color-utility-primaryText)',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        {inviteError && (
                            <p style={{ fontSize: '12px', color: '#ff6b6b', margin: 0 }}>{inviteError}</p>
                        )}
                        <button
                            onClick={handleSendIndividualInvite}
                            disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                            style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                backgroundColor: 'var(--color-brand-primary)',
                                color: 'var(--color-utility-secondaryText)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '13px',
                                opacity: inviteStatus === 'sending' ? 0.6 : 1,
                                alignSelf: 'flex-start'
                            }}
                        >
                            {inviteStatus === 'sending' ? 'Sending...' : inviteStatus === 'sent' ? 'Sent!' : 'Send Invite'}
                        </button>
                    </div>

                    {/* CSV Import */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>
                            CSV format: <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>email,phone</code>
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label
                                htmlFor="forum-csv-import"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px dashed rgba(255,255,255,0.25)',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                {csvFile ? csvFile.name : 'Choose CSV'}
                            </label>
                            <input
                                id="forum-csv-import"
                                type="file"
                                accept=".csv"
                                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={handleCsvImport}
                                disabled={!csvFile || csvImporting}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    color: 'var(--color-utility-primaryText)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    opacity: csvImporting ? 0.5 : 1
                                }}
                            >
                                {csvImporting ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </div>
                </div>
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
