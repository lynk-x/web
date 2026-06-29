"use client";

import { use, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '../../page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';

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
                .from('campaigns')
                .select(`
                    *,
                    ad_media:ad_media (call_to_action, url, is_primary, media_type:type),
                    ad_campaign_regions:campaign_regions (country_code),
                    campaign_tags (tag_id)
                `)
                .eq('id', id)
                .eq('account_id', activeAccount.id);

            if (createdAt) {
                query = query.eq('created_at', createdAt);
            }

            const { data, error } = await query.single();

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
                adImageUrl: assets.find(a => a.is_primary)?.url || ''
            });
            setIsLoading(false);
        };

        fetchCampaign();
    }, [id, supabase, activeAccount]);

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
                    <h1 className={styles.title}>Edit Campaign</h1>
                    <p className={styles.subtitle}>Update your campaign details and creative.</p>
                </div>
            </header>

            <CreateCampaignForm initialData={campaign} isEditing={true} />
        </div>
    );
}
