import React, { useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/utils/format';
import Badge from '@/components/shared/Badge';
import Pagination from '@/components/shared/Pagination';
import styles from '@/components/shared/DataTable.module.css';

export interface CampaignPerformance {
    campaign_id: string;
    title: string;
    status: string;
    impressions: number;
    clicks: number;
    total_cost: number;
}

interface AdsPerformanceTableProps {
    data: CampaignPerformance[];
}

export default function AdsPerformanceTable({ data }: AdsPerformanceTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE) || 1;
    
    // Ensure currentPage is valid if data changes
    if (currentPage > totalPages) {
        setCurrentPage(totalPages);
    }
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left' }}>Campaign</th>
                        <th style={{ textAlign: 'right', width: '210px' }}>Spend</th>
                        <th style={{ textAlign: 'right', width: '235px' }}>Impressions</th>
                        <th style={{ textAlign: 'right', width: '200px' }}>Clicks</th>
                        <th style={{ textAlign: 'right', width: '200px' }}>CTR</th>
                        <th style={{ textAlign: 'right', width: '210px' }}>CPC</th>
                        <th style={{ textAlign: 'left' }}>Status</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-utility-secondaryText)' }}>
                                No campaigns found matching criteria.
                            </td>
                        </tr>
                    ) : (
                        currentData.map(item => {
                            const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
                            const cpc = item.clicks > 0 ? item.total_cost / item.clicks : 0;

                            return (
                                <tr key={item.campaign_id}>
                                <td style={{ fontWeight: 500, color: 'var(--color-utility-primaryText)' }}>
                                    {item.title}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.total_cost, 'USD')}</td>
                                <td style={{ textAlign: 'right' }}>{item.impressions.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>{item.clicks.toLocaleString()}</td>
                                <td style={{ textAlign: 'right' }}>{ctr.toFixed(2)}%</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(cpc, 'USD')}</td>
                                <td>
                                    <Badge 
                                        label={item.status.replace('_', ' ')}
                                        variant={item.status === 'active' ? 'success' : item.status === 'paused' ? 'warning' : 'neutral'}
                                    />
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <Link 
                                        href={`/dashboard/ads/analytics/campaign/${item.campaign_id}`}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '6px',
                                            borderRadius: '4px',
                                            color: 'var(--color-brand-primary)',
                                            backgroundColor: 'rgba(32, 249, 40, 0.1)',
                                            transition: 'background-color 0.2s'
                                        }}
                                        title="View Detailed Analytics"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="20" x2="18" y2="10"></line>
                                            <line x1="12" y1="20" x2="12" y2="4"></line>
                                            <line x1="6" y1="20" x2="6" y2="14"></line>
                                        </svg>
                                    </Link>
                                </td>
                            </tr>
                        );
                    }))}
                </tbody>
            </table>
            <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
