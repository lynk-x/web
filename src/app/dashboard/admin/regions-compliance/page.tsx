"use client";

import { useState, useEffect } from 'react';
import styles from '../page.module.css'; // Use shared admin styles
import adminStyles from '../page.module.css';

import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { useRouter } from 'next/navigation';
import DisclaimerTable from '@/components/admin/regions/DisclaimerTable';
import TagTable from '@/components/admin/regions/TagTable';


// ─── Data Types & Mock Data ─────────────────────────────────────────────────

/**
 * Mirrors the `countries` DB table.
 *
 * Schema: countries (
 *   code varchar(2) PRIMARY KEY, name text, currency varchar(3),
 *   phone_prefix text, phone_digits int, is_active boolean DEFAULT false
 * )
 *
 * NOTE: `status` (restricted/banned) does NOT exist in the schema.
 * The schema uses `is_active boolean` — a country is either enabled or not.
 * Platform fee is NOT per-country; it is set globally in `system_config`
 * as `default_platform_fee_percent`. Tax info comes from `tax_rates` join.
 *
 * When wiring up:
 *   supabase.from('countries')
 *     .select('*, tax_rates(name, rate_percent, is_inclusive)')
 *     .order('name')
 */
interface RegionConfig {
    id: string;
    name: string;
    /** ISO 3166-1 alpha-2 country code (PK in DB) */
    code: string;
    /** DB column: is_active boolean — countries must be explicitly enabled */
    is_active: boolean;
    currency: string;
    /** DB column: phone_prefix text (e.g. +254) */
    phone_prefix?: string;
    /** Sourced from `tax_rates` join — e.g. 'VAT 20%', 'GST 15%' */
    taxSummary: string;
    lastUpdated: string;
}

const mockRegions: RegionConfig[] = [
    { id: '1', name: 'United States', code: 'US', is_active: true, currency: 'USD', phone_prefix: '+1', taxSummary: 'State/Local (Dynamic)', lastUpdated: '2 weeks ago' },
    { id: '2', name: 'United Kingdom', code: 'GB', is_active: true, currency: 'GBP', phone_prefix: '+44', taxSummary: 'VAT 20%', lastUpdated: '1 month ago' },
    { id: '3', name: 'Kenya', code: 'KE', is_active: true, currency: 'KES', phone_prefix: '+254', taxSummary: 'VAT 16%', lastUpdated: '3 days ago' },
    { id: '4', name: 'Canada', code: 'CA', is_active: true, currency: 'CAD', phone_prefix: '+1', taxSummary: 'GST/HST/PST (Dynamic)', lastUpdated: '1 week ago' },
    { id: '5', name: 'Germany', code: 'DE', is_active: true, currency: 'EUR', phone_prefix: '+49', taxSummary: 'VAT 19%', lastUpdated: '2 months ago' },
    { id: '6', name: 'Nigeria', code: 'NG', is_active: false, currency: 'NGN', phone_prefix: '+234', taxSummary: 'VAT 7.5%', lastUpdated: '1 month ago' },
    { id: '7', name: 'North Korea', code: 'KP', is_active: false, currency: 'KPW', phone_prefix: '+850', taxSummary: 'N/A', lastUpdated: '3 years ago' },
];

export default function RegionsCompliancePage() {
    const { showToast } = useToast();
    const router = useRouter();

    // Tab State
    const [activeTab, setActiveTab] = useState<'countries' | 'disclaimers' | 'tags'>('countries');

    // Countries State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRegionIds, setSelectedRegionIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter Logic — countries.is_active boolean (no restricted/banned in schema)
    const filteredRegions = mockRegions.filter(region => {
        const matchesSearch = region.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            region.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && region.is_active) ||
            (statusFilter === 'inactive' && !region.is_active);
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredRegions.length / itemsPerPage);
    const paginatedRegions = filteredRegions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
        setSelectedRegionIds(new Set());
    }, [searchTerm, statusFilter]);

    // Selection Logic
    const handleSelectRegion = (id: string) => {
        const newSelected = new Set(selectedRegionIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedRegionIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedRegionIds.size === paginatedRegions.length) {
            setSelectedRegionIds(new Set());
        } else {
            const newSelected = new Set(selectedRegionIds);
            paginatedRegions.forEach(region => newSelected.add(region.id));
            setSelectedRegionIds(newSelected);
        }
    };

    // Bulk Actions — aligned to is_active boolean toggle
    const handleBulkActivate = () => {
        showToast(`Activating ${selectedRegionIds.size} countries...`, 'info');
        setTimeout(() => { showToast('Countries activated.', 'success'); setSelectedRegionIds(new Set()); }, 1000);
    };
    const handleBulkDeactivate = () => {
        showToast(`Deactivating ${selectedRegionIds.size} countries...`, 'info');
        setTimeout(() => { showToast('Countries deactivated.', 'warning'); setSelectedRegionIds(new Set()); }, 1000);
    };

    const bulkActions: BulkAction[] = [
        { label: 'Activate Selected', onClick: handleBulkActivate, variant: 'success' },
        { label: 'Deactivate Selected', onClick: handleBulkDeactivate, variant: 'danger' },
    ];

    // Table Columns — aligned to countries schema (no platformFee column)
    const columns: Column<RegionConfig>[] = [
        {
            header: 'Country',
            render: (region) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
                        {region.code}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{region.name}</div>
                        {region.phone_prefix && (
                            // phone_prefix from countries table
                            <div style={{ fontSize: '11px', opacity: 0.5 }}>{region.phone_prefix}</div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: 'Currency',
            render: (region) => (
                // Linked to fx_rates table via countries.currency FK
                <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{region.currency}</div>
            ),
        },
        {
            header: 'Tax Rates',
            render: (region) => (
                // Sourced from `tax_rates` join (tax_rates.country_code = countries.code)
                <div style={{ fontSize: '13px', opacity: 0.8 }}>{region.taxSummary}</div>
            ),
        },
        {
            header: 'Status',
            render: (region) => (
                // countries.is_active boolean — Active or Inactive only
                <Badge
                    label={region.is_active ? 'Active' : 'Inactive'}
                    variant={region.is_active ? 'success' : 'subtle'}
                    showDot
                />
            ),
        },
        {
            header: 'Last Updated',
            render: (region) => (
                <div style={{ fontSize: '13px', opacity: 0.7 }}>{region.lastUpdated}</div>
            ),
        },
    ];

    const getRowActions = (region: RegionConfig): ActionItem[] => [
        {
            label: 'Edit Country Config',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/regions-compliance/edit/${region.id}`),
        },
        {
            // Toggle is_active boolean (no banned/restricted — just on/off)
            label: region.is_active ? 'Deactivate' : 'Activate',
            variant: region.is_active ? 'danger' : 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>,
            onClick: () => showToast(`Toggling ${region.name} (is_active)...`, 'info'),
        },
        {
            label: 'View Tax Rates',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
            onClick: () => showToast(`Loading tax_rates for ${region.name}...`, 'info'),
        },
    ];

    return (
        <div className={styles.container}>
            <header className={adminStyles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: '1 1 auto' }}>
                    <h1 className={adminStyles.title}>Regions & Compliance</h1>
                    <p className={adminStyles.subtitle}>Manage supported countries, regional platform fees, taxes, and legal compliance disclaimers.</p>
                </div>
                {activeTab === 'countries' && (
                    <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/regions-compliance/create')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8.01 8.01 0 0 1-8 8z" />
                            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20z" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                        </svg>
                        Add Region
                    </button>
                )}
            </header>

            {/* Sub-nav Tabs */}
            <div className={adminStyles.tabs} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '24px', marginBottom: '8px', paddingBottom: '0' }}>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'countries' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('countries')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'countries' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'countries' ? 'white' : 'rgba(255,255,255,0.6)', padding: '0 0 12px 0', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    Supported Countries
                </button>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'disclaimers' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('disclaimers')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'disclaimers' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'disclaimers' ? 'white' : 'rgba(255,255,255,0.6)', padding: '0 0 12px 0', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    Legal Disclaimers
                </button>
                <button
                    className={`${adminStyles.tab} ${activeTab === 'tags' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('tags')}
                    style={{ background: 'transparent', border: 'none', borderBottom: activeTab === 'tags' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'tags' ? 'white' : 'rgba(255,255,255,0.6)', padding: '0 0 12px 0', fontSize: '15px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                    Event Tags
                </button>
            </div>

            {activeTab === 'countries' && (
                <>

                    <TableToolbar
                        searchPlaceholder="Search country name or code..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        {/* Filter chips — is_active boolean: no restricted/banned states in schema */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { value: 'all', label: 'All Countries' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`}
                                    onClick={() => setStatusFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </TableToolbar>

                    <BulkActionsBar
                        selectedCount={selectedRegionIds.size}
                        actions={bulkActions}
                        onCancel={() => setSelectedRegionIds(new Set())}
                        itemTypeLabel="regions"
                    />

                    <DataTable<RegionConfig>
                        data={paginatedRegions}
                        columns={columns}
                        getActions={getRowActions}
                        selectedIds={selectedRegionIds}
                        onSelect={handleSelectRegion}
                        onSelectAll={handleSelectAll}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        emptyMessage="No regions found matching current filters."
                    />
                </>
            )}

            {activeTab === 'disclaimers' && (
                <div style={{ marginTop: '16px' }}>
                    <DisclaimerTable />
                </div>
            )}

            {activeTab === 'tags' && (
                <div style={{ marginTop: '16px' }}>
                    <TagTable />
                </div>
            )}
        </div>
    );
}
