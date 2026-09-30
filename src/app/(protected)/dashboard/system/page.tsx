'use client';

/**
 * Global System Dashboard landing page.
 * Mirrors the Admin Overview page with high-fidelity world clocks,
 * and a 90-day event-activity heatmap calendar.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import WorldClock from '@/components/system/overview/WorldClock';
import ActivityHeatmapCalendar from '@/components/system/overview/ActivityHeatmapCalendar';
import { createClient } from '@/utils/supabase/client';

interface DayCount {
    day: string;
    count: number;
}

export default function SystemDashboardPage() {
    const supabase = useMemo(() => createClient(), []);
    const [heatmapData, setHeatmapData] = useState<DayCount[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHeatmap = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase.schema('api').rpc('get_events_daily_heatmap');
        if (!error && data) setHeatmapData(data as DayCount[]);
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="System Overview"
                subtitle="Global Platform Operations Control Room. Monitor platform health, live transactions and administer central systems."
            />

            {/* High-Fidelity World Clocks */}
            <WorldClock />

            {/* Activity Heatmap Calendar */}
            <section style={{ marginTop: '32px', marginBottom: '32px' }}>
                <h2 className={sharedStyles.sectionTitle}>Event Activity (Last 90 Days)</h2>
                <ActivityHeatmapCalendar data={heatmapData} isLoading={isLoading} />
            </section>
        </div>
    );
}
