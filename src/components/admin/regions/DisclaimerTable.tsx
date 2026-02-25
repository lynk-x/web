"use client";

import React, { useState } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import adminStyles from '@/app/dashboard/admin/page.module.css';

interface Disclaimer {
    id: string;
    targetScope: 'global' | 'country' | 'tag';
    targetCode?: string; // e.g. 'US' or 'GB'
    severity: 'info' | 'warning' | 'critical';
    message: string;
    isActive: boolean;
    lastUpdated: string;
}

const mockDisclaimers: Disclaimer[] = [
    { id: 'd1', targetScope: 'country', targetCode: 'US', severity: 'warning', message: 'Crypto and high-risk investments are heavily regulated. Ensure all ad copy meets SEC guidelines.', isActive: true, lastUpdated: '2 days ago' },
    { id: 'd2', targetScope: 'global', severity: 'info', message: 'All transactions on the platform are processed in USD by default unless a regional gateway is enabled.', isActive: true, lastUpdated: '1 month ago' },
    { id: 'd3', targetScope: 'country', targetCode: 'GB', severity: 'critical', message: 'FCA regulations mandate explicit risk warnings on all financial service promotions. Banner injection is forced.', isActive: true, lastUpdated: '1 week ago' },
    { id: 'd4', targetScope: 'global', severity: 'info', message: 'Legacy terms of service applied to this interaction. Please migrate users to the new agreement.', isActive: false, lastUpdated: '2 months ago' },
    { id: 'd5', targetScope: 'tag', targetCode: '18+', severity: 'warning', message: 'Age Verification Required: Ticketing requires user to confirm they are over 18.', isActive: true, lastUpdated: '3 days ago' },
];

const getSeverityVariant = (severity: string): BadgeVariant => {
    switch (severity) {
        case 'info': return 'info';
        case 'warning': return 'warning';
        case 'critical': return 'error';
        default: return 'neutral';
    }
};

export default function DisclaimerTable() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filtered = mockDisclaimers.filter(d =>
        d.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.targetCode?.toLowerCase().includes(searchTerm.toLowerCase())
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
            header: 'Scope',
            render: (d) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {d.targetScope === 'global' ? (
                        <Badge label="GLOBAL" variant="primary" />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                                {d.targetScope === 'country' ? 'Country:' : 'Tag:'}
                            </span>
                            {d.targetScope === 'tag' ? (
                                <Badge label={d.targetCode || ''} variant="neutral" />
                            ) : (
                                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{d.targetCode}</span>
                            )}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Severity',
            render: (d) => <Badge label={d.severity.toUpperCase()} variant={getSeverityVariant(d.severity)} />
        },
        {
            header: 'Disclaimer Message',
            render: (d) => (
                <div style={{ maxWidth: '400px', fontSize: '13px', lineHeight: 1.5, opacity: d.isActive ? 1 : 0.5 }}>
                    "{d.message}"
                </div>
            )
        },
        {
            header: 'Status',
            render: (d) => <Badge label={d.isActive ? 'Active' : 'Inactive'} variant={d.isActive ? 'success' : 'subtle'} showDot />
        },
        {
            header: 'Updated',
            render: (d) => <span style={{ fontSize: '13px', opacity: 0.6 }}>{d.lastUpdated}</span>
        }
    ];

    const getActions = (d: Disclaimer): ActionItem[] => [
        {
            label: 'Edit Disclaimer',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => showToast('Opening editor...', 'info')
        },
        {
            label: d.isActive ? 'Deactivate' : 'Activate',
            variant: d.isActive ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
            onClick: () => showToast(`Disclaimer ${d.isActive ? 'deactivated' : 'activated'}.`, 'success')
        },
        {
            label: 'Delete',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => showToast('Disclaimer deleted.', 'error')
        }
    ];

    const bulkActions: BulkAction[] = [
        { label: 'Activate Selected', onClick: () => { showToast('Activated', 'success'); setSelectedIds(new Set()); }, variant: 'success' },
        { label: 'Deactivate Selected', onClick: () => { showToast('Deactivated', 'warning'); setSelectedIds(new Set()); }, variant: 'danger' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TableToolbar searchPlaceholder="Search disclaimers..." searchValue={searchTerm} onSearchChange={setSearchTerm} />
                <button className={adminStyles.btnPrimary} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    + New Disclaimer
                </button>
            </div>

            <BulkActionsBar selectedCount={selectedIds.size} actions={bulkActions} onCancel={() => setSelectedIds(new Set())} itemTypeLabel="disclaimers" />

            <DataTable<Disclaimer>
                data={filtered}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                emptyMessage="No legal disclaimers found."
            />
        </div>
    );
}
