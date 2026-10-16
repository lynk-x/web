"use client";

import { useState } from 'react';
import CreateCampaignForm from '@/components/commercial/campaigns/CreateCampaignForm';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

/**
 * Partner campaign creation page.
 * Renders the multi-step form to launch new campaigns and event sponsorships.
 */
export default function CreateCampaignPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={adminStyles.container}>
            <CreateCampaignForm 
                onDirtyChange={setIsDirty}
                pageTitle="Create New Campaign"
                pageSubtitle="Set up a new campaign or sponsorship to reach attendees."
                backLabel="Back to Campaigns"
            />
        </div>
    );
}
