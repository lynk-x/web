"use client";

import React from 'react';
import styles from './AdsCampaignTable.module.css';
import TableCheckbox from '../shared/TableCheckbox';
import Badge, { BadgeVariant } from '../shared/Badge';
import TableRowActions, { ActionItem } from '../shared/TableRowActions';
import Pagination from '../shared/Pagination';
import { useToast } from '@/components/ui/Toast';

export interface AdsCampaign {
    id: string;
    name: string;
    dates: string;
    status: 'active' | 'paused' | 'draft' | 'completed' | 'archived';
    impressions: string;
    clicks: string;
    spent: string;
}

interface AdsCampaignTableProps {
    campaigns: AdsCampaign[];
    selectedIds?: Set<string>;
    onSelect?: (id: string) => void;
    onSelectAll?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const AdsCampaignTable: React.FC<AdsCampaignTableProps> = ({
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
            case 'paused': return 'warning';
            case 'draft': return 'neutral';
            case 'completed': return 'info';
            case 'archived': return 'neutral';
            default: return 'neutral';
        }
    };

    const formatString = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const allSelected = campaigns.length > 0 && selectedIds?.size === campaigns.length;
    const isIndeterminate = (selectedIds?.size || 0) > 0 && !allSelected;

    const getCampaignActions = (campaign: AdsCampaign): ActionItem[] => {
        const actions: ActionItem[] = [
            {
                label: 'View Analytics',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
                onClick: () => showToast(`Opening analytics for ${campaign.name}...`, 'info')
            },
            {
                label: 'Edit Campaign',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
                onClick: () => showToast(`Opening editor for ${campaign.name}...`, 'info')
            },
            { divider: true }
        ];

        if (campaign.status === 'active') {
            actions.push({
                label: 'Pause',
                icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
                onClick: () => {
                    showToast(`Pausing ${campaign.name}...`, 'info');
                    setTimeout(() => showToast('Campaign paused.', 'info'), 1000);
                }
            });
        } else if (campaign.status === 'paused') {
            actions.push({
                label: 'Resume',
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
                        <th>Status</th>
                        <th>Impressions</th>
                        <th>Clicks</th>
                        <th>Spent</th>
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
                                    <div className={styles.campaignDates}>{campaign.dates}</div>
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
                                <div className={styles.metric}>
                                    <span className={styles.metricValue}>{campaign.impressions}</span>
                                </div>
                            </td>
                            <td>
                                <div className={styles.metric}>
                                    <span className={styles.metricValue}>{campaign.clicks}</span>
                                </div>
                            </td>
                            <td>
                                <div className={styles.metric}>
                                    <span className={styles.metricValue}>{campaign.spent}</span>
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

export default AdsCampaignTable;
