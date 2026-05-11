"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { formatString, formatDate } from '@/utils/format';
import type { SystemJob } from '@/types/admin';
import TableToolbar from '@/components/shared/TableToolbar';
import StatusFilterChips from '@/components/shared/StatusFilterChips';

const SystemJobsTab: React.FC = () => {
    const supabase = createClient();
    const { showToast } = useToast();
    
    const [jobs, setJobs] = useState<SystemJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const itemsPerPage = 50;

    const fetchJobs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_system_jobs', {
                p_params: {
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage
                }
            });

            if (error) throw error;

            setJobs(data.jobs || []);
            setTotalCount(data.total_count || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load system jobs', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, statusFilter, currentPage]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleAction = async (id: string, action: string) => {
        try {
            const { error } = await supabase.rpc('admin_manage_system_job', {
                p_action: action,
                p_id: id
            });

            if (error) throw error;

            showToast(`Job ${action}ed successfully`, 'success');
            fetchJobs();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || `Failed to ${action} job`, 'error');
        }
    };

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'completed': return 'success';
            case 'queued': return 'warning';
            case 'running': return 'primary';
            case 'failed': return 'error';
            case 'cancelled': return 'neutral';
            default: return 'neutral';
        }
    };

    const columns: Column<SystemJob>[] = [
        {
            header: 'Job ID',
            render: (j) => <code style={{ fontSize: '12px', opacity: 0.8 }}>{j.id.slice(0, 8)}</code>,
        },
        {
            header: 'Queue',
            render: (j) => <span style={{ fontWeight: 600 }}>{formatString(j.queue_name)}</span>,
        },
        {
            header: 'Status',
            render: (j) => <Badge label={formatString(j.status)} variant={getStatusVariant(j.status)} showDot />,
        },
        {
            header: 'Retries',
            render: (j) => <span style={{ opacity: 0.6 }}>{j.retry_count} / {j.max_retries}</span>,
        },
        {
            header: 'Payload',
            render: (j) => (
                <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', opacity: 0.6 }}>
                    {JSON.stringify(j.payload)}
                </div>
            ),
        },
        {
            header: 'Created',
            render: (j) => formatDate(j.created_at),
        },
    ];

    return (
        <div>
            <TableToolbar searchPlaceholder="Search jobs...">
                <StatusFilterChips
                    options={[
                        { value: 'all', label: 'All Jobs' },
                        { value: 'queued', label: 'Queued' },
                        { value: 'running', label: 'Running' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'failed', label: 'Failed' },
                    ]}
                    currentValue={statusFilter}
                    onChange={(val) => {
                        setStatusFilter(val);
                        setCurrentPage(1);
                    }}
                />
            </TableToolbar>

            <DataTable<SystemJob>
                data={jobs}
                columns={columns}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                onPageChange={setCurrentPage}
                emptyMessage="No system jobs found."
                getActions={(j) => [
                    {
                        label: 'Retry Job',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>,
                        onClick: () => handleAction(j.id, 'retry'),
                        disabled: j.status === 'completed' || j.status === 'running'
                    },
                    {
                        label: 'Cancel Job',
                        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>,
                        variant: 'danger',
                        onClick: () => handleAction(j.id, 'cancel'),
                        disabled: j.status === 'completed' || j.status === 'cancelled'
                    }
                ]}
            />
        </div>
    );
};

export default SystemJobsTab;
