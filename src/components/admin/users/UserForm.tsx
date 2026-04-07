"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from './UserForm.module.css';
import { useRouter } from 'next/navigation';
import { sanitizeInput } from '@/utils/sanitization';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export interface UserFormData {
    id?: string;
    name: string;
    userName: string;
    email: string;
    role: 'admin' | 'organizer' | 'advertiser' | 'user';
    status: 'active' | 'suspended' | 'partially_active';
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

    const defaultData: UserFormData = {
        name: '',
        userName: '',
        email: '',
        role: 'user',
        status: 'active',
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
        // Optimization: Don't sanitize on every keystroke if it causes jumpy UI
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
                        status: formData.status === 'suspended' ? 'permanently_suspended' : (formData.status as any)
                    })
                    .eq('id', formData.id);
                if (error) throw error;
                showToast('Account updated successfully!', 'success');
            } else {
                const { data, error } = await supabase.rpc('admin_create_user', {
                    p_email: sanitizedEmail,
                    p_full_name: sanitizedName,
                    p_user_name: formData.userName || sanitizedName.split(' ')[0].toLowerCase() + Math.floor(Math.random()*100),
                    p_role: formData.role
                });
                if (error) throw error;
                showToast('User account created!', 'success');
            }
            
            onDirtyChange?.(false);
            router.push('/dashboard/admin/users');
        } catch (err: any) {
            showToast(err.message || 'Action failed', 'error');
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
                        <label className={styles.label}>Username (Optional)</label>
                        <input
                            type="text"
                            name="userName"
                            className={styles.input}
                            placeholder="jdoe24"
                            value={formData.userName}
                            onChange={handleInputChange}
                        />
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
                        <label className={styles.label}>Admin: Assigned Role</label>
                        <select
                            name="role"
                            className={styles.select}
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="user">Platform Attendee</option>
                            <option value="organizer">Verified Organizer</option>
                            <option value="advertiser">Ad Partner</option>
                            <option value="admin">Platform Admin</option>
                        </select>
                    </div>

                    {!isEditing && (
                        <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                            <div className="validation-hint info" style={{ padding: '8px', border: '1px solid currentColor', borderRadius: '8px', opacity: 0.8 }}>
                                Note: This user will be invited to set their password via the platform's authentication gateway.
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
                            {isSubmitting ? 'Processing...' : (isEditing ? 'Save Changes' : 'Create User')}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
