"use client";
import { getErrorMessage } from '@/utils/error';

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

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single ad creative (headline + image). Supports up to 3 per campaign for A/B rotation. */
export interface Creative {
    headline: string;
    imageUrl?: string;
    file?: File;
    preview?: string;
    mediaType?: 'image' | 'video'; // Added to support video assets
}

export interface CampaignData {
    id?: string;
    title: string;
    description: string;
    type: 'banner' | 'interstitial' | 'interstitial_video';
    total_budget: string;
    daily_limit: string;
    start_at: string;
    end_at: string;
    target_url: string;
    target_event_id?: string;
    max_bid_amount: string;
    target_countries: string[];
    target_tags: string[];
    creatives: Creative[];
    adHeadline: string;
    adImageUrl?: string;
}

interface PricingConfig {
    impression: number;
    click: number;
}



interface CreateCampaignFormProps {
    initialData?: CampaignData;
    isEditing?: boolean;
    redirectPath?: string;
    onDirtyChange?: (isDirty: boolean) => void;
}


interface MarketSuggestion {
    country_code: string;
    suggested_bid: number;
    competition_level: 'low' | 'normal' | 'medium' | 'high';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCampaignForm({
    initialData,
    isEditing = false,
    redirectPath = '/dashboard/ads/campaigns',
    onDirtyChange,
}: CreateCampaignFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    // ── UI State ──────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'details' | 'targeting' | 'creative' | 'review'>('details');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
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



    // ── Active Creative Index (for A/B multi-creative picker) ─────────────────
    const [activeCreativeIdx, setActiveCreativeIdx] = useState(0);
    /** Holds the three file-input elements for the A/B creative slots. */
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

    // ── Form Data ─────────────────────────────────────────────────────────────
    const defaultData: CampaignData = initialData || {
        title: '',
        description: '',
        type: 'banner',
        total_budget: '',
        daily_limit: '',
        start_at: '',
        end_at: '',
        target_url: '',

        target_countries: [],
        target_tags: [],
        creatives: [{ headline: '', imageUrl: '', preview: '', file: undefined }],
        max_bid_amount: '0.01',
        adHeadline: '',
        adImageUrl: '',
    };
    const [formData, setFormData] = useState<CampaignData>(defaultData);

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
                .from('tags')
                .select('name')
                .eq('is_active', true)
                .order('use_count', { ascending: false })
                .limit(30);
            if (tData) setTagSuggestions(tData.map(t => t.name));
        };
        fetchTags();
    }, [supabase]);

    // ── Fetch Market Competition Suggestions ───────────────────────────
    useEffect(() => {
        if (!formData.target_countries?.length) {
            setMarketSuggestions([]);
            return;
        }

        const fetchMarketData = async () => {
            const { data, error } = await supabase.rpc('get_market_bid_suggestion', {
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
                .from('ad_pricing_config')
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
            showToast('Draft restored successfully.', 'success');
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
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(defaultData);
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
            window.addEventListener('beforeunload', handleBeforeUnload);

            // Auto-save draft
            if (!isEditing && formData.title) {
                const timer = setTimeout(() => {
                    localStorage.setItem('campaign_draft', JSON.stringify(formData));
                }, 1000);
                return () => {
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                    clearTimeout(timer);
                };
            }

            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
    }, [formData, onDirtyChange, isEditing, defaultData]);

    /**
     * Live validation for campaign dates.
     */
    useEffect(() => {
        const nextErrors = { ...errors };
        let hasChanges = false;

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
    }, [formData.start_at, formData.end_at, isEditing]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
            return { ...prev, creatives };
        });
    };

    const addCreative = () => {
        if (formData.creatives.length >= 3) return;
        setFormData(prev => ({
            ...prev,
            creatives: [...prev.creatives, { headline: '', imageUrl: '', preview: '', file: undefined }],
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

        // For previews, we still use FileReader for images, but for video we use a blob URL
        if (mediaType === 'video') {
            const videoUrl = URL.createObjectURL(file);
            updateCreative(idx, { file, preview: videoUrl, mediaType });
        } else {
            const reader = new FileReader();
            reader.onloadend = () => updateCreative(idx, { file, preview: reader.result as string, mediaType });
            reader.readAsDataURL(file);
        }
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
    const validateTab = (tab: string): boolean => {
        setFormError('');
        const newErrors: Record<string, string> = {};

        if (tab === 'details') {
            if (!formData.title.trim()) newErrors.title = 'Campaign title is required.';
            
            const budget = parseFloat(formData.total_budget);
            if (isNaN(budget) || budget <= 0) newErrors.total_budget = 'Valid positive total budget is required.';

            const bid = parseFloat(formData.max_bid_amount);
            if (isNaN(bid) || bid <= 0) {
                newErrors.max_bid_amount = 'Valid positive max bid is required.';
            } else if (!isNaN(budget) && bid > budget) {
                newErrors.max_bid_amount = `Max bid ($${bid}) cannot exceed total budget ($${budget}).`;
            }

            if (!formData.start_at) newErrors.start_at = 'Start date is required.';
            if (!formData.end_at) newErrors.end_at = 'End date is required.';
        }

        if (tab === 'targeting') {
            const url = formData.target_url.trim();
            if (!url) {
                newErrors.target_url = 'Target URL is required.';
            } else if (!url.startsWith('https://')) {
                newErrors.target_url = 'A secure target URL (https://...) is required.';
            } else {
                try {
                    new URL(url);
                } catch {
                    newErrors.target_url = 'Target URL is not in a valid format.';
                }
            }
        }

        if (tab === 'creative') {
            const primaryCreative = formData.creatives[0];
            if (!primaryCreative.headline.trim()) newErrors['creative.0.headline'] = 'Ad headline is required.';
            if (!primaryCreative.preview && !primaryCreative.imageUrl && !formData.adImageUrl) {
                newErrors['creative.0.asset'] = 'An ad asset is required.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateForm = (): boolean => {
        setFormError('');
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'Campaign title is required.';

        const budget = parseFloat(formData.total_budget);
        if (isNaN(budget) || budget <= 0) newErrors.total_budget = 'Valid positive total budget is required.';

        const limit = parseFloat(formData.daily_limit);
        if (formData.daily_limit && (isNaN(limit) || limit <= 0 || limit > budget)) {
            newErrors.daily_limit = 'Daily limit must be a positive number and cannot exceed total budget.';
        }

        const bid = parseFloat(formData.max_bid_amount);
        if (isNaN(bid) || bid <= 0) {
            newErrors.max_bid_amount = 'Valid positive max bid amount is required.';
        } else {
            if (formData.daily_limit && !isNaN(limit) && (bid > limit)) {
                newErrors.max_bid_amount = `Max bid ($${bid}) cannot be higher than the daily limit ($${limit}).`;
            }
            if (!isNaN(budget) && bid > budget) {
                newErrors.max_bid_amount = `Max bid ($${bid}) cannot exceed the total campaign budget ($${budget}).`;
            }
        }

        if (!formData.start_at) newErrors.start_at = 'Start date is required.';
        if (!formData.end_at) newErrors.end_at = 'End date is required.';

        const primaryCreative = formData.creatives[0];
        if (!primaryCreative.headline.trim()) newErrors['creative.0.headline'] = 'Ad headline is required.';
        if (!primaryCreative.preview && !primaryCreative.imageUrl && !formData.adImageUrl) {
            newErrors['creative.0.asset'] = 'An ad asset is required.';
        }

        const url = formData.target_url.trim();
        if (!url) {
            newErrors.target_url = 'Target URL is required.';
        } else if (!url.startsWith('https://')) {
            newErrors.target_url = 'A secure target URL (https://...) is required.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleTabSwitch = (target: 'details' | 'targeting' | 'creative' | 'review') => {
        const order = ['details', 'targeting', 'creative', 'review'];
        const currentIndex = order.indexOf(activeTab);
        const targetIndex = order.indexOf(target);

        // Always allow backward navigation
        if (targetIndex <= currentIndex) {
            setActiveTab(target);
            return;
        }

        // Validate current tab before moving forward
        if (validateTab(activeTab)) {
            setActiveTab(target);
        } else {
            showToast('Please review the errors on this tab before continuing.', 'warning');
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (!activeAccount) { showToast('Please select an active account first.', 'error'); return; }
        if (!validateForm()) { showToast('Please review the form for errors.', 'error'); return; }

        setIsSubmitting(true);
        try {
            // Upload all creative assets
            const uploadedCreatives = await Promise.all(formData.creatives.map(async (c, idx) => {
                if (!c.file) return c;
                const ext = c.file.name.split('.').pop();
                const path = `${activeAccount.id}/ads/${Date.now()}_creative_${idx}.${ext}`;
                const { error } = await supabase.storage.from('ad_media').upload(path, c.file);
                if (error) throw error;
                const { data } = supabase.storage.from('ad_media').getPublicUrl(path);
                return { ...c, imageUrl: data.publicUrl };
            }));

            const primaryCreative = uploadedCreatives[0];

            // Resolve tag slugs → UUIDs from the tags table so we can insert into campaign_tags.
            let resolvedTagIds: string[] = [];
            if (formData.target_tags.length > 0) {
                const { data: tagRows } = await supabase
                    .from('tags')
                    .select('id, name')
                    .in('name', formData.target_tags);
                resolvedTagIds = (tagRows || []).map(t => t.id);
            }

            if (isEditing && formData.id) {
                const { error } = await supabase.from('ad_campaigns').update({
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    total_budget: parseFloat(formData.total_budget),
                    daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                    max_bid_amount: parseFloat(formData.max_bid_amount),
                    start_at: new Date(formData.start_at).toISOString(),
                    end_at: new Date(formData.end_at).toISOString(),
                    target_url: formData.target_url,
                    updated_at: new Date().toISOString(),
                }).eq('id', formData.id);
                if (error) throw error;

                // Re-sync regions
                await supabase.from('ad_campaign_regions').delete().eq('campaign_id', formData.id);
                if (formData.target_countries.length > 0) {
                    await supabase.from('ad_campaign_regions').insert(
                        formData.target_countries.map(code => ({ campaign_id: formData.id, country_code: code }))
                    );
                }

                // Re-sync campaign_tags: wipe then re-insert
                await supabase.from('campaign_tags').delete().eq('campaign_id', formData.id);
                if (resolvedTagIds.length > 0) {
                    await supabase.from('campaign_tags').insert(
                        resolvedTagIds.map(tag_id => ({ campaign_id: formData.id, tag_id }))
                    );
                }

                // Re-insert all assets: delete old ones, re-insert all
                await supabase.from('ad_media').delete().eq('campaign_id', formData.id);
                await supabase.from('ad_media').insert(
                    uploadedCreatives.map((c, idx) => ({
                        campaign_id: formData.id,
                        media_type: c.mediaType || 'image',
                        call_to_action: c.headline,
                        url: c.imageUrl || formData.adImageUrl,
                        is_primary: idx === 0,
                    }))
                );
                showToast('Campaign updated successfully!', 'success');
            } else {
                const { data: campaign, error } = await supabase.from('ad_campaigns').insert({
                    account_id: activeAccount.id,
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    total_budget: parseFloat(formData.total_budget),
                    daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                    max_bid_amount: parseFloat(formData.max_bid_amount),
                    start_at: new Date(formData.start_at).toISOString(),
                    end_at: new Date(formData.end_at).toISOString(),
                    target_url: formData.target_url,
                    status: 'pending_approval',
                }).select().single();
                if (error) throw error;

                if (campaign) {
                    // Regions
                    if (formData.target_countries.length > 0) {
                        await supabase.from('ad_campaign_regions').insert(
                            formData.target_countries.map(code => ({ campaign_id: campaign.id, country_code: code }))
                        );
                    }
                    // Insert campaign_tags rows for each resolved tag UUID
                    if (resolvedTagIds.length > 0) {
                        await supabase.from('campaign_tags').insert(
                            resolvedTagIds.map(tag_id => ({ campaign_id: campaign.id, tag_id }))
                        );
                    }

                    await supabase.from('ad_media').insert(
                        uploadedCreatives.map((c, idx) => ({
                            campaign_id: campaign.id,
                            media_type: c.mediaType || 'image',
                            call_to_action: c.headline || formData.adHeadline,
                            url: c.imageUrl || primaryCreative.imageUrl || formData.adImageUrl,
                            is_primary: idx === 0,
                        }))
                    );
                }
                showToast('Campaign submitted for approval!', 'success');
            }

            onDirtyChange?.(false);
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

        // ─── JSX ──────────────────────────────────────────────────────────────────

        return (
            <>
                <div className={adminStyles.subPageGrid}>

                    {/* ── Left: Form ─────────────────────────────────────────── */}
                    <div className={adminStyles.formColumn}>
                        <div className={`${adminStyles.pageCard} tour-ads-form-container`} style={{ padding: '0' }}>

                            {/* Tab Nav */}
                            <div className={`${styles.tabs} tour-ads-form-tabs`} style={{ padding: '0 24px' }}>
                                {(['details', 'targeting', 'creative', 'review'] as const).map(tab => (
                                    <div
                                        key={tab}
                                        className={`${styles.tabItem} ${activeTab === tab ? styles.activeTab : ''} tour-ads-tab-${tab}`}
                                        onClick={() => handleTabSwitch(tab)}
                                    >
                                        {tab === 'details' ? 'Campaign' : tab === 'targeting' ? 'Targeting' : tab === 'creative' ? 'Creatives' : 'Review & Launch'}
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>

                                {/* ── Tab: Campaign Details ── */}
                                {activeTab === 'details' && (
                                    <div className={styles.formSection}>

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

                                        {/* Dates - Moved up below Description */}
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

                                        <div className={styles.row}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="type">
                                                    Ad Type <span className={styles.requiredIndicator}>*Required</span>
                                                </label>
                                                <select id="type" name="type" className={styles.input}
                                                    value={formData.type} onChange={handleInputChange} required>
                                                    <option value="banner">Banner Ad (16:9)</option>
                                                    <option value="interstitial">Interstitial (9:16 – Full Screen)</option>
                                                    <option value="interstitial_video">Interstitial Video (9:16 – Auto-play)</option>
                                                </select>
                                                {/* #3 CPM/CPC Estimator */}
                                                {pricing.impression > 0 && (
                                                    <div className={`${styles.pricingHint} tour-ads-pricing-hint`}>
                                                        <span>Starting at</span>
                                                        <strong>${pricing.impression.toFixed(3)}</strong> / impression
                                                        &nbsp;·&nbsp;
                                                        <strong>${pricing.click.toFixed(2)}</strong> / click
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="total_budget">
                                                    Total Budget ($) <span className={styles.requiredIndicator}>*Required</span>
                                                    <span className={styles.infoIcon} title="the maximum amount of money you are willing to spend on an entire advertising campaign over its lifetime">ⓘ</span>
                                                </label>
                                                <input id="total_budget" name="total_budget" type="number" className={styles.input}
                                                    placeholder="1000" value={formData.total_budget} onChange={handleInputChange} required />
                                            </div>
                                        </div>

                                        {/* Budget & Bidding */}
                                        <div className={styles.row}>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="daily_limit">
                                                    Daily Limit ($)
                                                    <span className={styles.infoIcon} title="the maximum amount you want to spend on the ad in a single day">ⓘ</span>
                                                </label>
                                                <input id="daily_limit" name="daily_limit" type="number" className={`${styles.input} ${errors.daily_limit ? styles.inputError : ''}`}
                                                    placeholder="50" value={formData.daily_limit} onChange={handleInputChange} />
                                                {errors.daily_limit && <p className={styles.errorMessage}>{errors.daily_limit}</p>}
                                            </div>
                                            <div className={styles.inputGroup}>
                                                <label className={styles.label} htmlFor="max_bid_amount">
                                                    Max Bid ($) <span className={styles.requiredIndicator}>*Required</span>
                                                    <span className={styles.infoIcon} title="the highest amount you are willing to pay for a single action">ⓘ</span>
                                                </label>
                                                <input id="max_bid_amount" name="max_bid_amount" type="number" step="0.001" className={`${styles.input} ${errors.max_bid_amount ? styles.inputError : ''}`}
                                                    placeholder="0.01" value={formData.max_bid_amount} onChange={handleInputChange} required />
                                                {errors.max_bid_amount && <p className={styles.errorMessage}>{errors.max_bid_amount}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Tab: Targeting ── */}
                                {activeTab === 'targeting' && (
                                    <div className={styles.formSection}>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.label} htmlFor="target_url">
                                                Destination URL <span className={styles.requiredIndicator}>*Required</span>
                                            </label>
                                            <input id="target_url" name="target_url" type="url" className={`${styles.input} ${errors.target_url ? styles.inputError : ''}`}
                                                placeholder="https://lynk-x.com/event/..." value={formData.target_url}
                                                onChange={handleInputChange} required />
                                            {errors.target_url && <p className={styles.errorMessage}>{errors.target_url}</p>}
                                        </div>

                                        {/* Multi-Country Targeting */}
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Target Regions <span style={{ opacity: 0.5, fontWeight: 400, fontSize: '12px' }}>(Leave empty for worldwide)</span></label>
                                            <div className={styles.tagInput}>
                                                {formData.target_countries?.map(code => {
                                                    const country = countries.find(c => c.code === code);
                                                    return (
                                                        <span key={code} className={styles.tag}>
                                                            {country?.display_name || code}
                                                            <button type="button" className={styles.tagRemove} onClick={() => removeCountry(code)}>×</button>
                                                        </span>
                                                    );
                                                })}
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
                                        </div>

                                        {/* Market Competition Insights */}
                                        {marketSuggestions.length > 0 && (
                                            <div className={styles.marketInsights}>
                                                <div className={styles.marketInsightsTitle}>Regional Market Density</div>
                                                <div className={styles.marketGrid}>
                                                    {marketSuggestions.map(s => {
                                                        const name = countries.find(c => c.code === s.country_code)?.display_name || s.country_code;
                                                        return (
                                                            <div key={s.country_code} className={styles.marketItem}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span className={styles.marketCountry}>{name}</span>
                                                                    <span className={`${styles.badge} ${styles['badge' + s.competition_level.charAt(0).toUpperCase() + s.competition_level.slice(1)]}`}>
                                                                        {s.competition_level.toUpperCase()}
                                                                    </span>
                                                                </div>
                                                                <div className={styles.marketMeta}>
                                                                    Suggested Bid: ${s.suggested_bid.toFixed(2)}
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
                                                {formData.target_tags.map(tag => (
                                                    <span key={tag} className={styles.tag}>
                                                        {tag}
                                                        <button type="button" className={styles.tagRemove} onClick={() => removeTag(tag)}>×</button>
                                                    </span>
                                                ))}
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
                                        </div>
                                    </div>
                                )}

                                {/* ── Tab: Creative ── */}
                                {activeTab === 'creative' && (
                                    <div className={styles.formSection}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '16px' }}>Ad Creatives</h3>
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
                                                <div key={i} className={`${styles.creativeTab} ${activeCreativeIdx === i ? styles.activeCreativeTab : ''}`} onClick={() => setActiveCreativeIdx(i)}>
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

                                            <div className={styles.inputGroup}>
                                                <label className={styles.label}>
                                                    Creative Asset <span className={styles.requiredIndicator}>*Required</span>
                                                </label>
                                                <div
                                                    className={`${styles.assetUpload} ${errors[`creative.${activeCreativeIdx}.asset`] ? styles.assetUploadError : ''}`}
                                                    onClick={() => fileInputRefs.current[activeCreativeIdx]?.click()}
                                                    style={{ height: formData.type.includes('interstitial') ? '240px' : '140px' }}
                                                >
                                                    {activeCreative.preview || activeCreative.imageUrl || formData.adImageUrl ? (
                                                        <div className={styles.assetPreview}>
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
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                                                            </svg>
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

                                {/* ── Tab: Review ── */}
                                {activeTab === 'review' && (
                                    <div className={styles.formSection}>
                                        <div className={styles.reviewGrid}>
                                            <div className={styles.reviewItem}>
                                                <label>Title</label>
                                                <div>{formData.title}</div>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <label>Budget</label>
                                                <div>${formData.total_budget} Total (${formData.max_bid_amount} Max Bid)</div>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <label>Timeline</label>
                                                <div>{formData.start_at} – {formData.end_at}</div>
                                            </div>
                                            <div className={styles.reviewItem}>
                                                <label>Targeting</label>
                                                <div>
                                                    {formData.target_countries.length > 0 ? formData.target_countries.join(', ') : 'Worldwide'}
                                                    {formData.target_tags.length > 0 && ` • ${formData.target_tags.join(', ')}`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Performance Forecast (Visualized) ── */}
                                        {forecast && (
                                            <div className={styles.forecastPanel}>
                                                <div className={styles.forecastHeader}>
                                                    <div className={styles.forecastTitle}>Estimated Performance</div>
                                                    <div className={styles.forecastBadge}>PROJECTION</div>
                                                </div>

                                                <div className={styles.forecastBody}>
                                                    <div className={styles.forecastGrid}>
                                                        <div className={styles.forecastItem}>
                                                            <span className={styles.forecastLabel}>Impressions Est.</span>
                                                            <span className={styles.forecastValue}>{fmtNum(forecast.minImpressions)} – {fmtNum(forecast.maxImpressions)}</span>
                                                        </div>
                                                        <div className={styles.forecastItem}>
                                                            <span className={styles.forecastLabel}>Clicks Est.</span>
                                                            <span className={styles.forecastValue}>{fmtNum(forecast.minClicks)} – {fmtNum(forecast.maxClicks)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.launchNote}>
                                            By launching, your campaign will be submitted for admin approval before going live.
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className={`${styles.actions} tour-ads-form-actions`}>
                                    {formError && (
                                        <div style={{ color: 'var(--color-interface-error)', width: '100%', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
                                            {formError}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
                                        <div>
                                            {activeTab !== 'details' && (
                                                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => {
                                                    const flow = ['details', 'targeting', 'creative', 'review'];
                                                    const idx = flow.indexOf(activeTab);
                                                    if (idx > 0) handleTabSwitch(flow[idx - 1] as any);
                                                }}>Back</button>
                                            )}
                                        </div>
                                        <div>
                                            {activeTab !== 'review' ? (
                                                <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => {
                                                    const flow = ['details', 'targeting', 'creative', 'review'];
                                                    const idx = flow.indexOf(activeTab);
                                                    if (idx < flow.length - 1) handleTabSwitch(flow[idx + 1] as any);
                                                }}>
                                                    Next →
                                                </button>
                                            ) : (
                                                <button type="submit" disabled={isSubmitting} className={`${styles.btn} ${styles.btnPrimary}`}>
                                                    {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Launch Campaign')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
                                                        <div style={{ color: '#fff', fontSize: '10px', fontWeight: 800 }}>AD</div>
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
                                                        <span className={styles.mockAdBadge}>Ad • {formData.type === 'interstitial_video' ? 'VIDEO' : 'INTERSTITIAL'}</span>
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
                                                                <img src={activeCreative.preview || activeCreative.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px', opacity: 0.5 }} />
                                                            ) : null}
                                                            <div className={styles.mockAdTitle} style={{ fontWeight: 800, zIndex: 1, position: 'relative' }}>
                                                                {activeCreative.headline || formData.adHeadline || 'AD'}
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
                            title: isEditing ? 'Edit Your Campaign' : 'Create an Ad Campaign',
                            content: 'Welcome to the Ads Dashboard! Let\'s walk through creating a high-performing campaign to boost your event\'s visibility.',
                            skipBeacon: true,
                        },
                        {
                            target: '.tour-ads-form-tabs',
                            title: 'Campaign Sections',
                            content: 'We\'ve broken down the process into 4 easy steps: Basic Details, Targeting, Creatives (A/B testing), and Final Review.',
                        },
                        {
                            target: '.tour-ads-pricing-hint',
                            title: 'Transparent Pricing',
                            content: 'See real-time estimates for impressions and clicks based on your selected ad type. We optimize for the best ROI.',
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
                            target: '.tour-ads-preview-panel',
                            title: 'Real-time Preview',
                            content: 'See exactly how your ad will appear to users in the Lynk-X mobile app. Interact with the "Learn More" button to test your destination URL.',
                        },
                        {
                            target: '.tour-ads-form-actions',
                            title: 'Launch When Ready',
                            content: 'Once you\'re happy with your targeting and visuals, click "Launch Campaign". Our team will review it within 24 hours.',
                        }
                    ]}
                />
            )}
        </>
    );
}
