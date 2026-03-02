"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import AuditTable, { AuditLog } from '@/components/admin/audit/AuditTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';

export default function OrganizerAuditLogsPage() {
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchLogs = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Step 1: Get all event IDs for this organization to filter logs
            const { data: myEvents } = await supabase
                .from('events')
                .select('id')
                .eq('account_id', activeAccount.id);

            const eventIds = myEvents?.map(e => e.id) || [];

            // Step 2: Fetch logs where target is an event owned by the org
            // Or log is created by a member of the org (could be added later)
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, actor:profiles!user_id(full_name, email)')
                .in('target_id', eventIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setLogs(data.map((l: any) => ({
                id: l.id,
                action: l.action,
                actor: {
                    name: l.actor?.full_name || 'System',
                    email: l.actor?.email || ''
                },
                target: l.target_id?.slice(0, 8) || 'N/A',
                targetType: l.target_type || 'Unknown',
                timestamp: new Date(l.created_at).toLocaleString(),
                details: l.details ? JSON.stringify(l.details) : undefined
            })));
        } catch (err: any) {
            showToast(err.message || "Failed to load audit logs", "error");
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        fetchLogs();

        // Optional: Real-time subscription to new logs
        const channel = supabase
            .channel('organizer_audit_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchLogs, supabase]);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Activity Audit</h1>
                    <p className={adminStyles.subtitle}>History of actions taken on your events and organization.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search by action or member..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <AuditTable
                logs={paginatedLogs}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
