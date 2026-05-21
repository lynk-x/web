"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { DatePicker } from '@/components/ui/DatePicker';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CreateCampaignPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();

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
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        const { data } = await supabase
            .from('accounts')
            .select('id, display_name')
            .eq('is_active', true)
            .order('display_name')
            .limit(100);
        setAccounts(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase.rpc('admin_create_campaign', {
                p_account_id: formData.account_id,
                p_title: formData.title,
                p_type: formData.type,
                p_budget: parseFloat(formData.budget),
                p_start_date: formData.start_date,
                p_end_date: formData.end_date
            });

            if (error) throw error;

            showToast('Campaign created successfully', 'success');
            router.push('/dashboard/admin/campaigns');
        } catch (err: any) {
            showToast(err.message || 'Failed to create campaign', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create Campaign"
                subtitle="Provision a new advertising campaign for an account"
                backLabel="Back to Campaigns"
            />

            <div className={adminStyles.pageCard}>
                <form onSubmit={handleSubmit} className={adminStyles.form}>
                    <div className={adminStyles.formGrid}>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Campaign Title</label>
                            <input
                                type="text"
                                required
                                className={adminStyles.input}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Summer Festival Promo"
                            />
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Advertiser Account</label>
                            <select
                                required
                                className={adminStyles.select}
                                value={formData.account_id}
                                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                            >
                                <option value="">Select an account...</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.display_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Ad Type</label>
                            <select
                                className={adminStyles.select}
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="banner">Banner</option>
                                <option value="interstitial">Interstitial</option>
                            </select>
                        </div>

                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Total Budget</label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="0.01"
                                className={adminStyles.input}
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className={adminStyles.formGrid}>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>Start Date</label>
                            <DatePicker
                                value={formData.start_date}
                                onChange={(val) => setFormData({ ...formData, start_date: val })}
                                placeholder="Start date"
                            />
                        </div>
                        <div className={adminStyles.inputGroup}>
                            <label className={adminStyles.label}>End Date</label>
                            <DatePicker
                                value={formData.end_date}
                                onChange={(val) => setFormData({ ...formData, end_date: val })}
                                placeholder="End date"
                            />
                        </div>
                    </div>

                    <div className={adminStyles.inputGroup} style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className={adminStyles.btnSecondary}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={adminStyles.btnPrimary}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Campaign'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
