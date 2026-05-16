"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/dashboard/PageHeader';
import styles from '../../campaigns/create/page.module.css'; // Reusing the same layout styles
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

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
        const { data } = await supabase.rpc('get_countries');
        if (data) setCountries(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase.rpc('admin_create_account', {
                p_display_name: formData.display_name,
                p_type: formData.type,
                p_owner_email: formData.owner_email,
                p_country_code: formData.country_code,
                p_status: formData.status
            });

            if (error) throw error;

            showToast('Account created successfully', 'success');
            router.push('/dashboard/admin/users');
        } catch (err: any) {
            showToast(err.message || 'Failed to create account', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Create New Account" 
                subtitle="Register a new organization or individual entity"
                backHref="/dashboard/admin/users"
            />

            <div className={styles.formContainer}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formSection}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Organization Name</label>
                            <input 
                                type="text"
                                required
                                className={styles.input}
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="e.g. Acme Corporation"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Primary Owner Email</label>
                            <input 
                                type="email"
                                required
                                className={styles.input}
                                value={formData.owner_email}
                                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                                placeholder="owner@example.com"
                            />
                            <span style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>Account will be linked if this user exists.</span>
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Account Type</label>
                                <select 
                                    className={styles.select}
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="organizer">Organizer</option>
                                    <option value="advertiser">Advertiser</option>
                                    <option value="attendee">Attendee</option>
                                    <option value="pulse_user">Pulse User</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Country</label>
                                <select 
                                    className={styles.select}
                                    value={formData.country_code}
                                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                >
                                    {countries.map(c => (
                                        <option key={c.code} value={c.code}>{c.display_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Initial Status</label>
                            <select 
                                className={styles.select}
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="pending_activation">Pending Activation</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <button 
                            type="button" 
                            onClick={() => router.back()} 
                            className={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
