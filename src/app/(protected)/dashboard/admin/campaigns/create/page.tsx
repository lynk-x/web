"use client";

import { useState } from 'react';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

/**
 * Admin campaign provisioning page.
 * Allows administrators to configure and launch campaigns on behalf of advertiser accounts.
 */
export default function CreateCampaignPage() {
    const { activeAccount } = useOrganization();
    const [accountId, setAccountId] = useState('');

    return (
        <div className={adminStyles.container}>
            <CreateCampaignForm
                pageTitle="Create Campaign"
                pageSubtitle="Provision a new campaign for an account"
                backLabel="Back to Campaigns"
                redirectPath="/dashboard/admin/campaigns"
                walletAccountId={accountId || undefined}
            >
                <div style={{ marginBottom: '24px' }}>
                    <AccountSearchInput
                        value={accountId}
                        onChange={setAccountId}
                        label="Partner Account"
                        placeholder="Search accounts by name or reference…"
                        countryCode={activeAccount?.country_code || null}
                    />
                </div>
            </CreateCampaignForm>
        </div>
    );
}
