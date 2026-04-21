"use client";

import React from 'react';
import styles from './AdsCampaignTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { AdsCampaign } from '@/types/ads';
import type { AdsCampaign } from '@/types/ads';

import { useRouter } from 'next/navigation';

interface AdsCampaignTableProps {
    campaigns: AdsCampaign[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    /** Called when user requests a status change (pause / resume / launch) */
    onStatusChange?: (id: string, newStatus: 'active' | 'paused') => void;
    /** Called when user requests deletion of a single campaign */
    onDelete?: (id: string, title: string) => void;
    /** Called when user requests duplication of a single campaign */
    onDuplicate?: (id: string) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'pending_approval': return 'primary';
        case 'paused': return 'warning';
        case 'draft': return 'neutral';
        case 'completed': return 'info';
        case 'scheduled': return 'primary';
        default: return 'neutral';
    }
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Advertiser campaign management table.
 * Displays campaign metrics, budget/spend, status, and provides campaign lifecycle actions.
 */
const AdsCampaignTable: React.FC<AdsCampaignTableProps> = ({
    campaigns,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    onStatusChange,
    onDelete,
    onDuplicate,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the ads campaign table. */
    const columns: Column<AdsCampaign>[] = [
        {
            header: 'Campaign',
            render: (campaign) => <div style={{ fontWeight: 500 }}>{campaign.title}</div>,
        },
        {
            header: 'Type',
            render: (campaign) => <Badge label={formatString(campaign.type)} variant="subtle" />,
        },
        {
            header: 'Status',
            render: (campaign) => (
                <Badge label={formatString(campaign.status)} variant={getStatusVariant(campaign.status)} showDot />
            ),
        },
        {
            header: 'Spend',
            render: (campaign) => (
                <div className={styles.metrics}>
                    <span className={styles.metricValue}>
                        ${campaign.spent_amount.toLocaleString()} / ${campaign.total_budget.toLocaleString()}
                    </span>
                </div>
            ),
        },
        {
            header: 'Performance',
            render: (campaign) => (
                <div className={styles.metrics}>
                    <span className={styles.metricValue}>
                        {campaign.metrics?.impressions.toLocaleString() || '0'} Impr.
                    </span>
                    <span className={styles.metricLabel}>
                        {campaign.metrics?.clicks.toLocaleString() || '0'} clicks ({campaign.metrics?.ctr || '0'}% CTR)
                    </span>
                </div>
            ),
        },
        {
            header: 'Dates',
            render: (campaign) => {
                const start = new Date(campaign.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const end = new Date(campaign.end_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {start} - {end}
                    </div>
                );
            },
        },
    ];

    /** Row-level actions for each ads campaign. */
    const getActions = (campaign: AdsCampaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'Edit Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => router.push(`/dashboard/ads/campaigns/${campaign.id}/edit`),
            },
        ];

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => onStatusChange?.(campaign.id, 'paused'),
            });
        }

        if (campaign.status === 'paused' || campaign.status === 'draft') {
            actions.push({
                label: campaign.status === 'paused' ? 'Resume' : 'Submit for Approval',
                variant: 'success' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
                onClick: () => onStatusChange?.(campaign.id, campaign.status === 'paused' ? 'active' : 'pending_approval' as any),
            });
        }

        actions.push({
            label: 'Duplicate',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
            onClick: () => onDuplicate?.(campaign.id),
        });

        actions.push({
            label: 'Delete',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => onDelete?.(campaign.id, campaign.title),
        });

        return actions;
    };

    return (
        <DataTable<AdsCampaign>
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

export default AdsCampaignTable;
