"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '@/components/shared/Modal';
import Spinner from '@/components/shared/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { formatCurrency, formatDate } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import {
    createSponsorshipsRepository,
    type SponsorshipTierItem,
    type SponsorshipInviteItem,
} from '@/lib/repositories';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './DirectInviteModal.module.css';

interface DirectInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    currency: string;
    tiers: SponsorshipTierItem[];
    initialTier: SponsorshipTierItem | null;
    onSuccess: () => void;
}

/**
 * Tokenized direct sponsorship invitation generator modal ([P3]).
 * Enables event organizers to configure bespoke corporate invitations with custom negotiated pricing,
 * designated expiration windows, and instant cryptographic claim links.
 */
export default function DirectInviteModal({
    isOpen,
    onClose,
    eventId,
    currency,
    tiers,
    initialTier,
    onSuccess,
}: DirectInviteModalProps) {
    const { showToast } = useToast();
    const { copy: copyToClipboard } = useCopyToClipboard();
    const supabase = useMemo(() => createClient(), []);
    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);

    // Form inputs state
    const [selectedTierId, setSelectedTierId] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [inviteeEmail, setInviteeEmail] = useState('');
    const [inviteeName, setInviteeName] = useState('');
    const [customPrice, setCustomPrice] = useState<number | ''>('');
    const [expiryDays, setExpiryDays] = useState(14);
    const [notes, setNotes] = useState('');

    // Submission & Success state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedInvite, setGeneratedInvite] = useState<SponsorshipInviteItem | null>(null);

    // Sync selected tier when modal opens or initialTier changes
    useEffect(() => {
        if (isOpen) {
            setGeneratedInvite(null);
            setCompanyName('');
            setInviteeEmail('');
            setInviteeName('');
            setCustomPrice('');
            setExpiryDays(14);
            setNotes('');

            if (initialTier) {
                setSelectedTierId(initialTier.id);
            } else if (tiers.length > 0) {
                setSelectedTierId(tiers[0].id);
            }
        }
    }, [isOpen, initialTier, tiers]);

    const activeTier = useMemo(() => {
        return tiers.find(t => t.id === selectedTierId) || initialTier || tiers[0];
    }, [tiers, selectedTierId, initialTier]);

    const claimUrl = useMemo(() => {
        if (!generatedInvite) return '';
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return `${origin}/sponsorships/claim/${generatedInvite.invite_token}`;
    }, [generatedInvite]);

    const handleCopy = useCallback(() => {
        if (claimUrl) {
            copyToClipboard(claimUrl);
            showToast('Invitation link copied to clipboard.', 'success');
        }
    }, [claimUrl, copyToClipboard, showToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTierId) {
            showToast('Please select a sponsorship tier.', 'error');
            return;
        }

        if (!companyName.trim()) {
            showToast('Company name is required.', 'error');
            return;
        }

        if (!inviteeEmail.trim()) {
            showToast('Invitee email is required.', 'error');
            return;
        }

        const priceOverride = customPrice !== '' ? Number(customPrice) : null;
        if (priceOverride !== null && priceOverride < 0) {
            showToast('Negotiated price cannot be negative.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await sponsorshipsRepo.createInvite({
                eventId,
                tierId: selectedTierId,
                companyName: companyName.trim(),
                inviteeEmail: inviteeEmail.trim(),
                inviteeName: inviteeName.trim() || undefined,
                customPrice: priceOverride,
                currency: activeTier?.currency || currency || 'KES',
                expiryDays,
                metadata: notes.trim() ? { notes: notes.trim() } : {},
            });

            if (res.error || !res.data) {
                showToast(res.error?.message || 'Failed to generate sponsorship invite.', 'error');
                return;
            }

            setGeneratedInvite(res.data);
            showToast('Tokenized invitation link generated successfully.', 'success');
            onSuccess();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'An unexpected error occurred while generating the invite.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAnother = () => {
        setGeneratedInvite(null);
        setCompanyName('');
        setInviteeEmail('');
        setInviteeName('');
        setCustomPrice('');
        setNotes('');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={generatedInvite ? 'Direct Sponsor Invite Generated' : 'Send Direct Sponsor Invite'}
            size="medium"
            footer={
                generatedInvite ? (
                    <div className={styles.successActions}>
                        <button
                            type="button"
                            className={adminStyles.btnSecondary}
                            onClick={handleCreateAnother}
                        >
                            + Issue Another Invite
                        </button>
                        <button
                            type="button"
                            className={adminStyles.btnPrimary}
                            onClick={() => {
                                handleCopy();
                                onClose();
                            }}
                        >
                            Copy Link & Done
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                        <button
                            type="button"
                            className={adminStyles.btnSecondary}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={adminStyles.btnPrimary}
                            onClick={handleSubmit}
                            disabled={isSubmitting || tiers.length === 0}
                        >
                            {isSubmitting ? <Spinner size={16} /> : 'Generate Tokenized Link'}
                        </button>
                    </div>
                )
            }
        >
            {generatedInvite ? (
                /* ─── Success View: Generated Link & Summary ──────────────────── */
                <div className={styles.successContainer}>
                    <div className={styles.successIconBadge}>✓</div>
                    <div>
                        <h3 className={styles.successTitle}>Private Invitation Ready</h3>
                        <p className={styles.successSubtitle}>
                            Share this private tokenized link with <strong>{generatedInvite.company_name}</strong>.
                            Opening the link locks the agreed package terms and initiates funds escrow.
                        </p>
                    </div>

                    <div className={styles.linkBox}>
                        <input
                            type="text"
                            readOnly
                            className={styles.linkInput}
                            value={claimUrl}
                        />
                        <button
                            type="button"
                            className={styles.copyBtn}
                            onClick={handleCopy}
                        >
                            Copy Link
                        </button>
                    </div>

                    <div className={styles.summaryCard}>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Package Tier</span>
                            <span className={styles.summaryValue}>{generatedInvite.tier_name}</span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Agreed Value</span>
                            <span className={styles.summaryValue}>
                                {generatedInvite.custom_price !== null
                                    ? formatCurrency(generatedInvite.custom_price, generatedInvite.currency)
                                    : activeTier
                                    ? formatCurrency(activeTier.price, activeTier.currency)
                                    : 'Standard'}
                            </span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Expires On</span>
                            <span className={styles.summaryValue}>
                                {formatDate(generatedInvite.expires_at)}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Generator Form View ─────────────────────────────────────── */
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    {/* Target Tier Selection */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="invite-tier">
                            Select Sponsorship Tier
                        </label>
                        {tiers.length === 0 ? (
                            <p className={styles.hint} style={{ color: 'var(--color-interface-error)' }}>
                                No sponsorship tiers configured. Please create a tier before sending an invite.
                            </p>
                        ) : (
                            <select
                                id="invite-tier"
                                className={styles.select}
                                value={selectedTierId}
                                onChange={e => setSelectedTierId(e.target.value)}
                                required
                            >
                                {tiers.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} — {formatCurrency(t.price, t.currency)} ({t.claimed_slots}/{t.max_slots} slots filled)
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Invitee Brand & Email */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-company">
                                Company / Sponsor Name
                            </label>
                            <input
                                id="invite-company"
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Acme Corp, Red Bull"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-email">
                                Primary Contact Email
                            </label>
                            <input
                                id="invite-email"
                                type="email"
                                className={styles.input}
                                placeholder="sponsor@company.com"
                                value={inviteeEmail}
                                onChange={e => setInviteeEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Invitee Contact Name & Negotiated Price */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-name">
                                Contact Person Name (Optional)
                            </label>
                            <input
                                id="invite-name"
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Jane Doe"
                                value={inviteeName}
                                onChange={e => setInviteeName(e.target.value)}
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-custom-price">
                                Negotiated Price Override (Optional)
                            </label>
                            <input
                                id="invite-custom-price"
                                type="number"
                                min={0}
                                step="any"
                                className={styles.input}
                                placeholder={activeTier ? `Default: ${formatCurrency(activeTier.price, activeTier.currency)}` : '0.00'}
                                value={customPrice}
                                onChange={e => setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            />
                            <span className={styles.hint}>Leave blank to apply standard tier price</span>
                        </div>
                    </div>

                    {/* Link Expiration Window */}
                    <div className={styles.field}>
                        <label className={styles.label}>Link Validity Window</label>
                        <div className={styles.pillsGroup}>
                            {[7, 14, 30].map(days => (
                                <button
                                    key={days}
                                    type="button"
                                    className={`${styles.pillOption} ${expiryDays === days ? styles.pillActive : ''}`}
                                    onClick={() => setExpiryDays(days)}
                                >
                                    {days} Days
                                </button>
                            ))}
                        </div>
                        <span className={styles.hint}>
                            Unclaimed reservation expires automatically after {expiryDays} days, releasing slot capacity back to inventory.
                        </span>
                    </div>

                    {/* Notes / Bespoke Terms */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="invite-notes">
                            Internal Outreach Notes (Optional)
                        </label>
                        <textarea
                            id="invite-notes"
                            className={styles.textarea}
                            placeholder="Add notes on custom contract terms, verbal commitments, or key contacts..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </form>
            )}
        </Modal>
    );
}
