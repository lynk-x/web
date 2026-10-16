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

const AVAILABLE_FORMATS = [
    { id: 'banner', label: 'Forum In-Feed Takeover', desc: 'Guaranteed 100% share of voice banners across Chat & Media streams' },
    { id: 'interstitial', label: 'Interstitial Image Takeover', desc: 'High-impact visual display modal on media download interactions' },
    { id: 'interstitial_video', label: 'High-Def Video Takeover', desc: 'Autoplaying modal video spot during attendee asset download' },
    { id: 'omnichannel', label: 'Omnichannel Brand Co-Presence', desc: 'Prominent badge, forum header taglines, and ticket quest integration' },
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
    const [ticketPasses, setTicketPasses] = useState(0);
    const [questSlots, setQuestSlots] = useState(0);
    const [selectedFormats, setSelectedFormats] = useState<string[]>(['banner']);
    const [isActive, setIsActive] = useState(true);

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
                setTicketPasses(tier.perks?.ticket_passes ?? 0);
                setQuestSlots(tier.perks?.quest_slots ?? 0);
                setSelectedFormats(Array.isArray(tier.perks?.formats) ? tier.perks.formats : ['banner']);
                setIsActive(tier.is_active);
            } else {
                setName('');
                setRank(1);
                setPrice('');
                setMaxSlots(1);
                setShareOfVoice(1.0);
                setTicketPasses(2);
                setQuestSlots(1);
                setSelectedFormats(['banner', 'interstitial']);
                setIsActive(true);
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
                ticket_passes: ticketPasses,
                quest_slots: questSlots,
                formats: selectedFormats,
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
    }, [isOpen, eventId, tier?.id, shareOfVoice, ticketPasses, questSlots, selectedFormats, sponsorshipsRepo]);

    const handleToggleFormat = useCallback((formatId: string) => {
        setSelectedFormats(prev =>
            prev.includes(formatId)
                ? prev.filter(f => f !== formatId)
                : [...prev, formatId]
        );
    }, []);

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
                    ticket_passes: Number(ticketPasses) || 0,
                    quest_slots: Number(questSlots) || 0,
                    formats: selectedFormats,
                },
                isActive,
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

                    {/* Deliverable Formats */}
                    <div className={styles.field}>
                        <label className={styles.label}>Placement Formats Included</label>
                        <div className={styles.checkboxGrid}>
                            {AVAILABLE_FORMATS.map(fmt => {
                                const isChecked = selectedFormats.includes(fmt.id);
                                return (
                                    <label
                                        key={fmt.id}
                                        className={`${styles.checkboxCard} ${isChecked ? styles.checkboxActive : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className={styles.checkboxInput}
                                            checked={isChecked}
                                            onChange={() => handleToggleFormat(fmt.id)}
                                        />
                                        <div>
                                            <div className={styles.checkboxTitle}>{fmt.label}</div>
                                            <div className={styles.checkboxDesc}>{fmt.desc}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tangible Passes & Gamified Quests */}
                    <div className={styles.rowGroup}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-passes">
                                VIP / Delegate Passes
                            </label>
                            <input
                                id="tier-passes"
                                type="number"
                                min={0}
                                max={100}
                                className={styles.input}
                                value={ticketPasses}
                                onChange={e => setTicketPasses(parseInt(e.target.value, 10) || 0)}
                            />
                            <span className={styles.hint}>Complimentary barcode tickets bundled with package</span>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="tier-quests">
                                Dynamic Quest Slots
                            </label>
                            <input
                                id="tier-quests"
                                type="number"
                                min={0}
                                max={5}
                                className={styles.input}
                                value={questSlots}
                                onChange={e => setQuestSlots(parseInt(e.target.value, 10) || 0)}
                            />
                            <span className={styles.hint}>Interactive gamified badge tasks on digital tickets</span>
                        </div>
                    </div>

                    {/* Active Status */}
                    <div className={styles.field}>
                        <label className={styles.checkboxCard} style={{ width: 'fit-content' }}>
                            <input
                                type="checkbox"
                                className={styles.checkboxInput}
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                            />
                            <div>
                                <div className={styles.checkboxTitle}>Tier is Active</div>
                                <div className={styles.checkboxDesc}>Allow organizers to issue invitations for this tier</div>
                            </div>
                        </label>
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
                                <div className={styles.breakdownItem}>
                                    <span className={styles.breakdownLabel}>VIP Passes Allocation</span>
                                    <span className={styles.breakdownValue}>
                                        {formatCurrency(valuation.tangible_value, valuation.currency)}
                                    </span>
                                </div>
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
