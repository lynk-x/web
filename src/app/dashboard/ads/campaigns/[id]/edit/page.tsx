"use client";

import { use } from 'react';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '../../page.module.css';

// Mock Data
const allCampaigns = [
    {
        id: '1',
        title: 'Summer Music Festival Promo',
        description: 'Internal description for summer festival promo',
        type: 'banner' as const,
        start_at: '2024-10-12',
        end_at: '2024-10-20',
        total_budget: '1000',
        daily_limit: '100',
        adHeadline: 'Summer Beats 2024',
        target_url: 'https://lynk-x.com/fest',
    },
    {
        id: '2',
        title: 'Tech Summit Early Bird',
        description: 'Internal description for tech summit',
        type: 'interstitial' as const,
        start_at: '2024-09-01',
        end_at: '2024-09-30',
        total_budget: '800',
        daily_limit: '50',
        adHeadline: 'Tech Summit 2024',
        target_url: 'https://lynk-x.com/tech',
    },
];

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    // Find campaign by ID
    const campaign = allCampaigns.find(c => c.id === id);

    if (!campaign) {
        return (
            <div className={styles.container}>
                <h1 className={styles.title}>Campaign Not Found</h1>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton label="Back to Campaigns" />
                    <h1 className={styles.title}>Edit Campaign</h1>
                    <p className={styles.subtitle}>Update your campaign details and creative.</p>
                </div>
            </header>

            <CreateCampaignForm initialData={campaign} isEditing={true} />
        </div>
    );
}
