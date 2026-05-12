'use client';

import { getErrorMessage } from '@/utils/error';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import FilterGroup from '@/components/dashboard/FilterGroup';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import type { PulseExplorerMapProps } from '../../../../../components/pulse/PulseExplorerMap';

// Dynamically import map to avoid SSR issues with Leaflet
const PulseExplorerMap = dynamic<PulseExplorerMapProps>(() => import('../../../../../components/pulse/PulseExplorerMap'), { 
    ssr: false,
    loading: () => <div className={styles.mapPlaceholder}>Loading Map Intelligence...</div>
});

export default function PulseExplorer() {
    const searchParams = useSearchParams();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [days, setDays] = useState(30);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const topicId = searchParams.get('topic');

    const fetchTrends = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data: trends, error } = await supabase.rpc('get_pulse_market_trends', {
                p_account_id: activeAccount.id,
                p_category_id: selectedCategory === 'all' ? null : selectedCategory,
                p_topic_id: topicId,
                p_days: days
            });

            if (error) throw error;
            setData(trends);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to fetch trend data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast, selectedCategory, topicId, days]);

    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchTrends();
        }
    }, [isOrgLoading, activeAccount, fetchTrends]);

    return (
        <div className={sharedStyles.fadeContent}>
            <PageHeader
                title="Trend Explorer"
                subtitle="Analyze geographic intent and historical growth for specific market segments."
            />

            {/* Filters */}
            <div className={styles.filterBar}>
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All Categories' },
                        { value: 'music', label: 'Music' },
                        { value: 'tech', label: 'Tech' },
                        { value: 'entertainment', label: 'Entertainment' },
                        { value: 'sports', label: 'Sports' },
                    ]}
                    currentValue={selectedCategory || 'all'}
                    onChange={setSelectedCategory}
                />

                <div className={styles.timeRange}>
                    {[7, 30, 90].map(d => (
                        <button 
                            key={d} 
                            className={`${styles.rangeBtn} ${days === d ? styles.activeRange : ''}`}
                            onClick={() => setDays(d)}
                        >
                            {d}D
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.explorerGrid}>
                {/* Map Section */}
                <div className={styles.mapContainer}>
                    <PulseExplorerMap 
                        data={data?.regional_heat || []} 
                        isLoading={isLoading} 
                    />
                </div>

                {/* Trends Section (Placeholder for Chart) */}
                <div className={styles.trendsDetail}>
                    <h3 className={styles.panelTitle}>Intent Volume Over Time</h3>
                    <div className={styles.chartPlaceholder}>
                        {/* We will implement a proper chart component next */}
                        <div className={styles.mockChart}>
                            {(() => {
                                const timeSeries = data?.time_series || [];
                                const maxVolume = Math.max(1, ...timeSeries.map((p: any) => p.volume || 0));
                                return timeSeries.map((point: any, i: number) => (
                                    <div 
                                        key={i} 
                                        className={styles.chartBar} 
                                        style={{ height: `${Math.max(5, (point.volume / maxVolume) * 100)}%` }}
                                        title={`${point.date}: ${point.volume} interactions`}
                                    />
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
