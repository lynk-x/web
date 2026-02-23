"use client";

import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '@/app/dashboard/ads/page.module.css';
import { useState } from 'react';

export default function CreateCampaignPage() {
    const [isDirty, setIsDirty] = useState(false);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Campaigns" isDirty={isDirty} />
                    <h1 className={styles.title}>Create New Campaign</h1>
                    <p className={styles.subtitle}>Set up a new ad campaign to reach more users.</p>
                </div>
            </header>

            <CreateCampaignForm onDirtyChange={setIsDirty} />
        </div>
    );
}
