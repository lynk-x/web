"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import TableToolbar from '@/components/shared/TableToolbar';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';

interface Country {
    id: string;
    code: string;
    name: string;
    currency: string;
    phone_prefix: string | null;
    phone_digits: number | null;
    is_active: boolean;
    taxSummary: string;
}

export default function RegionsTab() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [countries, setCountries] = useState<Country[]>([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [countryStatusFilter, setCountryStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const fetchCountries = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('countries')
                .select('*, tax_rates(display_name, rate_percent, is_inclusive)')
                .order('display_name');
            if (error) throw error;
            setCountries((data || []).map((c: any) => ({
                id: c.code,
                code: c.code,
                name: c.display_name,
                currency: c.currency,
                phone_prefix: c.phone_prefix ?? null,
                phone_digits: c.phone_digits ?? null,
                is_active: c.is_active,
                taxSummary: c.tax_rates?.length
                    ? `${c.tax_rates[0].display_name} ${c.tax_rates[0].rate_percent}%${c.tax_rates[0].is_inclusive ? ' (incl.)' : ''}`
                    : 'None',
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load countries', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, [supabase]);

    const handleToggleCountry = async (code: string, current: boolean) => {
        try {
            const { error } = await supabase
                .from('countries')
                .update({ is_active: !current })
                .eq('code', code);
            if (error) throw error;
            setCountries(prev => prev.map(c => c.code === code ? { ...c, is_active: !current } : c));
            showToast(`${code} ${!current ? 'activated' : 'deactivated'}`, 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const filtered = countries.filter(c => {
        const matchSearch =
            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
            c.code.toLowerCase().includes(countrySearch.toLowerCase());
        const matchStatus =
            countryStatusFilter === 'all' ||
            (countryStatusFilter === 'active' && c.is_active) ||
            (countryStatusFilter === 'inactive' && !c.is_active);
        return matchSearch && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [countrySearch, countryStatusFilter]);

    const columns: Column<Country>[] = [
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
        { header: 'Phone Code', render: (c) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{c.phone_prefix || '—'}</div> },
        { header: 'Digits', render: (c) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{c.phone_digits || '—'}</div> },
        {
            header: 'Status',
            render: (c) => <Badge label={c.is_active ? 'Active' : 'Inactive'} variant={c.is_active ? 'success' : 'subtle'} showDot />,
        },
    ];

    const getActions = (c: Country) => [
        {
            label: c.is_active ? 'Deactivate' : 'Activate',
            variant: (c.is_active ? 'danger' : 'success') as 'danger' | 'success',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>,
            onClick: () => handleToggleCountry(c.code, c.is_active),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
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
                data={paginated}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No countries found."
            />
        </div>
    );
}
