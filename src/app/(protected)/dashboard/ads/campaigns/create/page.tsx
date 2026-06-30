"use client";

import { useState } from 'react';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CreateCampaignPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={adminStyles.container}>
            <CreateCampaignForm 
                onDirtyChange={setIsDirty}
                pageTitle="Create New Campaign"
                pageSubtitle="Set up a new ad campaign to reach more users."
                backLabel="Back to Campaigns"
            />
        </div>
    );
}
