"use client";

import React from 'react';
import styles from './CampaignTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface Campaign {
    id: string;
    name: string;
    client: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    status: 'active' | 'pending' | 'paused' | 'rejected' | 'completed';
    startDate: string;
    endDate: string;
}

interface CampaignTableProps {
    campaigns: Campaign[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const CampaignTable: React.FC<CampaignTableProps> = ({
    campaigns,
    selectedIds,
    onSelect,
    onSelectAll,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}) => {
    const { showToast } = useToast();

    const getStatusVariant = (status: string): BadgeVariant => {
        switch (status) {
            case 'active': return 'success';
            case 'pending': return 'warning';
            case 'paused': return 'neutral';
            case 'rejected': return 'error';
            case 'completed': return 'info'; // or neutral/brand depending on preference
            default: return 'neutral';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
    };

    const formatString = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const allSelected = campaigns.length > 0 && selectedIds?.size === campaigns.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getCampaignActions = (campaign: Campaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Details',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
                onClick: () => showToast(`Opening details for ${campaign.name}...`, 'info')
            }
        ];

        actions.push({ divider: true });

        if (campaign.status === 'pending') {
            actions.push(
                {
                    label: 'Approve',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
                    variant: 'success',
                    onClick: () => {
                        showToast(`Approving campaign ${campaign.name}...`, 'info');
                        setTimeout(() => showToast('Campaign approved.', 'success'), 1000);
                    }
                },
                {
                    label: 'Reject',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
                    variant: 'danger',
                    onClick: () => {
                        showToast(`Rejecting campaign ${campaign.name}...`, 'info');
                        setTimeout(() => showToast('Campaign rejected.', 'error'), 1000);
                    }
                },
                { divider: true }
            );
        }

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => {
                    showToast(`Pausing ${campaign.name}...`, 'info');
                    setTimeout(() => showToast('Campaign paused.', 'info'), 1000);
                }
            });
        }

        if (campaign.status === 'paused') {
            actions.push({
                label: 'Resume Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
                onClick: () => {
                    showToast(`Resuming ${campaign.name}...`, 'info');
                    setTimeout(() => showToast('Campaign active.', 'success'), 1000);
                }
            });
        }

        actions.push({
            label: 'Delete',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
            variant: 'danger',
            onClick: () => {
                showToast(`Deleting campaign ${campaign.name}...`, 'info');
                setTimeout(() => showToast('Campaign deleted.', 'success'), 1500);
            }
        });

        return actions;
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '40px' }}>
                            <TableCheckbox
                                checked={allSelected}
                                onChange={() => onSelectAll && onSelectAll()}
                                indeterminate={isIndeterminate}
                                disabled={!onSelectAll}
                            />
                        </th>
                        <th>Campaign</th>
                        <th>Budget / Spend</th>
                        <th>Performance</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((campaign) => (
                        <tr key={campaign.id} className={selectedIds?.has(campaign.id) ? styles.rowSelected : ''}>
                            <td>
                                <TableCheckbox
                                    checked={selectedIds?.has(campaign.id) || false}
                                    onChange={() => onSelect && onSelect(campaign.id)}
                                />
                            </td>
                            <td>
                                <div className={styles.campaignInfo}>
                                    <div className={styles.campaignName}>{campaign.name}</div>
                                    <div className={styles.clientName}>{campaign.client}</div>
                                </div>
                            </td>
                            <td>
                                <div className={styles.metric}>
                                    <span className={styles.metricValue}>{formatCurrency(campaign.budget)}</span>
                                    <span className={styles.metricLabel}>{formatCurrency(campaign.spend)} spent</span>
                                </div>
                            </td>
                            <td>
                                <div className={styles.metric}>
                                    <span className={styles.metricValue}>{formatNumber(campaign.impressions)} Impr.</span>
                                    <span className={styles.metricLabel}>{formatNumber(campaign.clicks)} Clicks</span>
                                </div>
                            </td>
                            <td>
                                <Badge
                                    label={formatString(campaign.status)}
                                    variant={getStatusVariant(campaign.status)}
                                    showDot
                                />
                            </td>
                            <td>
                                <div style={{ fontSize: '13px', opacity: 0.8 }}>
                                    <div>{campaign.startDate}</div>
                                    <div style={{ opacity: 0.6 }}>to {campaign.endDate}</div>
                                </div>
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    <TableRowActions actions={getCampaignActions(campaign)} />
                                </div>
                            </td>
                        </tr>
                    ))}
                    {campaigns.length === 0 && (
                        <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '32px', opacity: 0.5 }}>
                                No campaigns found matching criteria.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {onPageChange && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            )}
        </div>
    );
};

export default CampaignTable;
