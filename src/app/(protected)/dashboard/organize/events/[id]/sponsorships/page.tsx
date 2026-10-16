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
    type SponsorshipTierItem,
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
import TierBuilderModal from '@/components/dashboard/TierBuilderModal';
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
 * Unified sponsor record representing contracted sponsors and pending invitations.
 * Inbound invitations carry status `pending`, merging the entire sponsor lifecycle
 * into a single unified status column.
 */
interface SponsorRowItem {
    id: string;
    sponsor_name: string;
    contact_info: string;
    tier_name: string;
    amount: number | null;
    currency: string;
    status: 'active' | 'pending' | 'completed' | 'paused' | 'expired' | 'declined' | 'draft';
    impressions: number | null;
    clicks: number | null;
    invite_token: string | null;
    expires_at?: string;
    reference: string | null;
    created_at: string;
}

/** Resolves semantic badge presentation for sponsor status, including pending invitations. */
function getStatusBadge(status: SponsorRowItem['status']): { label: string; variant: BadgeVariant } {
    switch (status) {
        case 'active':
            return { label: 'Active', variant: 'success' };
        case 'pending':
            return { label: 'Pending', variant: 'warning' };
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

/**
 * Sell-side event sponsorships dashboard for organizers.
 * Streamlined two-tab command center organizing sponsorship tiers inventory
 * and unified sponsors (Sponsors), where invitations appear as pending status.
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

    const [activeTab, setActiveTab] = useState<'tiers' | 'sponsors'>('tiers');
    const [searchQuery, setSearchQuery] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [sponsorFilter, setSponsorFilter] = useState('all');

    // [P2] Tier Builder modal state
    const [isTierModalOpen, setIsTierModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<SponsorshipTierItem | null>(null);

    // [P3] Direct Invite modal state
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [selectedTierForInvite, setSelectedTierForInvite] = useState<SponsorshipTierItem | null>(null);

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

    const handleOpenNewTier = useCallback(() => {
        setEditingTier(null);
        setIsTierModalOpen(true);
    }, []);

    const handleConfigureTier = useCallback((tier: SponsorshipTierItem) => {
        setEditingTier(tier);
        setIsTierModalOpen(true);
    }, []);

    const handleOpenNewInvite = useCallback((tier?: SponsorshipTierItem) => {
        setSelectedTierForInvite(tier || null);
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


    // Merge contracted sponsors and invitations into a unified sponsors list with status 'pending' for open invites
    const allSponsors = useMemo((): SponsorRowItem[] => {
        if (!overview) return [];

        const rows: SponsorRowItem[] = [];
        const matchedInviteIds = new Set<string>();

        // 1. Process contracted sponsors
        overview.sponsors.forEach((sponsor: SponsorshipRosterItem) => {
            const matchedInvite = overview.invites.find((inv: SponsorshipInviteItem) => {
                if (matchedInviteIds.has(inv.id)) return false;
                return (
                    inv.tier_id === sponsor.tier_id &&
                    inv.company_name.trim().toLowerCase() === sponsor.partner_name.trim().toLowerCase()
                );
            });

            if (matchedInvite) {
                matchedInviteIds.add(matchedInvite.id);
            }

            rows.push({
                id: `sponsor-${sponsor.id}`,
                sponsor_name: sponsor.partner_name,
                contact_info: matchedInvite?.invitee_email || sponsor.title,
                tier_name: sponsor.tier_name,
                amount: sponsor.total_budget,
                currency: sponsor.currency,
                status: (sponsor.status as SponsorRowItem['status']) || 'active',
                impressions: sponsor.impressions,
                clicks: sponsor.clicks,
                invite_token: matchedInvite?.invite_token || null,
                reference: sponsor.reference,
                created_at: sponsor.created_at,
            });
        });

        // 2. Append unmatched invitations with status 'pending' (or declined/expired)
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
                contact_info: invite.invitee_name ? `${invite.invitee_name} (${invite.invitee_email})` : invite.invitee_email,
                tier_name: invite.tier_name,
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

        return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [overview]);

    // Filtered tiers
    const filteredTiers = useMemo(() => {
        if (!overview?.tiers) return [];
        return overview.tiers.filter((tier: SponsorshipTierItem) => {
            const matchesSearch = tier.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter =
                tierFilter === 'all' ||
                (tierFilter === 'active' && tier.is_active) ||
                (tierFilter === 'inactive' && !tier.is_active) ||
                (tierFilter === 'available' && tier.claimed_slots < tier.max_slots) ||
                (tierFilter === 'sold_out' && tier.claimed_slots >= tier.max_slots);
            return matchesSearch && matchesFilter;
        });
    }, [overview?.tiers, searchQuery, tierFilter]);

    // Filtered sponsors
    const filteredSponsors = useMemo(() => {
        return allSponsors.filter((row: SponsorRowItem) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                row.sponsor_name.toLowerCase().includes(query) ||
                row.tier_name.toLowerCase().includes(query) ||
                row.contact_info.toLowerCase().includes(query);

            const matchesFilter =
                sponsorFilter === 'all' ||
                row.status === sponsorFilter;

            return matchesSearch && matchesFilter;
        });
    }, [allSponsors, searchQuery, sponsorFilter]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading sponsorships..." centered />
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
    const activeCount = kpis.active_sponsors;

    return (
        <div className={adminStyles.container}>
            {/* Page Header */}
            <PageHeader
                title="Sponsorships"
                subtitle={`Manage sponsorship tiers, sponsors and direct invites for "${event.title}"`}
                badge={{
                    label: activeCount === 1 ? '1 Active Sponsor' : `${activeCount} Active Sponsors`,
                    variant: activeCount > 0 ? 'success' : 'neutral',
                }}
                primaryAction={{
                    label: '+ Direct Invite',
                    onClick: () => handleOpenNewInvite(),
                }}
                secondaryAction={{
                    label: '+ New Tier',
                    onClick: handleOpenNewTier,
                }}

                closeHref={`/dashboard/organize/events/${id}`}
            />

            {/* Two-Tab Navigation Bar: Tiers & Sponsors */}
            <div className={styles.tabBar} role="tablist" aria-label="Sponsorship management sections">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'tiers'}
                    className={`${styles.tabItem} ${activeTab === 'tiers' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('tiers'); setSearchQuery(''); }}
                >
                    <span>Tiers & Inventory</span>
                    <span className={styles.tabBadge}>{overview.tiers.length}</span>
                </button>

                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'sponsors'}
                    className={`${styles.tabItem} ${activeTab === 'sponsors' ? styles.tabActive : ''}`}
                    onClick={() => { setActiveTab('sponsors'); setSearchQuery(''); }}
                >
                    <span>Sponsors</span>
                    <span className={styles.tabBadge}>{allSponsors.length}</span>
                </button>
            </div>

            {/* Search & Filter Toolbar */}
            <TableToolbar
                searchPlaceholder={
                    activeTab === 'tiers'
                        ? 'Search tiers by name...'
                        : 'Search sponsors by name, tier or contact...'
                }
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
            >
                {activeTab === 'tiers' && (
                    <FilterChips
                        options={[
                            { value: 'all', label: 'All Tiers' },
                            { value: 'active', label: 'Active' },
                            { value: 'available', label: 'Available Slots' },
                            { value: 'sold_out', label: 'Sold Out' },
                            { value: 'inactive', label: 'Paused' },
                        ]}
                        currentValue={tierFilter}
                        onChange={setTierFilter}
                    />
                )}
                {activeTab === 'sponsors' && (
                    <FilterChips
                        options={[
                            { value: 'all', label: 'All Sponsors' },
                            { value: 'active', label: 'Active' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'expired', label: 'Expired' },
                        ]}
                        currentValue={sponsorFilter}
                        onChange={setSponsorFilter}
                    />
                )}
            </TableToolbar>

            {/* ─── TAB 1: Tiers & Inventory ─────────────────────────────────── */}
            {activeTab === 'tiers' && (
                <div>
                    {filteredTiers.length === 0 ? (
                        <EmptyState
                            message={
                                searchQuery || tierFilter !== 'all'
                                    ? 'No tiers match your search filter criteria.'
                                    : 'You have not configured sponsorship tiers for this event yet. Create tiers to attract sponsors.'
                            }
                            action={
                                searchQuery || tierFilter !== 'all' ? undefined : (
                                    <button
                                        type="button"
                                        className={adminStyles.btnPrimary}
                                        onClick={handleOpenNewTier}
                                    >
                                        + New Tier
                                    </button>

                                )
                            }
                        />
                    ) : (
                        <div className={styles.tiersGrid}>
                            {filteredTiers.map((tier: SponsorshipTierItem) => {
                                const fillPct = tier.max_slots > 0 ? Math.round((tier.claimed_slots / tier.max_slots) * 100) : 0;
                                const isSoldOut = tier.claimed_slots >= tier.max_slots;
                                const sov = tier.perks?.share_of_voice;
                                const passes = tier.perks?.ticket_passes;
                                const questSlots = tier.perks?.quest_slots;

                                return (
                                    <div key={tier.id} className={styles.tierCard}>
                                        <div>
                                            <div className={styles.tierHeader}>
                                                <div>
                                                    <div className={styles.tierRank}>Tier #{tier.rank}</div>
                                                    <h3 className={styles.tierTitle}>{tier.name}</h3>
                                                </div>
                                                <Badge
                                                    label={isSoldOut ? 'Sold Out' : tier.is_active ? 'Active' : 'Paused'}
                                                    variant={isSoldOut ? 'error' : tier.is_active ? 'success' : 'neutral'}
                                                />
                                            </div>

                                            <div className={styles.tierPrice}>
                                                {formatCurrency(tier.price, tier.currency)}
                                            </div>

                                            <div style={{ marginTop: '14px' }}>
                                                <div className={styles.tierSlotLabel}>
                                                    <span>Slot Allocation</span>
                                                    <span style={{ fontWeight: 600 }}>
                                                        {tier.claimed_slots} / {tier.max_slots} Claimed
                                                    </span>
                                                </div>
                                                <div className={styles.progressTrack}>
                                                    <div
                                                        className={`${styles.progressFill} ${fillPct >= 100 ? styles.progressFillFull : ''}`}
                                                        style={{ width: `${fillPct}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className={styles.perksList}>
                                                {sov !== undefined && (
                                                    <span className={styles.perkBadge}>
                                                        {Number(sov) * 100}% Share of Voice
                                                    </span>
                                                )}
                                                {passes !== undefined && passes > 0 && (
                                                    <span className={styles.perkBadge}>
                                                        {passes} VIP Pass{passes === 1 ? '' : 'es'}
                                                    </span>
                                                )}
                                                {questSlots !== undefined && questSlots > 0 && (
                                                    <span className={styles.perkBadge}>
                                                        {questSlots} Quest Slot{questSlots === 1 ? '' : 's'}
                                                    </span>
                                                )}
                                                {Array.isArray(tier.perks?.formats) && tier.perks.formats.map((fmt: string) => (
                                                    <span key={fmt} className={styles.perkBadge}>
                                                        {fmt.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-interface-outline)' }}>
                                            <button
                                                type="button"
                                                className={styles.actionBtn}
                                                style={{ flex: 1, justifyContent: 'center' }}
                                                onClick={() => handleConfigureTier(tier)}
                                            >
                                                Configure Tier
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.actionBtn}
                                                style={{ flex: 1, justifyContent: 'center' }}
                                                onClick={() => handleOpenNewInvite(tier)}
                                            >
                                                Invite Sponsor
                                            </button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── TAB 2: Sponsors (Unified Roster & Pending Invitations) ──────── */}
            {activeTab === 'sponsors' && (
                <div>
                    {filteredSponsors.length === 0 ? (
                        <EmptyState
                            message={
                                searchQuery || sponsorFilter !== 'all'
                                    ? 'No sponsors match your search criteria.'
                                    : 'No sponsors or pending invitations configured for this event yet.'
                            }
                            action={
                                searchQuery || sponsorFilter !== 'all' ? undefined : (
                                    <button
                                        type="button"
                                        className={adminStyles.btnPrimary}
                                        onClick={() => handleOpenNewInvite()}
                                    >
                                        + Invite Sponsor
                                    </button>
                                )
                            }
                        />
                    ) : (
                        <div className={adminStyles.pageCard} style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="stack-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                            <th style={thStyle}>Sponsor</th>
                                            <th style={thStyle}>Tier</th>
                                            <th style={thStyle}>Agreed Value</th>
                                            <th style={thStyle}>Status</th>
                                            <th style={thStyle}>Performance / Expiry</th>
                                            <th style={thStyle}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSponsors.map((row: SponsorRowItem) => {
                                            const statusBadge = getStatusBadge(row.status);

                                            return (
                                                <tr key={row.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                                    <td data-title style={tdStyle}>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                             <span style={{ fontWeight: 600 }}>{row.sponsor_name}</span>
                                                            <span style={{ fontSize: '12px', opacity: 0.55 }}>{row.contact_info}</span>
                                                        </div>
                                                    </td>
                                                    <td data-label="Tier" style={tdStyle}>
                                                        <span style={{ fontWeight: 500 }}>{row.tier_name}</span>
                                                    </td>
                                                    <td data-label="Agreed Value" style={tdStyle}>
                                                        <span style={{ fontWeight: 600 }}>
                                                            {row.amount !== null
                                                                ? formatCurrency(row.amount, row.currency)
                                                                : 'Standard Tier Price'}
                                                        </span>
                                                    </td>
                                                    <td data-label="Status" style={tdStyle}>
                                                        <Badge
                                                            label={statusBadge.label}
                                                            variant={statusBadge.variant}
                                                        />
                                                    </td>
                                                    <td data-label="Performance" style={tdStyle}>
                                                        {row.impressions !== null ? (
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
                                                        {row.invite_token ? (
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
                                                                        onClick={() => handleRevokeInvite(row.id)}
                                                                    >
                                                                        Revoke
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ) : row.reference ? (
                                                            <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.65 }}>
                                                                {row.reference}
                                                            </span>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* [P2] Sponsorship Tier Builder Modal */}
            <TierBuilderModal
                isOpen={isTierModalOpen}
                onClose={() => setIsTierModalOpen(false)}
                eventId={id}
                currency={event?.currency || 'KES'}
                tier={editingTier}
                onSuccess={loadData}
            />

            {/* [P3] Tokenized Direct Invite Modal */}
            <DirectInviteModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                eventId={id}
                currency={event?.currency || 'KES'}
                tiers={overview?.tiers || []}
                initialTier={selectedTierForInvite}
                onSuccess={loadData}
            />
        </div>
    );
}

