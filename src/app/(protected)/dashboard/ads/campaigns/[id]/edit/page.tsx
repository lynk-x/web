"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import styles from '../../page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import Spinner from '@/components/shared/Spinner';

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const createdAt = searchParams.get('createdAt');
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount } = useOrganization();

    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchCampaign = async () => {
            if (!activeAccount) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            
            let query = supabase
                .from('v1_ad_campaigns')
                .select('*')
                .eq('id', id)
                .eq('account_id', activeAccount.id);

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
                adImageUrl: assets.find(a => a.is_primary)?.url || ''
            });
            setIsLoading(false);
        };

        fetchCampaign();
    }, [id, supabase, activeAccount, createdAt]);

    if (isLoading) {
        return (
            <div className={styles.container} style={{ padding: '60px', textAlign: 'center' }}>
                <Spinner label="Loading campaign..." />
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
            <CreateCampaignForm 
                initialData={campaign} 
                isEditing={true}
                pageTitle="Edit Campaign"
                pageSubtitle="Update your campaign details and creative."
                backLabel="Back to Campaigns"
            />
        </div>
    );
}
