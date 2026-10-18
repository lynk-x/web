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
    onSuccess: () => void;
    tiers?: SponsorshipTierItem[];
    initialTier?: SponsorshipTierItem | null;
}

/**
 * Tokenized direct sponsorship invitation generator modal.
 * Enables event organizers to configure bespoke corporate invitations targeting standardized
 * placements (Banner, Interstitial, Video) with custom negotiated pricing ($0 for offline settlement),
 * a 7-day soft-reservation hold, and instant cryptographic claim links.
 */
export default function DirectInviteModal({
    isOpen,
    onClose,
    eventId,
    currency,
    onSuccess,
}: DirectInviteModalProps) {
    const { showToast } = useToast();
    const { copy: copyToClipboard } = useCopyToClipboard();
    const supabase = useMemo(() => createClient(), []);
    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);

    // Form inputs state
    const [placement, setPlacement] = useState<'banner' | 'interstitial' | 'interstitial_video'>('banner');
    const [slots, setSlots] = useState(1);
    const [companyName, setCompanyName] = useState('');
    const [inviteeEmail, setInviteeEmail] = useState('');
    const [inviteeName, setInviteeName] = useState('');
    const [customPrice, setCustomPrice] = useState<number | ''>('');
    const [expiryDays, setExpiryDays] = useState(7);
    const [notes, setNotes] = useState('');

    // Submission & Success state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedInvite, setGeneratedInvite] = useState<SponsorshipInviteItem | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setGeneratedInvite(null);
            setPlacement('banner');
            setSlots(1);
            setCompanyName('');
            setInviteeEmail('');
            setInviteeName('');
            setCustomPrice('');
            setExpiryDays(7);
            setNotes('');
        }
    }, [isOpen]);

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
                placement,
                slots,
                companyName: companyName.trim(),
                inviteeEmail: inviteeEmail.trim(),
                inviteeName: inviteeName.trim() || undefined,
                customPrice: priceOverride,
                currency: currency || 'KES',
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

    const formatPlacementName = (p: string) => {
        if (p === 'banner') return 'Forum Banner Carousel';
        if (p === 'interstitial_video') return 'Video Interstitial';
        return 'Entry Interstitial';
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
                            disabled={isSubmitting}
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
                            Opening the link locks the agreed package terms and initiates funds escrow with a 7-day hold.
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
                            <span className={styles.summaryLabel}>Placement Format</span>
                            <span className={styles.summaryValue}>
                                {formatPlacementName(generatedInvite.placement || placement)} ({generatedInvite.slots || slots} Slots)
                            </span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Agreed Value</span>
                            <span className={styles.summaryValue}>
                                {generatedInvite.custom_price !== null
                                    ? Number(generatedInvite.custom_price) === 0
                                        ? '$0 (Settled Offline)'
                                        : formatCurrency(generatedInvite.custom_price, generatedInvite.currency)
                                    : 'Algorithmic Rate'}
                            </span>
                        </div>
                        <div className={styles.summaryItem}>
                            <span className={styles.summaryLabel}>Reservation Hold</span>
                            <span className={styles.summaryValue}>
                                Expires {formatDate(generatedInvite.expires_at)}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── Generator Form View ─────────────────────────────────────── */
                <form onSubmit={handleSubmit} className={styles.formContainer}>
                    {/* Placement Format & Slot Count */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-placement">
                                Placement Format
                            </label>
                            <select
                                id="invite-placement"
                                className={styles.select}
                                value={placement}
                                onChange={e => {
                                    const nextPlacement = e.target.value as 'banner' | 'interstitial' | 'interstitial_video';
                                    setPlacement(nextPlacement);
                                    const maxAllowed = nextPlacement === 'banner' ? 8 : 2;
                                    setSlots(prev => Math.min(prev, maxAllowed));
                                }}
                            >
                                <option value="banner">Forum Banner (16:9 Carousel – Max 8)</option>
                                <option value="interstitial">Entry Interstitial (9:16 Full Screen – Max 2)</option>
                                <option value="interstitial_video">Video Interstitial (9:16 Auto-play – Max 2)</option>
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="invite-slots">
                                Slot Allocation ({slots} of {placement === 'banner' ? 8 : 2} max)
                            </label>
                            <select
                                id="invite-slots"
                                className={styles.select}
                                value={slots}
                                onChange={e => setSlots(parseInt(e.target.value, 10))}
                            >
                                {Array.from({ length: placement === 'banner' ? 8 : 2 }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>
                                        {n} {n === 1 ? 'Slot' : 'Slots'} ({((n / (placement === 'banner' ? 8 : 2)) * 100).toFixed(1)}% SOV)
                                    </option>
                                ))}
                            </select>
                        </div>
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
                                Negotiated Price Override ({currency || 'KES'})
                            </label>
                            <input
                                id="invite-custom-price"
                                type="number"
                                min={0}
                                step="any"
                                className={styles.input}
                                placeholder="e.g. 0.00 for offline settlement"
                                value={customPrice}
                                onChange={e => setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            />
                            <span className={styles.hint}>Enter 0 if payment was settled offline via wire/bank transfer</span>
                        </div>
                    </div>

                    {/* Link Expiration Window */}
                    <div className={styles.field}>
                        <label className={styles.label}>Reservation Hold Window</label>
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
                            Holds 1 placement slot in soft-reservation for {expiryDays} days. If unclaimed, it returns to the public inventory.
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
