"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    PieChart, Pie, Cell, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { formatCurrency } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';

const COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042', '#a855f7'];

interface TierSlice { name: string; value: number; }
interface TierCapacity { name: string; sold: number; capacity: number; }

export default function EventInsightsPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState('Event Insights');
    const [stats, setStats] = useState<any>({
        totalRevenue: null,
        currency: 'KES',
        ticketsSold: null,
        avgTicketPrice: null,
        totalCapacity: null,
    });
    const [tierData, setTierData] = useState<TierSlice[]>([]);
    const [capacityData, setCapacityData] = useState<TierCapacity[]>([]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const { data: eventData, error: evErr } = await supabase
                .from('events')
                .select(`
                    id, title, starts_at, status,
                    ticket_tiers(display_name, price, capacity, tickets_sold)
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

                const slices: TierSlice[] = [];
                const capData: TierCapacity[] = [];

                tiers.forEach((t: any) => {
                    const sold = t.tickets_sold || 0;
                    const cap = t.capacity || 0;
                    totalSold += sold;
                    totalRevenue += sold * (t.price || 0);
                    totalCapacity += cap;

                    if (sold > 0) slices.push({ name: t.display_name, value: sold });
                    capData.push({ name: t.display_name, sold, capacity: cap });
                });

                setTierData(slices);
                setCapacityData(capData);
                setStats({
                    totalRevenue,
                    currency: 'KES',
                    ticketsSold: totalSold,
                    avgTicketPrice: totalSold > 0 ? totalRevenue / totalSold : 0,
                    totalCapacity,
                });
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event analytics.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleExport = () => {
        showToast('Preparing export...', 'info');
        exportToCSV(
            capacityData.map(t => ({ tier: t.name, tickets_sold: t.sold, capacity: t.capacity })),
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
            />

            <div className={adminStyles.subPageGrid} style={{ marginTop: '24px' }}>
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Tier Capacity Utilization</h2>
                    <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={capacityData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Legend />
                                <Bar dataKey="sold" name="Tickets Sold" fill="#20F928" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="capacity" name="Total Capacity" fill="#333333" radius={[4, 4, 0, 0]} />
                            </BarChart>
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
