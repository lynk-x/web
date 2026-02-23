"use client";

import { use } from 'react';
import CreateCampaignForm from '@/components/ads/campaigns/CreateCampaignForm';
import BackButton from '@/components/shared/BackButton';
import styles from '../../page.module.css';

// Mock Data
const allCampaigns = [
    {
        id: '1',
        name: 'Summer Music Festival Promo',
        dates: 'Oct 12 - Oct 20, 2024',
        startDate: '2024-10-12',
        endDate: '2024-10-20',
        status: 'active',
        impressions: '12.5k',
        clicks: '650',
        spent: '$450.00',
        budget: '1000',
        adTitle: 'Summer Beats 2024',
        adText: 'Get your tickets for the hottest festival of the year!',
        targetUrl: 'https://lynk-x.com/fest',
    },
    {
        id: '2',
        name: 'Tech Summit Early Bird',
        dates: 'Sep 01 - Sep 30, 2024',
        startDate: '2024-09-01',
        endDate: '2024-09-30',
        status: 'active',
        impressions: '8.2k',
        clicks: '420',
        spent: '$320.50',
        budget: '800',
        adTitle: 'Tech Summit 2024',
        adText: 'Innovate with the best in the industry.',
        targetUrl: 'https://lynk-x.com/tech',
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
