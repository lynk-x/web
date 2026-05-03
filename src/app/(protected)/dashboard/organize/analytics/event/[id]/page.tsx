"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { formatCurrency } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';

const COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042', '#a855f7'];

interface DayPoint { name: string; revenue: number; }
interface TierSlice { name: string; value: number; }

export default function EventInsightsPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7d');
    const [eventTitle, setEventTitle] = useState('Event Insights');
    const [stats, setStats] = useState<any>({
        totalRevenue: null,
        currency: 'KES',
        ticketsSold: null,
        avgTicketPrice: null,
        totalCapacity: null,
    });
    const [tierData, setTierData] = useState<TierSlice[]>([]);
    const [timeSeriesData, setTimeSeriesData] = useState<DayPoint[]>([]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const { data: eventData, error: evErr } = await supabase
                .from('events')
                .select(`
                    id, title, starts_at, status,
                    ticket_tiers(name, price, capacity, tickets_sold)
                `)
                .eq('id', id)
                .maybeSingle();

            if (evErr) throw evErr;

            if (eventData) {
                setEventTitle(eventData.title);
                const tiers = eventData.ticket_tiers || [];
                let totalSold = 0;
                let totalRevenue = 0;
                let totalCapacity = 0;

                const slices: TierSlice[] = tiers.map((t: any) => {
                    const sold = t.tickets_sold || 0;
                    totalSold += sold;
                    totalRevenue += sold * (t.price || 0);
                    totalCapacity += t.capacity || 0;
                    return { name: t.name, value: sold };
                });

                setTierData(slices.filter(s => s.value > 0));
                setStats({
                    totalRevenue,
                    currency: 'KES',
                    ticketsSold: totalSold,
                    avgTicketPrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                    totalCapacity,
                });
            }

            const days = dateRange === '7d' ? 7 : 30;
            const since = new Date();
            since.setDate(since.getDate() - days);

            const { data: txData, error: txErr } = await supabase
                .schema('transactions')
                .from('transactions')
                .select('amount, created_at')
                .eq('event_id', id)
                .eq('status', 'completed')
                .eq('category', 'incoming')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true });

            if (txErr) throw txErr;

            const byDay: Record<string, number> = {};
            (txData || []).forEach((tx: any) => {
                const label = new Date(tx.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' });
                byDay[label] = (byDay[label] || 0) + Number(tx.amount);
            });

            setTimeSeriesData(Object.entries(byDay).map(([name, revenue]) => ({ name, revenue })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event analytics.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, supabase, dateRange, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleExport = () => {
        showToast('Preparing export...', 'info');
        exportToCSV(
            tierData.map(t => ({ tier: t.name, tickets_sold: t.value })),
            `event_analytics_${id}`
        );
        showToast('Export complete.', 'success');
    };

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title={eventTitle}
                subtitle="Detailed performance metrics and audience insights."
                backLabel="Back to Analytics"
                secondaryAction={{
                    label: 'Export Data',
                    onClick: handleExport,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                }}
            >
                <div className={adminStyles.filterGroup}>
                    <button
                        className={`${adminStyles.chip} ${dateRange === '7d' ? adminStyles.chipActive : ''}`}
                        onClick={() => setDateRange('7d')}
                    >Last 7 Days</button>
                    <button
                        className={`${adminStyles.chip} ${dateRange === '30d' ? adminStyles.chipActive : ''}`}
                        onClick={() => setDateRange('30d')}
                    >Last 30 Days</button>
                </div>
            </SubPageHeader>



            <div className={adminStyles.subPageGrid} style={{ marginTop: '24px' }}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Revenue Trend</h2>
                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timeSeriesData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    formatter={(v: any) => formatCurrency(v, stats.currency)}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="var(--color-brand-primary)" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Ticket Tier Distribution</h2>
                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={tierData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {tierData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
