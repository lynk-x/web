"use client";

import styles from './page.module.css';
import TrendChart from '@/components/pulse/TrendChart';
import Badge from '@/components/shared/Badge';

export default function TrendsAnalysis({ overviewData }: { overviewData: any }) {
    return (
        <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
            <div className={styles.dashboardGrid}>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Intent Velocity Trend</h4>
                    <TrendChart 
                        data={[
                            { date: '2026-05-01', volume: 65 },
                            { date: '2026-05-02', volume: 72 },
                            { date: '2026-05-03', volume: 68 },
                            { date: '2026-05-04', volume: 85 },
                            { date: '2026-05-05', volume: 78 },
                            { date: '2026-05-12', volume: overviewData?.stats?.intent_velocity || 78.5 },
                        ]} 
                    />
                </div>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Key Intelligence Highlights</h4>
                    <div className={styles.trendsList}>
                        <div className={styles.trendRow}>
                            <div className={styles.trendInfo}>
                                <span className={styles.trendName}>Global Sentiment</span>
                                <span className={styles.trendMeta}>Average across all categories</span>
                            </div>
                            <Badge label={`${((overviewData?.stats?.global_sentiment || 0.42) * 100).toFixed(1)}%`} variant="success" />
                        </div>
                        <div className={styles.trendRow}>
                            <div className={styles.trendInfo}>
                                <span className={styles.trendName}>Market Velocity</span>
                                <span className={styles.trendMeta}>Normalized growth rate</span>
                            </div>
                            <span className={styles.valueText}>+{overviewData?.stats?.velocity_trend || '5.2'}%</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.card} style={{ marginTop: 'var(--spacing-xl)' }}>
                <h4 className={styles.sectionTitle}>Long-term Trend Projections</h4>
                <TrendChart 
                    data={[
                        { date: '2026-01-01', volume: 400 },
                        { date: '2026-02-01', volume: 450 },
                        { date: '2026-03-01', volume: 380 },
                        { date: '2026-04-01', volume: 520 },
                        { date: '2026-05-01', volume: 610 },
                    ]} 
                />
            </div>
        </div>
    );
}
