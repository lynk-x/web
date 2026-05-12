"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '../admin/page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import TableToolbar from '@/components/shared/TableToolbar';

/**
 * Market Pulse: Independent Market Intelligence Dashboard.
 * 
 * Provides deep insights into market trends, audience demographics, 
 * and competitive intelligence. Designed as a standalone product module.
 */
export function PulseDashboardContent({ initialTab }: { initialTab?: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState('');
    
    const activeTab = initialTab || searchParams.get('tab') || 'explorer';

    const handleTabChange = (value: string) => {
        // If we are on a sub-route, navigate back to the main pulse page with the tab
        if (pathname !== '/dashboard/pulse') {
            router.push(`/dashboard/pulse?tab=${value}`);
        } else {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', value);
            router.replace(`${pathname}?${params.toString()}`);
        }
    };

    return (
        <div className={styles.container}>
            <PageHeader 
                title="Market Pulse" 
                subtitle="High-fidelity market intelligence and predictive audience analytics." 
            />

            <div className={styles.statsGrid}>
                <StatCard 
                    label="Market Sentiment" 
                    value="Bullish" 
                    change="+12% velocity" 
                    trend="positive" 
                />
                <StatCard 
                    label="Active Trends" 
                    value="42" 
                    change="Across 8 categories" 
                    trend="neutral" 
                />
                <StatCard 
                    label="Audience Reach" 
                    value="1.2M" 
                    change="+5.4% this week" 
                    trend="positive" 
                />
                <StatCard 
                    label="Data Confidence" 
                    value="98.2%" 
                    change="High reliability" 
                    trend="positive" 
                />
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className={styles.tabs}>
                <TabsList className={adminStyles.tabsHeaderRow}>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <TabsTrigger value="explorer">Market Explorer</TabsTrigger>
                            <TabsTrigger value="audience">Audience Insights</TabsTrigger>
                            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                            <TabsTrigger value="reports">Data Reports</TabsTrigger>
                        </div>

                        <div className={adminStyles.chipsWrapper}>
                            <TableToolbar 
                                searchPlaceholder="Search intelligence..."
                                searchValue={searchTerm}
                                onSearchChange={setSearchTerm}
                            />
                        </div>
                    </TabsList>
                </Tabs>

            <div className={styles.tabContent}>
                {activeTab === 'explorer' && (
                    <div className={styles.placeholderCard}>
                        <h3>Market Explorer</h3>
                        <p>Visualizing real-time market opportunities and demand clusters.</p>
                        <div className={styles.emptyState}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: '16px' }}>
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <span>Aggregating real-time market data...</span>
                        </div>
                    </div>
                )}
                {activeTab === 'audience' && (
                    <div className={styles.placeholderCard}>
                        <h3>Audience Insights</h3>
                        <p>Deep-dive into demographic shifts and behavioral patterns.</p>
                    </div>
                )}
                {activeTab === 'trends' && (
                    <div className={styles.placeholderCard}>
                        <h3>Trend Analysis</h3>
                        <p>Predictive modeling for upcoming industry shifts.</p>
                    </div>
                )}
                {activeTab === 'reports' && (
                    <div className={styles.placeholderCard}>
                        <h3>Data Reports</h3>
                        <p>Exportable intelligence summaries for stakeholders.</p>
                    </div>
                )}
            </div>
        </div>
    );
}


