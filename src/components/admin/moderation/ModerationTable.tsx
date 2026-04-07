"use client";

import React from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { formatString, formatDate } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

export interface ModerationEntry {
    id: string;
    item_id: string;
    item_type: 'event' | 'campaign' | 'forum_message' | 'forum_media' | 'user_profile';
    status: 'pending_review' | 'approved' | 'rejected' | 'flagged' | 'appealed' | 'resolved';
    reason: string;
    created_at: string;
    metadata: any;
    report_id?: string;
}

interface ModerationTableProps {
    entries: ModerationEntry[];
    onApprove: (entry: ModerationEntry) => void;
    onReject: (entry: ModerationEntry) => void;
    onViewDetails: (entry: ModerationEntry) => void;
    isLoading?: boolean;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'pending_review': return 'primary';
        case 'flagged': return 'error';
        case 'appealed': return 'warning';
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'resolved': return 'neutral';
        default: return 'neutral';
    }
};

const ModerationTable: React.FC<ModerationTableProps> = ({
    entries,
    onApprove,
    onReject,
    onViewDetails,
    isLoading = false,
    currentPage,
    totalPages,
    onPageChange
}) => {
    const columns: Column<ModerationEntry>[] = [
        {
            header: 'Type',
            render: (entry) => (
                <Badge 
                    label={entry.item_type.toUpperCase().replace('_', ' ')} 
                    variant={entry.item_type === 'event' ? 'primary' : 'info'} 
                />
            )
        },
        {
            header: 'Item ID',
            render: (entry) => (
                <span style={{ fontFamily: 'monospace', fontSize: '12px', opacity: 0.6 }}>
                    {entry.item_id.slice(0, 8)}...
                </span>
            )
        },
        {
            header: 'Reason / Flag',
            render: (entry) => (
                <div style={{ maxWidth: '300px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>
                        {entry.reason || 'No reason provided'}
                    </div>
                    {entry.report_id && (
                        <div style={{ fontSize: '11px', color: 'var(--color-interface-error)', marginTop: '4px' }}>
                            ⚠ User Reported
                        </div>
                    )}
                </div>
            )
        },
        {
            header: 'Status',
            render: (entry) => (
                <Badge label={formatString(entry.status)} variant={getStatusVariant(entry.status)} showDot />
            )
        },
        {
            header: 'Submitted',
            render: (entry) => (
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    {formatDate(entry.created_at)}
                </div>
            )
        }
    ];

    const getActions = (entry: ModerationEntry): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Snapshot',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => onViewDetails(entry)
            }
        ];

        if (['pending_review', 'flagged', 'appealed', 'rejected'].includes(entry.status)) {
            actions.push({
                label: 'Approve',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                onClick: () => onApprove(entry)
            });
        }

        if (['pending_review', 'flagged', 'appealed', 'approved'].includes(entry.status)) {
            actions.push({
                label: 'Reject',
                variant: 'danger',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                onClick: () => onReject(entry)
            });
        }

        return actions;
    };

    return (
        <DataTable<ModerationEntry>
            data={entries}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="The moderation queue is clear. Great job!"
        />
    );
};

export default ModerationTable;
