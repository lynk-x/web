"use client";
import { getErrorMessage } from '@/utils/error';
import ImageCropperModal from '@/components/shared/ImageCropperModal';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styles from './CreateCampaignForm.module.css';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useCountries, Country } from '@/hooks/useCountries';
import ProductTour from '@/components/dashboard/ProductTour';
import { DatePicker } from '@/components/ui/DatePicker';
import { generateCampaignEmbedding, preloadEmbeddingModel } from '@/utils/embedding';
import PageHeader from '@/components/dashboard/PageHeader';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { createSponsorshipsRepository, type PlacementQuoteResult } from '@/lib/repositories/sponsorships.repository';
import { formatCurrency } from '@/utils/format';
import type { CampaignStatus } from '@/types/status';


// ─── Types ────────────────────────────────────────────────────────────────────

/** A single ad creative (headline + image). Supports up to 3 per campaign for A/B rotation. */
export interface Creative {
    headline: string;
    destination_url?: string;
    media_url?: string;
    imageUrl?: string;
    file?: File;
    preview?: string;
    mediaType?: 'image' | 'video'; // Added to support video assets
}

export interface CampaignData {
    id?: string;
    created_at?: string;
    title: string;
    description: string;
    type: 'banner' | 'interstitial' | 'interstitial_video';
    channel?: 'network' | 'event_sponsorship';
    status?: CampaignStatus;
    slots?: number;
    total_budget: string;
    daily_limit: string;
    start_at: string;
    end_at: string;
    destination_url: string;
    target_event_id?: string;
    max_bid_amount: string;
    currency: string;
    target_countries: string[];
    target_tags: string[];
    creatives: Creative[];
    adHeadline: string;
    adImageUrl?: string;
    account_id?: string;
    revision_notes?: string;
}

interface PricingConfig {
    impression: number;
    click: number;
}

// Client-side UX guard only — see the comment at handleAssetChange's size
// check for why the real enforcement boundary lives in media-signer.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

// A draft persisted to localStorage can't carry a File object (it's not
// JSON-serializable — JSON.stringify silently turns it into {}) or a
// blob: object URL (revoked once the tab/session that created it ends), so
// a naive JSON.stringify(formData) produces a "restored" creative that
// looks present (preview is still a truthy string) but is actually dead —
// no file to upload, and an image/video src that 404s. Stripping both
// before persisting makes a restored draft honestly show "no asset yet"
// instead of a broken one that silently passes validateForm()'s asset
// check.
function toDraftSnapshot(data: CampaignData): CampaignData {
    return {
        ...data,
        creatives: data.creatives.map(c => ({
            headline: c.headline,
            destination_url: c.destination_url,
            media_url: c.media_url,
            imageUrl: c.imageUrl,
            mediaType: c.mediaType,
            // file and preview (a blob: URL) are dropped — neither survives
            // a page reload, so persisting them would just recreate the
            // "looks fine, is actually broken" state on restore.
        })),
    };
}



interface CreateCampaignFormProps {
    initialData?: CampaignData;
    isEditing?: boolean;
    redirectPath?: string;
    onDirtyChange?: (isDirty: boolean) => void;
    /** When provided, the form delegates submission to this callback instead of its internal RPC logic.
     *  Receives the current form data and the editing flag. */
    onSubmit?: (formData: CampaignData, isEditing: boolean, status?: 'draft' | 'pending_approval') => Promise<void>;
    /** When provided, seeds the initial account_id in the form data (admin reuse). */
    initialAccountId?: string;
    /** Account whose wallets populate the currency dropdown. Defaults to the
     *  signed-in user's activeAccount; admin pages creating a campaign on
     *  behalf of a different advertiser must pass that advertiser's account
     *  id here (their own activeAccount is the admin's org, not the
     *  advertiser's). */
    walletAccountId?: string;
    pageTitle?: string;
    pageSubtitle?: string;
    /** @deprecated no longer used — the close button is icon-only now. */
    backLabel?: string;
    backHref?: string;
    children?: React.ReactNode;
}


interface MarketSuggestion {
    country_code: string;
    suggested_modifier: number;
    competition_level: 'low' | 'normal' | 'medium' | 'high';
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Multi-step creation and editing form for advertising or sponsorship campaigns.
 * Handles campaign metadata, targeting configuration, creatives upload and budget scheduling.
 */
export default function CreateCampaignForm({
    initialData,
    isEditing = false,
    redirectPath = '/dashboard/ads/campaigns',
    onDirtyChange,
    onSubmit,
    initialAccountId,
    walletAccountId,
    pageTitle,
    pageSubtitle,
    backHref,
    children
}: CreateCampaignFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { confirm, ConfirmDialog } = useConfirmModal();

    useEffect(() => {
        preloadEmbeddingModel();
    }, []);

    // ── UI State ──────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'details' | 'targeting' | 'creative' | 'budget' | 'review'>('details');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isOrgLoading, setIsOrgLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cropper State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [pendingCreativeIdx, setPendingCreativeIdx] = useState<number | null>(null);
    const [pendingMediaType, setPendingMediaType] = useState<'image' | 'video'>('image');
    const [formError, setFormError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [previewClicked, setPreviewClicked] = useState(false); // #7 interactive preview

    // ── Draft Restoration State ─────────────────────────────────────────────
    const [hasDraft, setHasDraft] = useState(false);
    const [draftData, setDraftData] = useState<CampaignData | null>(null);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);

    // ── Pricing Config (fetched from ad_pricing_config) ───────────────────────
    const [pricing, setPricing] = useState<PricingConfig>({ impression: 0, click: 0 });



    // ── Reference Data State (fetched from DB) ────────────────────────────────
    const { countries, isLoading: isLoadingCountries } = useCountries();
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

    // ── Country/Tag Input State ───────────────────────────────────────────────────────
    const [tagInput, setTagInput] = useState('');
    const [countryInput, setCountryInput] = useState('');
    const [countrySuggestions, setCountrySuggestions] = useState<Country[]>([]);
    const [marketSuggestions, setMarketSuggestions] = useState<MarketSuggestion[]>([]);
    const [walletCurrencies, setWalletCurrencies] = useState<string[]>([]);



    // ── Active Creative Index (for A/B multi-creative picker) ─────────────────
    const [activeCreativeIdx, setActiveCreativeIdx] = useState(0);
    /** Holds the three file-input elements for the A/B creative slots. */
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

    // ── Form Data ─────────────────────────────────────────────────────────────
    const defaultData: CampaignData = initialData || {
        title: '',
        description: '',
        type: 'banner',
        channel: 'network',
        slots: 1,
        total_budget: '',
        daily_limit: '',
        start_at: '',
        end_at: '',
        destination_url: '',
        target_event_id: '',
        account_id: initialAccountId ?? '',

        target_countries: [],
        target_tags: [],
        creatives: [{ headline: '', destination_url: '', imageUrl: '', preview: '', file: undefined }],
        max_bid_amount: '0.01',
        currency: '',
        adHeadline: '',
        adImageUrl: '',
    };
    const [formData, setFormData] = useState<CampaignData>(defaultData);

    // Account whose wallets should populate the currency dropdown —
    // walletAccountId overrides activeAccount for admin pages creating a
    // campaign on behalf of a different advertiser (activeAccount there is
    // the admin's own org, not the advertiser's).
    const effectiveWalletAccountId = walletAccountId || activeAccount?.id;

    // Reset the selected currency whenever the target account changes (only
    // matters for admin pages, where the advertiser being created for can
    // change interactively after mount) so a stale selection from a
    // previous account can't be submitted against a different account's
    // wallets.
    useEffect(() => {
        if (isEditing) return;
        setFormData(prev => prev.currency ? { ...prev, currency: '' } : prev);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveWalletAccountId]);

    // Default the currency to the account's primary wallet once wallets
    // load, but only for a NEW campaign (isEditing campaigns already have
    // a real currency from initialData and it must never be overwritten —
    // see the INSERT-only rule in upsert_campaign).
    useEffect(() => {
        if (isEditing || formData.currency || walletCurrencies.length === 0) return;
        const preferred = activeAccount?.wallet_currency;
        const defaultCurrency = (preferred && walletCurrencies.includes(preferred))
            ? preferred
            : walletCurrencies[0];
        setFormData(prev => prev.currency ? prev : { ...prev, currency: defaultCurrency });
    }, [walletCurrencies, activeAccount, isEditing, formData.currency]);

    useEffect(() => {
        if (!isLoadingCountries && countries.length > 0) {
            setCountrySuggestions(countries.slice(0, 4));
        }
    }, [isLoadingCountries, countries]);

    // ── Fetch Reference Data (Tags) ─────────────────────────────
    useEffect(() => {
        const fetchTags = async () => {
            // Fetch official/popular tags for suggestions
            const { data: tData } = await supabase
                .schema('api')
                .from('v1_tags')
                .select('name')
                .order('use_count', { ascending: false })
                .limit(30);
            if (tData) setTagSuggestions(tData.map(t => t.name));
        };
        fetchTags();
    }, [supabase]);

    // ── Fetch the target account's wallet currencies ───────────────────────
    // A new campaign's currency is restricted to a currency the account
    // actually holds a wallet in (a campaign in a currency with no
    // wallet cannot win a placement auction, since bidding requires
    // sufficient balance in that same currency).
    useEffect(() => {
        if (!effectiveWalletAccountId) {
            setWalletCurrencies([]);
            return;
        }
        const fetchWallets = async () => {
            const { data } = await supabase
                .schema('api')
                .from('v1_wallet_balances')
                .select('currency')
                .eq('account_id', effectiveWalletAccountId);
            setWalletCurrencies((data || []).map(w => w.currency));
        };
        fetchWallets();
    }, [supabase, effectiveWalletAccountId]);

    // ── Fetch Market Competition Suggestions ───────────────────────────
    useEffect(() => {
        if (!formData.target_countries?.length) {
            setMarketSuggestions([]);
            return;
        }

        const fetchMarketData = async () => {
            const { data, error } = await supabase.schema('api').rpc('get_market_bid_suggestion', {
                p_country_codes: formData.target_countries
            });
            if (!error && data) {
                setMarketSuggestions(data as MarketSuggestion[]);
            }
        };

        fetchMarketData();
    }, [supabase, formData.target_countries]);

    // ── Fetch Pricing on Ad Type Change ──────────────────────────────────────
    useEffect(() => {
        const fetchPricing = async () => {
            const { data, error } = await supabase
                .schema('api')
                .from('v1_pricing_config')
                .select('interaction_type, base_price')
                .eq('ad_type', formData.type);

            if (error || !data || data.length === 0) {
                setPricing({ impression: 0, click: 0 });
                if (error) console.warn('Failed to fetch ad pricing config:', error.message);
                return;
            }

            const imp = data.find((r: any) => r.interaction_type === 'impression')?.base_price ?? 0;
            const clk = data.find((r: any) => r.interaction_type === 'click')?.base_price ?? 0;
            setPricing({ impression: imp, click: clk });
        };
        fetchPricing();
    }, [formData.type, supabase]);

    const sponsorshipsRepo = useMemo(() => createSponsorshipsRepository(supabase), [supabase]);

    // ── Sponsorable Events & Live Quote State (for Event Sponsorship channel) ──
    const [sponsorableEvents, setSponsorableEvents] = useState<{ id: string; title: string; currency: string; start_datetime: string; end_datetime: string }[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [placementQuote, setPlacementQuote] = useState<PlacementQuoteResult | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    // ── Fetch Sponsorable Events ─────────────────────────────────────────────
    useEffect(() => {
        if (formData.channel !== 'event_sponsorship') return;
        let isCancelled = false;

        const loadEvents = async () => {
            setIsLoadingEvents(true);
            try {
                const { data, error } = await supabase
                    .schema('api')
                    .from('v1_events')
                    .select('id, title, currency, start_datetime, end_datetime')
                    .eq('status', 'published')
                    .eq('is_sponsorship_enabled', true)
                    .order('start_datetime', { ascending: true })
                    .limit(50);

                if (!isCancelled && data && !error) {
                    setSponsorableEvents(data as any);
                }
            } catch (err) {
                console.error('Failed to fetch sponsorable events', err);
            } finally {
                if (!isCancelled) setIsLoadingEvents(false);
            }
        };

        loadEvents();
        return () => {
            isCancelled = true;
        };
    }, [formData.channel, supabase]);

    // ── Fetch Placement Quote on Event / Type / Slots Change ──────────────────
    useEffect(() => {
        if (formData.channel !== 'event_sponsorship' || !formData.target_event_id) {
            setPlacementQuote(null);
            setQuoteError(null);
            return;
        }

        let isCancelled = false;

        const fetchQuote = async () => {
            setIsQuoteLoading(true);
            setQuoteError(null);

            const { data, error } = await sponsorshipsRepo.getPlacementQuote(
                formData.target_event_id!,
                formData.type,
                formData.slots || 1
            );

            if (isCancelled) return;
            setIsQuoteLoading(false);

            if (error || !data) {
                setQuoteError(error?.message || 'Failed to calculate placement quote.');
                setPlacementQuote(null);
            } else {
                setPlacementQuote(data);
                if (!data.is_available) {
                    setQuoteError(data.reason || 'Placement is not available for requested slots.');
                }
                // Auto-sync currency, fixed contract budget, and timeline from quote & event
                // Option 1: start_at runs immediately upon approval (today) for pre-event forum coverage;
                // end_at includes a 48-hour buffer after the event ends for post-event discussion recaps.
                setFormData(prev => {
                    const selectedEv = sponsorableEvents.find(e => e.id === prev.target_event_id);
                    const today = new Date().toISOString().split('T')[0];
                    let bufferedEnd = '';
                    if (selectedEv?.end_datetime) {
                        const endMs = new Date(selectedEv.end_datetime).getTime() + (48 * 60 * 60 * 1000);
                        bufferedEnd = new Date(endMs).toISOString().split('T')[0];
                    }
                    return {
                        ...prev,
                        currency: data.currency || prev.currency,
                        total_budget: data.total_price ? String(data.total_price) : prev.total_budget,
                        daily_limit: data.total_price ? String(data.total_price) : prev.daily_limit,
                        start_at: today,
                        end_at: bufferedEnd || prev.end_at,
                    };
                });
            }
        };

        fetchQuote();
        return () => {
            isCancelled = true;
        };
    }, [formData.channel, formData.target_event_id, formData.type, formData.slots, sponsorshipsRepo, sponsorableEvents]);

    // ── Persistent Draft Check ───────────────────────────────────────────────
    useEffect(() => {
        if (isEditing) return;
        const saved = localStorage.getItem('campaign_draft');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.title || parsed.total_budget) {
                    setDraftData(parsed);
                    setHasDraft(true);
                }
            } catch (e) { console.error('Draft parse error', e); }
        }
    }, [isEditing]);

    const applyDraft = () => {
        if (draftData) {
            setFormData(draftData);
            setIsDraftLoaded(true);
            setHasDraft(false);
            // Creative files/previews are never persisted (see
            // toDraftSnapshot) — a restored draft that had a pending,
            // not-yet-uploaded asset needs it re-attached before it can be
            // submitted.
            const needsReupload = draftData.creatives.some(c => !c.imageUrl && !c.file);
            showToast(
                needsReupload
                    ? 'Draft restored — please re-upload your creative asset(s).'
                    : 'Draft restored successfully.',
                needsReupload ? 'warning' : 'success'
            );
        }
    };

    const discardDraft = () => {
        localStorage.removeItem('campaign_draft');
        setHasDraft(false);
        setDraftData(null);
        if (isDraftLoaded) {
            setFormData(defaultData);
            setIsDraftLoaded(false);
        }
    };

    // ── Dirty Check ───────────────────────────────────────────────────────────
    const isDirty = useMemo(() => {
        return JSON.stringify(formData) !== JSON.stringify(defaultData);
    }, [formData, defaultData]);

    useEffect(() => {
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Auto-save draft
            if (!isEditing && formData.title) {
                const timer = setTimeout(() => {
                    localStorage.setItem('campaign_draft', JSON.stringify(toDraftSnapshot(formData)));
                }, 1000);
                return () => {
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                    clearTimeout(timer);
                };
            }

            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [isDirty, onDirtyChange, isEditing, formData.title]);

    /**
     * Live validation for campaign dates.
     * Note: Bypassed for event sponsorship because flight dates are strictly dictated by the sponsored event.
     */
    useEffect(() => {
        const nextErrors = { ...errors };
        let hasChanges = false;

        if (formData.channel === 'event_sponsorship') {
            if (nextErrors.start_at || nextErrors.end_at) {
                delete nextErrors.start_at;
                delete nextErrors.end_at;
                setErrors(nextErrors);
            }
            return;
        }

        if (formData.start_at) {
            const start = new Date(formData.start_at);
            const now = new Date();
            
            // Check 1: Start date in the past
            if (start < now && !isEditing) {
                if (nextErrors.start_at !== 'Start date cannot be in the past') {
                    nextErrors.start_at = 'Start date cannot be in the past';
                    hasChanges = true;
                }
            } else if (nextErrors.start_at === 'Start date cannot be in the past') {
                delete nextErrors.start_at;
                hasChanges = true;
            }

            // Check 2: End date vs Start date
            if (formData.end_at) {
                const end = new Date(formData.end_at);
                
                if (end <= start) {
                    if (nextErrors.end_at !== 'End date must be after start date') {
                        nextErrors.end_at = 'End date must be after start date';
                        hasChanges = true;
                    }
                } else if (nextErrors.end_at === 'End date must be after start date') {
                    delete nextErrors.end_at;
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            setErrors(nextErrors);
        }
    }, [formData.start_at, formData.end_at, formData.channel, isEditing]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const getMaxSlotsForType = (type: string) => (type === 'banner' ? 8 : 2);

    /**
     * Formats slot allocation numbers into intuitive attendee exposure ratios.
     * Replaces ad-tech jargon with concrete attendee frequency and milestone indicators.
     */
    const getSlotOptionLabel = (slotNum: number, type: string) => {
        const max = type === 'banner' ? 8 : 2;
        if (slotNum === max) {
            return 'Full Exclusive Takeover';
        }

        if (max === 2) {
            return '1 in 2 Attendee Views';
        }

        switch (slotNum) {
            case 1:
                return '1 in 8 Attendee Views';
            case 2:
                return '1 in 4 Attendee Views';
            case 3:
                return '3 in 8 Attendee Views';
            case 4:
                return '1 in 2 Attendee Views';
            case 5:
                return '5 in 8 Attendee Views';
            case 6:
                return '3 in 4 Attendee Views';
            case 7:
                return '7 in 8 Attendee Views';
            default:
                return `${slotNum} ${slotNum === 1 ? 'Slot' : 'Slots'}`;
        }
    };

    const handleChannelChange = (channel: 'network' | 'event_sponsorship') => {
        setFormData(prev => ({
            ...prev,
            channel,
            ...(channel === 'network' ? { target_event_id: '' } : {})
        }));
    };

    const handleSlotsChange = (slots: number) => {
        setFormData(prev => ({ ...prev, slots }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'type') {
            const maxAllowed = getMaxSlotsForType(value);
            setFormData(prev => ({
                ...prev,
                type: value as any,
                slots: Math.min(prev.slots || 1, maxAllowed),
            }));
        } else if (name === 'target_event_id') {
            const selectedEv = sponsorableEvents.find(ev => ev.id === value);
            const today = new Date().toISOString().split('T')[0];
            let bufferedEnd = '';
            if (selectedEv?.end_datetime) {
                const endMs = new Date(selectedEv.end_datetime).getTime() + (48 * 60 * 60 * 1000);
                bufferedEnd = new Date(endMs).toISOString().split('T')[0];
            }
            setFormData(prev => ({
                ...prev,
                target_event_id: value,
                start_at: today,
                ...(bufferedEnd ? { end_at: bufferedEnd } : {})
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (!touched[name]) setTouched(prev => ({ ...prev, [name]: true }));
    };

    /** Add a tag from input or suggestion chips. */
    const addTag = (tag: string) => {
        const normalized = tag.toLowerCase().trim().replace(/\s+/g, '_');
        if (!normalized || formData.target_tags.includes(normalized) || formData.target_tags.length >= 10) return;
        setFormData(prev => ({ ...prev, target_tags: [...prev.target_tags, normalized] }));
        setTagInput('');
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({ ...prev, target_tags: prev.target_tags.filter(t => t !== tag) }));
    };

    /** Add a country to targeting. */
    const addCountry = (code: string) => {
        if (!code || formData.target_countries.includes(code) || formData.target_countries.length >= 5) return;
        setFormData(prev => ({
            ...prev,
            target_countries: [...prev.target_countries, code]
        }));
        setCountryInput('');
    };

    const removeCountry = (code: string) => {
        setFormData(prev => ({
            ...prev,
            target_countries: prev.target_countries.filter(c => c !== code)
        }));
    };

    /** Update a single creative field by index. */
    const updateCreative = (idx: number, patch: Partial<Creative>) => {
        setFormData(prev => {
            const creatives = [...prev.creatives];
            creatives[idx] = { ...creatives[idx], ...patch };
            // If primary creative's destination_url is updated, keep top-level destination_url in sync as fallback
            const nextDestinationUrl = (idx === 0 && patch.destination_url !== undefined)
                ? patch.destination_url
                : prev.destination_url;
            return { ...prev, creatives, destination_url: nextDestinationUrl };
        });
    };

    const addCreative = () => {
        if (formData.creatives.length >= 3) return;
        const defaultUrl = formData.creatives[0]?.destination_url || formData.destination_url || '';
        setFormData(prev => ({
            ...prev,
            creatives: [...prev.creatives, { headline: '', destination_url: defaultUrl, imageUrl: '', preview: '', file: undefined }],
        }));
        setActiveCreativeIdx(formData.creatives.length);
    };

    const removeCreative = (idx: number) => {
        if (formData.creatives.length <= 1) return;
        setFormData(prev => {
            const creatives = prev.creatives.filter((_, i) => i !== idx);
            return { ...prev, creatives };
        });
        setActiveCreativeIdx(Math.max(0, idx - 1));
    };

    const handleAssetChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

        // UX-only guard — media-signer's presigned R2 PUT URL can't enforce a
        // size ceiling itself (R2 only supports presigned PUT, not the
        // presigned-POST flow that has a content-length-range condition), so
        // the edge function backstops this with a post-upload HeadObject
        // check + delete. This check just avoids a slow upload the backend
        // is going to reject anyway.
        const maxBytes = mediaType === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > maxBytes) {
            const maxMb = Math.round(maxBytes / (1024 * 1024));
            showToast(`${mediaType === 'video' ? 'Video' : 'Image'} exceeds the ${maxMb}MB limit.`, 'error');
            e.target.value = '';
            return;
        }

        if (mediaType === 'video') {
            const url = URL.createObjectURL(file);
            updateCreative(idx, { file, preview: url, mediaType: 'video' });
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPendingImage(reader.result as string);
            setPendingCreativeIdx(idx);
            setPendingMediaType(mediaType);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);

        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob, cropData?: any) => {
        if (pendingCreativeIdx === null) return;
        
        // Image branch is already WEBP (getCroppedImg encodes as image/webp).
        const fileName = pendingMediaType === 'video' ? `creative_${pendingCreativeIdx}.mp4` : `creative_${pendingCreativeIdx}.webp`;
        const type = pendingMediaType === 'video' ? 'video/mp4' : 'image/webp';
        
        const file = new File([croppedBlob], fileName, { type });
        const url = URL.createObjectURL(croppedBlob);
        
        updateCreative(pendingCreativeIdx, { 
            file, 
            preview: url, 
            mediaType: pendingMediaType,
            // If we wanted to store crop data in metadata, we could do it here
        });
        
        setIsCropperOpen(false);
        setPendingImage(null);
        setPendingCreativeIdx(null);
    };

    const handleCloseCropper = () => {
        setIsCropperOpen(false);
        setPendingImage(null);
        setPendingCreativeIdx(null);
    };

    const handleRemoveAsset = (idx: number) => {
        updateCreative(idx, { file: undefined, preview: '', imageUrl: '' });
        if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
    };

    // ── Performance Forecast ──────────────────────────────────────────────────

    const forecast = useMemo(() => {
        const budget = parseFloat(formData.total_budget);
        const start = formData.start_at ? new Date(formData.start_at) : null;
        const end = formData.end_at ? new Date(formData.end_at) : null;
        if (!budget || !start || !end || pricing.impression <= 0) return null;

        const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
        // Lower bound estimate: 80% of budget spent on impressions
        const impBudget = budget * 0.8;
        const minImpressions = Math.round(impBudget / (pricing.impression * 1.5));  // conservative (pays some premium)
        const maxImpressions = Math.round(impBudget / pricing.impression);           // optimistic (floor price)
        // Typical CTR for in-app ads: ~0.5% – 1.5%
        const minClicks = Math.round(minImpressions * 0.005);
        const maxClicks = Math.round(maxImpressions * 0.015);

        return { days, minImpressions, maxImpressions, minClicks, maxClicks };
    }, [formData.total_budget, formData.start_at, formData.end_at, pricing]);

    // ── Schedule Timeline ─────────────────────────────────────────────────────
    const scheduleTimeline = useMemo(() => {
        const start = formData.start_at ? new Date(formData.start_at) : null;
        const end = formData.end_at ? new Date(formData.end_at) : null;
        if (!start || !end || end <= start) return [];

        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const timeline: { label: string; active: boolean }[] = [];
        const cursor = new Date(start);

        if (diffDays <= 14) {
            // Daily granularity for short campaigns
            while (cursor <= end) {
                timeline.push({
                    label: cursor.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                    active: true,
                });
                cursor.setDate(cursor.getDate() + 1);
            }
        } else {
            // Weekly granularity for longer campaigns
            while (cursor <= end) {
                const weekStart = new Date(cursor);
                timeline.push({
                    label: `Wk: ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
                    active: true,
                });
                cursor.setDate(cursor.getDate() + 7);
                if (timeline.length > 24) break; // Safety cap
            }
        }
        return timeline;
    }, [formData.start_at, formData.end_at]);

    // ── Validation ────────────────────────────────────────────────────────────
    const validateForm = (): boolean => {
        setFormError('');
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'Campaign title is required.';

        if (!isEditing && !formData.currency) {
            newErrors.currency = 'A wallet currency is required.';
        }

        const budget = parseFloat(formData.total_budget);
        if (isNaN(budget) || budget <= 0) newErrors.total_budget = 'Valid positive total budget is required.';

        const limit = parseFloat(formData.daily_limit);
        if (formData.channel !== 'event_sponsorship' && formData.daily_limit && (isNaN(limit) || limit <= 0 || limit > budget)) {
            newErrors.daily_limit = 'Daily limit must be a positive number and cannot exceed total budget.';
        }

        if (formData.channel === 'event_sponsorship') {
            if (!formData.target_event_id) {
                newErrors.target_event_id = 'Please select a target event for sponsorship.';
            }
            if (placementQuote && !placementQuote.is_available) {
                newErrors.slots = placementQuote.reason || 'Requested slots are not available.';
            }
        } else {
            const bid = parseFloat(formData.max_bid_amount);
            if (isNaN(bid) || bid <= 0) {
                newErrors.max_bid_amount = 'Valid positive max bid amount is required.';
            } else {
                if (formData.daily_limit && !isNaN(limit) && (bid > limit)) {
                    newErrors.max_bid_amount = `Max bid (${bid}) cannot be higher than the daily limit (${limit}).`;
                }
                if (!isNaN(budget) && bid > budget) {
                    newErrors.max_bid_amount = `Max bid (${bid}) cannot exceed the total campaign budget (${budget}).`;
                }
            }
        }

        if (formData.channel !== 'event_sponsorship') {
            if (!formData.start_at) newErrors.start_at = 'Start date is required.';
            if (!formData.end_at) newErrors.end_at = 'End date is required.';
        } else {
            // For event sponsorship, ensure start_at is today and end_at has +48h buffer from the event
            const today = new Date().toISOString().split('T')[0];
            if (!formData.start_at) formData.start_at = today;
            if (!formData.end_at) {
                const selectedEv = sponsorableEvents.find(e => e.id === formData.target_event_id);
                if (selectedEv?.end_datetime) {
                    const endMs = new Date(selectedEv.end_datetime).getTime() + (48 * 60 * 60 * 1000);
                    formData.end_at = new Date(endMs).toISOString().split('T')[0];
                } else {
                    formData.end_at = today;
                }
            }
        }

        formData.creatives.forEach((c, idx) => {
            const label = idx === 0 ? 'Primary' : `Variant ${String.fromCharCode(65 + idx)}`;
            if (!c.headline.trim()) {
                newErrors[`creative.${idx}.headline`] = `${label} headline is required.`;
            }
            if (!c.preview && !c.imageUrl && !formData.adImageUrl) {
                newErrors[`creative.${idx}.asset`] = `${label} creative asset is required.`;
            }
            const cUrl = (c.destination_url || formData.destination_url || '').trim();
            if (!cUrl) {
                newErrors[`creative.${idx}.destination_url`] = `${label} destination URL is required.`;
            } else if (!cUrl.startsWith('https://')) {
                newErrors[`creative.${idx}.destination_url`] = 'A secure destination URL (https://...) is required.';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTabSwitch = (target: 'details' | 'targeting' | 'creative' | 'budget' | 'review') => {
        setActiveTab(target);
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e?: React.FormEvent, forceStatus?: 'draft' | 'pending_approval') => {
        if (e) e.preventDefault();
        setFormError('');
        
        const targetStatus = forceStatus || (isEditing ? (formData.status === 'revision_requested' ? 'pending_approval' : undefined) : 'pending_approval');

        if (onSubmit) { 
            setIsSubmitting(true);
            try {
                await onSubmit(formData, isEditing, targetStatus); 
            } finally {
                setIsSubmitting(false);
            }
            return; 
        }
        if (!effectiveWalletAccountId) { showToast('Please select an active account first.', 'error'); return; }
        if (!validateForm()) { showToast('Please review the form for errors.', 'error'); return; }

        setIsSubmitting(true);
        try {
            // 1. Upload all creative assets (if any new files)
            const uploadedCreatives = await Promise.all(formData.creatives.map(async (c, idx) => {
                const targetUrl = (c.destination_url || formData.destination_url || '').trim();
                if (!c.file) return {
                    media_type: c.mediaType || 'image',
                    call_to_action: c.headline,
                    destination_url: targetUrl,
                    media_url: c.media_url || c.imageUrl || formData.adImageUrl,
                    url: c.media_url || c.imageUrl || formData.adImageUrl,
                    is_primary: idx === 0
                };
                
                const ext = c.file.name.split('.').pop();
                const filename = `${effectiveWalletAccountId}_${Date.now()}_creative_${idx}.${ext}`;

                const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                    body: {
                        action: 'upload',
                        folder: 'ad_media',
                        filename,
                        contentType: c.file.type,
                        mediaType: c.mediaType || 'image',
                    }
                });

                if (signError || !signData?.uploadUrl) {
                    throw new Error(signError?.message || 'Failed to get upload URL');
                }

                const putResponse = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': c.file.type,
                    },
                    body: c.file,
                });

                if (!putResponse.ok) {
                    throw new Error('Failed to upload creative to R2');
                }
                const maxBytes = (c.mediaType || 'image') === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke('media-signer', {
                    body: {
                        action: 'verify_upload',
                        fileKey: signData.fileKey,
                        maxBytes,
                    }
                });
                if (verifyError || !verifyData?.ok) {
                    throw new Error(verifyError?.message || 'Uploaded file exceeds the allowed size limit.');
                }

                return {
                    media_type: c.mediaType || 'image',
                    call_to_action: c.headline,
                    destination_url: targetUrl,
                    media_url: signData.fileUrl,
                    url: signData.fileUrl,
                    is_primary: idx === 0
                };
            }));

            // 2. Submit to RPC for atomic persistence
            const { data, error } = await supabase.schema('api').rpc('upsert_campaign', {
                p_account_id: effectiveWalletAccountId,
                p_campaign_id: isEditing ? formData.id : null,
                p_created_at: formData.created_at || null,
                p_data: {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    channel: formData.channel || 'network',
                    ...(formData.channel === 'event_sponsorship' ? {
                        target_event_id: formData.target_event_id,
                        sponsorship_details: {
                            slots: formData.slots || 1,
                            share_of_voice: placementQuote?.share_of_voice || ((formData.slots || 1) / (formData.type === 'banner' ? 8 : 2)),
                            price_per_slot: placementQuote?.price_per_slot || 0,
                            quote_total: placementQuote?.total_price || parseFloat(formData.total_budget),
                        }
                    } : {}),
                    total_budget: parseFloat(formData.total_budget),
                    daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                    max_bid_amount: formData.channel === 'event_sponsorship' ? 1.0 : parseFloat(formData.max_bid_amount),
                    currency: formData.currency,
                    start_at: new Date(formData.start_at).toISOString(),
                    end_at: new Date(formData.end_at).toISOString(),
                    destination_url: formData.destination_url,
                    ...(targetStatus ? { status: targetStatus } : {})
                },
                p_regions: formData.target_countries,
                p_tags: formData.target_tags,
                p_creatives: uploadedCreatives
            });

            if (error) throw error;

            // Generate and update campaign embedding client-side
            const campaignId = (data as any)?.campaign_id;
            if (campaignId) {
                try {
                    const vector = await generateCampaignEmbedding(
                        formData.title,
                        formData.description,
                        formData.target_tags,
                        formData.target_countries
                    );
                    if (vector && vector.length > 0) {
                        const { error: embedError } = await supabase
                            .schema('api')
                            .from('v1_campaigns')
                            .update({ embedding: vector })
                            .eq('id', campaignId);
                        if (embedError) {
                            console.error('[Embedding] Failed to save campaign embedding:', embedError);
                        }
                    }
                } catch (embedErr) {
                    console.error('[Embedding] Failed to generate/save campaign embedding:', embedErr);
                }
            }

            showToast(isEditing ? (formData.status === 'revision_requested' ? 'Revision submitted for approval!' : 'Campaign updated successfully!') : 'Campaign submitted for approval!', 'success');
            onDirtyChange?.(false);
            localStorage.removeItem('campaign_draft');
            router.push(redirectPath);
            router.refresh();
        } catch (err: unknown) {
            console.error('Submission error:', err);
            showToast(getErrorMessage(err) || 'Failed to save campaign.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

        // ─── UI Helpers ───────────────────────────────────────────────────────────

        const activeCreative = formData.creatives[activeCreativeIdx] || formData.creatives[0];

        const fmtNum = (n: number) =>
            n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}`;

        /**
         * Render dynamic placement quote card and Category Sponsor Shield status
         * for event sponsorship campaigns when a target event is selected.
         */
        const renderPlacementQuoteCard = () => {
            if (formData.channel !== 'event_sponsorship' || !formData.target_event_id) return null;
            return (
                <div className={styles.placementQuoteCard}>
                    <div className={styles.quoteHeader}>
                        <span className={styles.quoteHeaderTitle}>
                            {isQuoteLoading ? 'Calculating Placement Quote...' : 'Live Placement Quote & Inventory'}
                        </span>
                        {placementQuote?.is_exclusive_takeover && (
                            <span className={styles.quoteExclusiveBadge}>★ 100% Exclusive Takeover</span>
                        )}
                    </div>

                    {quoteError ? (
                        <div className={styles.quoteWarningBox}>
                            <span>⚠️ {quoteError}</span>
                        </div>
                    ) : placementQuote ? (
                        <>
                            <div className={styles.quoteMetricsGrid}>
                                <div className={styles.quoteMetricItem}>
                                    <span className={styles.quoteMetricLabel}>Total Contract</span>
                                    <span className={`${styles.quoteMetricValue} ${styles.quoteMetricHighlight}`}>
                                        {formatCurrency(placementQuote.total_price, placementQuote.currency)}
                                    </span>
                                </div>
                                <div className={styles.quoteMetricItem}>
                                    <span className={styles.quoteMetricLabel}>Price per Slot</span>
                                    <span className={styles.quoteMetricValue}>
                                        {formatCurrency(placementQuote.price_per_slot, placementQuote.currency)}
                                    </span>
                                </div>
                                <div className={styles.quoteMetricItem}>
                                    <span className={styles.quoteMetricLabel}>Audience Exposure</span>
                                    <span className={styles.quoteMetricValue}>
                                        {parseFloat((placementQuote.share_of_voice * 100).toFixed(1))}% of Views
                                    </span>
                                </div>
                                <div className={styles.quoteMetricItem}>
                                    <span className={styles.quoteMetricLabel}>Available Slots</span>
                                    <span className={styles.quoteMetricValue}>
                                        {placementQuote.available_slots} / {placementQuote.max_slots}
                                    </span>
                                </div>
                            </div>

                            <div className={styles.quoteShieldBox}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                <span>
                                    <strong>Category Sponsor Shield Active:</strong> Competing sponsors in your category are locked out for this placement. Includes immediate pre-event delivery and 48-hour post-event forum recap coverage.
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>
            );
        };

        // ─── JSX ──────────────────────────────────────────────────────────────────

        const handleClose = async () => {
            if (isDirty) {
                const confirmed = await confirm('You have unsaved changes. Are you sure you want to leave?', { title: 'Unsaved Changes', confirmLabel: 'Leave', cancelLabel: 'Stay' });
                if (!confirmed) return;
            }
            if (backHref) router.push(backHref);
            else router.back();
        };

        return (
            <>
                {ConfirmDialog}
                <PageHeader
                    title={pageTitle || (isEditing ? "Edit Campaign" : "Create New Campaign")}
                    subtitle={pageSubtitle || (isEditing ? "Update your campaign details and creative." : "Set up a new campaign to reach more users.")}
                    onClose={handleClose}
                    primaryAction={{
                        label: isEditing ? (formData.status === 'revision_requested' ? 'Submit Revision' : 'Save Changes') : 'Launch Campaign',
                        type: 'submit',
                        formId: 'campaign-form',
                        isLoading: isSubmitting,
                        className: 'tour-ads-form-actions'
                    }}
                    secondaryAction={!isEditing ? {
                        label: 'Save Draft',
                        onClick: () => handleSubmit(undefined, 'draft'),
                        isLoading: isSubmitting
                    } : undefined}
                />

                {children}

                {formData.status === 'revision_requested' && (
                    <div style={{
                        padding: '16px 20px',
                        marginBottom: '20px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--color-interface-warning)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            Changes Requested by Event Organizer
                        </div>
                        {formData.revision_notes && (
                            <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                                &ldquo;{formData.revision_notes}&rdquo;
                            </p>
                        )}
                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.75 }}>
                            Please review the requested changes, update your creative assets or details, and click &ldquo;Submit Revision&rdquo;. Your reserved slot and escrow balance remain held.
                        </p>
                    </div>
                )}

                <div className={adminStyles.subPageGrid}>

                    {/* ── Left: Form ─────────────────────────────────────────── */}
                    <div className={adminStyles.formColumn}>
                        <div className={`${adminStyles.pageCard} tour-ads-form-container`} style={{ padding: '0' }}>

                            {/* Tab Nav */}
                            <div className={styles.tabsContainer} style={{ padding: '0 24px' }}>
                                <div className={`${styles.tabs} tour-ads-form-tabs`}>
                                    {(['details', 'targeting', 'creative', 'budget', 'review'] as const).map(tab => (
                                        <div
                                            key={tab}
                                            className={`${styles.tabItem} ${activeTab === tab ? styles.activeTab : ''} tour-ads-tab-${tab}`}
                                            onClick={() => handleTabSwitch(tab)}
                                        >
                                            {tab === 'details' ? 'Campaign' : tab === 'targeting' ? 'Targeting' : tab === 'creative' ? 'Creatives' : tab === 'budget' ? 'Budget' : 'Review'}
                                        </div>
                                    ))}
                                </div>
                                <div className={styles.tabNavArrows}>
                                    <button 
                                        type="button" 
                                        className={styles.tabArrowBtn} 
                                        onClick={() => {
                                            const flow = ['details', 'targeting', 'creative', 'budget', 'review'];
                                            const idx = flow.indexOf(activeTab);
                                            if (idx > 0) handleTabSwitch(flow[idx - 1] as any);
                                        }} 
                                        disabled={activeTab === 'details'}
                                        title="Previous Section"
                                        aria-label="Previous Section"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <button 
                                        type="button" 
                                        className={styles.tabArrowBtn} 
                                        onClick={() => {
                                            const flow = ['details', 'targeting', 'creative', 'budget', 'review'];
                                            const idx = flow.indexOf(activeTab);
                                            if (idx < flow.length - 1) handleTabSwitch(flow[idx + 1] as any);
                                        }} 
                                        disabled={activeTab === 'review'}
                                        title="Next Section"
                                        aria-label="Next Section"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                            </div>

                            <form id="campaign-form" onSubmit={(e) => handleSubmit(e)} style={{ padding: '24px' }}>

                                {/* ── Tab: Campaign Details ── */}
                                {activeTab === 'details' && (
                                    <div className={styles.formSection}>

                                        {/* ── Channel Selector: Network vs Event Sponsorship ── */}
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>
                                                Channel <span className={styles.requiredIndicator}>*Required</span>
                                            </label>
                                            <div className={styles.channelToggleGrid} role="radiogroup" aria-label="Campaign Channel Selection">
                                                <button
                                                    type="button"
                                                    className={`${styles.channelCard} ${formData.channel !== 'event_sponsorship' ? styles.channelCardActive : ''}`}
                                                    onClick={() => handleChannelChange('network')}
                                                    disabled={isEditing}
                                                    role="radio"
                                                    aria-checked={formData.channel !== 'event_sponsorship'}
                                                >
                                                    <div className={styles.channelCardTop}>
                                                        <div className={styles.channelIconWrap}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="2" y1="12" x2="22" y2="12" />
                                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                            </svg>
                                                        </div>
                                                        <div className={styles.channelTitleGroup}>
                                                            <span className={styles.channelCardTitle}>Network Ad Campaign</span>
                                                            <span className={styles.channelCardSubtitle}>Cross-Event & Audience Reach</span>
                                                        </div>
                                                    </div>
                                                    <p className={styles.channelCardDesc}>
                                                        Deliver targeted ads across multiple event forums and attendee feeds based on user interests, location and search topics.
                                                    </p>
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`${styles.channelCard} ${formData.channel === 'event_sponsorship' ? styles.channelCardActive : ''}`}
                                                    onClick={() => handleChannelChange('event_sponsorship')}
                                                    disabled={isEditing}
                                                    role="radio"
                                                    aria-checked={formData.channel === 'event_sponsorship'}
                                                >
                                                    <div className={styles.channelCardTop}>
                                                        <div className={styles.channelIconWrap}>
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                                                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                                                                <path d="M4 22h16" />
                                                                <path d="M10 14.66V17c0 .55-.45 1-1 1H8v2h8v-2h-1c-.55 0-1-.45-1-1v-2.34" />
                                                                <path d="M18 4H6v7a6 6 0 0 0 12 0V4z" />
                                                            </svg>
                                                        </div>
                                                        <div className={styles.channelTitleGroup}>
                                                            <span className={styles.channelCardTitle}>Event Sponsorship</span>
                                                            <span className={styles.channelCardSubtitle}>Dedicated Event Placement</span>
                                                        </div>
                                                    </div>
                                                    <p className={styles.channelCardDesc}>
                                                        Sponsor a specific event with guaranteed ad rotation inside its official forum.
                                                    </p>
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.label} htmlFor="title">
                                                Title <span className={styles.requiredIndicator}>*Required</span>
                                            </label>
                                            <input id="title" name="title" type="text" className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                                                placeholder="e.g. Festival Promo" value={formData.title}
                                                onChange={handleInputChange} required />
                                            {errors.title && <p className={styles.errorMessage}>{errors.title}</p>}
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.label} htmlFor="description">
                                                Description
                                            </label>
                                            <textarea id="description" name="description" className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                                                placeholder="Internal description or overview..." value={formData.description}
                                                onChange={handleInputChange} />
                                            {errors.description && <p className={styles.errorMessage}>{errors.description}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* ── Tab: Targeting ── */}
                                {activeTab === 'targeting' && (
                                    <div className={styles.formSection}>

                                        {/* ── Conditional Event Sponsorship: Target Event Selector ── */}
                                        {formData.channel === 'event_sponsorship' && (
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="target_event_id">
                                                    Target Event <span className={styles.requiredIndicator}>*Required</span>
                                                    <span className={styles.infoIcon} title="Audience impressions and Category Sponsor Shield exclusivity are anchored to this event forum.">ⓘ</span>
                                                </label>
                                                <select
                                                    id="target_event_id"
                                                    name="target_event_id"
                                                    className={`${styles.select} ${errors.target_event_id ? styles.inputError : ''}`}
                                                    value={formData.target_event_id || ''}
                                                    onChange={handleInputChange}
                                                    disabled={isEditing}
                                                    required
                                                >
                                                    <option value="" disabled>
                                                        {isLoadingEvents ? 'Loading sponsorable events...' : 'Select an event to sponsor'}
                                                    </option>
                                                    {sponsorableEvents.map(ev => (
                                                        <option key={ev.id} value={ev.id}>
                                                            {ev.title} ({ev.currency || 'KES'}) — {new Date(ev.start_datetime).toLocaleDateString()}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.target_event_id && <p className={styles.errorMessage}>{errors.target_event_id}</p>}
                                                <p className={styles.pricingHint}>
                                                    {formData.target_event_id
                                                        ? 'Event Forum & Attendee Targeting: Ad delivery and category exclusivity are locked to this event\'s audience.'
                                                        : 'Select an event to sponsor. Ad placement, attendees and Category Sponsor Shield exclusivity will anchor to this event.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* ── Dynamic Placement Quote Card in Targeting Tab ── */}
                                        {renderPlacementQuoteCard()}

                                        {/* ── Campaign Schedule (Flight Dates) — hidden for event sponsorship since the event timeline dictates flight dates ── */}
                                        {formData.channel !== 'event_sponsorship' && (
                                            <div className={styles.row}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="start_at">
                                                        Start Date <span className={styles.requiredIndicator}>*Required</span>
                                                    </label>
                                                    <DatePicker
                                                        value={formData.start_at}
                                                        onChange={(val) => handleInputChange({ target: { name: 'start_at', value: val } } as any)}
                                                        placeholder="dd/mm/yyyy"
                                                        className={errors.start_at ? styles.inputError : ''}
                                                    />
                                                    {errors.start_at && <p className={styles.errorMessage}>{errors.start_at}</p>}
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="end_at">
                                                        End Date <span className={styles.requiredIndicator}>*Required</span>
                                                    </label>
                                                    <DatePicker
                                                        value={formData.end_at}
                                                        onChange={(val) => handleInputChange({ target: { name: 'end_at', value: val } } as any)}
                                                        placeholder="dd/mm/yyyy"
                                                        className={errors.end_at ? styles.inputError : ''}
                                                    />
                                                    {errors.end_at && <p className={styles.errorMessage}>{errors.end_at}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Multi-Country & Tag Targeting (Network Auction only) */}
                                        {formData.channel !== 'event_sponsorship' ? (
                                            <>
                                                {/* Multi-Country Targeting */}
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Target Regions <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '12px' }}>(Leave empty for worldwide)</span></label>
                                                    <div className={styles.tagInput}>
                                                        <input
                                                            className={styles.tagInputField}
                                                            placeholder={(formData.target_countries?.length || 0) < 5 ? 'Search region...' : 'Leave empty for worldwide'}
                                                            value={countryInput}
                                                            onChange={e => setCountryInput(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    // Add the first matching country if any
                                                                    const match = countries.find(c =>
                                                                        c.display_name.toLowerCase().includes(countryInput.toLowerCase()) &&
                                                                        !formData.target_countries?.includes(c.code)
                                                                    );
                                                                    if (match) addCountry(match.code);
                                                                }
                                                            }}
                                                            disabled={(formData.target_countries?.length || 0) >= 5}
                                                        />
                                                        {/* Dropdown for search results */}
                                                        {countryInput && (
                                                            <div className={styles.countryDropdown}>
                                                                {countries
                                                                    .filter(c =>
                                                                        c.display_name.toLowerCase().includes(countryInput.toLowerCase()) &&
                                                                        !formData.target_countries?.includes(c.code)
                                                                    )
                                                                    .slice(0, 5)
                                                                    .map(c => (
                                                                        <div key={c.code} className={styles.countryDropdownItem} onClick={() => addCountry(c.code)}>
                                                                            {c.display_name}
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    {formData.target_countries && formData.target_countries.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                                            {formData.target_countries.map(code => {
                                                                const country = countries.find(c => c.code === code);
                                                                return (
                                                                    <span key={code} className={styles.tag}>
                                                                        {country?.display_name || code}
                                                                        <button type="button" className={styles.tagRemove} onClick={() => removeCountry(code)}>×</button>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                    {countrySuggestions.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                                            {countrySuggestions
                                                                .filter(c => !formData.target_countries?.includes(c.code))
                                                                .filter(c => !countryInput || c.display_name.toLowerCase().includes(countryInput.toLowerCase()))
                                                                .map(c => (
                                                                <button 
                                                                    key={c.code} 
                                                                    type="button" 
                                                                    onClick={() => addCountry(c.code)}
                                                                    style={{ 
                                                                        padding: '4px 12px', 
                                                                        fontSize: '12px', 
                                                                        borderRadius: '16px', 
                                                                        border: '1px solid rgba(255,255,255,0.1)', 
                                                                        background: 'rgba(255,255,255,0.02)',
                                                                        color: 'rgba(255,255,255,0.7)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                                                >
                                                                    + {c.display_name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Market Competition Insights */}
                                                {marketSuggestions.length > 0 && (
                                                    <div className={styles.marketInsights}>
                                                        <div className={styles.marketInsightsTitle}>Regional Market Density</div>
                                                        <div className={styles.marketGrid}>
                                                            {marketSuggestions.map(s => {
                                                                const name = countries.find(c => c.code === s.country_code)?.display_name || s.country_code;
                                                                const compLevel = s.competition_level || 'low';
                                                                const badgeClass = styles['badge' + compLevel.charAt(0).toUpperCase() + compLevel.slice(1)] || styles.badgeNormal;
                                                                
                                                                const baseBid = parseFloat(formData.max_bid_amount) || 0.01;
                                                                const suggestedBid = baseBid * (s.suggested_modifier || 1.0);
                                                                
                                                                return (
                                                                    <div key={s.country_code} className={styles.marketItem}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span className={styles.marketCountry}>{name}</span>
                                                                            <span className={`${styles.badge} ${badgeClass}`}>
                                                                                {compLevel.toUpperCase()}
                                                                            </span>
                                                                        </div>
                                                                        <div className={styles.marketNote}>
                                                                            Suggested Bid: ${suggestedBid.toFixed(3)} (modifier: {(s.suggested_modifier || 1.0).toFixed(2)}x)
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Targeting Tags */}
                                                <div className={styles.inputGroup} style={{ marginTop: '24px' }}>
                                                    <label className={styles.label}>Interest-Based Targeting <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '12px' }}>(e.g. Music, Tech)</span></label>
                                                    <div className={styles.tagInput}>
                                                        <input
                                                            className={styles.tagInputField}
                                                            placeholder="Type interest and press enter..."
                                                            value={tagInput}
                                                            onChange={e => setTagInput(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    addTag(tagInput);
                                                                }
                                                            }}
                                                        />
                                                        {tagInput && tagSuggestions.length > 0 && (
                                                            <div className={styles.countryDropdown}>
                                                                {tagSuggestions
                                                                    .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !formData.target_tags.includes(t))
                                                                    .slice(0, 5)
                                                                    .map(t => (
                                                                        <div key={t} className={styles.countryDropdownItem} onClick={() => addTag(t)}>
                                                                            {t}
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                    {formData.target_tags && formData.target_tags.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                                            {formData.target_tags.map(tag => (
                                                                <span key={tag} className={styles.tag}>
                                                                    {tag}
                                                                    <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {tagSuggestions.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                                            {tagSuggestions
                                                                .filter(t => !formData.target_tags?.includes(t))
                                                                .filter(t => !tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))
                                                                .slice(0, 5)
                                                                .map(t => (
                                                                <button 
                                                                    key={t} 
                                                                    type="button" 
                                                                    onClick={() => addTag(t)}
                                                                    style={{ 
                                                                        padding: '4px 12px', 
                                                                        fontSize: '12px', 
                                                                        borderRadius: '16px', 
                                                                        border: '1px solid rgba(255,255,255,0.1)', 
                                                                        background: 'rgba(255,255,255,0.02)',
                                                                        color: 'rgba(255,255,255,0.7)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                                                                >
                                                                    + {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{
                                                padding: '16px 20px',
                                                borderRadius: 'var(--radius-md)',
                                                background: 'rgba(255, 255, 255, 0.02)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginTop: '8px'
                                            }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <line x1="12" y1="16" x2="12" y2="12"/>
                                                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                                                </svg>
                                                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.5 }}>
                                                    <strong>Event-Specific Targeting:</strong> Audience demographics, attendee geolocation and forum impressions are anchored to the selected event. Network-wide country bidding and keyword filters do not apply to direct event sponsorships.
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── Tab: Creative ── */}
                                {activeTab === 'creative' && (
                                    <div className={styles.formSection}>
                                        {/* ── Placement Format & Audience Exposure Row ── */}
                                        {formData.channel === 'event_sponsorship' ? (
                                            <div className={styles.row}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="type">
                                                        Placement Format <span className={styles.requiredIndicator}>*Required</span>
                                                    </label>
                                                    <select id="type" name="type" className={styles.select}
                                                        value={formData.type} onChange={handleInputChange} required>
                                                        <option value="banner">Banner Placement (16:9)</option>
                                                        <option value="interstitial">Interstitial (9:16 – Full Screen)</option>
                                                        <option value="interstitial_video">Interstitial Video (9:16 – Auto-play)</option>
                                                    </select>
                                                </div>

                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="slots">
                                                        Audience Exposure
                                                        <span className={styles.infoIcon} title="Guaranteed share of attendee impressions and rotation in this event forum">ⓘ</span>
                                                    </label>
                                                    <select
                                                        id="slots"
                                                        name="slots"
                                                        className={styles.select}
                                                        value={formData.slots || 1}
                                                        onChange={(e) => handleSlotsChange(parseInt(e.target.value, 10))}
                                                    >
                                                        {Array.from({ length: formData.type === 'banner' ? 8 : 2 }, (_, i) => i + 1).map(slotNum => (
                                                            <option key={slotNum} value={slotNum}>
                                                                {getSlotOptionLabel(slotNum, formData.type)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors.slots && <p className={styles.errorMessage}>{errors.slots}</p>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="type">
                                                    Placement Format <span className={styles.requiredIndicator}>*Required</span>
                                                </label>
                                                <select id="type" name="type" className={styles.select}
                                                    value={formData.type} onChange={handleInputChange} required>
                                                    <option value="banner">Banner Placement (16:9)</option>
                                                    <option value="interstitial">Interstitial (9:16 – Full Screen)</option>
                                                    <option value="interstitial_video">Interstitial Video (9:16 – Auto-play)</option>
                                                </select>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '16px' }}>Campaign Creatives</h3>
                                                <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.6 }}>Add up to 3 variants for A/B rotation</p>
                                            </div>
                                            {formData.creatives.length < 3 && (
                                                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addCreative} style={{ padding: '6px 12px', fontSize: '12px' }}>
                                                    + Add Variant
                                                </button>
                                            )}
                                        </div>

                                        {/* Variant Tabs */}
                                        <div className={styles.creativeTabs}>
                                            {formData.creatives.map((_, i) => (
                                                <div key={i} className={`${styles.creativeTab} ${activeCreativeIdx === i ? styles.creativeTabActive : ''}`} onClick={() => setActiveCreativeIdx(i)}>
                                                    {i === 0 ? 'Primary' : `Variant ${String.fromCharCode(64 + i + 1)}`}
                                                    {i > 0 && (
                                                        <span className={styles.removeCreative} onClick={(e) => { e.stopPropagation(); removeCreative(i); }}>×</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.creativeWorkspace}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>
                                                    Headline <span className={styles.requiredIndicator}>*Required</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className={`${styles.input} ${errors[`creative.${activeCreativeIdx}.headline`] ? styles.inputError : ''}`}
                                                    placeholder="e.g. Join the biggest music festival!"
                                                    value={activeCreative.headline}
                                                    onChange={(e) => updateCreative(activeCreativeIdx, { headline: e.target.value })}
                                                />
                                                {errors[`creative.${activeCreativeIdx}.headline`] && <p className={styles.errorMessage}>{errors[`creative.${activeCreativeIdx}.headline`]}</p>}
                                            </div>

                                            {/* Destination URL per creative variant */}
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor={`creative_${activeCreativeIdx}_destination_url`}>
                                                    Destination URL <span className={styles.requiredIndicator}>*Required</span>
                                                    {activeCreativeIdx > 0 && (
                                                        <span style={{ opacity: 0.6, fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' }}>
                                                            (Defaults to Primary landing page)
                                                        </span>
                                                    )}
                                                </label>
                                                <input
                                                    id={`creative_${activeCreativeIdx}_destination_url`}
                                                    type="url"
                                                    className={`${styles.input} ${errors[`creative.${activeCreativeIdx}.destination_url`] ? styles.inputError : ''}`}
                                                    placeholder="https://lynk-x.app/..."
                                                    value={activeCreative.destination_url ?? (activeCreativeIdx === 0 ? formData.destination_url : '')}
                                                    onChange={(e) => updateCreative(activeCreativeIdx, { destination_url: e.target.value })}
                                                    required
                                                />
                                                {errors[`creative.${activeCreativeIdx}.destination_url`] && (
                                                    <p className={styles.errorMessage}>{errors[`creative.${activeCreativeIdx}.destination_url`]}</p>
                                                )}
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>
                                                    Creative Asset <span className={styles.requiredIndicator}>*Required</span>
                                                </label>
                                                <div
                                                    className={`${styles.uploadArea} ${errors[`creative.${activeCreativeIdx}.asset`] ? styles.assetUploadError : ''}`}
                                                    onClick={() => fileInputRefs.current[activeCreativeIdx]?.click()}
                                                    style={{ height: formData.type.includes('interstitial') ? '240px' : '140px' }}
                                                >
                                                    {activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl ? (
                                                        <div className={styles.assetPreviewBox}>
                                                            {activeCreative.mediaType === 'video' ? (
                                                                <video src={activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <img src={activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            )}
                                                            <div className={styles.assetOverlay}>
                                                                <button type="button" className={styles.assetRemove} onClick={(e) => { e.stopPropagation(); handleRemoveAsset(activeCreativeIdx); }}>Remove</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={styles.uploadPlaceholder}>
                                                            {formData.type === 'interstitial_video' ? (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polygon points="5 3 19 12 5 21 5 3" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                                                </svg>
                                                            )}
                                                            <span>{formData.type === 'interstitial_video' ? 'Upload Video (9:16)' : formData.type === 'banner' ? 'Upload Image (16:9)' : 'Upload Image (9:16)'}</span>
                                                        </div>
                                                    )}
                                                    <input
                                                        type="file"
                                                        ref={el => { fileInputRefs.current[activeCreativeIdx] = el; }}
                                                        style={{ display: 'none' }}
                                                        accept={formData.type === 'interstitial_video' ? 'video/*' : 'image/*'}
                                                        onChange={(e) => handleAssetChange(e, activeCreativeIdx)}
                                                    />
                                                </div>
                                                {errors[`creative.${activeCreativeIdx}.asset`] && <p className={styles.errorMessage}>{errors[`creative.${activeCreativeIdx}.asset`]}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Tab: Budget ── */}
                                {activeTab === 'budget' && (
                                    <div className={styles.formSection}>
                                        {/* Dynamic Placement Quote Card for Event Sponsorship */}
                                        {formData.channel === 'event_sponsorship' && renderPlacementQuoteCard()}

                                        {/* ── Financial Row: Wallet Currency & Total Budget Paired in Same Row ── */}
                                        <div className={styles.row}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="currency">
                                                    Wallet Currency <span className={styles.requiredIndicator}>*Required</span>
                                                    <span className={styles.infoIcon} title="The currency this campaign's budget, bids and spend are denominated in — fixed once the campaign is created">ⓘ</span>
                                                </label>
                                                <select id="currency" name="currency" className={`${styles.select} ${errors.currency ? styles.inputError : ''}`}
                                                    value={formData.currency} onChange={handleInputChange} disabled={isEditing || formData.channel === 'event_sponsorship'} required>
                                                    {!formData.currency && <option value="" disabled>Select a currency</option>}
                                                    {walletCurrencies.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                {isEditing ? (
                                                    <p className={styles.pricingHint}>Currency can&apos;t be changed after a campaign is created.</p>
                                                ) : formData.channel === 'event_sponsorship' ? (
                                                    <p className={styles.pricingHint}>Locked to target event currency ({formData.currency || 'KES'}).</p>
                                                ) : walletCurrencies.length === 0 ? (
                                                    <p className={styles.pricingHint}>No wallet found for this account yet — top up a wallet first.</p>
                                                ) : null}
                                                {errors.currency && <p className={styles.errorMessage}>{errors.currency}</p>}
                                            </div>

                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="total_budget">
                                                    Total Budget ({formData.currency || 'USD'}) <span className={styles.requiredIndicator}>*Required</span>
                                                    <span className={styles.infoIcon} title="The maximum amount of money you are willing to spend on an entire campaign over its lifetime">ⓘ</span>
                                                </label>
                                                <input id="total_budget" name="total_budget" type="number" className={`${styles.input} ${errors.total_budget ? styles.inputError : ''}`}
                                                    placeholder="1000" value={formData.total_budget} onChange={handleInputChange} readOnly={formData.channel === 'event_sponsorship'} required />
                                                {formData.channel === 'event_sponsorship' && (
                                                    <p className={styles.pricingHint}>Fixed contract price determined by event placement quote.</p>
                                                )}
                                                {errors.total_budget && <p className={styles.errorMessage}>{errors.total_budget}</p>}
                                            </div>
                                        </div>

                                        {/* Budget & Bidding (Network Auction only) */}
                                        {formData.channel !== 'event_sponsorship' && (
                                            <div className={styles.row}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="daily_limit">
                                                        Daily Limit ({formData.currency || 'USD'})
                                                        <span className={styles.infoIcon} title="The maximum amount you want to spend on the campaign in a single day">ⓘ</span>
                                                    </label>
                                                    <input id="daily_limit" name="daily_limit" type="number" className={`${styles.input} ${errors.daily_limit ? styles.inputError : ''}`}
                                                        placeholder="50" value={formData.daily_limit} onChange={handleInputChange} />
                                                    {errors.daily_limit && <p className={styles.errorMessage}>{errors.daily_limit}</p>}
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label} htmlFor="max_bid_amount">
                                                        Max Bid ({formData.currency || 'USD'}) <span className={styles.requiredIndicator}>*Required</span>
                                                        <span className={styles.infoIcon} title="The highest amount you are willing to pay for a single action">ⓘ</span>
                                                    </label>
                                                    <input id="max_bid_amount" name="max_bid_amount" type="number" step="0.001" className={`${styles.input} ${errors.max_bid_amount ? styles.inputError : ''}`}
                                                        placeholder="0.01" value={formData.max_bid_amount} onChange={handleInputChange} required />
                                                    {errors.max_bid_amount && <p className={styles.errorMessage}>{errors.max_bid_amount}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Escrow & Bidding Security Callout */}
                                        <div style={{
                                            padding: '14px 18px',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--color-surface-hover, rgba(255, 255, 255, 0.03))',
                                            border: '1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08))',
                                            marginTop: '8px',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'flex-start'
                                        }}>
                                            <div style={{ color: 'var(--color-brand-primary, #6366f1)', marginTop: '2px', flexShrink: 0 }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="16" x2="12" y2="12" />
                                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                                </svg>
                                            </div>
                                            <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.75)' }}>
                                                {formData.channel === 'event_sponsorship' ? (
                                                    <span>
                                                        <strong style={{ color: '#ffffff' }}>Escrow Protected:</strong> Upon campaign launch, the contract budget will be held in escrow. Funds are only settled once the event commences. If an organizer cancels or rejects the sponsorship, all funds are immediately returned to your ad wallet.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        <strong style={{ color: '#ffffff' }}>Programmatic Auction:</strong> Spend is governed dynamically based on real-time CPM/CPC auction bids. Your campaign will pause automatically if the daily limit or total budget is reached.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Tab: Review ── */}
                                {activeTab === 'review' && (
                                    <div className={styles.formSection}>
                                        <div className={styles.previewCard}>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Title</span>
                                                <span className={styles.reviewValue}>{formData.title || 'Untitled Campaign'}</span>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Description</span>
                                                <span className={styles.reviewValue}>{formData.description || 'No description provided'}</span>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Channel</span>
                                                <span className={styles.reviewValue}>{formData.channel === 'event_sponsorship' ? 'Event Sponsorship' : 'Network Ad Campaign'}</span>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Placement</span>
                                                <span className={styles.reviewValue}>
                                                    {formData.type === 'banner'
                                                        ? 'Banner Placement (16:9)'
                                                        : formData.type === 'interstitial_video'
                                                        ? 'Interstitial Video (9:16)'
                                                        : 'Interstitial (9:16)'}
                                                    {formData.channel === 'event_sponsorship' && ` • ${getSlotOptionLabel(formData.slots || 1, formData.type)}`}
                                                </span>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Timeline</span>
                                                <span className={styles.reviewValue}>
                                                    {formData.channel === 'event_sponsorship'
                                                        ? `Live upon approval – ${formData.end_at || 'TBD'} (Includes 48h post-event forum recap)`
                                                        : `${formData.start_at || 'TBD'} – ${formData.end_at || 'TBD'}`}
                                                </span>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <span className={styles.reviewLabel}>Targeting</span>
                                                <span className={styles.reviewValue}>
                                                    {formData.channel === 'event_sponsorship'
                                                        ? `${sponsorableEvents.find(e => e.id === formData.target_event_id)?.title || 'Selected Event'} • Attendees and Forum Audience`
                                                        : (formData.target_countries.length > 0 ? formData.target_countries.join(', ') : 'Anywhere') +
                                                          (formData.target_tags.length > 0 ? ` • ${formData.target_tags.join(', ')}` : '')}
                                                </span>
                                            </div>
                                        </div>


                                        <div className={styles.launchNote}>
                                            {formData.channel === 'event_sponsorship'
                                                ? 'By booking, slots are soft-reserved for 48 hours while the event organizer reviews your creative. Full refund if declined or expired.'
                                                : 'By launching, your campaign will be submitted for approval before going live.'}
                                        </div>

                                        {formError && (
                                            <div style={{ color: 'var(--color-interface-error)', width: '100%', marginTop: '16px', fontSize: '13px' }}>
                                                {formError}
                                            </div>
                                        )}

                                    </div>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* ── Right: Live Preview ─────────────────────────────────── */}
                    <div className={`${adminStyles.formSection} tour-ads-preview-panel`} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <h2 className={adminStyles.sectionTitle}>Live Preview</h2>
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                                <div className={styles.mockDevice}>
                                    <div className={styles.deviceContent}>
                                        <div className={styles.adPreviewWrapper}>
                                            {formData.type === 'interstitial' || formData.type === 'interstitial_video' ? (
                                                <div className={styles.mockAdInterstitial}>
                                                    <div className={styles.mockAdHeader}>
                                                        <div style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>SPONSOR</div>
                                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}>Download in progress</div>
                                                        <div style={{ color: '#fff', fontSize: '10px', fontWeight: 600 }}>05</div>
                                                    </div>
                                                    <div className={styles.mockAdMedia}>
                                                        {(activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl) ? (
                                                            formData.type === 'interstitial_video' ? (
                                                                <video src={activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop />
                                                            ) : (
                                                                <img src={activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            )
                                                        ) : (
                                                            formData.type === 'interstitial_video' ? (
                                                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
                                                                    <polygon points="5 3 19 12 5 21 5 3" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1">
                                                                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                                                </svg>
                                                            )
                                                        )}
                                                    </div>
                                                    <div className={styles.mockAdInfo}>
                                                        <span className={styles.mockAdBadge}>SPONSOR • {formData.type === 'interstitial_video' ? 'VIDEO' : 'INTERSTITIAL'}</span>
                                                        <div className={styles.mockAdTitle} style={{ fontSize: '18px' }}>{activeCreative.headline || formData.adHeadline || 'Your Catchy Headline'}</div>
                                                        <div className={styles.mockAdDesc}>{formData.title || 'Campaign Name'}</div>
                                                        {/* #7 Interactive Preview Button */}
                                                        <button
                                                            onClick={() => { setPreviewClicked(true); setTimeout(() => setPreviewClicked(false), 2000); }}
                                                            style={{
                                                                marginTop: '16px', width: '100%', padding: '10px',
                                                                background: previewClicked ? '#fff' : 'var(--color-brand-primary)',
                                                                border: 'none', borderRadius: '6px', color: '#000', fontWeight: 600, fontSize: '13px',
                                                                cursor: 'pointer', transition: 'background 0.3s',
                                                            }}>
                                                            {previewClicked ? '✓ Would redirect to your URL' : 'Learn More'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {formData.type === 'banner' && (
                                                        <div className={styles.mockAdBanner}>
                                                            {(activeCreative.preview || activeCreative.imageUrl) ? (
                                                                 <img src={activeCreative.preview || activeCreative.imageUrl} alt="Campaign creative" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: 0.5 }} />
                                                            ) : null}
                                                            <div className={styles.mockAdTitle} style={{ fontWeight: 800, zIndex: 1, position: 'relative' }}>
                                                                {activeCreative.headline || formData.adHeadline || 'SPONSOR'}
                                                            </div>
                                                            {/* #7 Interactive CTA */}
                                                            <div
                                                                className={styles.mockAdCTA}
                                                                onClick={() => { setPreviewClicked(true); setTimeout(() => setPreviewClicked(false), 2000); }}
                                                                style={{ cursor: 'pointer', zIndex: 1, position: 'relative', color: previewClicked ? 'var(--color-brand-primary)' : '#fff' }}
                                                            >
                                                                {previewClicked ? '✓ Redirected!' : 'Learn More'}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className={styles.mockAppContent}>
                                                        <div className={styles.mockAppLine} style={{ width: '40%' }}></div>
                                                        <div className={styles.mockAppLine} style={{ width: '80%' }}></div>
                                                        <div className={styles.mockAppLine} style={{ width: '90%', marginTop: 'auto' }}></div>
                                                        <div className={styles.mockAppLine} style={{ width: '100%' }}></div>
                                                        <div className={styles.mockAppLine} style={{ width: '70%' }}></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* A/B Variant selector in preview panel */}
                            {formData.creatives.length > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                                    {formData.creatives.map((_, i) => (
                                        <button key={i} type="button"
                                            style={{
                                                padding: '4px 12px', fontSize: '11px', fontWeight: 600, borderRadius: '20px', cursor: 'pointer', border: '1px solid',
                                                background: activeCreativeIdx === i ? 'var(--color-brand-primary)' : 'transparent',
                                                color: activeCreativeIdx === i ? '#000' : 'var(--color-utility-primaryText)',
                                                borderColor: activeCreativeIdx === i ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.2)',
                                            }}
                                            onClick={() => setActiveCreativeIdx(i)}>
                                            {i === 0 ? 'Primary' : `Variant ${String.fromCharCode(65 + i)}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            {!isOrgLoading && (
                <ProductTour
                    storageKey={activeAccount?.id ? `hasSeenAdsFormJoyride_${activeAccount.id}` : 'hasSeenAdsFormJoyride_guest'}
                    steps={[
                        {
                            target: 'body',
                            placement: 'center',
                            title: isEditing ? 'Edit Your Campaign' : 'Create a Campaign',
                            content: 'Welcome to the Sponsor Dashboard! Let\'s walk through creating a high-performing campaign to boost your brand\'s visibility.',
                            skipBeacon: true,
                        },
                        {
                            target: '.tour-ads-form-tabs',
                            title: 'Campaign Sections',
                            content: 'We\'ve broken down the process into 5 easy steps: Campaign Details, Targeting, Creatives (A/B testing), Budget and Final Review.',
                        },
                        {
                            target: '.tour-ads-tab-targeting',
                            title: 'Precision Targeting',
                            content: 'Reach the right audience by selecting specific regions and interests. Leave regions empty to go global!',
                        },
                        {
                            target: '.tour-ads-tab-creative',
                            title: 'A/B Testing',
                            content: 'Add up to 3 different creative variants. Our system automatically rotates them to find the highest performing version for your audience.',
                        },
                        {
                            target: '.tour-ads-tab-budget',
                            title: 'Budget & Currency',
                            content: 'Configure your campaign budget, wallet currency, daily spend caps and maximum bids with built-in escrow protection.',
                        },
                        {
                            target: '.tour-ads-preview-panel',
                            title: 'Real-time Preview',
                            content: 'See exactly how your creative will appear to users in Lynk-X. Interact with the button to test your destination URL.',
                        },
                        {
                            target: '.tour-ads-form-actions',
                            title: 'Launch When Ready',
                            content: 'Once you\'re happy with your targeting and visuals, click "Launch Campaign". Our team will review it within 24 hours.',
                        }
                    ]}
                />
            )}
            <ImageCropperModal
                isOpen={isCropperOpen}
                image={pendingMediaType === 'image' ? pendingImage : null}
                video={pendingMediaType === 'video' ? pendingImage : null}
                mediaType={pendingMediaType}
                onClose={handleCloseCropper}
                onCropComplete={handleCropComplete}
                aspectRatio={formData.type === 'banner' ? 16 / 9 : 9 / 16}
                title={`Crop ${formData.type === 'banner' ? 'Banner' : 'Interstitial'}`}
            />
        </>
    );
}
