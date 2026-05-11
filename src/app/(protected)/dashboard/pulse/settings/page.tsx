'use client';

import { getErrorMessage } from '@/utils/error';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function PulseSettings() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_pulse_account_settings', {
                    p_account_id: activeAccount.id
                });

                if (error) throw error;
                setSettings(data);
            } catch (error: unknown) {
                showToast(getErrorMessage(error) || 'Failed to sync settings.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading && activeAccount) {
            fetchSettings();
        }
    }, [activeAccount, isOrgLoading, supabase, showToast]);

    const tier = settings?.subscription?.tier || 'free';

    return (
        <div className={sharedStyles.fadeContent}>
            <PageHeader
                title="Pulse Settings"
                subtitle="Manage your market intelligence subscription and data preferences."
            />

            <div className={styles.settingsGrid}>
                {/* Subscription Section */}
                <section className={styles.settingsCard}>
                    <h3 className={styles.cardTitle}>Subscription & Tiers</h3>
                    <div className={styles.tierStatus}>
                        <div className={styles.tierInfo}>
                            <span className={styles.tierLabel}>Current Tier</span>
                            <span className={styles.tierValue}>{tier.toUpperCase()}</span>
                        </div>
                        <button className={styles.upgradeBtn}>Upgrade Access</button>
                    </div>

                    <div className={styles.tierCapabilities}>
                        <div className={`${styles.capability} ${tier === 'free' || tier === 'industry' || tier === 'global' ? styles.activeCap : ''}`}>
                            <span className={styles.capIcon}>✓</span>
                            <div className={styles.capText}>
                                <strong>Free Tier</strong>
                                <p>Top 10 global trends, 30-day retention.</p>
                            </div>
                        </div>
                        <div className={`${styles.capability} ${tier === 'industry' || tier === 'global' ? styles.activeCap : ''}`}>
                            <span className={styles.capIcon}>{tier === 'industry' || tier === 'global' ? '✓' : '🔒'}</span>
                            <div className={styles.capText}>
                                <strong>Industry Tier</strong>
                                <p>Full access to specific categories, 90-day retention.</p>
                            </div>
                        </div>
                        <div className={`${styles.capability} ${tier === 'global' ? styles.activeCap : ''}`}>
                            <span className={styles.capIcon}>{tier === 'global' ? '✓' : '🔒'}</span>
                            <div className={styles.capText}>
                                <strong>Global Tier</strong>
                                <p>Full platform access, semantic clusters, 2-year retention.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Display Preferences */}
                <section className={styles.settingsCard}>
                    <h3 className={styles.cardTitle}>Data Preferences</h3>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Default Region</label>
                        <select className={styles.select}>
                            <option>Global (All Regions)</option>
                            <option>East Africa (KE, RW, UG)</option>
                            <option>West Africa (NG, GH)</option>
                            <option>South Africa (ZA)</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Refresh Interval</label>
                        <select className={styles.select}>
                            <option>Real-time (Stream)</option>
                            <option>Hourly Aggregates</option>
                            <option>Daily Summaries</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" defaultChecked />
                            <span>Include sentiment velocity in weekly reports</span>
                        </label>
                    </div>
                </section>
            </div>
        </div>
    );
}
