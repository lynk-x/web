"use client";

import { use, useState, useEffect, useMemo } from 'react';
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
            const { data, error } = await supabase
                .from('campaigns')
                .select(`
                    *,
                    ad_media:ad_media (call_to_action, url, is_primary, media_type:type),
                    ad_campaign_regions:campaign_regions (country_code),
                    campaign_tags (tag_id)
                `)
                .eq('id', id)
                .single();

            if (error || !data) {
                setNotFound(true);
                setIsLoading(false);
                return;
            }

            // Since campaign_tags only returns tag_id, we need to fetch the tag slugs from tags proxy view
            const tagIds = (data.campaign_tags as any[])?.map(ct => ct.tag_id) || [];
            let tagNames: string[] = [];
            if (tagIds.length > 0) {
                const { data: tagsData } = await supabase
                    .from('tags')
                    .select('slug')
                    .in('id', tagIds);
                tagNames = tagsData?.map(t => t.slug) || [];
            }

            const assets = (data.ad_media as any[]) || [];
            const regions = (data.ad_campaign_regions as any[]) || [];

            setCampaign({
                id: data.id,
                title: data.title,
                description: data.description || '',
                type: data.type,
                total_budget: String(data.total_budget),
                daily_limit: data.daily_limit != null ? String(data.daily_limit) : '',
                max_bid_amount: data.max_bid_amount != null ? String(data.max_bid_amount) : '0.01',
                start_at: data.start_at ? data.start_at.slice(0, 10) : '',
                end_at: data.end_at ? data.end_at.slice(0, 10) : '',
                destination_url: data.destination_url || '',
                created_at: data.created_at,
                target_event_id: data.target_event_id || '',
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
                account_id: data.account_id
            });
            setIsLoading(false);
        };

        fetchCampaign();
    }, [id, supabase]);

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
                            .from('campaigns')
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
                    <BackButton label="Back to Campaigns" />
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
