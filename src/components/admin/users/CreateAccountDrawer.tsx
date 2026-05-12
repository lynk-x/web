"use client";

import React, { useState } from 'react';
import styles from './AccountMembersDrawer.module.css'; // Reusing styles for consistency
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface CreateAccountDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateAccountDrawer({ isOpen, onClose, onSuccess }: CreateAccountDrawerProps) {
    const supabase = createClient();
    const { showToast } = useToast();
    
    const [formData, setFormData] = useState({
        display_name: '',
        type: 'organizer',
        owner_email: '',
        country_code: 'KE',
        status: 'active'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data, error } = await supabase.rpc('admin_create_account', {
                p_display_name: formData.display_name,
                p_type: formData.type,
                p_owner_email: formData.owner_email,
                p_country_code: formData.country_code,
                p_status: formData.status
            });

            if (error) throw error;

            showToast('Account created successfully', 'success');
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                display_name: '',
                type: 'organizer',
                owner_email: '',
                country_code: 'KE',
                status: 'active'
            });
        } catch (err: any) {
            showToast(err.message || 'Failed to create account', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>Create New Account</h2>
                        <span className={styles.subtitle}>Register a new organization or individual entity</span>
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
                            <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Organization Name</label>
                            <input 
                                type="text"
                                required
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="e.g. Acme Corporation"
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
                            <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Primary Owner Email</label>
                            <input 
                                type="email"
                                required
                                value={formData.owner_email}
                                onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                                placeholder="owner@example.com"
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--color-interface-outline)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}
                            />
                            <span style={{ fontSize: '11px', opacity: 0.5 }}>Account will be linked if this user exists.</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Account Type</label>
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
                                    <option value="organizer">Organizer</option>
                                    <option value="advertiser">Advertiser</option>
                                    <option value="attendee">Attendee</option>
                                    <option value="pulse_user">Pulse User</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Country</label>
                                <select 
                                    value={formData.country_code}
                                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                    style={{ 
                                        padding: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid var(--color-interface-outline)',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white'
                                    }}
                                >
                                    <option value="KE">Kenya</option>
                                    <option value="UG">Uganda</option>
                                    <option value="TZ">Tanzania</option>
                                    <option value="RW">Rwanda</option>
                                    <option value="US">United States</option>
                                    <option value="GB">United Kingdom</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.7 }}>Initial Status</label>
                            <select 
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid var(--color-interface-outline)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: 'white'
                                }}
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
                            {isSubmitting ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
