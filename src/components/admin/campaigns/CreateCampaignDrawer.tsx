"use client";

import React, { useState, useEffect } from 'react';
import styles from '../users/AccountMembersDrawer.module.css'; // Reusing styles for consistency
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { DatePicker } from '@/components/ui/DatePicker';

interface CreateCampaignDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCampaignDrawer({ isOpen, onClose, onSuccess }: CreateCampaignDrawerProps) {
    const supabase = createClient();
    const { showToast } = useToast();
    
    const [accounts, setAccounts] = useState<{ id: string, display_name: string }[]>([]);
    const [formData, setFormData] = useState({
        account_id: '',
        title: '',
        type: 'banner',
        budget: '',
        start_date: '',
        end_date: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

    const fetchAccounts = async () => {
        const { data } = await supabase
            .from('accounts')
            .select('id, display_name')
            .eq('is_active', true)
            .order('display_name')
            .limit(100);
        setAccounts(data || []);
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('admin_create_campaign', {
                p_account_id: formData.account_id,
                p_title: formData.title,
                p_type: formData.type,
                p_budget: parseFloat(formData.budget),
                p_start_date: formData.start_date,
                p_end_date: formData.end_date
            });

            if (error) throw error;

            showToast('Campaign created successfully', 'success');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                account_id: '',
                title: '',
                type: 'banner',
                budget: '',
                start_date: '',
                end_date: ''
            });
        } catch (err: any) {
            showToast(err.message || 'Failed to create campaign', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Create New Campaign</h2>
                        <span className={styles.subtitle}>Provision a new advertising campaign for an account</span>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.content}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Campaign Title</label>
                            <input 
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Summer Festival Promo"
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--color-interface-outline)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Advertiser Account</label>
                            <select 
                                required
                                value={formData.account_id}
                                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--color-interface-outline)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}
                            >
                                <option value="">Select an account...</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.display_name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Ad Type</label>
                                <select 
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    style={{ 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--color-interface-outline)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white'
                                    }}
                                >
                                    <option value="banner">Banner</option>
                                    <option value="interstitial">Interstitial</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Total Budget</label>
                                <input 
                                    type="number"
                                    required
                                    min="1"
                                    step="0.01"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    placeholder="0.00"
                                    style={{ 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--color-interface-outline)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Start Date</label>
                                <DatePicker 
                                    value={formData.start_date}
                                    onChange={(val) => setFormData({ ...formData, start_date: val })}
                                    placeholder="Start date"
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>End Date</label>
                                <DatePicker 
                                    value={formData.end_date}
                                    onChange={(val) => setFormData({ ...formData, end_date: val })}
                                    placeholder="End date"
                                />
                            </div>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'white', 
                                opacity: 0.6, 
                                cursor: 'pointer' 
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className={styles.inviteButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Campaign'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
