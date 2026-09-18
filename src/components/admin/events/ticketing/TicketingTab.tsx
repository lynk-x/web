"use client";

import { getErrorMessage } from '@/utils/error';
import React, { useEffect, useState, useMemo } from 'react';
import styles from './TicketingTab.module.css';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import StatCard from '@/components/dashboard/StatCard';
import { formatCurrency, formatRelativeTime } from '@/utils/format';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

interface TicketingTabProps {
    eventId: string;
}

export default function TicketingTab({ eventId }: TicketingTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: result, error } = await supabase.schema('api').rpc('get_admin_event_ticketing_data', {
                    p_event_id: eventId
                });
                if (error) throw error;
                setData(result);
            } catch (err: unknown) {
                showToast(getErrorMessage(err) || "Failed to load ticketing data", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (eventId) fetchData();
    }, [eventId, supabase, showToast]);

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading ticketing governance...</div>;
    if (!data) return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No ticketing data available.</div>;

    const tierColumns: Column<any>[] = [
        { header: 'Tier Name', render: (t) => <strong>{t.display_name}</strong> },
        { header: 'Price', render: (t) => formatCurrency(t.price) },
        { header: 'Sold', render: (t) => `${t.tickets_sold} / ${t.capacity}` },
        { header: 'Reserved', render: (t) => t.tickets_reserved },
        { header: 'Status', render: (t) => <Badge label={t.is_hidden ? 'Hidden' : 'Visible'} variant={t.is_hidden ? 'neutral' : 'success'} /> }
    ];

    const reservationColumns: Column<any>[] = [
        { header: 'User', render: (r) => (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>{r.user_name}</span>
                <span style={{ fontSize: '10px', opacity: 0.5 }}>{r.user_email}</span>
            </div>
        )},
        { header: 'Tier', render: (r) => r.tier_name },
        { header: 'Qty', render: (r) => r.quantity },
        { header: 'Expires', render: (r) => formatRelativeTime(r.expires_at) },
        { header: 'Created', render: (r) => new Date(r.created_at).toLocaleTimeString() }
    ];

    const listingColumns: Column<any>[] = [
        { header: 'Ref', render: (l) => <code style={{ fontSize: '11px' }}>{l.reference}</code> },
        { header: 'Seller', render: (l) => l.seller_name },
        { header: 'Tier', render: (l) => l.tier_name },
        { header: 'Price', render: (l) => formatCurrency(l.asking_price) },
        { header: 'Status', render: (l) => <Badge label={l.status.toUpperCase()} variant={l.status === 'active' ? 'success' : 'neutral'} /> }
    ];

    return (
        <div className={styles.container}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Total Capacity" value={data.stats.total_capacity} />
                <StatCard label="Total Sold" value={data.stats.total_sold} />
                <StatCard label="In Cart (Reserved)" value={data.stats.total_reserved} />
                <StatCard label="Resale Listings" value={data.stats.active_listings} />
            </div>

            <Tabs defaultValue="tiers" className={styles.subTabs}>
                <TabsList>
                    <TabsTrigger value="tiers">Inventory & Tiers</TabsTrigger>
                    <TabsTrigger value="reservations">Active Reservations</TabsTrigger>
                    <TabsTrigger value="listings">Marketplace Listings</TabsTrigger>
                </TabsList>

                <TabsContent value="tiers">
                    <DataTable data={data.tiers} columns={tierColumns} emptyMessage="No ticket tiers defined." />
                </TabsContent>

                <TabsContent value="reservations">
                    <DataTable data={data.reservations} columns={reservationColumns} emptyMessage="No active reservations." />
                </TabsContent>

                <TabsContent value="listings">
                    <DataTable data={data.listings} columns={listingColumns} emptyMessage="No resale listings found." />
                </TabsContent>
            </Tabs>
        </div>
    );
}
