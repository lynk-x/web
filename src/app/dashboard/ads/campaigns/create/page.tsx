"use client";

import { useState } from 'react';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CreateCampaignPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create New Campaign"
                subtitle="Set up a new ad campaign to reach more users."
                backLabel="Back to Campaigns"
                isDirty={isDirty}
            />

            <CreateCampaignForm onDirtyChange={setIsDirty} />
        </div>
    );
}
