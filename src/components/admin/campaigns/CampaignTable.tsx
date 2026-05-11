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
    const getActions = (campaign: Campaign): ActionItem[] => [
        {
            label: 'Preview Ad',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
            onClick: () => onPreview?.(campaign),
        },
        {
            label: 'Manage Campaign',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/campaigns/${campaign.id}?createdAt=${encodeURIComponent(campaign.createdAt)}`),
        },
    ];

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
