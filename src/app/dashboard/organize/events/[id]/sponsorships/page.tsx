"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate } from '@/utils/format';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface SponsorshipInvitation {
    id: string;
    event_id: string;
    tier_id: string;
    invitee_email: string;
    status: string;
    expires_at: string;
    created_at: string;
}

interface SponsorshipTier {
    id: string;
    event_id: string;
    name: string;
    price: number;
    currency: string;
    slots_total: number;
    slots_taken: number;
    share_of_voice: number;
    is_exclusive: boolean;
    target_placements: string[];
    is_hidden: boolean;
    benefits: string[];
    created_at: string;
}

interface Sponsorship {
    id: string;
    invitation_id: string | null;
    tier_id: string;
    forum_id: string;
    campaign_id: string;
    starts_at: string;
    ends_at: string;
    created_at: string;
    // Joined data from performance view (optional)
    total_impressions?: number;
    total_clicks?: number;
    campaign_name?: string;
    tier_name?: string;
}

const INVITE_STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    accepted: { label: 'Accepted', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'error' },
    expired: { label: 'Expired', variant: 'neutral' },
};

export default function EventSponsorshipsPage() {
    const { id: eventId } = useParams<{ id: string }>();
    const { enabled: isSponsorshipsEnabled, isLoading: isFlagLoading } = useFeatureFlag('enable_event_sponsorships');
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [eventTitle, setEventTitle] = useState('');
    const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
    const [invitations, setInvitations] = useState<SponsorshipInvitation[]>([]);
    const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [selectedTierId, setSelectedTierId] = useState<string>('');
    const [isCustomTier, setIsCustomTier] = useState(false);
    
    // Custom tier overrides (if isCustomTier is true)
    const [fee, setFee] = useState('');
    const [currency, setCurrency] = useState('KES');
    const [expiresInDays, setExpiresInDays] = useState('7');
    const [isSaving, setIsSaving] = useState(false);

    // Tier management
    const [isTiersModalOpen, setIsTiersModalOpen] = useState(false);
    const [allTiers, setAllTiers] = useState<SponsorshipTier[]>([]);
    const [editingTierId, setEditingTierId] = useState<string | null>(null);
    const [tierForm, setTierForm] = useState({
        name: '', price: '', currency: 'KES', slots_total: '1',
        is_exclusive: false, target_placements: ['banner'] as string[],
        share_of_voice: '100', benefits: '',
    });
    const [isSavingTier, setIsSavingTier] = useState(false);

    const fetchData = useCallback(async () => {
        if (!eventId || !activeAccount) return;
        setIsLoading(true);
        try {
            const [eventRes, tiersRes, invitesRes, performanceRes] = await Promise.all([
                supabase
                    .from('events')
                    .select('title')
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single(),
                supabase
                    .from('sponsorship_tiers')
                    .select('*')
                    .eq('event_id', eventId)
                    .eq('is_hidden', false)
                    .order('price', { ascending: false }),
                supabase
                    .from('sponsorship_invitations')
                    .select('*, sponsorship_tiers(name)')
                    .eq('event_id', eventId)
                    .eq('organizer_account_id', activeAccount.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('sponsorship_performance_report')
                    .select('*')
                    .eq('event_id', eventId)
            ]);

            if (eventRes.data) setEventTitle(eventRes.data.title);
            if (tiersRes.data) setTiers(tiersRes.data);
            if (invitesRes.data) setInvitations(invitesRes.data as any);
            if (performanceRes.data) setSponsorships(performanceRes.data);

        } catch (e: any) {
            console.error('Fetch error:', e);
            showToast('Failed to load sponsorship data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, activeAccount, supabase, showToast]);

    const fetchAllTiers = useCallback(async () => {
        if (!eventId) return;
        const { data } = await supabase
            .from('sponsorship_tiers')
            .select('*')
            .eq('event_id', eventId)
            .order('price', { ascending: false });
        if (data) setAllTiers(data);
    }, [eventId, supabase]);

    useEffect(() => { fetchData(); fetchAllTiers(); }, [fetchData, fetchAllTiers]);

    const handleInvite = async () => {
        if (!email.trim()) {
            showToast('Sponsor email is required', 'error');
            return;
        }

        if (!isCustomTier && !selectedTierId) {
            showToast('Please select a sponsorship tier', 'error');
            return;
        }

        setIsSaving(true);
        try {
            let tierId = selectedTierId;

            // 1. Handle Custom Tier Creation
            if (isCustomTier) {
                const numFee = parseFloat(fee);
                if (!numFee || numFee <= 0) {
                    showToast('Valid fee required for custom deal', 'error');
                    setIsSaving(false);
                    return;
                }

                // Create a one-off hidden tier
                const { data: newTier, error: tierError } = await supabase
                    .from('sponsorship_tiers')
                    .insert({
                        event_id: eventId,
                        name: `Custom deal: ${email}`,
                        price: numFee,
                        currency: currency,
                        slots_total: 1,
                        is_hidden: true,
                        is_exclusive: false, // default
                        target_placements: ['banner'] // default
                    })
                    .select()
                    .single();

                if (tierError) throw tierError;
                tierId = newTier.id;
            }

            // 2. Create Invitation
            const numDays = parseInt(expiresInDays, 10);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (numDays || 7));

            const { error } = await supabase
                .from('sponsorship_invitations')
                .insert({
                    event_id: eventId,
                    tier_id: tierId,
                    organizer_account_id: activeAccount!.id,
                    invitee_email: email.trim(),
                    expires_at: expiresAt.toISOString()
                });

            if (error) throw error;

            showToast('Sponsorship invitation sent', 'success');
            setIsModalOpen(false);
            setEmail('');
            setFee('');
            setSelectedTierId('');
            setIsCustomTier(false);
            fetchData();
        } catch (e: any) {
            console.error('Invite error:', e);
            showToast(e.message || 'Failed to send invitation', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevoke = async (invitationId: string) => {
        if (!await confirm('Revoke this invitation?')) return;
        try {
            const { error } = await supabase
                .from('sponsorship_invitations')
                .update({ status: 'expired' })
                .eq('id', invitationId)
                .eq('status', 'pending');

            if (error) throw error;
            showToast('Invitation revoked', 'success');
            fetchData();
        } catch (e: any) {
            showToast('Failed to revoke invitation', 'error');
        }
    };

    const resetTierForm = () => {
        setEditingTierId(null);
        setTierForm({
            name: '', price: '', currency: 'KES', slots_total: '1',
            is_exclusive: false, target_placements: ['banner'],
            share_of_voice: '100', benefits: '',
        });
    };

    const startEditTier = (tier: SponsorshipTier) => {
        setEditingTierId(tier.id);
        setTierForm({
            name: tier.name,
            price: String(tier.price),
            currency: tier.currency,
            slots_total: String(tier.slots_total),
            is_exclusive: tier.is_exclusive,
            target_placements: tier.target_placements,
            share_of_voice: String(Math.round(tier.share_of_voice * 100)),
            benefits: (tier.benefits || []).join('\n'),
        });
    };

    const togglePlacement = (p: string) => {
        setTierForm(f => ({
            ...f,
            target_placements: f.target_placements.includes(p)
                ? f.target_placements.filter(x => x !== p)
                : [...f.target_placements, p],
        }));
    };

    const handleSaveTier = async () => {
        const numPrice = parseFloat(tierForm.price);
        const numSlots = parseInt(tierForm.slots_total, 10);
        if (!tierForm.name.trim()) { showToast('Tier name is required', 'error'); return; }
        if (!numPrice || numPrice <= 0) { showToast('Valid price is required', 'error'); return; }
        if (!numSlots || numSlots < 1) { showToast('Slots must be at least 1', 'error'); return; }
        if (tierForm.target_placements.length === 0) { showToast('Select at least one placement', 'error'); return; }

        setIsSavingTier(true);
        try {
            const payload = {
                event_id: eventId,
                name: tierForm.name.trim(),
                price: numPrice,
                currency: tierForm.currency,
                slots_total: numSlots,
                is_exclusive: tierForm.is_exclusive,
                target_placements: tierForm.target_placements,
                share_of_voice: parseFloat(tierForm.share_of_voice) / 100,
                is_hidden: false,
                benefits: tierForm.benefits.split('\n').map(b => b.trim()).filter(Boolean),
            };

            if (editingTierId) {
                const { error } = await supabase
                    .from('sponsorship_tiers')
                    .update(payload)
                    .eq('id', editingTierId)
                    .eq('event_id', eventId);
                if (error) throw error;
                showToast('Tier updated', 'success');
            } else {
                const { error } = await supabase.from('sponsorship_tiers').insert(payload);
                if (error) throw error;
                showToast('Tier created', 'success');
            }

            resetTierForm();
            fetchAllTiers();
            fetchData();
        } catch (e: any) {
            showToast(e.message || 'Failed to save tier', 'error');
        } finally {
            setIsSavingTier(false);
        }
    };

    const handleDeleteTier = async (tier: SponsorshipTier) => {
        if (tier.slots_taken > 0) {
            showToast('Cannot delete a tier with active sponsorships', 'error');
            return;
        }
        if (!await confirm(`Delete tier "${tier.name}"? This cannot be undone.`)) return;
        try {
            const { error } = await supabase
                .from('sponsorship_tiers')
                .delete()
                .eq('id', tier.id)
                .eq('event_id', eventId);
            if (error) throw error;
            showToast('Tier deleted', 'success');
            fetchAllTiers();
            fetchData();
        } catch (e: any) {
            showToast(e.message || 'Failed to delete tier', 'error');
        }
    };

    if (!isFlagLoading && isSponsorshipsEnabled === false) {
        return (
            <div className={adminStyles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>Event sponsorships are not available yet.</p>
            </div>
        );
    }

    return (
        <div className={adminStyles.page}>
            {ConfirmDialog}
            <SubPageHeader
                title="Sponsorships"
                subtitle={eventTitle ? `Manage sponsorship packages for "${eventTitle}"` : 'Manage event sponsorships'}
                backHref={`/dashboard/organize/events/${eventId}`}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button className={adminStyles.primaryButton} onClick={() => setIsModalOpen(true)}>
                    + Invite Sponsor
                </button>
            </div>

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : (
                <>
                    {/* Sponsorship Tiers */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Sponsorship Packages</h3>
                        <button className={adminStyles.secondaryButton} onClick={() => { resetTierForm(); setIsTiersModalOpen(true); }}>
                            Manage Tiers
                        </button>
                    </div>
                    {tiers.length === 0 ? (
                        <div className={adminStyles.emptyState} style={{ marginBottom: 32 }}>
                            <p>No public tiers defined. Add tiers to offer standardized packages.</p>
                        </div>
                    ) : (
                        <div className={adminStyles.statsGrid} style={{ marginBottom: 32 }}>
                            {tiers.map(tier => (
                                <div key={tier.id} className={adminStyles.statCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div className={adminStyles.statLabel}>{tier.name}</div>
                                        <Badge variant={tier.is_exclusive ? 'warning' : 'neutral'} label={tier.is_exclusive ? 'Exclusive' : 'Shared'} />
                                    </div>
                                    <div className={adminStyles.statValue}>{formatCurrency(tier.price, tier.currency)}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                                            {tier.slots_taken} / {tier.slots_total} Slots
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {tier.target_placements.map(p => (
                                                <Badge key={p} variant="subtle" label={p} />
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
                                        <div style={{ 
                                            height: '100%', 
                                            width: `${(tier.slots_taken / tier.slots_total) * 100}%`,
                                            background: 'var(--color-brand-primary)',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Active Sponsorships */}
                    {sponsorships.length > 0 && (
                        <>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Active Sponsorships</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                {sponsorships.map(s => (
                                    <div key={s.id} className={adminStyles.card} style={{ padding: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600 }}>
                                                    {s.campaign_name || `Campaign: ${s.campaign_id.slice(0, 8)}...`}
                                                </p>
                                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                                                    Tier: <span style={{ color: 'var(--color-utility-primaryText)' }}>{s.tier_name}</span> · 
                                                    {formatDate(s.starts_at)} — {formatDate(s.ends_at)}
                                                </p>
                                                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                                                    <div style={{ fontSize: 12 }}>
                                                        <span style={{ opacity: 0.6 }}>Impressions:</span> <b style={{ color: 'var(--color-brand-primary)' }}>{s.total_impressions || 0}</b>
                                                    </div>
                                                    <div style={{ fontSize: 12 }}>
                                                        <span style={{ opacity: 0.6 }}>Clicks:</span> <b style={{ color: 'var(--color-brand-primary)' }}>{s.total_clicks || 0}</b>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="success" label="Active" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Invitations */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Invitations</h3>
                    {invitations.length === 0 ? (
                        <div className={adminStyles.emptyState}>
                            <p>No sponsorship invitations yet. Invite sponsors to advertise during your event.</p>
                        </div>
                    ) : (
                        <table className={adminStyles.table}>
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Package</th>
                                    <th>Expires</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map(inv => {
                                    const badge = INVITE_STATUS_MAP[inv.status] || { label: inv.status, variant: 'neutral' as BadgeVariant };
                                    const tierName = (inv as any).sponsorship_tiers?.name || 'Unknown Tier';
                                    return (
                                        <tr key={inv.id}>
                                            <td>{inv.invitee_email}</td>
                                            <td style={{ fontWeight: 600 }}>{tierName}</td>
                                            <td>{formatDate(inv.expires_at)}</td>
                                            <td><Badge variant={badge.variant} label={badge.label} /></td>
                                            <td>
                                                {inv.status === 'pending' && (
                                                    <button
                                                        className={adminStyles.dangerButton}
                                                        onClick={() => handleRevoke(inv.id)}
                                                        style={{ fontSize: 13, padding: '4px 10px' }}
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {isTiersModalOpen && (
                <Modal
                    isOpen={true}
                    onClose={() => { setIsTiersModalOpen(false); resetTierForm(); }}
                    title="Manage Sponsorship Tiers"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Tier list */}
                        {allTiers.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
                                No tiers yet. Use the form below to add your first package.
                            </p>
                        ) : (
                            <table className={adminStyles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Price</th>
                                        <th>Slots</th>
                                        <th>Type</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTiers.map(tier => (
                                        <tr key={tier.id} style={editingTierId === tier.id ? { background: 'rgba(255,255,255,0.04)' } : undefined}>
                                            <td style={{ fontWeight: 600 }}>
                                                {tier.name}
                                                {tier.is_hidden && (
                                                    <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.5 }}>(custom deal)</span>
                                                )}
                                            </td>
                                            <td>{formatCurrency(tier.price, tier.currency)}</td>
                                            <td style={{ color: tier.slots_taken >= tier.slots_total ? '#ff6b6b' : 'inherit' }}>
                                                {tier.slots_taken} / {tier.slots_total}
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 12, opacity: 0.7 }}>
                                                    {tier.is_exclusive ? 'Exclusive' : 'Shared'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button
                                                        className={adminStyles.secondaryButton}
                                                        style={{ fontSize: 12, padding: '3px 10px' }}
                                                        onClick={() => startEditTier(tier)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={adminStyles.dangerButton}
                                                        style={{ fontSize: 12, padding: '3px 10px' }}
                                                        onClick={() => handleDeleteTier(tier)}
                                                        disabled={tier.slots_taken > 0}
                                                        title={tier.slots_taken > 0 ? 'Has active sponsorships' : undefined}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Add / Edit form */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>
                                {editingTierId ? 'Edit Tier' : 'Add New Tier'}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <label className={adminStyles.fieldLabel}>
                                    Name *
                                    <input
                                        className={adminStyles.input}
                                        value={tierForm.name}
                                        onChange={e => setTierForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Platinum"
                                    />
                                </label>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <label className={adminStyles.fieldLabel}>
                                        Price *
                                        <input
                                            className={adminStyles.input}
                                            type="number" min="0" step="0.01"
                                            value={tierForm.price}
                                            onChange={e => setTierForm(f => ({ ...f, price: e.target.value }))}
                                            placeholder="0.00"
                                        />
                                    </label>
                                    <label className={adminStyles.fieldLabel}>
                                        Currency
                                        <select className={adminStyles.select} value={tierForm.currency} onChange={e => setTierForm(f => ({ ...f, currency: e.target.value }))}>
                                            <option>KES</option>
                                            <option>NGN</option>
                                            <option>USD</option>
                                            <option>GBP</option>
                                        </select>
                                    </label>
                                    <label className={adminStyles.fieldLabel}>
                                        Slots *
                                        <input
                                            className={adminStyles.input}
                                            type="number" min="1"
                                            value={tierForm.slots_total}
                                            onChange={e => setTierForm(f => ({ ...f, slots_total: e.target.value }))}
                                        />
                                    </label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <label className={adminStyles.fieldLabel}>
                                        Share of Voice (%)
                                        <input
                                            className={adminStyles.input}
                                            type="number" min="1" max="100"
                                            value={tierForm.share_of_voice}
                                            onChange={e => setTierForm(f => ({ ...f, share_of_voice: e.target.value }))}
                                        />
                                    </label>
                                    <div>
                                        <span className={adminStyles.fieldLabel} style={{ display: 'block', marginBottom: 8 }}>Placements *</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {(['banner', 'interstitial', 'interstitial_video'] as const).map(p => (
                                                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={tierForm.target_placements.includes(p)}
                                                        onChange={() => togglePlacement(p)}
                                                    />
                                                    {p.replace(/_/g, ' ')}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={tierForm.is_exclusive}
                                        onChange={e => setTierForm(f => ({ ...f, is_exclusive: e.target.checked }))}
                                    />
                                    Exclusive (blocks network ads on target placements)
                                </label>

                                <label className={adminStyles.fieldLabel}>
                                    Benefits (one per line)
                                    <textarea
                                        className={adminStyles.input}
                                        rows={3}
                                        value={tierForm.benefits}
                                        onChange={e => setTierForm(f => ({ ...f, benefits: e.target.value }))}
                                        placeholder="Logo on event page&#10;Shoutout in forum&#10;VIP access"
                                        style={{ resize: 'vertical' }}
                                    />
                                </label>

                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    {editingTierId && (
                                        <button className={adminStyles.secondaryButton} onClick={resetTierForm}>
                                            Cancel Edit
                                        </button>
                                    )}
                                    <button
                                        className={adminStyles.primaryButton}
                                        onClick={handleSaveTier}
                                        disabled={isSavingTier}
                                    >
                                        {isSavingTier ? 'Saving...' : editingTierId ? 'Update Tier' : 'Add Tier'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title="Invite Sponsor">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label className={adminStyles.fieldLabel}>
                            Sponsor Email *
                            <input
                                className={adminStyles.input}
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="sponsor@company.com"
                            />
                        </label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                            <input 
                                type="checkbox" 
                                id="customDeal" 
                                checked={isCustomTier} 
                                onChange={e => setIsCustomTier(e.target.checked)} 
                            />
                            <label htmlFor="customDeal" style={{ fontSize: 13, cursor: 'pointer' }}>
                                Create a custom one-off deal (hidden tier)
                            </label>
                        </div>

                        {!isCustomTier ? (
                            <label className={adminStyles.fieldLabel}>
                                Select Sponsorship Package *
                                <select 
                                    className={adminStyles.select} 
                                    value={selectedTierId} 
                                    onChange={e => setSelectedTierId(e.target.value)}
                                >
                                    <option value="">-- Choose a Tier --</option>
                                    {tiers.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({formatCurrency(t.price, t.currency)})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <label className={adminStyles.fieldLabel}>
                                    Custom Fee *
                                    <input
                                        className={adminStyles.input}
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={fee}
                                        onChange={e => setFee(e.target.value)}
                                        placeholder="Amount"
                                    />
                                </label>
                                <label className={adminStyles.fieldLabel}>
                                    Currency
                                    <select className={adminStyles.select} value={currency} onChange={e => setCurrency(e.target.value)}>
                                        <option value="KES">KES</option>
                                        <option value="NGN">NGN</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </label>
                            </div>
                        )}

                        <label className={adminStyles.fieldLabel}>
                            Invitation Expiry (days)
                            <input
                                className={adminStyles.input}
                                type="number"
                                min="1"
                                value={expiresInDays}
                                onChange={e => setExpiresInDays(e.target.value)}
                            />
                        </label>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className={adminStyles.primaryButton} onClick={handleInvite} disabled={isSaving}>
                                {isSaving ? 'Sending...' : 'Send Invitation'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
