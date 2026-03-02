"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '../../shared/TableRowActions';
import type { LegalDocument } from '@/types/admin';

interface LegalDocTableProps {
    documents: LegalDocument[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    /** Called when admin clicks "Set Active" to promote a document version. */
    onSetActive?: (doc: LegalDocument) => void;
    isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable labels for the legal_document_type enum. */
const formatDocType = (type: LegalDocument['type']): string => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// ─── Component ────────────────────────────────────────────────────────────────

const LegalDocTable: React.FC<LegalDocTableProps> = ({
    documents,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    onSetActive,
    isLoading = false
}) => {
    const { showToast } = useToast();

    /** Column definitions for the legal documents table. */
    const columns: Column<LegalDocument>[] = [
        {
            header: 'Type',
            render: (doc) => (
                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                    {formatDocType(doc.type)}
                </span>
            ),
        },
        {
            header: 'Version',
            render: (doc) => (
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600 }}>
                    {doc.version}
                </span>
            ),
        },
        {
            header: 'Title',
            render: (doc) => (
                <span style={{ fontWeight: 500 }}>{doc.title}</span>
            ),
        },
        {
            header: 'Effective Date',
            render: (doc) => (
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{new Date(doc.effective_date).toLocaleDateString()}</span>
            ),
        },
        {
            header: 'Status',
            render: (doc) => (
                <Badge
                    label={doc.is_active ? 'Active' : 'Inactive'}
                    variant={doc.is_active ? 'success' : 'subtle'}
                    showDot
                />
            ),
        },
    ];

    /** Row-level actions for each legal document. */
    const getActions = (doc: LegalDocument): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening ${doc.title} (${doc.version})...`, 'info'),
            },
        ];

        if (doc.is_active) {
            actions.push({
                label: 'Export PDF',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                onClick: () => showToast(`Exporting ${doc.title} as PDF...`, 'info'),
            });
        } else {
            actions.push({
                label: 'Set Active',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => onSetActive?.(doc),
            });
        }

        return actions;
    };

    return (
        <DataTable<LegalDocument>
            data={documents}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No legal documents found."
            isLoading={isLoading}
        />
    );
};

export default LegalDocTable;
