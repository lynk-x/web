"use client";

import React, { useState, useEffect } from 'react';
import styles from './UserForm.module.css';
import { useRouter } from 'next/navigation';

export interface UserFormData {
    id?: string;
    name: string;
    email: string;
    role: 'admin' | 'organizer' | 'advertiser' | 'user';
    status: 'active' | 'suspended' | 'partially_active';
    bio?: string;
}

interface UserFormProps {
    initialData?: UserFormData;
    isEditing?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
}

export default function UserForm({ initialData, isEditing = false, onDirtyChange }: UserFormProps) {
    const router = useRouter();
    const defaultData: UserFormData = {
        name: '',
        email: '',
        role: 'user',
        status: 'active',
        bio: ''
    };

    const [formData, setFormData] = useState<UserFormData>(initialData || defaultData);
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Dirty Check
    useEffect(() => {
        const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData || defaultData);
        onDirtyChange?.(isDirty);

        if (isDirty) {
            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        }
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
        const isValid = name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') : !!value;
        return `${baseClass} ${isValid ? 'input-success' : 'input-error'}`;
    };

    const renderValidationHint = (name: keyof UserFormData) => {
        if (!touched[name as string]) return null;
        const value = formData[name];
        const isValid = name === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '') : !!value;
        const label = name === 'email' && value && !isValid ? 'Invalid Email' : 'Required';

        return isValid ? (
            <div className="validation-hint success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Valid
            </div>
        ) : (
            <div className="validation-hint error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {label}
            </div>
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(isEditing ? 'Updating user:' : 'Creating user:', formData);
        onDirtyChange?.(false);
        // Simulate success
        router.push('/dashboard/admin/users');
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
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
                        <label className={styles.label}>Role</label>
                        <select
                            name="role"
                            className={styles.select}
                            value={formData.role}
                            onChange={handleInputChange}
                            required
                        >
                            <option value="user">User</option>
                            <option value="organizer">Organizer</option>
                            <option value="advertiser">Advertiser</option>
                            <option value="admin">Admin</option>
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
                            <option value="active">Active</option>
                            <option value="partially_active">Partially Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                        <label className={styles.label}>Bio / Internal Notes</label>
                        <textarea
                            name="bio"
                            className={styles.textarea}
                            placeholder="Tell us a bit about this user or add internal notes..."
                            value={formData.bio}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className={styles.actions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isEditing ? 'Save Changes' : 'Create User'}
                    </button>
                </div>
            </form>
        </div>
    );
}
