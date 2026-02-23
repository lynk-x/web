"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import CampaignDetail from '@/components/admin/campaigns/Detail/CampaignDetail';
import BackButton from '@/components/shared/BackButton';
import styles from '../page.module.css';
import adminStyles from '../../page.module.css';
import { useToast } from '@/components/ui/Toast';

// In a real app, this would be fetched from an API
const mockCampaigns = [
    { id: '1', name: 'Summer Festival Promo', client: 'Global Beats', budget: 5000, spend: 3200, impressions: 150000, clicks: 4500, status: 'active', startDate: '2025-06-01', endDate: '2025-07-15' },
    { id: '2', name: 'Product Launch Q3', client: 'TechDaily', budget: 12000, spend: 0, impressions: 0, clicks: 0, status: 'pending', startDate: '2025-08-01', endDate: '2025-08-31' },
    { id: '3', name: 'Brand Awareness', client: 'Local Coffee', budget: 1000, spend: 850, impressions: 45000, clicks: 1200, status: 'paused', startDate: '2025-05-01', endDate: '2025-12-31' },
];

export default function AdminCampaignDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const id = params.id as string;

    const campaign = mockCampaigns.find(c => c.id === id) || mockCampaigns[0];

    const handleStatusChange = (campaignId: string, newStatus: string) => {
        showToast(`Campaign status updated to ${newStatus}`, 'success');
        // In real app: update state or re-fetch
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <BackButton />
                    <h1 className={styles.title}>{campaign.name}</h1>
                    <p className={adminStyles.subtitle}>Detailed oversight for {campaign.client}'s campaign.</p>
                </div>
            </header>

            <CampaignDetail
                campaign={campaign as any}
                onStatusChange={handleStatusChange}
            />
        </div>
    );
}
