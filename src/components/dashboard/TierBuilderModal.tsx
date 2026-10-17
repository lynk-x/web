"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Modal from '@/components/shared/Modal';
import Spinner from '@/components/shared/Spinner';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/utils/format';
import { getErrorMessage } from '@/utils/error';
import {
    createSponsorshipsRepository,
    type SponsorshipTierItem,
    type ValuationResult,
} from '@/lib/repositories';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import styles from './TierBuilderModal.module.css';

interface TierBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    currency: string;
    tier: SponsorshipTierItem | null;
    onSuccess: () => void;
}

const PLACEMENT_OPTIONS = [
    { value: 'banner', label: 'Banner Placement (16:9)' },
    { value: 'interstitial', label: 'Interstitial (9:16 – Full Screen)' },
    { value: 'interstitial_video', label: 'Interstitial Video (9:16 – Auto-play)' },
];

/**
 * Interactive sell-side sponsorship tier configuration modal.
 * Combines granular package customization (slot capacities, share-of-voice, and deliverable formats)
 * with a real-time algorithmic valuation assistant ensuring pricing never drops below the programmatic yield parity floor.
 */
export default function TierBuilderModal({
    isOpen,
    onClose,
    eventId,
    currency,
    tier,
    onSuccess,
}: TierBuilderModalProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);

    // Form inputs state
    const [name, setName] = useState('');
    const [rank, setRank] = useState(1);
    const [price, setPrice] = useState<number | ''>(0);
    const [maxSlots, setMaxSlots] = useState(1);
    const [shareOfVoice, setShareOfVoice] = useState(1.0);
    const [placementFormat, setPlacementFormat] = useState('banner');

    // Submission & Valuation state
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [valuation, setValuation] = useState<ValuationResult | null>(null);

    // Initialize or reset form when modal opens or editing tier changes
    useEffect(() => {
        if (isOpen) {
            if (tier) {
                setName(tier.name);
                setRank(tier.rank);
                setPrice(tier.price);
                setMaxSlots(tier.max_slots);
                setShareOfVoice(tier.perks?.share_of_voice ?? 1.0);
                const format = Array.isArray(tier.perks?.formats) && tier.perks.formats.length > 0
                    ? tier.perks.formats[0]
                    : (typeof tier.perks?.formats === 'string' ? tier.perks.formats : 'banner');
                setPlacementFormat(format);
            } else {
                setName('');
                setRank(1);
                setPrice('');
                setMaxSlots(1);
                setShareOfVoice(1.0);
                setPlacementFormat('banner');
            }
        }
    }, [isOpen, tier]);

    // Live algorithmic valuation assistant debounced request
    useEffect(() => {
        if (!isOpen || !eventId) return;

        let isMounted = true;
        const timer = setTimeout(async () => {
            setIsCalculating(true);
            const customPerks = {
                share_of_voice: shareOfVoice,
                formats: [placementFormat],
            };

            const res = await sponsorshipsRepo.calculateMarketValuation(
                eventId,
                tier?.id,
                customPerks
            );

            if (isMounted) {
                if (res.data) {
                    setValuation(res.data);
                }
                setIsCalculating(false);
            }
        }, 280);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [isOpen, eventId, tier?.id, shareOfVoice, placementFormat, sponsorshipsRepo]);

    const handleApplyValuationPrice = useCallback(() => {
        if (valuation?.suggested_price) {
            setPrice(valuation.suggested_price);
            showToast(`Applied algorithmic suggested valuation (${formatCurrency(valuation.suggested_price, currency)})`, 'success');
        }
    }, [valuation, currency, showToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            showToast('Tier name is required.', 'error');
            return;
        }

        const numericPrice = typeof price === 'number' ? price : 0;
        if (numericPrice < 0) {
            showToast('Price cannot be negative.', 'error');
            return;
        }

        if (maxSlots < 1) {
            showToast('Slot capacity must be at least 1.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const res = await sponsorshipsRepo.upsertTier({
                eventId,
                tierId: tier?.id,
                name: name.trim(),
                rank: Number(rank) || 1,
                price: numericPrice,
                currency: currency || 'KES',
                maxSlots: Number(maxSlots) || 1,
                perks: {
                    share_of_voice: shareOfVoice,
                    formats: [placementFormat],
                },
                isActive: tier ? tier.is_active : true,
            });

            if (res.error || !res.data) {
                showToast(res.error?.message || 'Failed to save sponsorship tier.', 'error');
                return;
            }

            showToast(tier ? 'Tier updated successfully.' : 'New sponsorship tier created.', 'success');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'An unexpected error occurred while saving the tier.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!tier) return;
        if (!window.confirm(`Are you sure you want to delete the "${tier.name}" tier? This cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await sponsorshipsRepo.deleteTier(eventId, tier.id);
            if (res.error) {
                showToast(res.error.message || 'Failed to delete sponsorship tier.', 'error');
                return;
            }

            showToast('Sponsorship tier removed.', 'success');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'An unexpected error occurred while deleting the tier.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const isEdit = Boolean(tier);
    const canDelete = isEdit && (tier?.claimed_slots === 0);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Configure ${tier?.name || 'Tier'}` : 'New Sponsorship Tier'}
            size="large"
            footer={
                <div className={styles.modalFooter}>
                    <div className={styles.footerLeft}>
                        {canDelete && (
                            <button
                                type="button"
                                className={styles.deleteBtn}
                                onClick={handleDelete}
                                disabled={isDeleting || isSaving}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete Tier'}
                            </button>
                        )}
                    </div>
                    <div className={styles.footerRight}>
                        <button
                            type="button"
                            className={adminStyles.btnSecondary}
                            onClick={onClose}
                            disabled={isSaving || isDeleting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={adminStyles.btnPrimary}
                            onClick={handleSubmit}
                            disabled={isSaving || isDeleting}
                        >
                            {isSaving ? <Spinner size={16} /> : isEdit ? 'Save Changes' : 'Create Tier'}
                        </button>
                    </div>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className={styles.modalBody}>
                {/* ─── Left Column: Configuration Controls ─────────────────────────── */}
                <div className={styles.formColumn}>
                    {/* Tier Name & Rank */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-name">
                                Tier Title
                            </label>
                            <input
                                id="tier-name"
                                type="text"
                                className={styles.input}
                                placeholder="e.g. Title Partner, Gold Sponsor"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-rank">
                                Display Rank
                            </label>
                            <input
                                id="tier-rank"
                                type="number"
                                min={1}
                                max={99}
                                className={styles.input}
                                value={rank}
                                onChange={e => setRank(parseInt(e.target.value, 10) || 1)}
                            />
                            <span className={styles.hint}>Lower rank appears higher in the showcase</span>
                        </div>
                    </div>

                    {/* Capacity & Pricing */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-slots">
                                Slot Capacity
                            </label>
                            <input
                                id="tier-slots"
                                type="number"
                                min={1}
                                max={50}
                                className={styles.input}
                                value={maxSlots}
                                onChange={e => setMaxSlots(parseInt(e.target.value, 10) || 1)}
                                required
                            />
                            <span className={styles.hint}>1 for exclusive title; 2+ for co-sponsors</span>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-price">
                                Asking Price ({currency})
                            </label>
                            <input
                                id="tier-price"
                                type="number"
                                min={0}
                                step="any"
                                className={styles.input}
                                placeholder="0.00"
                                value={price}
                                onChange={e => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                required
                            />
                            <span className={styles.hint}>Contractual slot pricing before tax</span>
                        </div>
                    </div>

                    {/* Share of Voice Slider */}
                    <div className={styles.field}>
                        <div className={styles.label}>
                            <span>Share of Voice (SOV)</span>
                            <span className={styles.badgeValue}>{Math.round(shareOfVoice * 100)}% SOV</span>
                        </div>
                        <input
                            type="range"
                            min="0.10"
                            max="1.0"
                            step="0.05"
                            className={styles.rangeInput}
                            value={shareOfVoice}
                            onChange={e => setShareOfVoice(parseFloat(e.target.value))}
                        />
                        <span className={styles.hint}>
                            {shareOfVoice >= 1.0
                                ? '100% SOV: Sole exclusive takeover of event ad slots and banner placements'
                                : `${Math.round(shareOfVoice * 100)}% SOV: Co-branded rotation with guaranteed programmatic ad suppression`}
                        </span>
                    </div>

                    {/* Campaign Placement Format */}
                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="tier-placement">
                            Placement Format
                        </label>
                        <select
                            id="tier-placement"
                            className={styles.select}
                            value={placementFormat}
                            onChange={e => setPlacementFormat(e.target.value)}
                        >
                            {PLACEMENT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <span className={styles.hint}>
                            Ad creative format and screen placement assigned to this sponsorship tier
                        </span>
                    </div>
                </div>

                {/* ─── Right Column: Live Algorithmic Valuation Assistant ────────── */}
                <div className={styles.valuationColumn}>
                    <div className={styles.valuationCard}>
                        <div className={styles.valuationHeader}>
                            <div className={styles.valuationTitleGroup}>
                                <span className={styles.aiPill}>ALGO</span>
                                <span className={styles.valuationTitle}>Valuation Assistant</span>
                            </div>
                            {isCalculating && <Spinner size={16} />}
                        </div>

                        <div className={styles.valuationDisplay}>
                            <div className={styles.suggestedPriceLabel}>Suggested Market Value</div>
                            <div className={styles.suggestedPriceValue}>
                                {valuation ? formatCurrency(valuation.suggested_price, valuation.currency) : '—'}
                            </div>
                            {valuation && (
                                <div className={styles.parityFloorTag}>
                                    <span>Yield Floor:</span>
                                    <strong>{formatCurrency(valuation.parity_floor_price, valuation.currency)}</strong>
                                </div>
                            )}
                        </div>

                        {valuation && (
                            <div className={styles.breakdownList}>
                                <div className={styles.breakdownItem}>
                                    <span className={styles.breakdownLabel}>Digital Real Estate</span>
                                    <span className={styles.breakdownValue}>
                                        {formatCurrency(valuation.digital_value, valuation.currency)}
                                    </span>
                                </div>
                                {Number(valuation.tangible_value) > 0 && (
                                    <div className={styles.breakdownItem}>
                                        <span className={styles.breakdownLabel}>VIP Passes Allocation</span>
                                        <span className={styles.breakdownValue}>
                                            {formatCurrency(valuation.tangible_value, valuation.currency)}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.breakdownItem}>
                                    <span className={styles.breakdownLabel}>Experiential Activation</span>
                                    <span className={styles.breakdownValue}>
                                        {formatCurrency(valuation.activation_value, valuation.currency)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button
                            type="button"
                            className={styles.applyPriceBtn}
                            onClick={handleApplyValuationPrice}
                            disabled={!valuation || isCalculating}
                        >
                            <span>⚡</span>
                            <span>Apply Valuation to Asking Price</span>
                        </button>

                        <p className={styles.valuationNote}>
                            Calculated using venue capacity, ticket yields, and programmatic ad network CPM parity benchmarks.
                        </p>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
