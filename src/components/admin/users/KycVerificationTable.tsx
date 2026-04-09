"use client";

import React from 'react';
import styles from './KycVerificationTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { formatString, formatDate } from '@/utils/format';
import type { KycVerification } from '@/types/admin';
import type { ActionItem } from '../../shared/TableRowActions';

interface KycVerificationTableProps {
    data: KycVerification[];
    isLoading?: boolean;
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onViewDetails: (verification: KycVerification) => void;
    onApprove: (verification: KycVerification) => void;
    onReject: (verification: KycVerification) => void;
}

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'approved': return 'success';
        case 'pending': return 'warning';
        case 'rejected': return 'error';
        case 'expired': return 'neutral';
        default: return 'neutral';
    }
};

const getTierVariant = (tier: string): BadgeVariant => {
    switch (tier) {
        case 'tier_3_gold': return 'warning';
        case 'tier_2_silver': return 'neutral';
        default: return 'primary'; // tier_1_basic
    }
};

const KycVerificationTable: React.FC<KycVerificationTableProps> = ({
    data,
    isLoading = false,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    onViewDetails,
    onApprove,
    onReject,
}) => {
    const columns: Column<KycVerification>[] = [
        {
            header: 'Account',
            render: (v) => (
                <div className={styles.accountInfo}>
                    <span className={styles.accountName}>{v.account_name || 'Organization'}</span>
                    <span className={styles.accountId}>{v.account_id.slice(0, 8)}...</span>
                </div>
            ),
        },
        {
            header: 'KYC Tier',
            render: (v) => <Badge label={formatString(v.kyc_tier)} variant={getTierVariant(v.kyc_tier)} />,
        },
        {
            header: 'Document',
            render: (v) => (
                <div className={styles.docInfo}>
                    <span className={styles.docType}>{formatString(v.document_type)}</span>
                    <span className={styles.docCount}>{v.uploaded_documents?.length || 0} Files</span>
                </div>
            ),
        },
        {
            header: 'Status',
            render: (v) => <Badge label={formatString(v.status)} variant={getStatusVariant(v.status)} showDot />,
        },
        {
            header: 'Submitted',
            render: (v) => formatDate(v.created_at),
        },
    ];

    const getActions = (v: KycVerification): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Documents',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => onViewDetails(v),
            }
        ];

        if (v.status === 'pending') {
            actions.push(
                {
                    label: 'Approve',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>,
                    onClick: () => onApprove(v),
                },
                {
                    label: 'Reject',
                    variant: 'danger',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    onClick: () => onReject(v),
                }
            );
        }

        return actions;
    };

    return (
        <DataTable<KycVerification>
            data={data}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No identity verification requests found."
        />
    );
};

export default KycVerificationTable;
