"use client";

import React from 'react';
import styles from './CampaignTable.module.css';
import DataTable, { Column } from '../shared/DataTable';
import Badge, { BadgeVariant } from '../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency, formatNumber } from '@/utils/format';
import type { ActionItem } from '../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { Campaign } from '@/types/admin';
import type { Campaign } from '@/types/admin';

interface CampaignTableProps {
    campaigns: Campaign[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'pending': return 'warning';
        case 'paused': return 'info';
        case 'rejected': return 'error';
        case 'completed': return 'neutral';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Admin campaign oversight table.
 * Displays campaign details, budget/spend, impressions/clicks, and moderation actions.
 */
const CampaignTable: React.FC<CampaignTableProps> = ({
    campaigns,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();

    /** Column definitions for the campaign table. */
    const columns: Column<Campaign>[] = [
        {
            header: 'Campaign',
            render: (campaign) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{campaign.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{campaign.client}</div>
                </div>
            ),
        },
        {
            header: 'Budget / Spend',
            render: (campaign) => (
                <div className={styles.metrics}>
                    <span className={styles.metricValue}>{formatCurrency(campaign.budget)}</span>
                    <span className={styles.metricLabel}>{formatCurrency(campaign.spend)} spent</span>
                </div>
            ),
        },
        {
            header: 'Performance',
            render: (campaign) => (
                <div className={styles.metrics}>
                    <span className={styles.metricValue}>{formatNumber(campaign.impressions)} Impr.</span>
                    <span className={styles.metricLabel}>{formatNumber(campaign.clicks)} Clicks</span>
                </div>
            ),
        },
        {
            header: 'Status',
            render: (campaign) => (
                <Badge label={formatString(campaign.status)} variant={getStatusVariant(campaign.status)} showDot />
            ),
        },
        {
            header: 'Dates',
            render: (campaign) => (
                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    <div>{campaign.startDate}</div>
                    <div style={{ opacity: 0.6 }}>to {campaign.endDate}</div>
                </div>
            ),
        },
    ];

    /** Row-level actions for each campaign. */
    const getActions = (campaign: Campaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening campaign details for ${campaign.name}...`, 'info'),
            },
        ];

        if (campaign.status === 'pending') {
            actions.push(
                {
                    label: 'Approve',
                    variant: 'success',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                    onClick: () => {
                        showToast('Approving campaign...', 'info');
                        setTimeout(() => showToast('Campaign approved and set to active.', 'success'), 1000);
                    },
                },
                {
                    label: 'Reject',
                    variant: 'danger',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    onClick: () => {
                        showToast('Rejecting campaign...', 'info');
                        setTimeout(() => showToast('Campaign rejected.', 'error'), 1000);
                    },
                },
            );
        }

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => {
                    showToast('Pausing campaign...', 'info');
                    setTimeout(() => showToast('Campaign paused.', 'warning'), 1000);
                },
            });
        }

        if (campaign.status === 'paused') {
            actions.push({
                label: 'Resume',
                variant: 'success',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
                onClick: () => {
                    showToast('Resuming campaign...', 'info');
                    setTimeout(() => showToast('Campaign resumed.', 'success'), 1000);
                },
            });
        }

        actions.push({
            label: 'Delete',
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => {
                showToast(`Deleting campaign ${campaign.name}...`, 'info');
                setTimeout(() => showToast('Campaign deleted.', 'success'), 1500);
            },
        });

        return actions;
    };

    return (
        <DataTable<Campaign>
            data={campaigns}
            columns={columns}
            getActions={getActions}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No campaigns found matching criteria."
        />
    );
};

export default CampaignTable;
