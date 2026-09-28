"use client";

import { useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import styles from './page.module.css';

interface TrendingTopic {
    id: string;
    display_name: string;
    category_id: string;
    volume_count: number;
    sentiment_score: number;
    velocity: number;
}

/** Market Explorer tab — top trending topics table. Reuses the dashboard-overview RPC data already fetched by the parent Overview component instead of refetching it. */
export default function MarketExplorer({ overviewData, isLoading, searchTerm }: { overviewData: { trending_topics?: TrendingTopic[] } | null, isLoading: boolean, searchTerm: string }) {
    const filteredTrends = useMemo(() => {
        if (!overviewData?.trending_topics) return [];
        return overviewData.trending_topics.filter((t: TrendingTopic) =>
            t.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [overviewData, searchTerm]);

    const columns: Column<TrendingTopic>[] = [
        { 
            header: 'Topic', 
            render: (row) => (
                <div className={styles.trendInfo}>
                    <span className={styles.trendName}>{row.display_name}</span>
                    <span className={styles.trendMeta}>{row.category_id}</span>
                </div>
            )
        },
        { 
            header: 'Volume', 
            render: (row) => <span className={styles.valueText}>{row.volume_count?.toLocaleString()}</span> 
        },
        { 
            header: 'Sentiment', 
            render: (row) => {
                const score = row.sentiment_score || 0;
                const variant = score > 0.2 ? 'success' : score < -0.2 ? 'error' : 'neutral';
                return <Badge label={`${(score * 100).toFixed(1)}%`} variant={variant as any} />;
            }
        },
        { 
            header: 'Velocity', 
            render: (row) => (
                <span style={{ color: row.velocity > 0 ? 'var(--color-status-success)' : 'var(--color-status-error)', fontSize: '12px', fontWeight: 600 }}>
                    {row.velocity > 0 ? '+' : ''}{row.velocity}%
                </span>
            )
        }
    ];

    return (
        <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
            <div className={styles.card}>
                <h4 className={styles.sectionTitle}>Intelligence Explorer</h4>
                <DataTable 
                    data={filteredTrends}
                    columns={columns}
                    isLoading={isLoading}
                    emptyMessage="No intelligence data available for the current filters."
                />
            </div>
        </div>
    );
}
