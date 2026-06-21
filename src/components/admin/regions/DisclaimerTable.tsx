import { getErrorMessage } from '@/utils/error';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Toggle from '@/components/shared/Toggle';
import { useRouter } from 'next/navigation';

interface Disclaimer {
    id: string;
    tag_id: string;
    title: string;
    content: string;
    is_active: boolean;
    effective_date: string;
    updated_at: string;
    tags?: { name: string };
}

interface DisclaimerTableProps {
    hideToolbar?: boolean;
    searchTerm?: string;
}

export default function DisclaimerTable({ hideToolbar, searchTerm: externalSearchTerm }: DisclaimerTableProps) {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient().schema('api' as any), []);

    const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchDisclaimers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_registry_data', {
                p_tab: 'disclaimers'
            });

            if (error) throw error;
            setDisclaimers(data || []);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to load disclaimers. Please check your connection.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchDisclaimers();
    }, [fetchDisclaimers]);

    const handleToggle = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase.rpc('admin_manage_registry_item', {
                p_tab: 'disclaimers',
                p_action: 'toggle',
                p_id: id,
                p_params: { is_active: !currentValue }
            });

            if (error) throw error;
            setDisclaimers(prev => prev.map(d => d.id === id ? { ...d, is_active: !currentValue } : d));
            showToast(`Disclaimer updated successfully.`, 'success');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || `Failed to update disclaimer.`, 'error');
        }
    };

    const filtered = disclaimers.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tags?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(d => d.id)));
    };

    const columns: Column<Disclaimer>[] = [
        {
            header: 'Title',
            render: (d) => <div style={{ fontWeight: 600 }}>{d.title}</div>
        },
        {
            header: 'Target Tag',
            render: (d) => <Badge label={d.tags?.name || 'Unknown'} variant="neutral" />
        },
        {
            header: 'Preview',
            render: (d) => (
                <div style={{ maxWidth: '300px', fontSize: '13px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.content}
                </div>
            )
        },
        {
            header: 'Effective Date',
            render: (d) => <span style={{ fontSize: '13px' }}>{new Date(d.effective_date).toLocaleDateString()}</span>
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (d) => (
                <Toggle
                    enabled={d.is_active}
                    onChange={() => handleToggle(d.id, d.is_active)}
                />
            )
        }
    ];

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this disclaimer?')) return;
        try {
            const { error } = await supabase.rpc('admin_manage_registry_item', {
                p_tab: 'disclaimers',
                p_action: 'delete',
                p_id: id
            });

            if (error) throw error;
            showToast('Disclaimer deleted successfully', 'success');
            fetchDisclaimers();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to delete disclaimer', 'error');
        }
    };

    const getActions = (d: Disclaimer): ActionItem[] => [
        {
            label: 'Edit Disclaimer',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/system/registry/disclaimers/edit/${d.id}`)
        },
        {
            label: 'Delete',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => handleDelete(d.id)
        }
    ];

    const bulkActions: BulkAction[] = [
        {
            label: 'Activate Selected',
            onClick: async () => {
                const ids = Array.from(selectedIds);
                const results = await Promise.all(ids.map(id =>
                    supabase.rpc('admin_manage_registry_item', {
                        p_tab: 'disclaimers',
                        p_action: 'toggle',
                        p_id: id,
                        p_params: { is_active: true }
                    })
                ));
                const errors = results.filter(r => r.error);
                if (errors.length === 0) {
                    showToast('Activated selected disclaimers', 'success');
                    fetchDisclaimers();
                    setSelectedIds(new Set());
                } else {
                    showToast('Some updates failed', 'error');
                }
            },
            variant: 'success' as const
        },
        {
            label: 'Deactivate Selected',
            onClick: async () => {
                const ids = Array.from(selectedIds);
                const results = await Promise.all(ids.map(id =>
                    supabase.rpc('admin_manage_registry_item', {
                        p_tab: 'disclaimers',
                        p_action: 'toggle',
                        p_id: id,
                        p_params: { is_active: false }
                    })
                ));
                const errors = results.filter(r => r.error);
                if (errors.length === 0) {
                    showToast('Deactivated selected disclaimers', 'warning');
                    fetchDisclaimers();
                    setSelectedIds(new Set());
                } else {
                    showToast('Some updates failed', 'error');
                }
            },
            variant: 'danger' as const
        }
    ];

    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!hideToolbar && (
                <TableToolbar searchPlaceholder="Search disclaimers..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => router.push('/dashboard/system/registry/disclaimers/create')}
                    >
                        + New Disclaimer
                    </button>
                </TableToolbar>
            )}

            <BulkActionsBar selectedCount={selectedIds.size} actions={bulkActions} onCancel={() => setSelectedIds(new Set())} itemTypeLabel="disclaimers" />

            <DataTable<Disclaimer>
                data={paginated}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
                emptyMessage="No disclaimers found."
            />
        </div>
    );
}
