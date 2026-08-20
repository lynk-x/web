"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
    PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { exportToCSV } from '@/utils/export';
import { formatCurrency, formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';

const TIER_COLORS = ['#20F928', '#0088FE', '#FFBB28', '#FF8042', '#a855f7'];

interface TierMeta {
    id: string;
    display_name: string;
    capacity: number;
    tickets_sold: number;
}

interface TierSlice { name: string; value: number; }
interface CheckInSlice { name: string; value: number; color: string; }

export default function EventInsightsPage() {
    const { id } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState('Event Insights');
    const [currency, setCurrency] = useState('KES');
    
    const [tiersList, setTiersList] = useState<TierMeta[]>([]);
    const [tierData, setTierData] = useState<TierSlice[]>([]);
    const [checkInData, setCheckInData] = useState<CheckInSlice[]>([]);
    const [rawTickets, setRawTickets] = useState<any[]>([]);
    const [selectedTierFilter, setSelectedTierFilter] = useState('all');

    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            // 1. Fetch Event & Tiers
            const { data: eventData, error: evErr } = await supabase
                .from('events')
                .select(`
                    id, title, starts_at, status, currency,
                    ticket_tiers(id, display_name, price, capacity, tickets_sold)
                `)
                .eq('id', id)
                .maybeSingle();

            if (evErr) throw evErr;

            if (eventData) {
                setEventTitle(eventData.title);
                setCurrency(eventData.currency || 'KES');
                const tiers = (eventData.ticket_tiers || []).map((t: any) => ({
                    id: t.id,
                    display_name: t.display_name,
                    capacity: t.capacity || 0,
                    tickets_sold: t.tickets_sold || 0,
                }));

                setTiersList(tiers);

                const slices: TierSlice[] = [];
                tiers.forEach(t => {
                    if (t.tickets_sold > 0) {
                        slices.push({ name: t.display_name, value: t.tickets_sold });
                    }
                });
                setTierData(slices);
            }

            // 2. Fetch Tickets Telemetry for Velocity Timeline & Gate Check-In Stats
            const { data: ticketsData, error: tickErr } = await supabase
                .schema('api')
                .from('v1_tickets')
                .select('id, status, created_at, redeemed_at, purchased_price, tier_name')
                .eq('event_id', id);

            if (!tickErr && ticketsData) {
                setRawTickets(ticketsData);

                let checkedInCount = 0;
                let pendingCount = 0;
                let otherCount = 0;

                ticketsData.forEach((ticket: any) => {
                    if (ticket.status === 'used' || ticket.redeemed_at) {
                        checkedInCount++;
                    } else if (ticket.status === 'valid') {
                        pendingCount++;
                    } else {
                        otherCount++;
                    }
                });

                setCheckInData([
                    { name: 'Checked In', value: checkedInCount, color: '#FF8042' },
                    { name: 'Unused / Pending', value: pendingCount, color: '#0088FE' },
                    ...(otherCount > 0 ? [{ name: 'Cancelled / Other', value: otherCount, color: '#20F928' }] : [])
                ]);
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event analytics.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Total Capacity Computation
    const totalCapacity = useMemo(() => {
        return tiersList.reduce((sum, t) => sum + (t.capacity || 0), 0);
    }, [tiersList]);

    const activeCapacityLimit = useMemo(() => {
        if (selectedTierFilter === 'all') return totalCapacity;
        const target = tiersList.find(t => t.id === selectedTierFilter);
        return target ? target.capacity : totalCapacity;
    }, [selectedTierFilter, totalCapacity, tiersList]);

    // Computed Sales Velocity Timeline Data
    const timelineData = useMemo(() => {
        if (!rawTickets.length) return [];

        const targetTierName = selectedTierFilter !== 'all' 
            ? tiersList.find(t => t.id === selectedTierFilter)?.display_name 
            : null;

        const dateMap: { [dateStr: string]: { count: number; rev: number } } = {};

        rawTickets.forEach((ticket: any) => {
            if (targetTierName && ticket.tier_name !== targetTierName) {
                return;
            }

            if (ticket.created_at) {
                const dateStr = ticket.created_at.split('T')[0];
                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = { count: 0, rev: 0 };
                }
                dateMap[dateStr].count += 1;
                dateMap[dateStr].rev += Number(ticket.purchased_price || 0);
            }
        });

        const sortedDates = Object.keys(dateMap).sort();
        let cumSold = 0;
        let cumRev = 0;

        return sortedDates.map(dStr => {
            cumSold += dateMap[dStr].count;
            cumRev += dateMap[dStr].rev;
            const formattedDate = new Date(dStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return {
                date: formattedDate,
                cumulativeSold: cumSold,
                revenue: cumRev,
            };
        });
    }, [rawTickets, selectedTierFilter, tiersList]);

    const handleExport = () => {
        showToast('Preparing export...', 'info');
        exportToCSV(
            tiersList.map(t => ({ tier: t.display_name, tickets_sold: t.tickets_sold, capacity: t.capacity })),
            `event_analytics_${id}`
        );
        showToast('Export complete.', 'success');
    };

    const attendancePercentage = useMemo(() => {
        const total = checkInData.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return 0;
        const checkedIn = checkInData.find(item => item.name === 'Checked In')?.value || 0;
        return ((checkedIn / total) * 100).toFixed(1);
    }, [checkInData]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%' }}>
                    <Spinner label="Loading event analytics..." centered />
                </div>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title={eventTitle}
                subtitle="Detailed performance metrics, sales velocity, and door telemetry."
                closeHref={`/dashboard/organize/events/${id}`}
                secondaryAction={{
                    label: 'Export Data',
                    onClick: handleExport,
                    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                }}
            />

            {/* Top Chart Row: Gate Check-In & Ticket Tier Distribution */}
            <div className={adminStyles.subPageGridBalanced}>
                {/* 1. Gate Check-In Telemetry */}
                <div className={adminStyles.pageCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className={adminStyles.sectionTitle}>Gate Check-In Telemetry</h2>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-brand-primary)' }}>
                            {attendancePercentage}% Turnout
                        </span>
                    </div>
                    {checkInData.length > 0 && checkInData.some(item => item.value > 0) ? (
                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={checkInData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {checkInData.map((entry, index) => (
                                            <Cell key={`checkin-cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ padding: '60px 0' }}>
                            <EmptyState message="No check-in telemetry available yet." />
                        </div>
                    )}
                </div>

                {/* 2. Ticket Tier Distribution */}
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Ticket Tier Distribution</h2>
                    {tierData.length > 0 ? (
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
                                            <Cell key={`tier-cell-${index}`} fill={TIER_COLORS[index % TIER_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ padding: '60px 0' }}>
                            <EmptyState message="No ticket tier sales recorded." />
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Row: Combined Sales Velocity & Capacity Target (Full Width Card) */}
            <div className={adminStyles.pageCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 className={adminStyles.sectionTitle}>Sales Velocity & Capacity Target</h2>
                        <span style={{ fontSize: '13px', opacity: 0.6 }}>
                            Cumulative sales progress toward capacity limit ({formatNumber(activeCapacityLimit)} max)
                        </span>
                    </div>
                    {tiersList.length > 0 && (
                        <select
                            className={adminStyles.select}
                            value={selectedTierFilter}
                            onChange={(e) => setSelectedTierFilter(e.target.value)}
                            style={{ width: 'auto', minWidth: '180px' }}
                        >
                            <option value="all">All Ticket Tiers</option>
                            {tiersList.map(tier => (
                                <option key={tier.id} value={tier.id}>
                                    {tier.display_name} (Cap: {formatNumber(tier.capacity)})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {timelineData.length > 0 ? (
                    <div style={{ height: '340px', width: '100%', marginTop: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSoldCombined" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-brand-primary)" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="var(--color-brand-primary)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis 
                                    stroke="rgba(255,255,255,0.3)" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false}
                                    domain={[0, (dataMax: number) => Math.max(dataMax, activeCapacityLimit > 0 ? activeCapacityLimit * 1.1 : 10)]}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-interface-surface)', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                                    formatter={(value: any, name: any) => [
                                        name === 'cumulativeSold' ? `${formatNumber(Number(value))} tickets` : formatCurrency(Number(value), currency),
                                        name === 'cumulativeSold' ? 'Tickets Sold' : 'Gross Revenue'
                                    ]}
                                />
                                {activeCapacityLimit > 0 && (
                                    <ReferenceLine
                                        y={activeCapacityLimit}
                                        stroke="var(--color-interface-error, #ef4444)"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: `Capacity Limit (${formatNumber(activeCapacityLimit)})`,
                                            fill: 'rgba(255,255,255,0.7)',
                                            fontSize: 12,
                                            position: 'top',
                                        }}
                                    />
                                )}
                                <Area 
                                    type="monotone" 
                                    dataKey="cumulativeSold" 
                                    name="cumulativeSold"
                                    stroke="var(--color-brand-primary)" 
                                    fillOpacity={1} 
                                    fill="url(#colorSoldCombined)" 
                                    strokeWidth={2} 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ padding: '60px 0' }}>
                        <EmptyState message="No sales telemetry logged for this event yet." />
                    </div>
                )}
            </div>
        </div>
    );
}


