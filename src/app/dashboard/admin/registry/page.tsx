"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from '../settings/page.module.css';
import adminStyles from '../page.module.css';
import TagLibraryTab from '@/components/admin/registry/TagLibraryTab';
import MappingTab from '@/components/admin/registry/MappingTab';
import DisclaimerTable from '@/components/admin/regions/DisclaimerTable';
import { createClient } from '@/utils/supabase/client';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import TableToolbar from '@/components/shared/TableToolbar';
import Tabs from '@/components/dashboard/Tabs';

// ... types ...
type Tab = 'library' | 'mapping' | 'disclaimer' | 'countries';

interface Country {
    id: string;
    code: string;
    name: string;
    currency: string;
    phone_prefix: string | null;
    is_active: boolean;
    taxSummary: string;
}

function RegistryContent() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as any) || 'library';
    const [activeTab, setActiveTab] = useState<Tab>(
        ['library', 'mapping', 'disclaimer', 'countries'].includes(initialTab) ? initialTab : 'library'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['library', 'mapping', 'disclaimer', 'countries'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // ── Countries State ────────────────────────────────────────────────────
    const [countries, setCountries] = useState<Country[]>([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [countryStatusFilter, setCountryStatusFilter] = useState('all');
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

    /**
     * Lazy-load countries only when the tab is selected.
     * Joins `tax_rates` to show a summarised tax label per country.
     */
    useEffect(() => {
        if (activeTab !== 'countries') return;
        const fetchCountries = async () => {
            setIsLoadingCountries(true);
            try {
                const { data, error } = await supabase
                    .from('countries')
                    .select('*, tax_rates(name, rate_percent, is_inclusive)')
                    .order('name');
                if (error) throw error;
                setCountries((data || []).map((c: any) => ({
                    id: c.code,    // satisfy DataTable's `id` constraint
                    code: c.code,
                    name: c.name,
                    currency: c.currency,
                    phone_prefix: c.phone_prefix ?? null,
                    is_active: c.is_active,
                    taxSummary: c.tax_rates?.length
                        ? `${c.tax_rates[0].name} ${c.tax_rates[0].rate_percent}%${c.tax_rates[0].is_inclusive ? ' (incl.)' : ''}`
                        : 'None',
                })));
            } catch (err: any) {
                showToast(err.message || 'Failed to load countries', 'error');
            } finally {
                setIsLoadingCountries(false);
            }
        };
        fetchCountries();
    }, [activeTab, supabase, showToast]);

    /** Toggle a country's `is_active` flag directly inline. */
    const handleToggleCountry = async (code: string, current: boolean) => {
        try {
            const { error } = await supabase
                .from('countries')
                .update({ is_active: !current })
                .eq('code', code);
            if (error) throw error;
            setCountries(prev => prev.map(c => c.code === code ? { ...c, is_active: !current } : c));
            showToast(`${code} ${!current ? 'activated' : 'deactivated'}`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filteredCountries = countries.filter(c => {
        const matchSearch =
            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
            c.code.toLowerCase().includes(countrySearch.toLowerCase());
        const matchStatus =
            countryStatusFilter === 'all' ||
            (countryStatusFilter === 'active' && c.is_active) ||
            (countryStatusFilter === 'inactive' && !c.is_active);
        return matchSearch && matchStatus;
    });

    const countryColumns: Column<Country>[] = [
        {
            header: 'Country',
            render: (c) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>
                        {c.code}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.name}</div>
                        {c.phone_prefix && <div style={{ fontSize: '11px', opacity: 0.5 }}>{c.phone_prefix}</div>}
                    </div>
                </div>
            ),
        },
        { header: 'Currency', render: (c) => <code style={{ fontSize: '13px', fontWeight: 600 }}>{c.currency}</code> },
        { header: 'Tax Rates', render: (c) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{c.taxSummary}</div> },
        {
            header: 'Status',
            render: (c) => <Badge label={c.is_active ? 'Active' : 'Inactive'} variant={c.is_active ? 'success' : 'subtle'} showDot />,
        },
    ];

    const getCountryActions = (c: Country) => [
        {
            label: c.is_active ? 'Deactivate' : 'Activate',
            variant: (c.is_active ? 'danger' : 'success') as any,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>,
            onClick: () => handleToggleCountry(c.code, c.is_active),
        },
    ];

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={adminStyles.title}>Registry &amp; Rules</h1>
                    <p className={adminStyles.subtitle}>Manage platform taxonomy, tag hierarchies, compliance rules, and supported regions.</p>
                </div>
            </header>

            <Tabs
                options={[
                    { id: 'library', label: 'Tag Library' },
                    { id: 'mapping', label: 'Logic & Mapping' },
                    { id: 'disclaimer', label: 'Compliance Rules' },
                    { id: 'countries', label: 'Supported Regions' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <main className={styles.content}>
                {activeTab === 'library' && <TagLibraryTab />}
                {activeTab === 'mapping' && <MappingTab />}
                {activeTab === 'disclaimer' && (
                    <div style={{ marginTop: '16px' }}>
                        <DisclaimerTable />
                    </div>
                )}
                {activeTab === 'countries' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        <TableToolbar
                            searchPlaceholder="Search country name or code..."
                            searchValue={countrySearch}
                            onSearchChange={setCountrySearch}
                        >
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        className={`${adminStyles.chip} ${countryStatusFilter === value ? adminStyles.chipActive : ''}`}
                                        onClick={() => setCountryStatusFilter(value)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </TableToolbar>
                        <DataTable<Country>
                            data={filteredCountries}
                            columns={countryColumns}
                            getActions={getCountryActions}
                            isLoading={isLoadingCountries}
                            emptyMessage="No countries found."
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

export default function AdminRegistryPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Registry...</div>}>
            <RegistryContent />
        </Suspense>
    );
}
