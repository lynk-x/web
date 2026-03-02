"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors `tax_rates` joined with `countries(name, currency)`. */
interface TaxRate {
    id: string;
    country_code: string;
    country_name: string;
    currency: string;
    name: string;
    rate_percent: number;
    is_inclusive: boolean;
    is_active: boolean;
    updated_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin settings tab for `tax_rates`.
 * Lists per-country VAT/GST rates with inline activation toggle.
 */
export default function TaxRatesTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [rates, setRates] = useState<TaxRate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchRates = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tax_rates')
                .select('*, country:countries!country_code(name, currency)')
                .order('country_code');
            if (error) throw error;
            setRates((data || []).map((r: any) => ({
                id: r.id,
                country_code: r.country_code,
                country_name: r.country?.name ?? r.country_code,
                currency: r.country?.currency ?? '—',
                name: r.name,
                rate_percent: parseFloat(r.rate_percent),
                is_inclusive: r.is_inclusive,
                is_active: r.is_active,
                updated_at: r.updated_at,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load tax rates', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchRates(); }, [fetchRates]);

    const handleToggle = async (rate: TaxRate) => {
        try {
            const { error } = await supabase
                .from('tax_rates')
                .update({ is_active: !rate.is_active, updated_at: new Date().toISOString() })
                .eq('id', rate.id);
            if (error) throw error;
            setRates(prev => prev.map(r => r.id === rate.id ? { ...r, is_active: !rate.is_active } : r));
            showToast(`${rate.name} (${rate.country_code}) ${!rate.is_active ? 'activated' : 'deactivated'}`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filtered = rates.filter(r => {
        const matchSearch = r.country_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.country_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' && r.is_active) || (statusFilter === 'inactive' && !r.is_active);
        return matchSearch && matchStatus;
    });

    const columns: Column<TaxRate>[] = [
        {
            header: 'Country',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700 }}>{r.country_code}</div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.country_name}</div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>{r.currency}</div>
                    </div>
                </div>
            ),
        },
        {
            header: 'Tax Name',
            render: (r) => <div style={{ fontSize: '14px', fontWeight: 500 }}>{r.name}</div>,
        },
        {
            header: 'Rate',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '15px' }}>{r.rate_percent}%</span>
                    {r.is_inclusive && <Badge label="Incl." variant="info" />}
                </div>
            ),
        },
        {
            header: 'Status',
            render: (r) => <Badge label={r.is_active ? 'Active' : 'Inactive'} variant={r.is_active ? 'success' : 'subtle'} showDot />,
        },
    ];

    const getActions = (r: TaxRate) => [
        {
            label: r.is_active ? 'Deactivate' : 'Activate',
            variant: (r.is_active ? 'danger' : 'success') as any,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>,
            onClick: () => handleToggle(r),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Tax Rates</div>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>Per-country VAT / GST rates applied at checkout. Inclusive rates are embedded in the ticket price.</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search by country or tax name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: '1 1 220px', padding: '9px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px' }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                    {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(({ value, label }) => (
                        <button key={value} className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`} onClick={() => setStatusFilter(value)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <DataTable<TaxRate>
                data={filtered}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                emptyMessage="No tax rates configured."
            />
        </div>
    );
}
