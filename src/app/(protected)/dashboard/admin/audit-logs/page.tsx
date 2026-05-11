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
import SystemJobsTab from '@/components/admin/audit/SystemJobsTab';



export default function AdminAuditLogsPage() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 20;

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_audit_logs', {
                p_params: {
                    action: actionFilter,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage,
                    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    to: new Date().toISOString()
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
    }, [supabase, showToast, actionFilter, currentPage]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, actionFilter]);

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
            <header className={adminStyles.header}>
                <div>
                    <h1 className={adminStyles.title}>Traceability & Operations</h1>
                    <p className={adminStyles.subtitle}>Monitor system events, user actions, and background task health.</p>
                </div>
            </header>

            <Tabs defaultValue="audit" className={adminStyles.tabs}>
                <TabsList className={adminStyles.tabsList}>
                    <TabsTrigger value="audit">System Audit Logs</TabsTrigger>
                    <TabsTrigger value="jobs">Queue Monitoring</TabsTrigger>
                </TabsList>

                <TabsContent value="audit">
                    <TableToolbar
                        searchPlaceholder="Search by action, actor or target..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        <div className={adminStyles.filterGroup}>
                            <select
                                className={adminStyles.filterSelect}
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                            >
                                <option value="all">All Actions</option>
                                {actionTypes.map(type => (
                                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </TableToolbar>

                    <AuditTable
                        logs={filteredLogs}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </TabsContent>

                <TabsContent value="jobs">
                    <SystemJobsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
