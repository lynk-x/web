"use client";

import { getErrorMessage } from '@/utils/error';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CampaignDetail from '@/components/admin/campaigns/Detail/CampaignDetail';
import SubPageHeader from '@/components/shared/SubPageHeader';
import styles from '../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { Campaign } from '@/types/admin';

export default function AdminCampaignDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();
    const id = params.id as string;
    const createdAt = searchParams.get('createdAt');

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [allCampaigns, setAllCampaigns] = useState<{ id: string; created_at: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCampaign = async () => {
            setIsLoading(true);
            try {
                // Fetch all campaign IDs to enable next/previous navigation
                const { data: allCamps } = await supabase
                    .schema('api')
                    .from('v1_ad_campaigns')
                    .select('id, created_at')
                    .order('created_at', { ascending: false });
                
                if (allCamps) {
                    setAllCampaigns(allCamps);
                }

                // Fetch campaign data from api.v1_ad_campaigns
                const query = supabase
                    .schema('api')
                    .from('v1_ad_campaigns')
                    .select(`
                        id,
                        account_id,
                        reference,
                        title,
                        description,
                        type,
                        destination_url,
                        total_budget,
                        spent_amount,
                        status,
                        start_at,
                        end_at,
                        created_at
                    `)
                    .eq('id', id);

                if (createdAt) {
                    query.eq('created_at', createdAt);
                }

                const { data: rawData, error } = await query.single();

                if (error) throw error;
                const data = rawData as any;

                // Fetch account display name from api.v1_accounts
                const { data: accountData } = await supabase
                    .schema('api')
                    .from('v1_accounts')
                    .select('display_name')
                    .eq('id', data.account_id)
                    .single();

                // Fetch performance stats separately to avoid complex join issues in the same query
                const { data: perfData } = await supabase
                    .from('mv_ad_campaign_performance')
                    .select('*')
                    .eq('campaign_id', id)
                    .single();

                const perf = perfData || { total_impressions: 0, total_clicks: 0, total_spend: 0 };

                // Fetch target countries/regions
                const { data: regionsData } = await supabase
                    .schema('api')
                    .from('v1_ad_campaign_regions')
                    .select('country_code')
                    .eq('campaign_id', id);

                // Fetch target tags
                const { data: tagsData } = await supabase
                    .schema('api')
                    .from('v1_ad_campaign_tags')
                    .select('tag_id')
                    .eq('campaign_id', id);

                const tagIds = tagsData?.map(ct => ct.tag_id) || [];
                let tagNames: string[] = [];
                if (tagIds.length > 0) {
                    const { data: tagsInfo } = await supabase
                        .from('v1_tags')
                        .select('slug')
                        .in('id', tagIds);
                    tagNames = tagsInfo?.map(t => t.slug) || [];
                }

                // Fetch primary ad media
                const { data: mediaData } = await supabase
                    .schema('api')
                    .from('v1_ad_media')
                    .select('url, call_to_action, media_type, is_primary')
                    .eq('campaign_id', id);

                const primaryMedia = mediaData?.find(m => m.is_primary) || mediaData?.[0];

                setCampaign({
                    id: data.id,
                    createdAt: data.created_at,
                    campaignRef: data.reference,
                    name: data.title,
                    client: accountData?.display_name || 'Unknown Client',
                    adType: data.type,
                    budget: parseFloat(data.total_budget),
                    spend: parseFloat(data.spent_amount) || parseFloat(perf.total_spend) || 0,
                    impressions: parseInt(perf.total_impressions) || 0,
                    clicks: parseInt(perf.total_clicks) || 0,
                    status: data.status,
                    startDate: new Date(data.start_at).toLocaleDateString(),
                    endDate: new Date(data.end_at).toLocaleDateString(),
                    description: data.description || '',
                    destinationUrl: data.destination_url || '',
                    targetEventId: data.target_event_id || undefined,
                    targetCountries: regionsData?.map(r => r.country_code) || [],
                    targetTags: tagNames,
                    mediaUrl: primaryMedia?.url || '',
                    mediaType: primaryMedia?.media_type || '',
                    callToAction: primaryMedia?.call_to_action || '',
                });
            } catch (err) {
                showToast(getErrorMessage(err) || 'Campaign not found.', 'error');
                router.push('/dashboard/admin/campaigns');
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchCampaign();
    }, [id, supabase, showToast, router]);

    const handleStatusChange = async (campaignId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('v1_ad_campaigns')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', campaignId)
                .eq('created_at', campaign?.createdAt);

            if (error) throw error;

            showToast(`Campaign status updated to ${newStatus}`, 'success');
            setCampaign(prev => prev ? { ...prev, status: newStatus as 'draft' | 'active' | 'completed' | 'paused' | 'rejected' } : null);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to update status.', 'error');
        }
    };

    const currentIndex = allCampaigns.findIndex(c => c.id === id);
    const prevCampaign = currentIndex > 0 ? allCampaigns[currentIndex - 1] : null;
    const nextCampaign = currentIndex < allCampaigns.length - 1 ? allCampaigns[currentIndex + 1] : null;

    if (isLoading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Loading campaign details...</div>;
    if (!campaign) return null;

    return (
        <div className={styles.container}>
            <SubPageHeader
                title={campaign.name}
                subtitle={`Detailed oversight for ${campaign.client}'s campaign.`}
                secondaryAction={allCampaigns.length > 1 ? {
                    label: 'Prev',
                    onClick: () => { if (prevCampaign) router.push(`/dashboard/admin/campaigns/${prevCampaign.id}?createdAt=${prevCampaign.created_at}`); },
                    disabled: !prevCampaign
                } : undefined}
                primaryAction={allCampaigns.length > 1 ? {
                    label: 'Next',
                    onClick: () => { if (nextCampaign) router.push(`/dashboard/admin/campaigns/${nextCampaign.id}?createdAt=${nextCampaign.created_at}`); },
                    disabled: !nextCampaign
                } : undefined}
            />

            <CampaignDetail
                campaign={campaign}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
