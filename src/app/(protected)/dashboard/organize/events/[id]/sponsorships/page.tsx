"use client";

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import {
    createSponsorshipsRepository,
    createEventsRepository,
    type SponsorshipOverview,
    type SponsorshipRosterItem,
    type SponsorshipInviteItem,
    type EventRow,
} from '@/lib/repositories';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getErrorMessage } from '@/utils/error';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './sponsorships.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterChips from '@/components/shared/FilterChips';
import Badge, { type BadgeVariant } from '@/components/shared/Badge';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/shared/Modal';
import DirectInviteModal from '@/components/dashboard/DirectInviteModal';

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.6,
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
    verticalAlign: 'middle',
};

/**
 * Unified sponsor record representing contracted sponsors, review requests, and invitations.
 */
interface SponsorRowItem {
    id: string;
    campaign_id?: string;
    sponsor_name: string;
    title: string;
    contact_info: string;
    tier_name: string;
    placement?: string;
    slots?: number;
    amount: number | null;
    currency: string;
    status: 'active' | 'pending_approval' | 'revision_requested' | 'pending' | 'completed' | 'paused' | 'expired' | 'declined' | 'draft';
    impressions: number | null;
    clicks: number | null;
    invite_token: string | null;
    expires_at?: string;
    reference: string | null;
    revision_notes?: string;
    created_at: string;
}

/** Resolves semantic badge presentation for sponsor status. */
function getStatusBadge(status: SponsorRowItem['status']): { label: string; variant: BadgeVariant } {
    switch (status) {
        case 'active':
            return { label: 'Active', variant: 'success' };
        case 'pending_approval':
            return { label: 'Pending Review', variant: 'warning' };
        case 'revision_requested':
            return { label: 'Revision Requested', variant: 'warning' };
        case 'pending':
            return { label: 'Direct Invite', variant: 'neutral' };
        case 'completed':
            return { label: 'Completed', variant: 'info' };
        case 'paused':
            return { label: 'Paused', variant: 'neutral' };
        case 'declined':
            return { label: 'Declined', variant: 'error' };
        case 'expired':
            return { label: 'Expired', variant: 'error' };
        case 'draft':
            return { label: 'Draft', variant: 'neutral' };
        default:
            return { label: status, variant: 'neutral' };
    }
}

/** Format human-readable placement title */
function getPlacementLabel(placement?: string): string {
    if (placement === 'banner') return 'Forum Banner (16:9)';
    if (placement === 'interstitial_video') return 'Video Interstitial (9:16)';
    if (placement === 'interstitial') return 'Entry Interstitial (9:16)';
    return 'Event Sponsorship';
}

/**
 * Sell-side event sponsorships dashboard for organizers (Single-table unified view - Option 3).
 * Eliminates tabs and stat cards in favor of a clean, persistent data table with status filter chips,
 * inline Option 4.2 creative review actions (Approve, Request Changes, Decline),
 * and direct 7-day reserve invite management.
 */
export default function EventSponsorshipsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const { copy: copyToClipboard } = useCopyToClipboard();

    const supabase = useMemo(() => createClient(), []);
    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);
    const eventsRepo = useMemo(() => createEventsRepository(supabase), [supabase]);

    const [isLoading, setIsLoading] = useState(true);
    const [event, setEvent] = useState<EventRow | null>(null);
    const [overview, setOverview] = useState<SponsorshipOverview | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [sponsorFilter, setSponsorFilter] = useState('all');

    // Direct Invite modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    // Option 4.2 Creative Revision Request state
    const [revisionCampaignId, setRevisionCampaignId] = useState<string | null>(null);
    const [revisionFeedback, setRevisionFeedback] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);

    const loadData = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);

        try {
            const [eventRes, overviewRes] = await Promise.all([
                eventsRepo.findById(id),
                sponsorshipsRepo.getEventOverview(id),
            ]);

            if (eventRes.error || !eventRes.data) {
                showToast(eventRes.error?.message || 'Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }

            if (overviewRes.error || !overviewRes.data) {
                showToast(overviewRes.error?.message || 'Failed to load sponsorship overview.', 'error');
                return;
            }

            setEvent(eventRes.data);
            setOverview(overviewRes.data);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'An unexpected error occurred while loading sponsorships.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, eventsRepo, sponsorshipsRepo, showToast, router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCopyInviteLink = useCallback((token: string) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const claimUrl = `${origin}/sponsorships/claim/${token}`;
        copyToClipboard(claimUrl);
        showToast('Direct invite link copied to clipboard.', 'success');
    }, [copyToClipboard, showToast]);

    const handleOpenNewInvite = useCallback(() => {
        setIsInviteModalOpen(true);
    }, []);

    const handleRevokeInvite = useCallback(async (inviteId: string) => {
        if (!window.confirm('Are you sure you want to revoke this invitation? The link will no longer be claimable.')) {
            return;
        }
        try {
            const res = await sponsorshipsRepo.revokeInvite(id, inviteId);
            if (res.error) {
                showToast(res.error.message || 'Failed to revoke invite.', 'error');
                return;
            }
            showToast('Invitation revoked successfully.', 'success');
            loadData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to revoke invite.', 'error');
        }
    }, [id, sponsorshipsRepo, showToast, loadData]);

    /** Process review action (approve, request_revision, decline) on incoming sponsor request */
    const handleReview = useCallback(async (campaignId: string, decision: 'approve' | 'request_revision' | 'decline', feedback?: string) => {
        setIsReviewing(true);
        try {
            const res = await sponsorshipsRepo.reviewCampaign({
                campaignId,
                decision,
                feedback,
            });

            if (res.error || !res.data) {
                showToast(res.error?.message || `Failed to process ${decision} action.`, 'error');
                return;
            }

            showToast(res.data.message || 'Review decision processed successfully.', 'success');
            setRevisionCampaignId(null);
            setRevisionFeedback('');
            loadData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to submit review.', 'error');
        } finally {
            setIsReviewing(false);
        }
    }, [sponsorshipsRepo, showToast, loadData]);

    // Merge contracted sponsors, review requests, and direct invites into a single unified list
    const allSponsors = useMemo((): SponsorRowItem[] => {
        if (!overview) return [];

        const rows: SponsorRowItem[] = [];
        const matchedInviteIds = new Set<string>();

        // 1. Process commercial campaigns
        overview.sponsors.forEach((sponsor: SponsorshipRosterItem) => {
            const matchedInvite = overview.invites.find((inv: SponsorshipInviteItem) => {
                if (matchedInviteIds.has(inv.id)) return false;
                return (
                    inv.company_name.trim().toLowerCase() === sponsor.partner_name.trim().toLowerCase()
                );
            });

            if (matchedInvite) {
                matchedInviteIds.add(matchedInvite.id);
            }

            rows.push({
                id: `sponsor-${sponsor.id}`,
                campaign_id: sponsor.id,
                sponsor_name: sponsor.partner_name,
                title: sponsor.title,
                contact_info: matchedInvite?.invitee_email || sponsor.title,
                tier_name: sponsor.tier_name,
                placement: sponsor.placement,
                slots: sponsor.slots,
                amount: sponsor.total_budget,
                currency: sponsor.currency,
                status: (sponsor.status as SponsorRowItem['status']) || 'active',
                impressions: sponsor.impressions,
                clicks: sponsor.clicks,
                invite_token: matchedInvite?.invite_token || null,
                reference: sponsor.reference,
                revision_notes: sponsor.revision_notes,
                created_at: sponsor.created_at,
            });
        });

        // 2. Append unmatched direct invitations
        overview.invites.forEach((invite: SponsorshipInviteItem) => {
            if (matchedInviteIds.has(invite.id)) return;

            const status: SponsorRowItem['status'] =
                invite.status === 'expired'
                    ? 'expired'
                    : invite.status === 'declined'
                    ? 'declined'
                    : 'pending';

            rows.push({
                id: `invite-${invite.id}`,
                sponsor_name: invite.company_name,
                title: 'Direct Invitation',
                contact_info: invite.invitee_name ? `${invite.invitee_name} (${invite.invitee_email})` : invite.invitee_email,
                tier_name: invite.tier_name,
                placement: invite.placement,
                slots: invite.slots,
                amount: invite.custom_price,
                currency: invite.currency,
                status,
                impressions: null,
                clicks: null,
                invite_token: invite.invite_token,
                expires_at: invite.expires_at,
                reference: null,
                created_at: invite.created_at,
            });
        });

        // Sort so urgent review requests float to the very top, followed by newest created
        return rows.sort((a, b) => {
            const isUrgentA = a.status === 'pending_approval' || a.status === 'revision_requested' ? 1 : 0;
            const isUrgentB = b.status === 'pending_approval' || b.status === 'revision_requested' ? 1 : 0;
            if (isUrgentA !== isUrgentB) return isUrgentB - isUrgentA;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [overview]);

    // Filtered sponsors
    const filteredSponsors = useMemo(() => {
        return allSponsors.filter((row: SponsorRowItem) => {
            const matchesSearch =
                row.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.contact_info.toLowerCase().includes(searchQuery.toLowerCase());

            let matchesFilter = true;
            if (sponsorFilter === 'review') {
                matchesFilter = row.status === 'pending_approval' || row.status === 'revision_requested';
            } else if (sponsorFilter === 'invites') {
                matchesFilter = row.status === 'pending' || row.status === 'expired';
            } else if (sponsorFilter !== 'all') {
                matchesFilter = row.status === sponsorFilter;
            }

            return matchesSearch && matchesFilter;
        });
    }, [allSponsors, searchQuery, sponsorFilter]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px' }}>
                    <Spinner size={32} />
                </div>
            </div>
        );
    }

    if (!overview || !event) {
        return (
            <div className={adminStyles.container}>
                <EmptyState
                    message="We could not locate this event or you do not have permission to manage its sponsorships."
                    action={
                        <button
                            type="button"
                            className={adminStyles.btnSecondary}
                            onClick={() => router.push('/dashboard/organize/events')}
                        >
                            Back to Events
                        </button>
                    }
                />
            </div>
        );
    }

    const { kpis } = overview;
    const reviewCount = (kpis.pending_reviews || 0) + (kpis.revision_requests || 0);
    const activeCount = kpis.active_sponsors || 0;
    const inviteCount = kpis.pipeline_invites || 0;

    return (
        <div className={adminStyles.container}>
            {/* Page Header */}
            <PageHeader
                title="Sponsorships"
                subtitle={`Review commercial placement bookings and issue direct invites for "${event.title}"`}
                badge={{
                    label: reviewCount > 0 ? `${reviewCount} In Review Queue` : `${activeCount} Active Sponsors`,
                    variant: reviewCount > 0 ? 'warning' : activeCount > 0 ? 'success' : 'neutral',
                }}
                primaryAction={{
                    label: '+ Direct Invite',
                    onClick: handleOpenNewInvite,
                }}
                closeHref={`/dashboard/organize/events/${id}`}
            />

            {/* Unified Search & Filter Toolbar */}
            <TableToolbar
                searchPlaceholder="Search sponsorships by brand name, campaign, or contact..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
            >
                <FilterChips
                    options={[
                        { value: 'all', label: `All (${allSponsors.length})` },
                        ...(reviewCount > 0 ? [{ value: 'review', label: `Pending Review (${reviewCount})` }] : []),
                        { value: 'active', label: `Active (${activeCount})` },
                        { value: 'invites', label: `Direct Invites (${inviteCount})` },
                        { value: 'completed', label: 'Completed' },
                        { value: 'declined', label: 'Declined' },
                    ]}
                    currentValue={sponsorFilter}
                    onChange={setSponsorFilter}
                />
            </TableToolbar>

            {/* Unified Single Table View (Option 3) */}
            <div className={adminStyles.pageCard} style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="stack-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                <th style={thStyle}>Sponsor & Campaign</th>
                                <th style={thStyle}>Placement</th>
                                <th style={thStyle}>Contract Value</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Performance / Status Detail</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSponsors.map((row: SponsorRowItem) => {
                                    const statusBadge = getStatusBadge(row.status);
                                    const isReviewActionable = (row.status === 'pending_approval' || row.status === 'revision_requested') && !!row.campaign_id;

                                    return (
                                        <tr key={row.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                            <td data-title style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{row.sponsor_name}</span>
                                                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{row.title}</span>
                                                    <span style={{ fontSize: '11px', opacity: 0.45 }}>{row.contact_info}</span>
                                                </div>
                                            </td>
                                            <td data-label="Placement" style={tdStyle}>
                                                <span style={{ fontWeight: 500 }}>
                                                    {getPlacementLabel(row.placement)}
                                                    {row.slots && ` (${row.slots} ${row.slots === 1 ? 'Slot' : 'Slots'})`}
                                                </span>
                                            </td>
                                            <td data-label="Contract Value" style={tdStyle}>
                                                <span style={{ fontWeight: 600 }}>
                                                    {row.amount !== null
                                                        ? Number(row.amount) === 0
                                                            ? '$0 (Offline)'
                                                            : formatCurrency(row.amount, row.currency)
                                                        : 'Standard'}
                                                </span>
                                            </td>
                                            <td data-label="Status" style={tdStyle}>
                                                <Badge
                                                    label={statusBadge.label}
                                                    variant={statusBadge.variant}
                                                    showDot
                                                />
                                            </td>
                                            <td data-label="Performance / Detail" style={tdStyle}>
                                                {isReviewActionable ? (
                                                    <div style={{ fontSize: '12px' }}>
                                                        {row.status === 'revision_requested' ? (
                                                            <span style={{ color: '#facc15' }}>
                                                                Revision pending: {row.revision_notes ? `"${row.revision_notes.slice(0, 40)}..."` : 'Waiting on sponsor upload'}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--color-brand-primary)' }}>
                                                                ⚡ 48h Escrow Reservation Hold
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : row.impressions !== null ? (
                                                    <div style={{ fontSize: '13px' }}>
                                                        <span>{formatNumber(row.impressions)} imps</span>
                                                        <span style={{ opacity: 0.5, margin: '0 4px' }}>•</span>
                                                        <span>{formatNumber(row.clicks || 0)} clicks</span>
                                                    </div>
                                                ) : row.expires_at ? (
                                                    <span style={{ fontSize: '13px', opacity: 0.75 }}>
                                                        Expires {formatDate(row.expires_at)}
                                                    </span>
                                                ) : (
                                                    <span style={{ opacity: 0.4 }}>—</span>
                                                )}
                                            </td>
                                            <td data-actions style={tdStyle}>
                                                {isReviewActionable ? (
                                                    /* Option 4.2 Inline Review Actions */
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className={styles.btnApprove}
                                                            style={{ padding: '6px 12px', fontSize: '12px', flex: 'none' }}
                                                            onClick={() => handleReview(row.campaign_id!, 'approve')}
                                                            disabled={isReviewing}
                                                            title="Approve sponsorship & activate Category Sponsor Shield"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        {row.status === 'pending_approval' && (
                                                            <button
                                                                type="button"
                                                                className={styles.btnRequestRevision}
                                                                style={{ padding: '6px 12px', fontSize: '12px', flex: 'none' }}
                                                                onClick={() => {
                                                                    setRevisionCampaignId(row.campaign_id!);
                                                                    setRevisionFeedback('');
                                                                }}
                                                                disabled={isReviewing}
                                                                title="Request creative asset changes from the sponsor"
                                                            >
                                                                ✎ Changes
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className={styles.btnDecline}
                                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                                            onClick={() => {
                                                                if (window.confirm('Are you sure you want to decline this sponsorship? Escrow funds will be immediately refunded to the sponsor wallet and the slot will be released.')) {
                                                                    handleReview(row.campaign_id!, 'decline');
                                                                }
                                                            }}
                                                            disabled={isReviewing}
                                                            title="Decline sponsorship & refund escrow"
                                                        >
                                                            ✕ Decline
                                                        </button>
                                                    </div>
                                                ) : row.invite_token ? (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className={styles.actionBtn}
                                                            onClick={() => handleCopyInviteLink(row.invite_token!)}
                                                        >
                                                            Copy Link
                                                        </button>
                                                        {row.status === 'pending' && (
                                                            <button
                                                                type="button"
                                                                className={styles.actionBtn}
                                                                style={{ color: 'var(--color-interface-error)' }}
                                                                onClick={() => handleRevokeInvite(row.id.replace('invite-', ''))}
                                                            >
                                                                Revoke
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : row.reference ? (
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.65 }}>
                                                            {row.reference}
                                                        </span>
                                                    </div>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredSponsors.length === 0 && (
                                    <tr>
                                        <td data-empty colSpan={6} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5, padding: '36px 16px' }}>
                                            {searchQuery || sponsorFilter !== 'all'
                                                ? 'No sponsorships match your search and filter criteria.'
                                                : 'No active sponsorships or direct invitations configured for this event yet.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* ─── Modal 1: Tokenized Direct Invite Modal (7-Day Reservation Hold) ─── */}
            <DirectInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                eventId={id}
                currency={event?.currency || 'KES'}
                onSuccess={loadData}
            />

            {/* ─── Modal 2: Creative Revision Request (Option 4.2) ─────────────────── */}
            <Modal
                isOpen={revisionCampaignId !== null}
                onClose={() => { setRevisionCampaignId(null); setRevisionFeedback(''); }}
                title="Request Creative Changes"
                size="medium"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                        <button
                            type="button"
                            className={adminStyles.btnSecondary}
                            onClick={() => { setRevisionCampaignId(null); setRevisionFeedback(''); }}
                            disabled={isReviewing}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={adminStyles.btnPrimary}
                            onClick={() => {
                                if (!revisionFeedback.trim()) {
                                    showToast('Please provide feedback explaining the requested changes.', 'error');
                                    return;
                                }
                                handleReview(revisionCampaignId!, 'request_revision', revisionFeedback.trim());
                            }}
                            disabled={isReviewing || !revisionFeedback.trim()}
                        >
                            {isReviewing ? <Spinner size={16} /> : 'Send Feedback & Hold Slot (48h)'}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
                    <p style={{ fontSize: '13px', color: 'var(--color-utility-secondaryText)', lineHeight: 1.5 }}>
                        Requesting changes moves this campaign to <strong>Revision Requested</strong>. The sponsor&apos;s funds remain held safely in escrow and their requested slot stays reserved for <strong>48 hours</strong> while they upload updated creative assets.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-utility-primaryText)' }}>
                            Feedback & Instructions for the Sponsor <span style={{ color: 'var(--color-brand-primary)' }}>*Required</span>
                        </label>
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '10px 14px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid var(--color-interface-outline)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-utility-primaryText)',
                                fontSize: '14px',
                            }}
                            placeholder="e.g. Please provide a high-resolution PNG with a transparent background, or adjust the call to action."
                            value={revisionFeedback}
                            onChange={e => setRevisionFeedback(e.target.value)}
                            required
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
