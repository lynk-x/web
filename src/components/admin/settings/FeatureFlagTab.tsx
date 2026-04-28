"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export interface FeatureFlag {
    key: string;
    is_enabled: boolean;
    description: string;
    platforms: string[];
    rollout_percent: number;
    updated_at: string;
}

export default function FeatureFlagTab() {
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchFlags = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('feature_flags')
                .select('*')
                .order('key', { ascending: true });

            if (error) throw error;
            setFlags(data || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to fetch feature flags', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchFlags();
    }, [fetchFlags]);

    const handleToggleFlag = async (key: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('feature_flags')
                .update({ is_enabled: !currentValue, updated_at: new Date().toISOString() })
                .eq('key', key);

            if (error) throw error;

            // Optimistic update
            setFlags(prev => prev.map(f =>
                f.key === key ? { ...f, is_enabled: !currentValue } : f
            ));

            showToast(`Feature "${key}" ${!currentValue ? 'turned ON' : 'turned OFF'}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update feature flag', 'error');
        }
    };

    const filteredFlags = flags.filter(flag =>
        flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flag.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredFlags.length / itemsPerPage);
    const paginatedFlags = filteredFlags.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getPlatformBadge = (platform: string): BadgeVariant => {
        switch (platform) {
            case 'web': return 'info';
            case 'ios': return 'neutral';
            case 'android': return 'success';
            default: return 'subtle';
        }
    };

    const columns: Column<FeatureFlag>[] = [
        {
            header: 'Flag Key',
            render: (flag) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'monospace' }}>{flag.key}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{flag.description}</div>
                </div>
            )
        },
        {
            header: 'Rollout',
            render: (flag) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${flag.rollout_percent}%`, height: '100%', background: 'var(--color-brand-primary)' }} />
                    </div>
                    <span style={{ fontSize: '12px' }}>{flag.rollout_percent}%</span>
                </div>
            )
        },
        {
            header: 'Platforms',
            render: (flag) => (
                <div style={{ display: 'flex', gap: '4px' }}>
                    {flag.platforms.map(p => (
                        <Badge key={p} label={p} variant={getPlatformBadge(p)} />
                    ))}
                </div>
            )
        },
        {
            header: 'Regions',
            render: (flag) => {
                const regions = (flag as any).allowed_regions as string[] | undefined;
                if (!regions || regions.length === 0) {
                    return <span style={{ fontSize: '12px', opacity: 0.4 }}>All</span>;
                }
                return (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {regions.map(r => <Badge key={r} label={r} variant="subtle" />)}
                    </div>
                );
            }
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (flag) => (
                <Toggle
                    enabled={flag.is_enabled}
                    onChange={() => handleToggleFlag(flag.key, flag.is_enabled)}
                />
            )
        }
    ];

    const getRowActions = (flag: FeatureFlag): ActionItem[] => [
        {
            label: 'Edit Configuration',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/settings/feature-flags/edit/${encodeURIComponent(flag.key)}`),
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <TableToolbar
                searchPlaceholder="Search feature flags..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/settings/feature-flags/create')}>
                    Create Flag
                </button>
            </TableToolbar>

            <DataTable<any>
                data={paginatedFlags.map(f => ({ ...f, id: f.key }))}
                columns={columns}
                getActions={getRowActions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
            />
        </div>
    );
}
