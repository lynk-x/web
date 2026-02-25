"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';

import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { useRouter } from 'next/navigation';

// ─── Data Types & Mock Data ─────────────────────────────────────────────────

/**
 * Mirrors the `system_config` key-value table in the database.
 * `key` is the PRIMARY KEY — there is no separate `id` field.
 * `data_type` tells the application how to parse and render the value.
 */
export interface SystemConfig {
    /**
     * `id` is an alias for `key`, required by DataTable's generic constraint.
     * When querying Supabase, populate this with the row's `key` value.
     */
    id: string;
    /** Primary key — unique config identifier (e.g. 'is_maintenance_mode') */
    key: string;
    /** The config value, always stored as text and cast per data_type */
    value: string;
    /** How the value should be interpreted: string | boolean | number | json */
    data_type: 'string' | 'boolean' | 'number' | 'json';
    /** Human-readable explanation shown in the dashboard */
    description: string;
    /** When false the config is readable but ignored by the application */
    is_active: boolean;
    /** ISO timestamp of last update — display-formatted for the UI */
    updated_at: string;
}

/**
 * Mock data seeded to match the 9 rows inserted by the migration.
 * Replace with a Supabase query: `supabase.from('system_config').select('*')`
 */
const mockConfigs: SystemConfig[] = [
    { id: 'is_maintenance_mode', key: 'is_maintenance_mode', value: 'false', data_type: 'boolean', description: 'Locks down all non-admin routes when true', is_active: true, updated_at: '3 days ago' },
    { id: 'web_maintenance_mode', key: 'web_maintenance_mode', value: 'false', data_type: 'boolean', description: 'Locks down the web platform specifically when true', is_active: true, updated_at: '3 days ago' },
    { id: 'support_email', key: 'support_email', value: 'support@lynk-x.com', data_type: 'string', description: 'Default support contact email shown to users', is_active: true, updated_at: '1 month ago' },
    { id: 'default_platform_fee_percent', key: 'default_platform_fee_percent', value: '0.05', data_type: 'number', description: 'Platform fee applied to all ticket transactions (0.05 = 5%)', is_active: true, updated_at: '1 year ago' },
    { id: 'max_ticket_tiers_per_event', key: 'max_ticket_tiers_per_event', value: '10', data_type: 'number', description: 'Maximum ticket tiers an organizer can create per event', is_active: true, updated_at: '2 weeks ago' },
    { id: 'app_min_version_ios', key: 'app_min_version_ios', value: '1.0.0', data_type: 'string', description: 'Minimum iOS app version; users below this are forced to update', is_active: true, updated_at: '1 month ago' },
    { id: 'app_min_version_android', key: 'app_min_version_android', value: '1.0.0', data_type: 'string', description: 'Minimum Android version; users below this are forced to update', is_active: true, updated_at: '1 month ago' },
    { id: 'app_feature_flags', key: 'app_feature_flags', value: '{}', data_type: 'json', description: 'Feature flag overrides for the mobile app (JSON object)', is_active: true, updated_at: '1 month ago' },
    { id: 'web_feature_flags', key: 'web_feature_flags', value: '{}', data_type: 'json', description: 'Feature flag overrides for the web platform (JSON object)', is_active: false, updated_at: '1 month ago' },
];


export default function SystemConfigsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    // Uses `key` as the unique identifier (it is the DB primary key)
    const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic — is_active boolean maps to 'active'/'inactive' filter chips
    const filteredConfigs = mockConfigs.filter(config => {
        const matchesSearch = config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            config.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && config.is_active) ||
            (statusFilter === 'inactive' && !config.is_active);
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
    const paginatedConfigs = filteredConfigs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedConfigIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic — uses config.key as the unique identifier (DB primary key)
    const handleSelectConfig = (key: string) => {
        const newSelected = new Set(selectedConfigIds);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedConfigIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedConfigIds.size === paginatedConfigs.length) {
            setSelectedConfigIds(new Set());
        } else {
            const newSelected = new Set(selectedConfigIds);
            paginatedConfigs.forEach(config => newSelected.add(config.key));
            setSelectedConfigIds(newSelected);
        }
    };

    // Bulk Actions
    const handleBulkEnable = () => {
        showToast(`Enabling ${selectedConfigIds.size} configurations...`, 'info');
        setTimeout(() => {
            showToast('Configurations enabled successfully.', 'success');
            setSelectedConfigIds(new Set());
        }, 1000);
    };

    const handleBulkDisable = () => {
        showToast(`Disabling ${selectedConfigIds.size} configurations...`, 'warning');
        setTimeout(() => {
            showToast('Configurations disabled.', 'success');
            setSelectedConfigIds(new Set());
        }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Enable Selected', onClick: handleBulkEnable, variant: 'success' },
        { label: 'Disable Selected', onClick: handleBulkDisable, variant: 'danger' }
    ];

    // Table Columns & Actions
    /**
     * Maps data_type to a small badge colour for quick visual scanning.
     * string → neutral, boolean → info, number → warning, json → purple-ish
     */
    const getDataTypeVariant = (type: string): BadgeVariant => {
        switch (type) {
            case 'boolean': return 'info';
            case 'number': return 'warning';
            case 'json': return 'neutral';
            default: return 'subtle';
        }
    };

    const columns: Column<SystemConfig>[] = [
        {
            header: 'Config Key',
            render: (config) => (
                <div>
                    {/* key is the DB primary key — display in monospace for readability */}
                    <div style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'monospace' }}>{config.key}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>{config.description}</div>
                </div>
            )
        },
        {
            header: 'Value',
            render: (config) => <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>{config.value}</div>
        },
        {
            header: 'Type',
            // data_type badge tells admins how the value is cast in the application layer
            render: (config) => (
                <Badge label={config.data_type} variant={getDataTypeVariant(config.data_type)} />
            )
        },
        {
            header: 'Status',
            // is_active: inactive configs are readable by the app but not applied
            render: (config) => (
                <Badge label={config.is_active ? 'ACTIVE' : 'INACTIVE'} variant={config.is_active ? 'success' : 'subtle'} showDot />
            )
        },
        {
            header: 'Last Updated',
            render: (config) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{config.updated_at}</div>
        }
    ];


    const getRowActions = (config: SystemConfig): ActionItem[] => [
        {
            label: 'Edit Value',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            // Route uses the config key (DB primary key) as the identifier, not an id
            onClick: () => router.push(`/dashboard/admin/system-configs/edit/${encodeURIComponent(config.key)}`),
        },
        {
            label: config.is_active ? 'Disable' : 'Enable',
            variant: config.is_active ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
            onClick: () => showToast(`Toggling is_active for "${config.key}"`, 'info'),
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>System Configs</h1>
                    <p className={adminStyles.subtitle}>Manage global platform configuration flags and parameters.</p>
                </div>
                <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/system-configs/create')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Config
                </button>
            </header>

            <TableToolbar
                searchPlaceholder="Search config keys or descriptions..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['all', 'active', 'inactive'].map((status) => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {status === 'all' ? 'All Statuses' : status}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedConfigIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedConfigIds(new Set())}
                itemTypeLabel="configs"
            />

            <DataTable<SystemConfig>
                data={paginatedConfigs}
                columns={columns}
                getActions={getRowActions}
                selectedIds={selectedConfigIds}
                onSelect={handleSelectConfig}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No configurations found matching current filters."
            />
        </div>
    );
}
