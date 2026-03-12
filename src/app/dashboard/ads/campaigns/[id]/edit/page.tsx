"use client";

import { use, useState, useEffect, useMemo } from 'react';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '../../page.module.css';
import { createClient } from '@/utils/supabase/client';

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const supabase = useMemo(() => createClient(), []);

    const [campaign, setCampaign] = useState<CampaignData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        /**
         * Fetches the campaign and its primary ad asset from Supabase.
         * Maps DB columns to the CampaignData shape expected by CreateCampaignForm.
         */
        const fetchCampaign = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('ad_campaigns')
                .select(`
                    id, title, description, type,
                    total_budget, daily_limit,
                    start_at, end_at,
                    target_url, target_event_id, target_country_code,
                    ad_assets (call_to_action, url, is_primary)
                `)
                .eq('id', id)
                .single();

            if (error || !data) {
                setNotFound(true);
                setIsLoading(false);
                return;
            }

            // Find the primary asset for headline / image URL
            const assets = (data.ad_assets as { is_primary: boolean; url: string; call_to_action?: string }[]) || [];
            const primaryAsset = assets.find(a => a.is_primary) ?? assets[0];

            setCampaign({
                id: data.id,
                title: data.title,
                description: data.description || '',
                type: data.type,
                total_budget: String(data.total_budget),
                daily_limit: data.daily_limit != null ? String(data.daily_limit) : '',
                // Slice to YYYY-MM-DD for the date input
                start_at: data.start_at ? data.start_at.slice(0, 10) : '',
                end_at: data.end_at ? data.end_at.slice(0, 10) : '',
                target_url: data.target_url || '',
                target_event_id: data.target_event_id || '',
                target_country_code: data.target_country_code || 'KE',
                adHeadline: primaryAsset?.call_to_action || '',
                adImageUrl: primaryAsset?.url || ''
            });
            setIsLoading(false);
        };

        fetchCampaign();
    }, [id, supabase]);

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
