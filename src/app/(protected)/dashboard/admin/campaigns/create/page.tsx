"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CreateCampaignPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const { activeAccount } = useOrganization();

    const [accountId, setAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdminSubmit = async (formData: CampaignData) => {
        const resolvedAccountId = accountId || activeAccount?.id;
        if (!resolvedAccountId) {
            showToast('You must select an advertiser account.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.rpc('admin_create_campaign', {
                p_account_id: resolvedAccountId,
                p_title: formData.title,
                p_type: formData.type,
                p_budget: parseFloat(formData.total_budget),
                p_start_date: new Date(formData.start_at).toISOString(),
                p_end_date: new Date(formData.end_at).toISOString()
            });

            if (error) throw error;
            showToast('Campaign created successfully', 'success');
            router.push('/dashboard/admin/campaigns');
        } catch (err: any) {
            showToast(err.message || 'Failed to create campaign', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create Campaign"
                subtitle="Provision a new advertising campaign for an account"
                backLabel="Back to Campaigns"
            />

            <AccountSearchInput
                value={accountId}
                onChange={setAccountId}
                label="Advertiser Account"
                placeholder="Search accounts by name or reference…"
                countryCode={activeAccount?.country_code || null}
            />

            <div className={adminStyles.pageCard}>
                <CreateCampaignForm onSubmit={handleAdminSubmit} />
            </div>
        </div>
    );
}
