"use client";

import { useState } from 'react';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CreateCampaignPage() {
    const { activeAccount } = useOrganization();
    const [accountId, setAccountId] = useState('');

    return (
        <div className={adminStyles.container}>
            <CreateCampaignForm
                pageTitle="Create Campaign"
                pageSubtitle="Provision a new advertising campaign for an account"
                backLabel="Back to Campaigns"
                redirectPath="/dashboard/admin/campaigns"
                walletAccountId={accountId || undefined}
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
