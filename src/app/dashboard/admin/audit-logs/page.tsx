"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import AuditTable, { AuditLog } from '@/components/admin/audit/AuditTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';

export default function AdminAuditLogsPage() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*, actor:profiles!user_id(full_name, email)')
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
                details: l.details ? JSON.stringify(l.details) : undefined,
                changes: l.changes
            })));
        } catch (err: any) {
            showToast(err.message || "Failed to load logs", "error");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = actionFilter === 'all' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Audit Logs</h1>
                    <p className={adminStyles.subtitle}>Track detailed system events and user actions platform-wide.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search by action, actor, or target..."
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
                        {/* Values can be made dynamic based on DB content */}
                        <option value="USER_SUSPEND">User Suspension</option>
                        <option value="REFUND_APPROVE">Refund Approved</option>
                        <option value="EVENT_EDIT">Event Edited</option>
                        <option value="TICKET_USE">Ticket Scanned</option>
                    </select>
                </div>
            </TableToolbar>

            <AuditTable
                logs={paginatedLogs}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
