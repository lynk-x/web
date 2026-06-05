"use client";

import { use, useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import BackButton from '@/components/shared/BackButton';
import PageHeader from '@/components/dashboard/PageHeader';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';

export default function CampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [campaignTitle, setCampaignTitle] = useState('Campaign');

    const fetchAnalytics = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            // Get Campaign Title
            const { data: campaignData } = await supabase
                .schema('advertising' as any)
                .from('campaigns')
                .select('title')
                .eq('id', id)
                .eq('account_id', activeAccount.id)
                .single();
                
            if (campaignData) setCampaignTitle(campaignData.title);

            // Fetch timeseries for this campaign (defaulting to last 30 days)
            const d = new Date();
            const endDate = d.toISOString().split('T')[0];
            d.setDate(d.getDate() - 30);
            const startDate = d.toISOString().split('T')[0];

            const { data, error } = await supabase.rpc('get_ads_performance_metrics', {
                p_account_id: activeAccount.id,
                p_start_date: startDate,
                p_end_date: endDate,
                p_campaign_id: id
            });

            if (error) throw error;

            const results = Array.isArray(data) ? data : [];
            const formatted = results.map((r: any) => {
                const date = new Date(r.day);
                const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return {
                    name: label,
                    impressions: Number(r.impressions || 0),
                    clicks: Number(r.clicks || 0),
                    sortKey: date.getTime()
                };
            });

            setPerformanceData(formatted);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to sync your performance data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, id, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchAnalytics();
            } else {
                setIsLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchAnalytics]);

    if (isLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                Loading analytics...
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '8px' }}>
                <BackButton label="Back to Analytics" />
            </div>
            <PageHeader
                title={`${campaignTitle} Performance`}
                subtitle="Detailed breakdown of your campaign metrics over the last 30 days."
            />

            <div className={sharedStyles.pageCard}>
                <h2 className={sharedStyles.sectionTitle}>Performance Over Time</h2>
                <div style={{ width: '100%', height: 400, marginTop: '16px' }}>
                    <ResponsiveContainer>
                        <AreaChart
                            data={performanceData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#20f928" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#20f928" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                            <Legend />
                            <Area type="monotone" dataKey="impressions" stroke="#20f928" fillOpacity={1} fill="url(#colorImp)" strokeWidth={2} />
                            <Area type="monotone" dataKey="clicks" stroke="rgba(255, 255, 255, 0.4)" fillOpacity={1} fill="url(#colorClick)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
