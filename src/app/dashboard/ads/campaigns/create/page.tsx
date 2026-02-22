"use client";

import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import styles from '../../page.module.css'; // Reuse main dashboard styles for title

export default function CreateCampaignPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Create New Campaign</h1>
                    <p className={styles.subtitle}>Set up a new ad campaign to reach more users.</p>
                </div>
            </header>

            <CreateCampaignForm />
        </div>
    );
}
