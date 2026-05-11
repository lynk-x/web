"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from './page.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import WorldClock from '@/components/admin/overview/WorldClock';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

const AdminMap = dynamic(() => import('@/components/admin/overview/AdminMap'), { ssr: false });

export default function AdminDashboard() {
    const [isMounted, setIsMounted] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) setSummary(data);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        setIsMounted(true);
        fetchSummary();
    }, [fetchSummary]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Admin Overview"
                subtitle="Welcome back, Administrator. Here's what's happening today."
            />

            <WorldClock />

            {/* Map Section */}
            <section>
                <h2 className={sharedStyles.sectionTitle}>Live Activity Map</h2>
                <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden', height: '600px', position: 'relative' }}>
                    <AdminMap />
                </div>
            </section>
        </div>
    );
}
