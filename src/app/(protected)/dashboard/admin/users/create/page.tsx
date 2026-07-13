"use client";

import { getErrorMessage } from '@/utils/error';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/dashboard/PageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import FormRow from '@/components/shared/FormRow';

export default function CreateAccountPage() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();

    const [countries, setCountries] = useState<{ code: string, display_name: string }[]>([]);
    const [formData, setFormData] = useState({
        display_name: '',
        type: 'organizer',
        owner_email: '',
        country_code: 'KE',
        status: 'active'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        const { data } = await supabase.schema('api').from('v1_countries').select('code, display_name').order('display_name');
        if (data) setCountries(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase.schema('api').rpc('admin_create_account', {
                p_display_name: formData.display_name,
                p_type: formData.type,
                p_owner_email: formData.owner_email,
                p_country_code: formData.country_code,
                p_status: formData.status
            });

            if (error) throw error;

            showToast('Account created successfully', 'success');
            router.push('/dashboard/admin/users');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create account', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Create New Account"
                subtitle="Register a new organization or individual entity"
                closeHref="/dashboard/admin/users"
            />

            <div className={adminStyles.pageCard}>
                <form onSubmit={handleSubmit} className={adminStyles.form}>
                    <div className={adminStyles.formGrid}>
                        <FormRow label="Organization Name" styles={adminStyles}>
                            <input
                                type="text"
                                required
                                className={adminStyles.input}
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="e.g. Acme Corporation"
                            />
                        </FormRow>

                        <FormRow label="Primary Owner Email" styles={adminStyles}>
                            <input
                                type="email"
                                required
                                className={adminStyles.input}
                                value={formData.owner_email}
                                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                                placeholder="owner@example.com"
                            />
                            <span style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>Account will be linked if this user exists.</span>
                        </FormRow>

                        <FormRow label="Account Type" styles={adminStyles}>
                            <select
                                className={adminStyles.select}
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="organizer">Organizer</option>
                                <option value="advertiser">Advertiser</option>
                                <option value="attendee">Attendee</option>
                                <option value="pulse_user">Pulse User</option>
                            </select>
                        </FormRow>

                        <FormRow label="Country" styles={adminStyles}>
                            <select
                                className={adminStyles.select}
                                value={formData.country_code}
                                onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                            >
                                {countries.map(c => (
                                    <option key={c.code} value={c.code}>{c.display_name}</option>
                                ))}
                            </select>
                        </FormRow>
                    </div>

                    <FormRow label="Initial Status" styles={adminStyles}>
                        <select
                            className={adminStyles.select}
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="active">Active</option>
                            <option value="pending_activation">Pending Activation</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </FormRow>

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
                                {isSubmitting ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
