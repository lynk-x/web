"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import AdsCampaignTable, { AdsCampaign } from '@/components/ads/campaigns/AdsCampaignTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

// Mock Data
const allCampaigns: AdsCampaign[] = [
    {
        id: '1',
        name: 'Summer Music Festival Promo',
        dates: 'Oct 12 - Oct 20, 2024',
        status: 'active',
        impressions: '12.5k',
        clicks: '650',
        spent: '$450.00',
    },
    {
        id: '2',
        name: 'Tech Summit Early Bird',
        dates: 'Sep 01 - Sep 30, 2024',
        status: 'active',
        impressions: '8.2k',
        clicks: '420',
        spent: '$320.50',
    },
    {
        id: '3',
        name: 'Weekend Jazz Night',
        dates: 'Nov 05 - Nov 07, 2024',
        status: 'paused',
        impressions: '5.1k',
        clicks: '180',
        spent: '$150.00',
    },
    {
        id: '4',
        name: 'Art Gallery Opening',
        dates: 'Dec 01 - Dec 15, 2024',
        status: 'draft',
        impressions: '-',
        clicks: '-',
        spent: '$0.00',
    }
];

export default function CampaignsPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 2;

    // Filter Logic
    const filteredCampaigns = allCampaigns.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    const paginatedCampaigns = filteredCampaigns.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset stuff when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedCampaigns.length) {
            setSelectedIds(new Set());
        } else {
            const newSelected = new Set(selectedIds);
            paginatedCampaigns.forEach(c => newSelected.add(c.id));
            setSelectedIds(newSelected);
        }
    };

    const handleBulkPause = () => {
        showToast(`Pausing ${selectedIds.size} campaigns...`, 'info');
        setTimeout(() => {
            showToast('Campaigns paused.', 'info');
            setSelectedIds(new Set());
        }, 1000);
    };

    const handleBulkDelete = () => {
        showToast(`Deleting ${selectedIds.size} campaigns...`, 'info');
        setTimeout(() => {
            showToast(`Successfully deleted ${selectedIds.size} campaigns.`, 'success');
            setSelectedIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Pause Selected', onClick: handleBulkPause },
        { label: 'Delete Selected', onClick: handleBulkDelete, variant: 'danger' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Campaigns</h1>
                    <p className={styles.subtitle}>Track and optimize your active advertising campaigns.</p>
                </div>
                <Link href="/dashboard/ads/campaigns/create" className={styles.createBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Create Campaign
                </Link>
            </header>

            <TableToolbar
                searchPlaceholder="Search campaigns..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={styles.toolbarContainer}>
                    {['all', 'active', 'paused', 'draft'].map(status => (
                        <button
                            key={status}
                            className={`${styles.chip} ${statusFilter === status ? styles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <div style={{ marginTop: '20px' }}>
                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    actions={bulkActions}
                    onCancel={() => setSelectedIds(new Set())}
                    itemTypeLabel="campaigns"
                />

                <AdsCampaignTable
                    campaigns={paginatedCampaigns}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
