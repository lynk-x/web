"use client";

import { getErrorMessage } from '@/utils/error';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { generateCampaignEmbedding } from '@/utils/embedding';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export default function CreateCampaignPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const { activeAccount } = useOrganization();
    const { enabled: isEmbedEnabled } = useFeatureFlag('enable_client_embeddings');

    const [accountId, setAccountId] = useState('');

    const handleAdminSubmit = async (formData: CampaignData) => {
        const resolvedAccountId = accountId || activeAccount?.id;
        if (!resolvedAccountId) {
            showToast('You must select an advertiser account.', 'error');
            return;
        }

        try {
            const { data, error } = await supabase.schema('api').rpc('admin_create_campaign', {
                p_account_id: resolvedAccountId,
                p_title: formData.title,
                p_type: formData.type,
                p_budget: parseFloat(formData.total_budget),
                p_start_date: new Date(formData.start_at).toISOString(),
                p_end_date: new Date(formData.end_at).toISOString()
            });

            if (error) throw error;

            // Generate and save campaign embedding client-side (only if feature flag is enabled)
            const campaignId = (data as any)?.campaign_id;
            if (campaignId && isEmbedEnabled === true) {
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

            showToast('Campaign created successfully', 'success');
            router.push('/dashboard/admin/campaigns');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create campaign', 'error');
        }
    };

    return (
        <div className={adminStyles.container}>
            <CreateCampaignForm 
                onSubmit={handleAdminSubmit}
                pageTitle="Create Campaign"
                pageSubtitle="Provision a new advertising campaign for an account"
                backLabel="Back to Campaigns"
            >
                <div style={{ marginBottom: '24px' }}>
                    <AccountSearchInput
                        value={accountId}
                        onChange={setAccountId}
                        label="Advertiser Account"
                        placeholder="Search accounts by name or reference…"
                        countryCode={activeAccount?.country_code || null}
                    />
                </div>
            </CreateCampaignForm>
        </div>
    );
}
