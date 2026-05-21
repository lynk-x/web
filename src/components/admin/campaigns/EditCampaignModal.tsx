"use client";

import { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/shared/Modal';
import { Campaign } from './CampaignTable';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { DatePicker } from '@/components/ui/DatePicker';
import { AccountSearchInput } from '@/components/shared/AccountSearchInput';
import { useOrganization } from '@/context/OrganizationContext';

interface EditCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: any) => void;
    campaign: Campaign | null;
}

export default function EditCampaignModal({ isOpen, onClose, onSave, campaign }: EditCampaignModalProps) {
    const { activeAccount } = useOrganization();
    const [name, setName] = useState('');
    const [budget, setBudget] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (campaign) {
            setName(campaign.name);
            setBudget(campaign.budget);

            // Format dates for input type="date"
            const start = new Date(campaign.startDate);
            const end = new Date(campaign.endDate);

            if (!isNaN(start.getTime())) {
                setStartDate(start.toISOString().split('T')[0]);
            }
            if (!isNaN(end.getTime())) {
                setEndDate(end.toISOString().split('T')[0]);
            }

            // Pre-select current account if available on campaign
            if ((campaign as any).account_id) {
                setAccountId((campaign as any).account_id);
            }
        }
    }, [campaign, isOpen]);

    const handleSave = () => {
        if (!campaign) return;
        onSave(campaign.id, {
            name,
            budget,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            account_id: accountId || (campaign as any).account_id,
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Edit Campaign: ${campaign?.campaignRef || ''}`}
            size="medium"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <label className={adminStyles.fieldLabel}>
                    Campaign Name
                    <input
                        type="text"
                        className={adminStyles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>

                <AccountSearchInput
                    value={accountId}
                    onChange={setAccountId}
                    label="Advertiser Account"
                    placeholder="Search accounts by name or reference…"
                    countryCode={activeAccount?.country_code || null}
                />

                <label className={adminStyles.fieldLabel}>
                    Total Budget (USD)
                    <input
                        type="number"
                        className={adminStyles.input}
                        value={budget}
                        onChange={(e) => setBudget(parseFloat(e.target.value))}
                    />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <label className={adminStyles.fieldLabel}>
                        Start Date
                        <DatePicker
                            value={startDate}
                            onChange={setStartDate}
                            placeholder="dd/mm/yyyy"
                        />
                    </label>
                    <label className={adminStyles.fieldLabel}>
                        End Date
                        <DatePicker
                            value={endDate}
                            onChange={setEndDate}
                            placeholder="dd/mm/yyyy"
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button className={adminStyles.secondaryButton} onClick={onClose}>
                        Cancel
                    </button>
                    <button className={adminStyles.btnPrimary} onClick={handleSave}>
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
}
