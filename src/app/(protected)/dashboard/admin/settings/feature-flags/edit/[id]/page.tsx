"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from '@/app/(protected)/dashboard/admin/page.module.css';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { createClient } from '@/utils/supabase/client';

export default function EditFeatureFlagPage() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const supabase = createClient();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const [formData, setFormData] = useState({
        key: '',
        description: '',
        is_enabled: false,
        rollout_percent: 100,
        platforms: ['web', 'ios', 'android'] as string[],
        allowed_regions: [] as string[],
    });
    const [regionInput, setRegionInput] = useState('');

    const fetchFlag = useCallback(async () => {
        if (!params.id) return;
        setIsFetching(true);
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('*')
                .eq('key', decodeURIComponent(params.id as string))
                .single();

            if (error) throw error;
            if (data) {
                setFormData({
                    key: data.key,
                    description: data.description || '',
                    is_enabled: data.is_enabled,
                    rollout_percent: data.rollout_percent,
                    platforms: data.platforms || [],
                    allowed_regions: data.allowed_regions || [],
                });
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to fetch feature flag', 'error');
        } finally {
            setIsFetching(false);
        }
    }, [params.id, supabase, showToast]);

    useEffect(() => {
        fetchFlag();
    }, [fetchFlag]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await supabase
                .from('feature_flags')
                .update({
                    description: formData.description,
                    rollout_percent: formData.rollout_percent,
                    platforms: formData.platforms,
                    allowed_regions: formData.allowed_regions,
                    updated_at: new Date().toISOString()
                })
                .eq('key', formData.key);

            if (error) throw error;

            showToast('Feature flag updated successfully', 'success');
            router.push('/dashboard/admin/settings');
            router.refresh();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update feature flag', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlatform = (platform: string) => {
        setFormData(prev => ({
            ...prev,
            platforms: prev.platforms.includes(platform)
                ? prev.platforms.filter(p => p !== platform)
                : [...prev.platforms, platform]
        }));
    };

    const addRegion = () => {
        const code = regionInput.trim().toUpperCase();
        if (code.length !== 2 || formData.allowed_regions.includes(code)) return;
        setFormData(prev => ({ ...prev, allowed_regions: [...prev.allowed_regions, code] }));
        setRegionInput('');
    };

    const removeRegion = (code: string) => {
        setFormData(prev => ({ ...prev, allowed_regions: prev.allowed_regions.filter(r => r !== code) }));
    };

    if (isFetching) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                <svg className={styles.spinner} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Edit Feature Flag"
                subtitle={`Modify deployment rules for ${formData.key}`}
                primaryAction={{
                    label: 'Save Changes',
                    onClick: handleSubmit,
                    isLoading: isLoading
                }}
            />

            <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Flag Key (Read-only)</label>
                    <input
                        className={styles.input}
                        value={formData.key}
                        disabled
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        className={styles.textarea}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: sanitizeInput(e.target.value) })}
                        rows={4}
                    />
                </div>

                <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Rollout Percentage (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className={styles.input}
                            value={formData.rollout_percent}
                            onChange={e => setFormData({ ...formData, rollout_percent: parseInt(e.target.value) || 0 })}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Platforms</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            {['web', 'ios', 'android'].map(platform => (
                                <button
                                    key={platform}
                                    type="button"
                                    className={formData.platforms.includes(platform) ? styles.chipActive : styles.chip}
                                    onClick={() => togglePlatform(platform)}
                                >
                                    {platform.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Allowed Regions</label>
                    <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>
                        ISO 3166-1 alpha-2 codes (e.g. KE, NG, ZA). Leave empty to allow all regions.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            className={styles.input}
                            placeholder="e.g. KE"
                            maxLength={2}
                            value={regionInput}
                            onChange={e => setRegionInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRegion(); } }}
                            style={{ maxWidth: '120px' }}
                        />
                        <button type="button" className={styles.chip} onClick={addRegion}>Add</button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {formData.allowed_regions.map(code => (
                            <span key={code} className={styles.chipActive} style={{ cursor: 'pointer' }} onClick={() => removeRegion(code)}>
                                {code} ✕
                            </span>
                        ))}
                        {formData.allowed_regions.length === 0 && (
                            <span style={{ fontSize: '12px', opacity: 0.4 }}>All regions</span>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
