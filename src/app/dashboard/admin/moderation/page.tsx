"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import ReportTable, { Report } from '@/components/admin/ReportTable';

// Mock Data
const mockReports: Report[] = [
    {
        id: '1',
        type: 'content',
        title: 'Inappropriate Content in Event Description',
        description: 'User reported event "Wild Party" for containing offensive language in the description. Please review.',
        date: '2 hrs ago',
        reporter: 'ConcernedUser',
        status: 'open'
    },
    {
        id: '10',
        type: 'user',
        title: 'Harassment in Forum Comments',
        description: 'User ID 502 reported for harassing others in the "Ticket Resale" thread.',
        date: '5 hrs ago',
        reporter: 'CommunityMod',
        status: 'open'
    },
    {
        id: '3',
        type: 'user',
        title: 'Spam Account Detected',
        description: 'User ID #49221 sending bulk messages to organizers. Automated flag triggered.',
        date: '1 day ago',
        reporter: 'AutoMod Bot',
        status: 'open'
    },
    {
        id: '5',
        type: 'content',
        title: 'Copyright Infringement Claim',
        description: 'Organizer claims event banner image used without permission.',
        date: '3 days ago',
        reporter: 'LegalBot',
        status: 'resolved'
    },
    {
        id: '8',
        type: 'bug',
        title: 'Payment Gateway Error',
        description: 'Recurring failure on checkout step 3 for multiple users.',
        date: '4 hrs ago',
        reporter: 'SystemMonitor',
        status: 'open'
    },
    {
        id: '9',
        type: 'content',
        title: 'Misleading Event Details',
        description: 'Event location inaccurate. Users reporting confusion.',
        date: '2 days ago',
        reporter: 'VerifiedAttendee',
        status: 'dismissed'
    }
];

import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';

export default function AdminModerationPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredReports = mockReports.filter(report => {
        const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reporter.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
        const matchesType = typeFilter === 'all' || report.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
    const paginatedReports = filteredReports.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedReportIds(new Set());
    }, [searchTerm, statusFilter, typeFilter]);

    // Selection Logic
    const handleSelectReport = (id: string) => {
        const newSelected = new Set(selectedReportIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedReportIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedReportIds.size === paginatedReports.length) {
            setSelectedReportIds(new Set());
        } else {
            const newSelected = new Set(selectedReportIds);
            paginatedReports.forEach(report => newSelected.add(report.id));
            setSelectedReportIds(newSelected);
        }
    };

    const handleBulkResolve = () => {
        showToast(`Resolving ${selectedReportIds.size} reports...`, 'info');
        setTimeout(() => {
            showToast(`Successfully resolved ${selectedReportIds.size} reports.`, 'success');
            setSelectedReportIds(new Set());
        }, 1000);
    };

    const handleBulkDismiss = () => {
        showToast(`Dismissing ${selectedReportIds.size} reports...`, 'info');
        setTimeout(() => {
            showToast(`Successfully dismissed ${selectedReportIds.size} reports.`, 'warning');
            setSelectedReportIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Resolve Selected', onClick: handleBulkResolve, variant: 'success' },
        { label: 'Dismiss Selected', onClick: handleBulkDismiss }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Content Moderation</h1>
                    <p className={adminStyles.subtitle}>Review and manage flagged content and users.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search reports or reporters..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'open', 'resolved', 'dismissed'].map((status) => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                <div className={adminStyles.filterGroup}>
                    {['all', 'content', 'user', 'bug'].map((type) => (
                        <button
                            key={type}
                            className={`${adminStyles.chip} ${typeFilter === type ? adminStyles.chipActive : ''}`}
                            onClick={() => setTypeFilter(type)}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedReportIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedReportIds(new Set())}
                itemTypeLabel="reports"
            />

            <ReportTable
                reports={paginatedReports}
                selectedIds={selectedReportIds}
                onSelect={handleSelectReport}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
