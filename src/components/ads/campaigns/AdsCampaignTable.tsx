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
            header: 'Budget',
            render: (campaign) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600 }}>
                        ${campaign.total_budget.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '12px', opacity: 0.6 }}>
                        ${campaign.spent_amount.toLocaleString()} spent
                    </span>
                </div>
            ),
        },
        {
            header: 'Targeting',
            render: (campaign) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px' }}>
                        📍 {campaign.target_regions?.length ? campaign.target_regions.join(', ') : 'Global'}
                    </span>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                        🏷️ {campaign.target_tags?.length ? (
                            <>
                                {campaign.target_tags.slice(0, 3).join(', ')}
                                {campaign.target_tags.length > 3 ? ` +${campaign.target_tags.length - 3}` : ''}
                            </>
                        ) : 'Any Interests'}
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
        {
            header: 'Status',
            render: (campaign) => (
                <Badge label={formatString(campaign.status)} variant={getStatusVariant(campaign.status)} showDot />
            ),
        },
    ];

    /** Row-level actions for each ads campaign. */
    const getActions = (campaign: AdsCampaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'Edit Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => router.push(`/dashboard/ads/campaigns/${campaign.id}/edit?createdAt=${encodeURIComponent(campaign.created_at)}`),
            },
        ];

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => onStatusChange?.(campaign.id, 'paused'),
            });
        }

        if (campaign.status === 'paused') {
            actions.push({
                label: 'Resume',
                variant: 'success' as const,
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
                onClick: () => onStatusChange?.(campaign.id, 'active'),
            });
        }

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
