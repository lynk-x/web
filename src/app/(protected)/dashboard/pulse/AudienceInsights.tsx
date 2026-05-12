"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import styles from './page.module.css';

interface AudienceCluster {
    id: string;
    display_name: string;
    description: string;
    keywords: string[];
    sentiment: number;
}

export default function AudienceInsights({ accountId }: { accountId: string }) {
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<{ clusters: AudienceCluster[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const { data: insights, error } = await supabase.rpc('get_pulse_audience_insights', {
            p_account_id: accountId
        });
        if (error) console.error("Error fetching audience insights:", error);
        else setData(insights);
        setIsLoading(false);
    }, [supabase, accountId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const columns: Column<AudienceCluster>[] = [
        { header: 'Cluster', render: (r) => <span className={styles.trendName}>{r.display_name}</span> },
        { 
            header: 'Keywords', 
            render: (r) => (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {r.keywords?.slice(0, 3).map((k: string) => (
                        <Badge key={k} label={k} variant="neutral" />
                    ))}
                </div>
            )
        },
        { 
            header: 'Sentiment', 
            render: (r) => <Badge label={`${((r.sentiment || 0) * 100).toFixed(1)}%`} variant={r.sentiment > 0 ? 'success' : 'error'} /> 
        }
    ];

    return (
        <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
            <div className={styles.dashboardGrid}>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Semantic Clusters</h4>
                    <DataTable 
                        data={data?.clusters || []}
                        isLoading={isLoading}
                        columns={columns}
                    />
                </div>
                <div className={styles.card}>
                    <h4 className={styles.sectionTitle}>Engagement Breakdown</h4>
                    <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                        <span style={{ fontSize: '13px' }}>Demographic visualization...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
