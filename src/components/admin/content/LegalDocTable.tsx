"use client";

import React from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '../../shared/TableRowActions';

// ─── Type ─────────────────────────────────────────────────────────────────────

/**
 * Mirrors the `legal_documents` DB table.
 *
 * Schema: legal_documents (
 *   id uuid, type legal_document_type, version text, title text, content text,
 *   is_active boolean DEFAULT false, effective_date timestamptz,
 *   created_at timestamptz, updated_at timestamptz
 * )
 *
 * `legal_document_type` enum: terms_of_service | privacy_policy | organizer_agreement
 *
 * When wiring up:
 *   supabase.from('legal_documents')
 *     .select('*')
 *     .order('type, effective_date', { ascending: false })
 */
export interface LegalDocument {
    id: string;
    /** Aligned to `legal_document_type` schema enum */
    type: 'terms_of_service' | 'privacy_policy' | 'organizer_agreement';
    version: string;
    title: string;
    /**
     * `is_active` boolean from schema — exactly ONE document per type should be active.
     * DB enforces this via partial unique index: idx_legal_documents_active.
     */
    is_active: boolean;
    effective_date: string;
}

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable labels for the legal_document_type enum. */
const formatDocType = (type: LegalDocument['type']): string => {
    switch (type) {
        case 'terms_of_service': return 'Terms of Service';
        case 'privacy_policy': return 'Privacy Policy';
        case 'organizer_agreement': return 'Organizer Agreement';
    }
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Read-only admin table for versioned legal documents.
 *
 * - Shows type, version, title, effective date, and active state.
 * - "Set Active" row action promotes an inactive document to active for its type.
 * - Only inactive documents display the "Set Active" action.
 */
const LegalDocTable: React.FC<LegalDocTableProps> = ({
    documents,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    onSetActive,
}) => {
    const { showToast } = useToast();

    /** Column definitions for the legal documents table. */
    const columns: Column<LegalDocument>[] = [
        {
            header: 'Type',
            render: (doc) => (
                // legal_document_type enum value displayed as human-readable label
                <span style={{ fontSize: '12px', opacity: 0.7, fontFamily: 'monospace' }}>
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
                <span style={{ fontSize: '13px', opacity: 0.8 }}>{doc.effective_date}</span>
            ),
        },
        {
            header: 'Status',
            render: (doc) => (
                // is_active boolean from schema — no status enum, just active/inactive
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
                label: 'View Document',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening ${doc.title} (${doc.version})...`, 'info'),
            },
        ];

        // Active documents can be exported; inactive can be promoted
        if (doc.is_active) {
            actions.push({
                label: 'Export PDF',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                onClick: () => showToast(`Exporting ${doc.title} as PDF...`, 'info'),
            });
        } else {
            // Promote this version to the active one for its document type
            actions.push({
                label: 'Set Active',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => {
                    if (onSetActive) {
                        onSetActive(doc);
                    } else {
                        showToast(`Activating ${doc.title} (${doc.version})...`, 'success');
                    }
                },
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
        />
    );
};

export default LegalDocTable;
