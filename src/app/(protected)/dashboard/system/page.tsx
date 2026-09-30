'use client';

/**
 * Global System Dashboard landing page.
 * Mirrors the Admin Overview page with high-fidelity world clocks,
 * a system-health tile grid, and a 48h activity sparkline strip.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import WorldClock from '@/components/system/overview/WorldClock';
import SystemPulseTiles from '@/components/system/overview/SystemPulseTiles';
import ActivitySparklines from '@/components/system/overview/ActivitySparklines';
import { createClient } from '@/utils/supabase/client';

interface SystemPulse {
    tiles: {
        payment_failure_rate_pct: number;
        open_reports: number;
        dead_letters_24h: number;
        max_toxicity: number;
        kyc_pending: number;
        active_campaigns: number;
    };
    series: Array<{
        hour: string;
        events_published: number;
        tickets_sold: number;
        reports_filed: number;
    }>;
}

export default function SystemDashboardPage() {
    const supabase = useMemo(() => createClient(), []);
    const [pulse, setPulse] = useState<SystemPulse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPulse = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.schema('api').rpc('get_system_pulse');
        if (!error && data) setPulse(data as SystemPulse);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => { fetchPulse(); }, [fetchPulse]);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="System Overview"
                subtitle="Global Platform Operations Control Room. Monitor platform health, live transactions and administer central systems."
            />

            {/* High-Fidelity World Clocks */}
            <WorldClock />

            {/* System Health Tiles */}
            <section style={{ marginTop: '32px' }}>
                <h2 className={sharedStyles.sectionTitle}>System Health</h2>
                <SystemPulseTiles data={pulse?.tiles ?? null} isLoading={isLoading} />
            </section>

            {/* Activity Sparklines */}
            <section style={{ marginTop: '32px', marginBottom: '32px' }}>
                <h2 className={sharedStyles.sectionTitle}>Activity (Last 48h)</h2>
                <ActivitySparklines series={pulse?.series ?? []} isLoading={isLoading} />
            </section>
        </div>
    );
}
