"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import adminStyles from '../admin/page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/shared/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import TableToolbar from '@/components/shared/TableToolbar';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';
import Badge from '@/components/shared/Badge';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';
import ProductTour from '@/components/dashboard/ProductTour';

// ─── Extracted Components ───────────────────────────────────────────────────

import MarketExplorer from './MarketExplorer';
import AudienceInsights from './AudienceInsights';
import TrendsAnalysis from './TrendsAnalysis';

// ─── Sub-Components ─────────────────────────────────────────────────────────

function PulseOverviewTab({ accountId, overviewData }: { accountId: string, overviewData: any }) {
    return (
        <div className={styles.section}>
            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={adminStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/pulse/explorer" className={`${styles.actionCard} tour-pulse-explorer`}>
                        <span className={styles.actionLabel}>Market Explorer</span>
                    </Link>
                    <Link href="/dashboard/pulse/audience" className={`${styles.actionCard} tour-pulse-audience`}>
                        <span className={styles.actionLabel}>Audience Insights</span>
                    </Link>
                    <Link href="/dashboard/pulse/reports" className={`${styles.actionCard} tour-pulse-reports`}>
                        <span className={styles.actionLabel}>Generate Reports</span>
                    </Link>
                    <Link href="/dashboard/pulse/settings" className={`${styles.actionCard} tour-pulse-settings`}>
                        <span className={styles.actionLabel}>Configure Alerts</span>
                    </Link>
                </div>
            </section>

            {/* Spotlight Section */}
            <section className={styles.spotlightSection}>
                <SystemBannerSpotlight 
                    slides={[
                        {
                            id: 'pulse-intro',
                            title: 'Master Your Market Intelligence',
                            subtitle: 'Pulse provides high-fidelity audience tracking and predictive demand modeling for your brand.',
                            backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            ctaLabel: 'Learn More',
                            ctaHref: '/dashboard/pulse/settings',
                            badge: 'NEW'
                        },
                        {
                            id: 'pulse-audience',
                            title: 'Understand Demographic Shifts',
                            subtitle: 'Identify emerging semantic clusters and community engagement before the competition.',
                            backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            ctaLabel: 'Explore Audience',
                            ctaHref: '/dashboard/pulse/audience'
                        }
                    ]}
                />
            </section>
        </div>
    );
}

// ─── Main Content Component ───────────────────────────────────────────────────

export function PulseDashboardContent({ initialTab, hideTabs = false }: { initialTab?: string, hideTabs?: boolean }) {
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState('');
    const [overviewData, setOverviewData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    const activeTab = initialTab || searchParams.get('tab') || 'overview';

    useEffect(() => {
        if (!activeAccount) return;
        const fetchOverview = async () => {
            setIsLoadingData(true);
            const supabase = createClient();
            const { data } = await supabase.rpc('get_pulse_dashboard_overview', {
                p_account_id: activeAccount.id
            });
            setOverviewData(data);
            setIsLoadingData(false);
        };
        fetchOverview();
    }, [activeAccount]);

    const handleTabChange = (value: string) => {
        if (pathname === '/dashboard/pulse' && value === 'overview') {
            router.replace(pathname);
            return;
        }

        const targetPath = `/dashboard/pulse/${value === 'overview' ? '' : value}`;
        router.push(targetPath);
    };

    if (isOrgLoading) return <div className={styles.loading}>Initializing session...</div>;

    return (
        <div className={styles.container}>
            <PageHeader 
                title={activeAccount ? `Welcome back to Pulse dashboard, ${activeAccount.name} 👋` : 'Pulse User 👋'} 
                subtitle="Here is what is happening in the market today." 
            />

            <div className={`${styles.statsGrid} tour-pulse-stats`}>
                <StatCard 
                    label="Market Sentiment" 
                    value={overviewData?.stats?.global_sentiment ? `${(overviewData.stats.global_sentiment * 100).toFixed(1)}%` : 'Bullish'} 
                    change="+12% velocity" 
                    trend="positive" 
                    isLoading={isLoadingData}
                />
                <StatCard 
                    label="Active Topics" 
                    value={overviewData?.stats?.active_topics_count || '...'} 
                    change="Across 8 categories" 
                    trend="neutral" 
                    isLoading={isLoadingData}
                />
                <StatCard 
                    label="Intent Velocity" 
                    value={overviewData?.stats?.intent_velocity ? `${overviewData.stats.intent_velocity}%` : '78.5%'} 
                    change={`+${overviewData?.stats?.velocity_trend || '5.2'}% this week`} 
                    trend="positive" 
                    isLoading={isLoadingData}
                />
                <StatCard 
                    label="Tier Status" 
                    value={overviewData?.tier?.toUpperCase() || 'FREE'} 
                    change="Account level" 
                    trend="neutral" 
                    isLoading={isLoadingData}
                />
            </div>

            {!hideTabs && (
                <Tabs value={activeTab} onValueChange={handleTabChange} className={styles.tabs}>
                    <div className={adminStyles.tabsHeaderRow}>
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="explorer">Market Explorer</TabsTrigger>
                            <TabsTrigger value="audience">Audience Insights</TabsTrigger>
                            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
                            <TabsTrigger value="reports">Data Reports</TabsTrigger>
                        </TabsList>

                        <div className={adminStyles.chipsWrapper}>
                            <TableToolbar 
                                searchPlaceholder="Search intelligence..."
                                searchValue={searchTerm}
                                onSearchChange={setSearchTerm}
                            />
                        </div>
                    </div>
                </Tabs>
            )}

            <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                    <PulseOverviewTab accountId={activeAccount?.id || ''} overviewData={overviewData} />
                )}
                {activeTab === 'explorer' && (
                    <MarketExplorer accountId={activeAccount?.id || ''} searchTerm={searchTerm} />
                )}
                {activeTab === 'audience' && (
                    <AudienceInsights accountId={activeAccount?.id || ''} />
                )}
                {activeTab === 'trends' && (
                    <TrendsAnalysis overviewData={overviewData} />
                )}
                {activeTab === 'reports' && (
                    <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
                        <div className={styles.placeholderCard}>
                            <h3>Intelligence Reports</h3>
                            <p>Generate and export comprehensive market intelligence summaries.</p>
                            <div style={{ marginTop: '20px' }}>
                                <Badge label="New" variant="success" showDot />
                                <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                    Weekly Market Recap (May 2026) is now available.
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ProductTour
                storageKey={activeAccount ? `hasSeenPulseJoyride_${activeAccount.id}` : 'hasSeenPulseJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Pulse Intelligence',
                        content: 'Welcome to your Market Pulse command center. This dashboard provides high-fidelity intelligence on market trends and audience intent.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-pulse-stats',
                        title: 'Real-time Metrics',
                        content: 'Monitor global sentiment, topic volume, and market velocity in real-time.',
                    },
                    {
                        target: '.tour-pulse-explorer',
                        title: 'Deep Exploration',
                        content: 'Dive deep into specific topics and track their performance across the platform.',
                    },
                    {
                        target: '.tour-pulse-audience',
                        title: 'Audience Clusters',
                        content: 'Identify emerging interest groups and map their engagement behavior.',
                    }
                ]}
            />
        </div>
    );
}
