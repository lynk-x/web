"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import AuditTable, { AuditLog } from '@/components/admin/audit/AuditTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import StatusFilterChips from '@/components/shared/FilterChips';
import SystemJobsTab from '@/components/admin/audit/SystemJobsTab';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import DateRangeRow from '@/components/shared/DateRangeRow';



export default function AdminAuditLogsPage() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [jobStatusFilter, setJobStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('audit');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [stats, setStats] = useState<any>(null);
    const itemsPerPage = 20;

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_audit_logs', {
                p_params: {
                    action: actionFilter,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage,
                    from: startDate ? new Date(startDate).toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    to: endDate ? new Date(endDate).toISOString() : new Date().toISOString()
                }
            });

            if (error) throw error;

            const logsData = data.logs || [];
            setLogs(logsData.map((l: any) => ({
                id: l.id,
                action: l.action,
                actor: {
                    name: l.actor?.full_name || l.actor?.user_name || 'System',
                    email: l.actor?.email || 'N/A'
                },
                target: l.target_id?.slice(0, 8) || 'N/A',
                targetType: l.target_type || 'Unknown',
                timestamp: new Date(l.created_at).toLocaleString(),
                // Map changes if old_value/new_value are present, otherwise use details
                changes: (l.details?.old_value || l.details?.new_value) ? {
                    [l.target_type || 'object']: { 
                        old: l.details.old_value, 
                        new: l.details.new_value 
                    }
                } : undefined,
                details: l.details ? JSON.stringify(l.details, null, 2) : undefined
            })));

            setTotalCount(data.total_count || 0);

            // Populate action-type filter dropdown from a distinct RPC or a one-time fetch
            const { data: actions } = await supabase.rpc('get_unique_audit_actions');
            if (actions) {
                setActionTypes(actions);
            }
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load logs', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, actionFilter, currentPage, startDate, endDate]);

    const fetchStats = useCallback(async () => {
        setIsStatsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_audit_stats');
            if (error) throw error;
            setStats(data);
        } catch (err: any) {
            console.error('Failed to fetch audit stats', err);
        } finally {
            setIsStatsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, actionFilter, startDate, endDate]);

    // Client-side search is applied only to the current page of results
    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        return (
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const totalPages = Math.ceil(totalCount / itemsPerPage);


    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Traceability & Operations"
                subtitle="Monitor system events, user actions, and background task health."
            />

            <div className={adminStyles.statsGrid}>
                <StatCard 
                    label="Actions (24h)" 
                    value={stats?.total_logs_24h} 
                    change="System events"
                    trend="neutral"
                    isLoading={isStatsLoading}
                />
                <StatCard 
                    label="Unique Actors" 
                    value={stats?.unique_actors_24h} 
                    change="Active admins"
                    trend="neutral"
                    isLoading={isStatsLoading}
                />
                <StatCard 
                    label="Critical Events" 
                    value={stats?.critical_events_24h} 
                    change="Deletions & config"
                    trend={stats?.critical_events_24h > 10 ? "negative" : "positive"}
                    isLoading={isStatsLoading}
                />
                <StatCard 
                    label="Failed Jobs" 
                    value={stats?.failed_jobs} 
                    change="Requires attention"
                    trend={stats?.failed_jobs > 0 ? "negative" : "positive"}
                    isLoading={isStatsLoading}
                />
            </div>

            <TableToolbar
                searchPlaceholder="Search by action, actor or target..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <DateRangeRow 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => { setStartDate(''); setEndDate(''); }}
                />
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.tabs}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="audit">System Audit Logs</TabsTrigger>
                        <TabsTrigger value="jobs">Queue Monitoring</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'audit' ? (
                            <FilterChips 
                                options={[
                                    { value: 'all', label: 'All Actions' },
                                    ...actionTypes.slice(0, 6).map(type => ({
                                        value: type,
                                        label: type.replace(/_/g, ' ')
                                    }))
                                ]}
                                currentValue={actionFilter}
                                onChange={setActionFilter}
                            />
                        ) : (
                            <FilterChips 
                                options={[
                                    { value: 'all', label: 'All Jobs' },
                                    { value: 'queued', label: 'Queued' },
                                    { value: 'running', label: 'Running' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'failed', label: 'Failed' },
                                ]}
                                currentValue={jobStatusFilter}
                                onChange={setJobStatusFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="audit">
                    <AuditTable
                        logs={filteredLogs}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="jobs">
                    <SystemJobsTab statusFilter={jobStatusFilter} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
