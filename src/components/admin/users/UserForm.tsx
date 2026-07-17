"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './UserForm.module.css';
import { useRouter } from 'next/navigation';
import { sanitizeInput } from '@/utils/sanitization';
import { normalizeToE164 } from '@/utils/phone';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import { useCountries } from '@/hooks/useCountries';
import CountryPhoneSelect, { DialCodeCountry } from '@/components/shared/CountryPhoneSelect';

const DEFAULT_PHONE_COUNTRY: DialCodeCountry = { code: 'KE', display_name: 'Kenya', phone_prefix: '+254', phone_digits: 9 };

export interface UserFormData {
    id?: string;
    name: string;
    email: string;
    phone: string;
    role: 'attendee' | 'organizer' | 'advertiser' | 'platform' | 'system';
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
        phone: '',
        role: 'attendee',
        status: 'active',
        countryCode: 'KE',
        kycTier: 'tier_1_basic',
        bio: ''
    };

    const [formData, setFormData] = useState<UserFormData>(initialData || defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phoneCountry, setPhoneCountry] = useState<DialCodeCountry>(DEFAULT_PHONE_COUNTRY);

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
        const isValid = name === 'email'
            ? (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string))
            : name === 'phone'
                ? !!normalizeToE164(value as string || '', phoneCountry.phone_prefix, phoneCountry.phone_digits ?? undefined)
                : !!value;
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: keyof UserFormData) => {
        if (!touched[name as string]) return null;
        const value = formData[name];
        const isValid = name === 'email'
            ? (!value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string))
            : name === 'phone'
                ? !!normalizeToE164(value as string || '', phoneCountry.phone_prefix, phoneCountry.phone_digits ?? undefined)
                : !!value;
        const label = name === 'email' && value && !isValid
            ? 'Invalid Email'
            : name === 'phone' && !isValid
                ? `Invalid Phone (e.g. ${phoneCountry.phone_prefix}712345678)`
                : 'Required';

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
            const normalizedPhone = normalizeToE164(sanitizeInput(formData.phone), phoneCountry.phone_prefix, phoneCountry.phone_digits ?? undefined);

            if (!normalizedPhone) {
                showToast('Enter a valid phone number for the selected country.', 'error');
                setIsSubmitting(false);
                onSubmittingChange?.(false);
                return;
            }

            if (isEditing) {
                const { error: profileError } = await supabase
                    .schema('api')
                    .from('v1_profiles')
                    .update({
                        full_name: sanitizedName,
                        email: sanitizedEmail,
                        phone_number: normalizedPhone,
                        role: formData.role,
                        status: formData.status,
                        country_code: formData.countryCode
                    })
                    .eq('id', formData.id);
                
                if (profileError) throw profileError;

                // Update KYC Tier via identity_verifications
                // We need to find the primary account first
                const { data: memberData } = await supabase
                    .schema('api')
                    .from('v1_account_memberships')
                    .select('account_id')
                    .eq('user_id', formData.id)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (memberData?.account_id) {
                    // Upsert semantics (one row per account/tier) live in the RPC.
                    await supabase.schema('api').rpc('admin_upsert_identity_verification', {
                        p_account_id: memberData.account_id,
                        p_kyc_tier: formData.kycTier,
                        p_status: 'approved'
                    });
                }

                showToast('Account updated successfully!', 'success');
            } else {
                const { data: userId, error: createError } = await supabase.schema('api').rpc('admin_create_user', {
                    p_phone: normalizedPhone,
                    p_email: sanitizedEmail,
                    p_full_name: sanitizedName,
                    p_user_name: sanitizedName.split(' ')[0].toLowerCase() + Math.floor(Math.random()*100),
                    p_account_type: formData.role,
                    p_country_code: formData.countryCode
                });
                
                if (createError) throw createError;

                // Set initial KYC tier via identity_verifications
                const { data: memberData } = await supabase
                    .schema('api')
                    .from('v1_account_memberships')
                    .select('account_id')
                    .eq('user_id', userId)
                    .eq('is_primary', true)
                    .maybeSingle();

                if (memberData?.account_id) {
                    await supabase.schema('api').rpc('admin_upsert_identity_verification', {
                        p_account_id: memberData.account_id,
                        p_kyc_tier: formData.kycTier,
                        p_status: 'approved'
                    });
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
                        <label className={styles.label}>Phone Number</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <CountryPhoneSelect
                                value={phoneCountry.code}
                                onChange={setPhoneCountry}
                                className={styles.select}
                                disabled={isEditing}
                            />
                            <input
                                type="tel"
                                name="phone"
                                className={getInputClass('phone', styles.input)}
                                placeholder="712345678"
                                value={formData.phone}
                                onChange={handleInputChange}
                                required
                                disabled={isEditing}
                                style={{ flex: 1 }}
                            />
                        </div>
                        {renderValidationHint('phone')}
                        {!isEditing && (
                            <div className="validation-hint info" style={{ marginTop: '4px', opacity: 0.7, fontSize: '0.85em' }}>
                                Primary identifier — an existing user with this number will be reused instead of creating a duplicate.
                            </div>
                        )}
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Email Address (optional)</label>
                        <input
                            type="email"
                            name="email"
                            className={getInputClass('email', styles.input)}
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={handleInputChange}
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
                            <option value="attendee">Attendee</option>
                            <option value="organizer">Organizer</option>
                            <option value="advertiser">Advertiser</option>
                            <option value="platform">Platform Admin</option>
                            <option value="system">System Admin</option>
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
