"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import styles from './page.module.css';
import TrendChart from '@/components/pulse/TrendChart';
import RegionalDemandChart from '@/components/pulse/RegionalDemandChart';
import Badge from '@/components/shared/Badge';
import Spinner from '@/components/shared/Spinner';
import { createClient } from '@/utils/supabase/client';

interface TrendPoint {
    date: string;
    volume: number;
    sentiment: number;
    engagement: number;
}

interface RegionalRow {
    country_code: string;
    volume: number;
    sentiment: number;
}

/** Trend Analysis tab — 30-day volume/sentiment time series and regional demand, sourced from pulse.get_pulse_market_trends. */
export default function TrendsAnalysis({ accountId, overviewData }: { accountId: string, overviewData: any }) {
    const supabase = useMemo(() => createClient(), []);
    const [timeSeries, setTimeSeries] = useState<TrendPoint[]>([]);
    const [regionalHeat, setRegionalHeat] = useState<RegionalRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTrends = useCallback(async () => {
        if (!accountId) return;
        setIsLoading(true);
        const { data, error } = await supabase.schema('api').rpc('get_pulse_market_trends', {
            p_account_id: accountId,
            p_days: 30,
        });
        if (error) console.error('Error fetching market trends:', error);
        else {
            setTimeSeries(data?.time_series || []);
            setRegionalHeat(data?.regional_heat || []);
        }
        setIsLoading(false);
    }, [supabase, accountId]);

    useEffect(() => { fetchTrends(); }, [fetchTrends]);

    const latestSentiment = timeSeries.length ? timeSeries[timeSeries.length - 1].sentiment : overviewData?.stats?.global_sentiment;
    const velocityTrend = overviewData?.stats?.velocity_trend;

    return (
        <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
            <div className={styles.dashboardGrid}>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Volume Trend (30 days)</h4>
                    {isLoading ? (
                        <div className={styles.emptyState}><Spinner label="Loading trend data..." /></div>
                    ) : (
                        <TrendChart data={timeSeries} type="volume" />
                    )}
                </div>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Key Intelligence Highlights</h4>
                    <div className={styles.trendsList}>
                        <div className={styles.trendRow}>
                            <div className={styles.trendInfo}>
                                <span className={styles.trendName}>Latest Sentiment</span>
                                <span className={styles.trendMeta}>Most recent day, subscribed categories</span>
                            </div>
                            <Badge
                                label={typeof latestSentiment === 'number' ? `${(latestSentiment * 100).toFixed(1)}%` : '—'}
                                variant={typeof latestSentiment === 'number' ? (latestSentiment > 0.2 ? 'success' : latestSentiment < -0.2 ? 'error' : 'neutral') : 'neutral'}
                            />
                        </div>
                        <div className={styles.trendRow}>
                            <div className={styles.trendInfo}>
                                <span className={styles.trendName}>Market Velocity</span>
                                <span className={styles.trendMeta}>Normalized growth rate</span>
                            </div>
                            <span className={styles.valueText}>
                                {typeof velocityTrend === 'number' ? `${velocityTrend > 0 ? '+' : ''}${velocityTrend}%` : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: 'var(--spacing-xl)' }}>
                <h4 className={styles.sectionTitle}>Sentiment Over Time</h4>
                {isLoading ? (
                    <div className={styles.emptyState}><Spinner label="Loading trend data..." /></div>
                ) : (
                    <TrendChart data={timeSeries} type="sentiment" />
                )}
            </div>

            <div className={styles.card} style={{ marginTop: 'var(--spacing-xl)' }}>
                <h4 className={styles.sectionTitle}>Regional Demand</h4>
                {isLoading ? (
                    <div className={styles.emptyState}><Spinner label="Loading regional data..." /></div>
                ) : (
                    <RegionalDemandChart data={regionalHeat} />
                )}
            </div>
        </div>
    );
}
