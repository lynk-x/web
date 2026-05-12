"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import TrendChart from '@/components/pulse/TrendChart';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import SystemBannerSpotlight from '@/components/shared/SystemBannerSpotlight';

// ─── Sub-Components ─────────────────────────────────────────────────────────

function PulseOverviewTab({ accountId, overviewData }: { accountId: string, overviewData: any }) {
    return (
        <div className={styles.section}>
            {/* Quick Actions */}
            <section className={styles.quickActions}>
                <h2 className={adminStyles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <Link href="/dashboard/pulse/explorer" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Market Explorer</span>
                    </Link>
                    <Link href="/dashboard/pulse/audience" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Audience Insights</span>
                    </Link>
                    <Link href="/dashboard/pulse/reports" className={styles.actionCard}>
                        <span className={styles.actionLabel}>Generate Reports</span>
                    </Link>
                    <Link href="/dashboard/pulse/settings" className={styles.actionCard}>
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

            {/* Visual Overview */}
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
        </div>
    );
}

interface TrendingTopic {
    id: string;
    display_name: string;
    category_id: string;
    volume_count: number;
    sentiment_score: number;
    velocity: number;
}

interface AudienceCluster {
    id: string;
    display_name: string;
    description: string;
    keywords: string[];
    sentiment: number;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function MarketExplorerTab({ accountId, searchTerm }: { accountId: string, searchTerm: string }) {
    const supabase = useMemo(() => createClient(), []);
    const [data, setData] = useState<{ trending_topics: TrendingTopic[], stats: any } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const { data: overview, error } = await supabase.rpc('get_pulse_dashboard_overview', {
            p_account_id: accountId
        });
        
        if (error) console.error("Error fetching overview:", error);
        else setData(overview);
        setIsLoading(false);
    }, [supabase, accountId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredTrends = useMemo(() => {
        if (!data?.trending_topics) return [];
        return data.trending_topics.filter((t: TrendingTopic) => 
            t.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [data, searchTerm]);

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

function AudienceInsightsTab({ accountId }: { accountId: string }) {
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

// ─── Main Content Component ───────────────────────────────────────────────────

export function PulseDashboardContent({ initialTab, hideTabs = false }: { initialTab?: string, hideTabs?: boolean }) {
    const { activeAccount } = useOrganization();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [searchTerm, setSearchTerm] = useState('');
    const [overviewData, setOverviewData] = useState<any>(null);
    
    const activeTab = initialTab || searchParams.get('tab') || 'overview';

    useEffect(() => {
        if (!activeAccount) return;
        const fetchOverview = async () => {
            const supabase = createClient();
            const { data } = await supabase.rpc('get_pulse_dashboard_overview', {
                p_account_id: activeAccount.id
            });
            setOverviewData(data);
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

    if (!activeAccount) return <div className={styles.loading}>Initializing session...</div>;

    return (
        <div className={styles.container}>
            <PageHeader 
                title={activeAccount ? `Welcome back to Pulse dashboard, ${activeAccount.name} 👋` : 'Pulse User 👋'} 
                subtitle="Here is what is happening in the market today." 
            />

            <div className={styles.statsGrid}>
                <StatCard 
                    label="Market Sentiment" 
                    value={overviewData?.stats?.global_sentiment ? `${(overviewData.stats.global_sentiment * 100).toFixed(1)}%` : 'Bullish'} 
                    change="+12% velocity" 
                    trend="positive" 
                />
                <StatCard 
                    label="Active Topics" 
                    value={overviewData?.stats?.active_topics_count || '...'} 
                    change="Across 8 categories" 
                    trend="neutral" 
                />
                <StatCard 
                    label="Intent Velocity" 
                    value={overviewData?.stats?.intent_velocity ? `${overviewData.stats.intent_velocity}%` : '78.5%'} 
                    change={`+${overviewData?.stats?.velocity_trend || '5.2'}% this week`} 
                    trend="positive" 
                />
                <StatCard 
                    label="Tier Status" 
                    value={overviewData?.tier?.toUpperCase() || 'FREE'} 
                    change="Account level" 
                    trend="neutral" 
                />
            </div>

            {!hideTabs && (
                <Tabs value={activeTab} onValueChange={handleTabChange} className={styles.tabs}>
                    <TabsList className={adminStyles.tabsHeaderRow}>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
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
            )}

            <div className={styles.tabContent}>
                {activeTab === 'overview' && (
                    <PulseOverviewTab accountId={activeAccount.id} overviewData={overviewData} />
                )}
                {activeTab === 'explorer' && (
                    <MarketExplorerTab accountId={activeAccount.id} searchTerm={searchTerm} />
                )}
                {activeTab === 'audience' && (
                    <AudienceInsightsTab accountId={activeAccount.id} />
                )}
                {activeTab === 'trends' && (
                    <div className={styles.section} style={{ marginTop: 'var(--spacing-md)' }}>
                        <div className={styles.card}>
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
        </div>
    );
}
