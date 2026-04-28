"use client";

import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import adminStyles from '../../page.module.css';
import styles from '../page.module.css';

export default function AdminCreateCampaignPage() {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Campaigns" />
                    <h1 className={styles.title}>Create Admin Campaign</h1>
                    <p className={adminStyles.subtitle}>Set up a new platform-wide or client-specific ad campaign.</p>
                </div>
            </header>

            <CreateCampaignForm redirectPath="/dashboard/admin/campaigns" />
        </div>
    );
}
