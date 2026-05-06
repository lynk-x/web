"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './UserForm.module.css';
import { useRouter } from 'next/navigation';
import { sanitizeInput } from '@/utils/sanitization';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useCountries } from '@/hooks/useCountries';

export interface UserFormData {
    id?: string;
    name: string;
    email: string;
    role: 'attendee' | 'organizer' | 'advertiser' | 'platform';
    status: 'active' | 'temporarily_suspended' | 'permanently_suspended';
    countryCode: string;
    kycTier: 'tier_1_basic' | 'tier_2_verified' | 'tier_3_advanced';
    bio?: string;
}

interface UserFormProps {
    initialData?: UserFormData;
    isEditing?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    onSubmittingChange?: (isSubmitting: boolean) => void;
    formId?: string;
    hideActions?: boolean;
}

export default function UserForm({
    initialData,
    isEditing = false,
    onDirtyChange,
    onSubmittingChange,
    formId,
    hideActions = false
}: UserFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const { countries, isLoading: isLoadingCountries } = useCountries();

    const defaultData: UserFormData = {
        name: '',
        email: '',
        role: 'attendee',
        status: 'active',
        countryCode: 'KE',
        kycTier: 'tier_1_basic',
        bio: ''
    };

    const [formData, setFormData] = useState<UserFormData>(initialData || defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData || defaultData);
        onDirtyChange?.(isDirty);
    }, [formData, initialData, onDirtyChange]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        if (!touched[name]) {
            setTouched(prev => ({ ...prev, [name]: true }));
        }
    };

    const getInputClass = (name: keyof UserFormData, baseClass: string) => {
        if (!touched[name as string]) return baseClass;
        const value = formData[name];
        const isValid = name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string || '') : !!value;
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: keyof UserFormData) => {
        if (!touched[name as string]) return null;
        const value = formData[name];
        const isValid = name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string || '') : !!value;
        const label = name === 'email' && value && !isValid ? 'Invalid Email' : 'Required';

        return isValid ? (
            <div className="validation-hint success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Ready
            </div>
        ) : (
            <div className="validation-hint error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {label}
            </div>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        onSubmittingChange?.(true);

        try {
            const sanitizedName = sanitizeInput(formData.name);
            const sanitizedEmail = sanitizeInput(formData.email);
            
            if (isEditing) {
                const { error } = await supabase
                    .from('user_profile')
                    .update({
                        full_name: sanitizedName,
                        email: sanitizedEmail,
                        role: formData.role,
                        status: formData.status,
                        country_code: formData.countryCode,
                        kyc_tier: formData.kycTier
                    })
                    .eq('id', formData.id);
                if (error) throw error;
                showToast('Account updated successfully!', 'success');
            } else {
                const { data, error } = await supabase.rpc('admin_create_user', {
                    p_email: sanitizedEmail,
                    p_full_name: sanitizedName,
                    p_user_name: sanitizedName.split(' ')[0].toLowerCase() + Math.floor(Math.random()*100),
                    p_account_type: formData.role,
                    p_country_code: formData.countryCode
                });
                if (error) throw error;

                // Set KYC tier separately if it's not tier_1_basic
                if (formData.kycTier !== 'tier_1_basic') {
                    await supabase
                        .from('user_profile')
                        .update({ kyc_tier: formData.kycTier })
                        .eq('id', data);
                }

                showToast('Account created successfully!', 'success');
            }
            
            onDirtyChange?.(false);
            router.push('/dashboard/admin/users');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Action failed', 'error');
        } finally {
            setIsSubmitting(false);
            onSubmittingChange?.(false);
        }
    };

    return (
        <div className={styles.container}>
            <form id={formId} className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.grid}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Full Name</label>
                        <input
                            type="text"
                            name="name"
                            className={getInputClass('name', styles.input)}
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                        {renderValidationHint('name')}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className={getInputClass('email', styles.input)}
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                        />
                        {renderValidationHint('email')}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Primary Country</label>
                        <select
                            name="countryCode"
                            className={styles.select}
                            value={formData.countryCode}
                            onChange={handleInputChange}
                            required
                            disabled={isLoadingCountries}
                        >
                            {isLoadingCountries ? (
                                <option value="">Loading Countries...</option>
                            ) : (
                                countries.map(c => (
                                    <option key={c.code} value={c.code}>{c.display_name} ({c.code})</option>
                                ))
                            )}
                            {!isLoadingCountries && countries.length === 0 && (
                                <option value="KE">Kenya (KE)</option>
                            )}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Verification (KYC) Tier</label>
                        <select
                            name="kycTier"
                            className={styles.select}
                            value={formData.kycTier}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="tier_1_basic">Tier 1: Basic (Identity)</option>
                            <option value="tier_2_verified">Tier 2: Verified (Docs)</option>
                            <option value="tier_3_advanced">Tier 3: Advanced (AML)</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Assigned Account Role</label>
                        <select
                            name="role"
                            className={styles.select}
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="attendee">Platform Attendee</option>
                            <option value="organizer">Verified Organizer</option>
                            <option value="advertiser">Ad Partner</option>
                            <option value="platform">Platform Admin</option>
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Account Status</label>
                        <select
                            name="status"
                            className={styles.select}
                            value={formData.status}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="active">Active / Healthy</option>
                            <option value="temporarily_suspended">Temporarily Suspended</option>
                            <option value="permanently_suspended">Permanently Suspended</option>
                        </select>
                    </div>

                    {!isEditing && (
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                            <div className="validation-hint info" style={{ padding: '8px', border: '1px solid currentColor', borderRadius: '8px', opacity: 0.8 }}>
                                Note: The account owner will be invited to set their password via the platform's authentication gateway.
                            </div>
                        </div>
                    )}
                </div>

                {!hideActions && (
                    <div className={styles.actions}>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={adminStyles.btnPrimary}
                        >
                            {isSubmitting ? 'Processing...' : (isEditing ? 'Save Changes' : 'Create Account')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
