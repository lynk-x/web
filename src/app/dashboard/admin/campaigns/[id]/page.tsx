"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CampaignDetail from '@/components/admin/campaigns/Detail/CampaignDetail';
import BackButton from '@/components/shared/BackButton';
import styles from '../page.module.css';
import adminStyles from '../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { Campaign } from '@/types/admin';

export default function AdminCampaignDetailPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createClient();
    const { showToast } = useToast();
    const id = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCampaign = async () => {
            setIsLoading(true);
            try {
                // Fetch campaign data
                const { data, error } = await supabase
                    .from('ad_campaigns')
                    .select(`
                        id,
                        reference,
                        title,
                        type,
                        total_budget,
                        spent_amount,
                        status,
                        start_at,
                        end_at,
                        account_id,
                        accounts: account_id (name)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Fetch performance stats separately to avoid complex join issues in the same query
                const { data: perfData } = await supabase
                    .from('mv_ad_campaign_performance')
                    .select('*')
                    .eq('campaign_id', id)
                    .single();

                const perf = perfData || { total_impressions: 0, total_clicks: 0, total_spend: 0 };

                setCampaign({
                    id: data.id,
                    campaignRef: data.reference,
                    name: data.title,
                    client: (data.accounts as { name?: string })?.name || 'Unknown Client',
                    adType: data.type,
                    budget: parseFloat(data.total_budget),
                    spend: parseFloat(data.spent_amount) || parseFloat(perf.total_spend) || 0,
                    impressions: parseInt(perf.total_impressions) || 0,
                    clicks: parseInt(perf.total_clicks) || 0,
                    status: data.status,
                    startDate: new Date(data.start_at).toLocaleDateString(),
                    endDate: new Date(data.end_at).toLocaleDateString(),
                });
            } catch (err) {
                console.error('Error fetching campaign:', err);
                showToast('Campaign not found.', 'error');
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
                .from('ad_campaigns')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', campaignId);

            if (error) throw error;

            showToast(`Campaign status updated to ${newStatus}`, 'success');
            setCampaign(prev => prev ? { ...prev, status: newStatus as 'draft' | 'active' | 'completed' | 'paused' | 'rejected' } : null);
        } catch (err) {
            showToast('Failed to update status.', 'error');
        }
    };

    if (isLoading) return <div className={styles.container} style={{ padding: '40px', textAlign: 'center' }}>Loading campaign details...</div>;
    if (!campaign) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton />
                    <h1 className={styles.title}>{campaign.name}</h1>
                    <p className={adminStyles.subtitle}>Detailed oversight for {campaign.client}'s campaign.</p>
                </div>
            </header>

            <CampaignDetail
                campaign={campaign}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
