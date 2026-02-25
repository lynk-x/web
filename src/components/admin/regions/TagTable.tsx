"use client";

import React, { useState } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import adminStyles from '@/app/dashboard/admin/page.module.css';

export interface EventTag {
    id: string;
    name: string;
    description: string;
    requiresDisclaimer: boolean;
    isActive: boolean;
    usageCount: number;
}

const mockTags: EventTag[] = [
    { id: 'tag_1', name: '18+', description: 'Restricts ticket purchase to users 18 and older.', requiresDisclaimer: true, isActive: true, usageCount: 1420 },
    { id: 'tag_2', name: 'Alcohol Served', description: 'Indicates alcohol is available on premises.', requiresDisclaimer: true, isActive: true, usageCount: 854 },
    { id: 'tag_3', name: 'VIP Only', description: 'Exclusive event for VIP members.', requiresDisclaimer: false, isActive: true, usageCount: 120 },
    { id: 'tag_4', name: 'Outdoor', description: 'Event takes place outdoors.', requiresDisclaimer: false, isActive: true, usageCount: 3400 },
    { id: 'tag_5', name: 'High Risk', description: 'Extreme sports or high-risk activities.', requiresDisclaimer: true, isActive: false, usageCount: 15 },
];

export default function TagTable() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filtered = mockTags.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(t => t.id)));
    };

    const columns: Column<EventTag>[] = [
        {
            header: 'Tag Name',
            render: (t) => (
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {t.name}
                </div>
            )
        },
        {
            header: 'Description',
            render: (t) => (
                <div style={{ fontSize: '13px', opacity: 0.8, maxWidth: '300px' }}>
                    {t.description}
                </div>
            )
        },
        {
            header: 'Disclaimer Attached',
            render: (t) => (
                <Badge
                    label={t.requiresDisclaimer ? 'Yes' : 'No'}
                    variant={t.requiresDisclaimer ? 'warning' : 'subtle'}
                />
            )
        },
        {
            header: 'Usage Count',
            render: (t) => (
                <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                    {t.usageCount.toLocaleString()} events
                </div>
            )
        },
        {
            header: 'Status',
            render: (t) => (
                <Badge
                    label={t.isActive ? 'Active' : 'Inactive'}
                    variant={t.isActive ? 'success' : 'subtle'}
                    showDot
                />
            )
        }
    ];

    const getActions = (t: EventTag): ActionItem[] => [
        {
            label: 'Edit Tag',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast(`Editing tag: ${t.name}`, 'info')
        },
        {
            label: t.isActive ? 'Deactivate' : 'Activate',
            variant: t.isActive ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
            onClick: () => showToast(`Tag ${t.isActive ? 'deactivated' : 'activated'}.`, 'success')
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: 'Activate Selected', onClick: () => { showToast('Activated', 'success'); setSelectedIds(new Set()); }, variant: 'success' },
        { label: 'Deactivate Selected', onClick: () => { showToast('Deactivated', 'warning'); setSelectedIds(new Set()); }, variant: 'danger' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableToolbar searchPlaceholder="Search event tags..." searchValue={searchTerm} onSearchChange={setSearchTerm} />
                <button className={adminStyles.btnPrimary} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    + New Tag
                </button>
            </div>

            <BulkActionsBar selectedCount={selectedIds.size} actions={bulkActions} onCancel={() => setSelectedIds(new Set())} itemTypeLabel="tags" />

            <DataTable<EventTag>
                data={filtered}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                emptyMessage="No tags found."
            />
        </div>
    );
}
