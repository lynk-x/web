"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/dashboard/admin/page.module.css';
import { useToast } from '@/components/ui/Toast';
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
        platforms: ['web', 'ios', 'android']
    });

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
                        onChange={e => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        className={styles.textarea}
                        placeholder="What does this feature toggle?"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
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
            </form>
        </div>
    );
}
