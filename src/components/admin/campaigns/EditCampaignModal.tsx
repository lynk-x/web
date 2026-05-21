"use client";

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/shared/Modal';
import { Campaign } from './CampaignTable';
import CreateCampaignForm, { CampaignData } from '@/components/ads/campaigns/CreateCampaignForm';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';

interface EditCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: { name: string; budget: number; startDate: string; endDate: string; account_id: string }) => void;
    campaign: Campaign | null;
}

export default function EditCampaignModal({ isOpen, onClose, onSave, campaign }: EditCampaignModalProps) {
    const { activeAccount } = useOrganization();
    const [accountId, setAccountId] = useState('');
    const [initialData, setInitialData] = useState<CampaignData | null>(null);

    useEffect(() => {
        if (campaign) {
            setAccountId((campaign as any).account_id || '');
            setInitialData({
                id: campaign.id,
                created_at: (campaign as any).createdAt,
                title: campaign.name,
                type: campaign.adType || 'banner',
                total_budget: String(campaign.budget),
                start_at: campaign.startDate,
                end_at: campaign.endDate,
                description: '',
                daily_limit: '',
                destination_url: '',
                max_bid_amount: '0.01',
                target_countries: [],
                target_tags: [],
                creatives: [{ headline: '', imageUrl: '', preview: '', file: undefined }],
                adHeadline: '',
                adImageUrl: '',
                account_id: (campaign as any).account_id || '',
            });
        }
    }, [campaign, isOpen]);

    const handleAdminSave = async (_formData: CampaignData) => {
        if (!campaign) return;
        onSave(campaign.id, {
            name: _formData.title,
            budget: parseFloat(_formData.total_budget) || 0,
            startDate: new Date(_formData.start_at).toISOString(),
            endDate: new Date(_formData.end_at).toISOString(),
            account_id: accountId || _formData.account_id || '',
        });
        onClose();
    };

    const headerTitle = campaign && campaign.campaignRef
        ? `Edit Campaign: ${campaign.campaignRef}`
        : 'Edit Campaign';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            size="medium"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <AccountSearchInput
                    value={accountId}
                    onChange={setAccountId}
                    label="Advertiser Account"
                    placeholder="Search accounts by name or reference…"
                    countryCode={activeAccount?.country_code || null}
                />

                {initialData && (
                    <CreateCampaignForm
                        initialData={initialData}
                        isEditing={true}
                        onSubmit={handleAdminSave}
                    />
                )}
            </div>
        </Modal>
    );
}
