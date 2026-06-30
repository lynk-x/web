"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '../../page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { generateCampaignEmbedding } from '@/utils/embedding';
import { useRouter } from 'next/navigation';

export default function AdminEditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const createdAt = searchParams.get('createdAt');
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();

    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchCampaign = async () => {
            setIsLoading(true);
            let query = supabase
                .from('v1_ad_campaigns')
                .select('*')
                .eq('id', id);

            if (createdAt) {
                query = query.eq('created_at', createdAt);
            }

            const { data: campaignData, error: campaignError } = await query.single();

            if (campaignError || !campaignData) {
                setNotFound(true);
                setIsLoading(false);
                return;
            }

            // Fetch related media, regions, and tags in parallel from api.v1_ views
            const [mediaRes, regionsRes, tagsRes] = await Promise.all([
                supabase
                    .from('v1_ad_media')
                    .select('call_to_action, url, is_primary, media_type')
                    .eq('campaign_id', id),
                supabase
                    .from('v1_ad_campaign_regions')
                    .select('country_code')
                    .eq('campaign_id', id),
                supabase
                    .from('v1_ad_campaign_tags')
                    .select('tag_id')
                    .eq('campaign_id', id)
            ]);

            const assets = mediaRes.data || [];
            const regions = regionsRes.data || [];
            const tagIds = tagsRes.data?.map(ct => ct.tag_id) || [];
            
            let tagNames: string[] = [];
            if (tagIds.length > 0) {
                const { data: tagsData } = await supabase
                    .from('v1_tags')
                    .select('slug')
                    .in('id', tagIds);
                tagNames = tagsData?.map(t => t.slug) || [];
            }

            setCampaign({
                id: campaignData.id,
                title: campaignData.title,
                description: campaignData.description || '',
                type: campaignData.type,
                total_budget: String(campaignData.total_budget),
                daily_limit: campaignData.daily_limit != null ? String(campaignData.daily_limit) : '',
                max_bid_amount: campaignData.max_bid_amount != null ? String(campaignData.max_bid_amount) : '0.01',
                start_at: campaignData.start_at ? campaignData.start_at.slice(0, 10) : '',
                end_at: campaignData.end_at ? campaignData.end_at.slice(0, 10) : '',
                destination_url: campaignData.destination_url || '',
                created_at: campaignData.created_at,
                target_event_id: campaignData.target_event_id || '',
                target_countries: regions.map(r => r.country_code),
                target_tags: tagNames,
                creatives: assets.map(a => ({
                    headline: a.call_to_action || '',
                    imageUrl: a.url || '',
                    preview: a.url || '',
                    mediaType: a.media_type
                })),
                adHeadline: assets.find(a => a.is_primary)?.call_to_action || '',
                adImageUrl: assets.find(a => a.is_primary)?.url || '',
                account_id: campaignData.account_id
            });
            setIsLoading(false);
        };

        fetchCampaign();
    }, [id, supabase, createdAt]);

    const handleAdminSubmit = async (formData: CampaignData, isEditing: boolean) => {
        setIsSubmitting(true);
        showToast('Saving campaign changes...', 'info');
        try {
            // 1. Upload all creative assets (if any new files)
            const uploadedCreatives = await Promise.all(formData.creatives.map(async (c, idx) => {
                if (!c.file) return {
                    media_type: c.mediaType || 'image',
                    call_to_action: c.headline,
                    url: c.imageUrl || formData.adImageUrl,
                    is_primary: idx === 0
                };
                
                const ext = c.file.name.split('.').pop();
                const filename = `${formData.account_id || 'admin'}_${Date.now()}_creative_${idx}.${ext}`;

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
                
                return {
                    media_type: c.mediaType || 'image',
                    call_to_action: c.headline,
                    url: signData.fileUrl,
                    is_primary: idx === 0
                };
            }));

            // 2. Submit to RPC for atomic persistence
            const { data, error } = await supabase.schema('api').rpc('upsert_advertiser_campaign', {
                p_account_id: formData.account_id,
                p_campaign_id: formData.id || null,
                p_created_at: formData.created_at || null,
                p_data: {
                    title: formData.title,
                    description: formData.description,
                    type: formData.type,
                    total_budget: parseFloat(formData.total_budget),
                    daily_limit: formData.daily_limit ? parseFloat(formData.daily_limit) : null,
                    max_bid_amount: parseFloat(formData.max_bid_amount),
                    start_at: new Date(formData.start_at).toISOString(),
                    end_at: new Date(formData.end_at).toISOString(),
                    destination_url: formData.destination_url
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
                            .from('v1_ad_campaigns')
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

            showToast('Campaign updated successfully!', 'success');
            router.push('/dashboard/admin/campaigns');
            router.refresh();
        } catch (err: unknown) {
            console.error('Submission error:', err);
            showToast(getErrorMessage(err) || 'Failed to save campaign.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container} style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                Loading campaign...
            </div>
        );
    }

    if (notFound || !campaign) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Campaign Not Found</h1>
                <p className={styles.subtitle}>The campaign you are looking for does not exist or was deleted.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <div style={{ marginBottom: '16px' }}>
                        <BackButton label="Back to Campaigns" />
                    </div>
                    <h1 className={styles.title}>Edit Campaign (Admin)</h1>
                    <p className={styles.subtitle}>Update details and creative assets for this client campaign.</p>
                </div>
            </header>

            <CreateCampaignForm 
                initialData={campaign} 
                isEditing={true} 
                onSubmit={handleAdminSubmit}
            />
        </div>
    );
}
