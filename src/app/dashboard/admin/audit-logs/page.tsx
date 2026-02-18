"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';
import AuditTable, { AuditLog } from '@/components/admin/AuditTable';

// Mock Data
const mockAuditLogs: AuditLog[] = [
    {
        id: '9001',
        action: 'USER_SUSPEND',
        actor: { name: 'Admin User', email: 'admin@lynk-x.io' },
        target: 'user:1023',
        targetType: 'User',
        timestamp: '2023-10-25T10:30:00Z',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        changes: {
            status: { old: 'active', new: 'suspended' },
            suspension_reason: { old: null, new: 'Violation of TOS' }
        }
    },
    {
        id: '9002',
        action: 'REFUND_APPROVE',
        actor: { name: 'Robert Finance', email: 'robert@lynk-x.io' },
        target: 'order:9921',
        targetType: 'Order',
        timestamp: '2023-10-25T09:15:00Z',
        ipAddress: '10.0.0.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        details: 'Refunded $25.00 to user wallet for cancelled event.'
    },
    {
        id: '9003',
        action: 'SYSTEM_CONFIG_UPDATE',
        actor: { name: 'Super Admin', email: 'super@lynk-x.io' },
        target: 'config:payment',
        targetType: 'SystemConfig',
        timestamp: '2023-10-24T16:45:00Z',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        changes: {
            gateway_api_key: { old: '***xyz', new: '***abc' },
            enabled: { old: false, new: true }
        }
    },
    {
        id: '9004',
        action: 'CAMPAIGN_REJECT',
        actor: { name: 'Sarah Ads', email: 'sarah@lynk-x.io' },
        target: 'campaign:112',
        targetType: 'AdCampaign',
        timestamp: '2023-10-24T14:20:00Z',
        ipAddress: '10.0.0.45',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        details: 'Rejected due to low quality image assets.'
    },
    {
        id: '9005',
        action: 'LOGIN_SUCCESS',
        actor: { name: 'Admin User', email: 'admin@lynk-x.io' },
        target: 'session:8812',
        targetType: 'Session',
        timestamp: '2023-10-24T08:00:00Z',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        details: 'Successful 2FA login.'
    },
    {
        id: '9006',
        action: 'EVENT_DELETE',
        actor: { name: 'Robert Finance', email: 'robert@lynk-x.io' },
        target: 'event:442',
        targetType: 'Event',
        timestamp: '2023-10-23T11:20:00Z',
        ipAddress: '10.0.0.12',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        details: 'Deleted unauthorized event.'
    },
    {
        id: '9007',
        action: 'USER_ROLE_UPDATE',
        actor: { name: 'Super Admin', email: 'super@lynk-x.io' },
        target: 'user:502',
        targetType: 'User',
        timestamp: '2023-10-23T10:15:00Z',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        changes: {
            role: { old: 'user', new: 'organizer' }
        }
    },
    {
        id: '9008',
        action: 'SETTING_CHANGE',
        actor: { name: 'Admin User', email: 'admin@lynk-x.io' },
        target: 'system:smtp',
        targetType: 'System',
        timestamp: '2023-10-22T15:30:00Z',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        details: 'Updated SMTP server configuration.'
    }
];

import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';

export default function AdminAuditLogsPage() {
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic
    const filteredLogs = mockAuditLogs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.actor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = actionFilter === 'all' || log.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, actionFilter]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Audit Logs</h1>
                    <p className={adminStyles.subtitle}>Track detailed system events and administrator actions for compliance.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder="Search by action, actor, or target ID..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    <select
                        className={adminStyles.filterSelect}
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                    >
                        <option value="all">All Actions</option>
                        <option value="USER_SUSPEND">User Suspension</option>
                        <option value="REFUND_APPROVE">Refund Approved</option>
                        <option value="SYSTEM_CONFIG_UPDATE">Config Update</option>
                        <option value="LOGIN_SUCCESS">Login Success</option>
                    </select>

                    <button className={adminStyles.btnSecondary} style={{ padding: '8px 16px', fontSize: '13px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Oct 24 - Oct 25
                    </button>

                    <button
                        className={adminStyles.btnSecondary}
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => {
                            showToast('Preparing audit log export...', 'info');
                            setTimeout(() => showToast('Audit logs exported successfully (CSV).', 'success'), 2000);
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export CSV
                    </button>
                </div>
            </TableToolbar>

            <AuditTable
                logs={paginatedLogs}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
