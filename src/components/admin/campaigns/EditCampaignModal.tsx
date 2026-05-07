"use client";

import { useState, useEffect } from 'react';
import Modal from '@/components/shared/Modal';
import { Campaign } from './CampaignTable';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { formatDate } from '@/utils/format';

interface EditCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: any) => void;
    campaign: Campaign | null;
}

export default function EditCampaignModal({ isOpen, onClose, onSave, campaign }: EditCampaignModalProps) {
    const [name, setName] = useState('');
    const [budget, setBudget] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

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
        }
    }, [campaign, isOpen]);

    const handleSave = () => {
        if (!campaign) return;
        onSave(campaign.id, {
            name,
            budget,
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
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
                        <input 
                            type={focusedField === 'startDate' || !startDate ? 'date' : 'text'} 
                            className={adminStyles.input} 
                            value={focusedField !== 'startDate' && startDate ? formatDate(startDate) : startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            onFocus={(e) => {
                                setFocusedField('startDate');
                                try { (e.target as any).showPicker(); } catch {}
                            }}
                            onBlur={() => setFocusedField(null)}
                        />
                    </label>
                    <label className={adminStyles.fieldLabel}>
                        End Date
                        <input 
                            type={focusedField === 'endDate' || !endDate ? 'date' : 'text'} 
                            className={adminStyles.input} 
                            value={focusedField !== 'endDate' && endDate ? formatDate(endDate) : endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            onFocus={(e) => {
                                setFocusedField('endDate');
                                try { (e.target as any).showPicker(); } catch {}
                            }}
                            onBlur={() => setFocusedField(null)}
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
