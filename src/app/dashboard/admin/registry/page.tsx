"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from '../settings/page.module.css';
import adminStyles from '../page.module.css';
import TagLibraryTab from '@/components/admin/registry/TagLibraryTab';
import MappingTab from '@/components/admin/registry/MappingTab';
import DisclaimerTable from '@/components/admin/regions/DisclaimerTable';
import { createClient } from '@/utils/supabase/client';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import TableToolbar from '@/components/shared/TableToolbar';
import Tabs from '@/components/dashboard/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import PageHeader from '@/components/dashboard/PageHeader';

// ... types ...
type Tab = 'tags' | 'types' | 'logic' | 'events' | 'disclaimer';



function RegistryContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [stats, setStats] = useState({
        tags: 0,
        types: 0,
        rules: 0,
        mappings: 0
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    const fetchStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const [tagsRes, typesRes, rulesRes, eventMapRes, catMapRes] = await Promise.all([
                supabase.from('tags').select('*', { count: 'exact', head: true }),
                supabase.from('tag_types').select('*', { count: 'exact', head: true }),
                supabase.from('disclaimers').select('*', { count: 'exact', head: true }),
                supabase.from('event_tags').select('*', { count: 'exact', head: true }),
                supabase.from('category_tags').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                tags: tagsRes.count || 0,
                types: typesRes.count || 0,
                rules: rulesRes.count || 0,
                mappings: (eventMapRes.count || 0) + (catMapRes.count || 0)
            });
        } catch (err) {
            console.error('Error fetching registry stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const initialTab = (searchParams.get('tab') as string) || 'tags';
    const validTabs: Tab[] = ['tags', 'types', 'logic', 'events', 'disclaimer'];
    const [activeTab, setActiveTab] = useState<Tab>(
        (validTabs as string[]).includes(initialTab) ? initialTab as Tab : 'tags'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && (validTabs as string[]).includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };



    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Registry &amp; Disclaimers" 
                subtitle="Manage platform taxonomy, tag hierarchies, and event disclaimers." 
            />

            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Global Taxonomy" 
                    value={stats.tags} 
                    change="Platform tags"
                    isLoading={isLoadingStats} 
                />
                <StatCard 
                    label="Tag Types" 
                    value={stats.types} 
                    change="Structural categories"
                    trend="positive"
                    isLoading={isLoadingStats} 
                />
                <StatCard 
                    label="Disclaimers" 
                    value={stats.rules} 
                    change="Platform notices"
                    trend="neutral"
                    isLoading={isLoadingStats}
                />
                <StatCard 
                    label="Logical Mappings" 
                    value={stats.mappings} 
                    change="Assignments & logic"
                    isLoading={isLoadingStats}
                />
            </div>

            <Tabs
                options={[
                    { id: 'tags', label: 'Tags Registry' },
                    { id: 'types', label: 'Tag Types' },
                    { id: 'logic', label: 'Category Logic' },
                    { id: 'events', label: 'Event Mappings' },
                    { id: 'disclaimer', label: 'Disclaimers' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {activeTab === 'tags' && <TagLibraryTab forceView="tags" />}
                {activeTab === 'types' && <TagLibraryTab forceView="types" />}
                {activeTab === 'logic' && <MappingTab forceView="category" />}
                {activeTab === 'events' && <MappingTab forceView="event" />}
                {activeTab === 'disclaimer' && <DisclaimerTable />}
            </div>

        </div>
    );
}

export default function AdminRegistryPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Registry...</div>}>
            <RegistryContent />
        </Suspense>
    );
}
