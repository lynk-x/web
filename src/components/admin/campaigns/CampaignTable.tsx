"use client";

import React from 'react';
import styles from './CampaignTable.module.css';
import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { formatString, formatCurrency, formatNumber } from '@/utils/format';
import type { ActionItem } from '../../shared/TableRowActions';

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
    onStatusChange?: (campaign: Campaign, newStatus: string) => void;
    onDelete?: (campaign: Campaign) => void;
    onPreview?: (campaign: Campaign) => void;
    onViewStats?: (campaign: Campaign) => void;
    onFlag?: (campaign: Campaign) => void;
    onEdit?: (campaign: Campaign) => void;
}

// ─── Variant Helpers ─────────────────────────────────────────────────────────

/**
 * Maps `campaign_status` enum to badge colour variants.
 * active | draft | paused | rejected | completed
 */
const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'active': return 'success';
        case 'pending_approval': return 'primary';
        case 'draft': return 'warning';
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
    onStatusChange,
    onDelete,
    onPreview,
    onViewStats,
    onFlag,
    onEdit,
}) => {
    const { showToast } = useToast();
    const router = useRouter();

    /** Column definitions for the campaign table. */
    const columns: Column<Campaign>[] = [
        {
            header: 'Reference',
            render: (campaign) => (
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8, fontFamily: 'var(--font-mono, monospace)' }}>
                        {campaign.campaignRef || 'N/A'}
                    </div>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{campaign.name}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>by {campaign.client}</div>
                </div>
            ),
        },
        {
            header: 'Ad Type',
            // From `ad_type` enum: banner | interstitial
            render: (campaign) => (
                campaign.adType
                    ? <Badge
                        label={campaign.adType.replace('_', ' ').toUpperCase()}
                        variant={
                            campaign.adType === 'banner' ? 'neutral' : 'info'
                        }
                    />
                    : <span style={{ opacity: 0.3, fontSize: '12px' }}>—</span>
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
            header: 'Start Date',
            render: (campaign) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{campaign.startDate}</div>,
        },
        {
            header: 'End Date',
            render: (campaign) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{campaign.endDate}</div>,
        },
        {
            header: 'Status',
            render: (campaign) => (
                <Badge label={formatString(campaign.status)} variant={getStatusVariant(campaign.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for each campaign. */
    const getActions = (campaign: Campaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'Preview Ad',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
                onClick: () => onPreview?.(campaign),
            },
            {
                label: 'Edit',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => onEdit?.(campaign),
            },
            {
                label: 'View Stats',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
                onClick: () => onViewStats?.(campaign),
            },
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => router.push(`/dashboard/admin/campaigns/${campaign.id}`),
            },
            { divider: true },
            {
                label: campaign.isFlagged ? 'Unflag Review' : 'Flag for Review',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>,
                onClick: () => onFlag?.(campaign),
            },
        ];

        // Status Transitions
        if (campaign.status === 'pending_approval' || campaign.status === 'draft') {
            actions.push(
                {
                    label: 'Approve',
                    variant: 'success' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                    onClick: () => onStatusChange?.(campaign, 'active'),
                },
                {
                    label: 'Reject',
                    variant: 'danger' as const,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    onClick: () => onStatusChange?.(campaign, 'rejected'),
                },
            );
        }

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => onStatusChange?.(campaign, 'paused'),
            });
        }

        if (campaign.status === 'paused') {
            actions.push({
                label: 'Resume',
                variant: 'success' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
                onClick: () => onStatusChange?.(campaign, 'active'),
            });
        }

        actions.push({
            label: 'Delete',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => onDelete?.(campaign),
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
