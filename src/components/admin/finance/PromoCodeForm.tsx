"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo } from 'react';
import styles from './PromoCodeForm.module.css';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

export interface PromoCodeFormData {
    id?: string;
    event_id?: string; // We'll handle a single primary event for now in this form
    code: string;
    type: 'percent' | 'fixed' | 'free_entry';
    value: number;
    max_uses: number | null;
    one_per_user: boolean;
    valid_from?: string;
    valid_until?: string;
    is_active: boolean;
}

interface PromoCodeFormProps {
    initialData?: PromoCodeFormData;
    isEditing?: boolean;
}

export default function PromoCodeForm({
    initialData,
    isEditing = false,
}: PromoCodeFormProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingRefs, setIsLoadingRefs] = useState(true);
    
    // Reference data
    const [accounts, setAccounts] = useState<{id: string, display_name: string}[]>([]);
    const [events, setEvents] = useState<{id: string, title: string}[]>([]);
    const [tiers, setTiers] = useState<{id: string, display_name: string}[]>([]);

    const defaultData: PromoCodeFormData = initialData || {
        code: '',
        type: 'percent',
        value: 0,
        max_uses: null,
        one_per_user: false,
        is_active: true,
    };
    const [formData, setFormData] = useState<PromoCodeFormData>(defaultData);

    // Fetch all events for the dropdown (simplified for admin context)
    useEffect(() => {
        const fetchRefs = async () => {
            setIsLoadingRefs(true);
            try {
                const { data: eventsData, error: eventError } = await supabase
                    .from('events')
                    .select('id, title')
                    .order('title');
                if (eventError) throw eventError;
                setEvents(eventsData || []);
            } catch (err: unknown) {
                console.error('Error fetching form refs:', err);
                showToast('Failed to load events.', 'error');
            } finally {
                setIsLoadingRefs(false);
            }
        };

        fetchRefs();
    }, [supabase, showToast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let finalValue: any = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
        }

        setFormData(prev => {
            const newData = { ...prev, [name]: finalValue };
            
            if (name === 'type') {
                if (finalValue === 'free_entry') {
                    newData.value = 0;
                }
            }
            
            return newData;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setIsSubmitting(true);
        try {
            const payload = {
                code: formData.code.toUpperCase().trim(),
                type: formData.type,
                value: formData.value,
                max_uses: formData.max_uses,
                one_per_user: formData.one_per_user,
                valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
                is_active: formData.is_active,
                updated_at: new Date().toISOString()
            };

            let promoId = formData.id;

            if (isEditing && promoId) {
                const { error } = await supabase
                    .from('promo_codes')
                    .update(payload)
                    .eq('id', promoId);
                if (error) throw error;

                // Sync event junction
                await supabase.from('event_promos').delete().eq('promo_code_id', promoId);
                if (formData.event_id) {
                    await supabase.from('event_promos').insert({
                        event_id: formData.event_id,
                        promo_code_id: promoId
                    });
                }

                showToast('Promo code updated!', 'success');
            } else {
                const { data, error } = await supabase
                    .from('promo_codes')
                    .insert([{ ...payload, uses_count: 0 }])
                    .select('id')
                    .single();
                if (error) throw error;
                
                promoId = data.id;
                if (formData.event_id) {
                    await supabase.from('event_promos').insert({
                        event_id: formData.event_id,
                        promo_code_id: promoId
                    });
                }
                
                showToast('Promo code created!', 'success');
            }

            router.push('/dashboard/admin/finance?tab=promo-codes');
            router.refresh();
        } catch (error: unknown) {
            console.error('Error saving promo code:', error);
            showToast(getErrorMessage(error) || 'Failed to save promo code.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.container}>
            <div className={adminStyles.pageCard}>
                <div className={styles.grid}>
                    {/* Basic Info */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>General Settings</h3>
                        
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Promo Code (unique)</label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="SUMMER2024"
                                style={{ textTransform: 'uppercase' }}
                                required
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Discount Type</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                >
                                    <option value="percent">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount</option>
                                    <option value="free_entry">Free Entry</option>
                                </select>
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>
                                    {formData.type === 'percent' ? 'Value (%)' : 'Amount'}
                                </label>
                                <input
                                    type="number"
                                    name="value"
                                    value={formData.value}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    disabled={formData.type === 'free_entry'}
                                    min="0"
                                    step="0.01"
                                    max={formData.type === 'percent' ? '100' : undefined}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Max Uses (empty for unlimited)</label>
                                <input
                                    type="number"
                                    name="max_uses"
                                    value={formData.max_uses ?? ''}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="Unlimited"
                                    min="1"
                                />
                            </div>
                            <div className={styles.inputGroup} style={{ justifyContent: 'center', paddingTop: '28px' }}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        name="one_per_user"
                                        checked={formData.one_per_user}
                                        onChange={handleInputChange}
                                    />
                                    One per user
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Scope & Dates */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Scope & Validity</h3>
                        
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Associated Event (Optional)</label>
                            <select
                                name="event_id"
                                value={formData.event_id || ''}
                                onChange={handleInputChange}
                                className={styles.input}
                            >
                                <option value="">Global (All Events)</option>
                                {events.map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </select>
                            <p className={styles.hint}>Currently limited to one event per form. Use the junction table for bulk assignments.</p>
                        </div>

                        <div className={styles.row}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Valid From</label>
                                <input
                                    type="datetime-local"
                                    name="valid_from"
                                    value={formData.valid_from ? formData.valid_from.substring(0, 16) : ''}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Valid Until</label>
                                <input
                                    type="datetime-local"
                                    name="valid_until"
                                    value={formData.valid_until ? formData.valid_until.substring(0, 16) : ''}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup} style={{ paddingTop: '12px' }}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleInputChange}
                                />
                                Is Active
                            </label>
                        </div>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={adminStyles.btnSecondary}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={adminStyles.btnPrimary}
                    >
                        {isSubmitting ? 'Saving...' : (isEditing ? 'Update Promo Code' : 'Create Promo Code')}
                    </button>
                </div>
            </div>
        </form>
    );
}
