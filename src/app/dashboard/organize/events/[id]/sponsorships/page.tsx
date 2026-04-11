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
    invitee_email: string;
    proposed_fee: number;
    currency: string;
    platform_fee_percent: number;
    status: string;
    expires_at: string;
    info: { message?: string; terms?: string } | null;
    created_at: string;
}

interface Sponsorship {
    id: string;
    invitation_id: string | null;
    forum_id: string;
    campaign_id: string;
    is_exclusive: boolean;
    share_of_voice: number;
    starts_at: string;
    ends_at: string;
    created_at: string;
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
    const [invitations, setInvitations] = useState<SponsorshipInvitation[]>([]);
    const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [fee, setFee] = useState('');
    const [currency, setCurrency] = useState('KES');
    const [platformFee, setPlatformFee] = useState('20');
    const [expiresInDays, setExpiresInDays] = useState('7');
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        if (!eventId || !activeAccount) return;
        setIsLoading(true);
        try {
            const [eventRes, invitesRes, sponsRes] = await Promise.all([
                supabase
                    .from('events')
                    .select('title')
                    .eq('id', eventId)
                    .eq('account_id', activeAccount.id)
                    .single(),
                supabase
                    .from('sponsorship_invitations')
                    .select('*')
                    .eq('event_id', eventId)
                    .eq('organizer_account_id', activeAccount.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('sponsorships')
                    .select('*')
                    .eq('forum_id', eventId) // sponsorships link through forum
                    .order('created_at', { ascending: false }),
            ]);

            if (eventRes.data) setEventTitle(eventRes.data.title);
            if (invitesRes.error) throw invitesRes.error;

            setInvitations(invitesRes.data || []);
            setSponsorships(sponsRes.data || []);
        } catch (e: any) {
            showToast('Failed to load sponsorship data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [eventId, activeAccount, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleInvite = async () => {
        const numFee = parseFloat(fee);
        const numPlatformFee = parseFloat(platformFee);
        const numDays = parseInt(expiresInDays, 10);

        if (!email.trim() || !numFee || numFee <= 0) {
            showToast('Email and a valid fee are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (numDays || 7));

            const { error } = await supabase
                .from('sponsorship_invitations')
                .insert({
                    event_id: eventId,
                    organizer_account_id: activeAccount!.id,
                    invitee_email: email.trim(),
                    proposed_fee: numFee,
                    currency,
                    platform_fee_percent: numPlatformFee || 20,
                    expires_at: expiresAt.toISOString(),
                    info: message.trim() ? { message: message.trim() } : {},
                });

            if (error) throw error;

            showToast('Sponsorship invitation sent', 'success');
            setIsModalOpen(false);
            setEmail('');
            setFee('');
            setMessage('');
            fetchData();
        } catch (e: any) {
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
                                                    Campaign: {s.campaign_id.slice(0, 8)}...
                                                </p>
                                                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                                                    {formatDate(s.starts_at)} — {formatDate(s.ends_at)}
                                                    {s.is_exclusive && ' · Exclusive'}
                                                    {' · '}{Math.round(s.share_of_voice * 100)}% SOV
                                                </p>
                                            </div>
                                            <Badge variant="success">Active</Badge>
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
                                    <th>Fee</th>
                                    <th>Platform %</th>
                                    <th>Expires</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invitations.map(inv => {
                                    const badge = INVITE_STATUS_MAP[inv.status] || { label: inv.status, variant: 'neutral' as BadgeVariant };
                                    return (
                                        <tr key={inv.id}>
                                            <td>{inv.invitee_email}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(inv.proposed_fee, inv.currency)}</td>
                                            <td>{inv.platform_fee_percent}%</td>
                                            <td>{formatDate(inv.expires_at)}</td>
                                            <td><Badge variant={badge.variant}>{badge.label}</Badge></td>
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
                <Modal onClose={() => setIsModalOpen(false)} title="Invite Sponsor">
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Sponsorship Fee *
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Platform Fee %
                                <input
                                    className={adminStyles.input}
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={platformFee}
                                    onChange={e => setPlatformFee(e.target.value)}
                                />
                            </label>
                            <label className={adminStyles.fieldLabel}>
                                Expires In (days)
                                <input
                                    className={adminStyles.input}
                                    type="number"
                                    min="1"
                                    value={expiresInDays}
                                    onChange={e => setExpiresInDays(e.target.value)}
                                />
                            </label>
                        </div>
                        <label className={adminStyles.fieldLabel}>
                            Message to Sponsor
                            <textarea
                                className={adminStyles.textarea}
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                rows={3}
                                placeholder="Optional message or terms for the sponsor"
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
