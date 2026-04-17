"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/dashboard/admin/page.module.css';
import { useToast } from '@/components/ui/Toast';
import { sanitizeInput } from '@/utils/sanitization';
import SubPageHeader from '@/components/shared/SubPageHeader';
import { createClient } from '@/utils/supabase/client';

export default function CreateFeatureFlagPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        key: '',
        description: '',
        is_enabled: false,
        rollout_percent: 100,
        platforms: ['web', 'ios', 'android'],
        allowed_regions: [] as string[],
    });
    const [regionInput, setRegionInput] = useState('');

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!formData.key) {
            showToast('Flag key is required', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('feature_flags')
                .insert([{
                    key: formData.key,
                    description: formData.description,
                    is_enabled: formData.is_enabled,
                    rollout_percent: formData.rollout_percent,
                    platforms: formData.platforms,
                    allowed_regions: formData.allowed_regions,
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;

            showToast('Feature flag created successfully', 'success');
            router.push('/dashboard/admin/settings');
            router.refresh(); // Ensure the table updates
        } catch (error: any) {
            showToast(error.message || 'Failed to create feature flag', 'error');
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

    return (
        <div className={styles.container}>
            <SubPageHeader
                title="Create Feature Flag"
                subtitle="Define a new platform feature deployment rule."
                primaryAction={{
                    label: 'Create Flag',
                    onClick: handleSubmit,
                    isLoading: isLoading
                }}
            />

            <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Flag Key</label>
                    <input
                        className={styles.input}
                        placeholder="e.g. enable_new_checkout_flow"
                        value={formData.key}
                        onChange={e => setFormData({ ...formData, key: sanitizeInput(e.target.value).toLowerCase().replace(/\s+/g, '_') })}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        className={styles.textarea}
                        placeholder="What does this feature toggle?"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: sanitizeInput(e.target.value) })}
                        rows={4}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Enabled</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={formData.is_enabled}
                            onChange={e => setFormData({ ...formData, is_enabled: e.target.checked })}
                        />
                        <span style={{ fontSize: '14px' }}>Enable flag immediately after creation</span>
                    </label>
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
