'use client';

import { getErrorMessage } from '@/utils/error';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import FilterGroup from '@/components/dashboard/FilterGroup';

export default function AudienceInsights() {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [clusters, setClusters] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        const fetchAudience = async () => {
            if (!activeAccount) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_pulse_audience_insights', {
                    p_account_id: activeAccount.id,
                    p_category_id: selectedCategory === 'all' ? null : selectedCategory
                });

                if (error) throw error;
                setClusters(data.clusters || []);
            } catch (error: unknown) {
                showToast(getErrorMessage(error) || 'Failed to sync audience insights.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        if (!isOrgLoading && activeAccount) {
            fetchAudience();
        }
    }, [activeAccount, isOrgLoading, supabase, showToast, selectedCategory]);

    return (
        <div className={sharedStyles.fadeContent}>
            <PageHeader
                title="Audience Clusters"
                subtitle="Semantic mapping of community conversations and interest depth."
            />

            <div className={styles.filterBar}>
                <FilterGroup
                    options={[
                        { value: 'all', label: 'All Clusters' },
                        { value: 'entertainment', label: 'Entertainment' },
                        { value: 'music', label: 'Music' },
                        { value: 'tech', label: 'Tech' },
                    ]}
                    currentValue={selectedCategory || 'all'}
                    onChange={setSelectedCategory}
                />
            </div>

            <div className={styles.clustersGrid}>
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className={styles.skeletonCluster} />)
                ) : (
                    clusters.map((cluster) => (
                        <div key={cluster.id} className={styles.clusterCard}>
                            <div className={styles.clusterHeader}>
                                <h3 className={styles.clusterName}>{cluster.display_name}</h3>
                                <span className={`${styles.sentiment} ${cluster.sentiment >= 0 ? styles.positive : styles.negative}`}>
                                    {(cluster.sentiment * 100).toFixed(0)}% Positivity
                                </span>
                            </div>
                            <p className={styles.description}>{cluster.description}</p>
                            
                            <div className={styles.keywords}>
                                {cluster.keywords?.map((kw: string, i: number) => (
                                    <span key={i} className={styles.keyword}>#{kw}</span>
                                ))}
                            </div>

                            <div className={styles.clusterFooter}>
                                <span className={styles.categoryId}>{cluster.category_id}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
