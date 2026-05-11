'use client';

import { getErrorMessage } from '@/utils/error';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import TrendingTopicCard from '@/components/pulse/TrendingTopicCard';

export default function PulseOverview() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchOverview = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                const { data: overview, error } = await supabase.rpc('get_pulse_dashboard_overview', {
                    p_account_id: activeAccount.id
                });

                if (error) throw error;
                setData(overview);
            } catch (error: unknown) {
                showToast(getErrorMessage(error) || 'Failed to sync market pulse.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading && activeAccount) {
            fetchOverview();
        }
    }, [activeAccount, isOrgLoading, supabase, showToast]);

    const stats = useMemo(() => {
        if (!data?.stats) return [
            { label: 'Intent Velocity', value: '0', change: 'Market activity' },
            { label: 'Active Topics', value: '0', change: 'Semantic clusters' },
            { label: 'Global Sentiment', value: '0', change: 'Community mood' },
            { label: 'Market Reach', value: '0', change: 'Geographic spread' },
        ];

        return [
            { 
                label: 'Intent Velocity', 
                value: `${data.stats.intent_velocity}%`, 
                change: `${data.stats.velocity_trend >= 0 ? '+' : ''}${data.stats.velocity_trend}% from yesterday`,
                trend: data.stats.velocity_trend >= 0 ? 'up' : 'down' as any
            },
            { 
                label: 'Active Topics', 
                value: data.stats.active_topics_count.toLocaleString(), 
                change: 'Monitored clusters' 
            },
            { 
                label: 'Global Sentiment', 
                value: (data.stats.global_sentiment * 100).toFixed(1) + '%', 
                change: 'Overall positivity' 
            },
            { 
                label: 'Account Tier', 
                value: (data.tier || 'Free').toUpperCase(), 
                change: 'Data access level' 
            },
        ];
    }, [data]);

    return (
        <div className={sharedStyles.fadeContent}>
            <PageHeader
                title="Market Pulse"
                subtitle="Real-time consumer intent and trending insights across the platform."
            />

            {/* Key Metrics */}
            <div className={sharedStyles.statsGrid}>
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        label={stat.label}
                        value={stat.value}
                        change={stat.change}
                        trend={stat.trend || 'neutral'}
                        isLoading={isLoading}
                    />
                ))}
            </div>

            {/* Trending Topics Grid */}
            <section style={{ marginTop: '40px' }}>
                <h2 className={sharedStyles.sectionTitle}>Global Trending Topics</h2>
                <div className={styles.trendsGrid}>
                    {isLoading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className={styles.skeletonCard} />
                        ))
                    ) : (
                        data?.trending_topics?.map((topic: any) => (
                            <TrendingTopicCard
                                key={topic.id}
                                topic={topic}
                            />
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
