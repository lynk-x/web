import React, { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import adminStyles from '@/app/dashboard/admin/page.module.css';
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

export default function DisclaimerTable() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();

    const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchDisclaimers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('disclaimers')
                .select(`
                    *,
                    tags(name)
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setDisclaimers(data || []);
        } catch (error: unknown) {
            console.error("Fetch error:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            showToast(`Error fetching rules: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchDisclaimers();
    }, [fetchDisclaimers]);

    const handleToggle = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('disclaimers')
                .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setDisclaimers(prev => prev.map(d => d.id === id ? { ...d, is_active: !currentValue } : d));
            showToast(`Statut mis à jour`, 'success');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            showToast(`Statut non mis à jour: ${errorMessage}`, 'error');
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

    const getActions = (d: Disclaimer): ActionItem[] => [
        {
            label: 'Edit Disclaimer',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/registry/disclaimers/edit/${d.id}`)
        },
        {
            label: 'Delete',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => showToast('Delete coming soon', 'info')
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: 'Activate Selected', onClick: () => { showToast('Activated', 'success'); setSelectedIds(new Set()); }, variant: 'success' },
        { label: 'Deactivate Selected', onClick: () => { showToast('Deactivated', 'warning'); setSelectedIds(new Set()); }, variant: 'danger' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableToolbar searchPlaceholder="Search rules..." searchValue={searchTerm} onSearchChange={setSearchTerm} />
                <button
                    className={adminStyles.btnPrimary}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                    onClick={() => router.push('/dashboard/admin/registry/disclaimers/create')}
                >
                    + New Rule
                </button>
            </div>

            <BulkActionsBar selectedCount={selectedIds.size} actions={bulkActions} onCancel={() => setSelectedIds(new Set())} itemTypeLabel="rules" />

            <DataTable<Disclaimer>
                data={filtered}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                isLoading={isLoading}
                emptyMessage="No compliance rules found."
            />
        </div>
    );
}
