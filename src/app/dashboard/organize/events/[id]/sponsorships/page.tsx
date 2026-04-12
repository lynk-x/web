"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate } from '@/utils/format';
import SubPageHeader from '@/components/shared/SubPageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import type { BadgeVariant } from '@/types/shared';

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
    const { showToast } = useToast();
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
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    useEffect(() => { fetchData(); }, [fetchData]);

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
        if (!confirm('Revoke this invitation?')) return;
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

    return (
        <div className={adminStyles.page}>
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
                        <button className={adminStyles.secondaryButton} onClick={() => {/* TODO: Manage Tiers Modal */}}>
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
