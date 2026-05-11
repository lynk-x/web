"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import TableToolbar from '@/components/shared/TableToolbar';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Toggle from '@/components/shared/Toggle';
import Modal from '@/components/shared/Modal';

interface Country {
    id: string;
    code: string;
    name: string;
    currency: string;
    timezone: string;
    region: string;
    phone_prefix: string | null;
    phone_digits: number | null;
    is_active: boolean;
    taxSummary: string;
    info: any;
}

export default function RegionsTab() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();

    const [countries, setCountries] = useState<Country[]>([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [countryStatusFilter, setCountryStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isEditing, setIsEditing] = useState<Country | null>(null);
    const [editForm, setEditForm] = useState({
        phone_prefix: '',
        phone_digits: '',
        currency: '',
        region: '',
        timezone: '',
        require_id: false,
        require_address: false,
        min_age: '18'
    });
    const [isSaving, setIsSaving] = useState(false);
    const itemsPerPage = 10;

    const fetchCountries = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_settings_data', {
                p_tab: 'regions'
            });
            if (error) throw error;
            setCountries((data || []).map((c: any) => ({
                id: c.code,
                code: c.code,
                name: c.display_name,
                currency: c.currency,
                timezone: c.timezone,
                region: c.region,
                phone_prefix: c.info?.phone_prefix ?? null,
                phone_digits: c.info?.phone_digits ?? null,
                is_active: c.is_active,
                info: c.info || {},
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
            const { error } = await supabase.rpc('admin_manage_settings_item', {
                p_tab: 'regions',
                p_action: 'toggle',
                p_id: code,
                p_params: { is_active: !current }
            });
            if (error) throw error;
            setCountries(prev => prev.map(c => c.code === code ? { ...c, is_active: !current } : c));
            showToast(`${code} ${!current ? 'activated' : 'deactivated'}`, 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleSaveConfig = async () => {
        if (!isEditing) return;
        setIsSaving(true);
        try {
            const updatedInfo = {
                ...isEditing.info,
                phone_prefix: editForm.phone_prefix,
                phone_digits: editForm.phone_digits ? parseInt(editForm.phone_digits) : null,
                kyc_rules: {
                    require_id: editForm.require_id,
                    require_address: editForm.require_address,
                    min_age: parseInt(editForm.min_age) || 18
                }
            };

            const { error } = await supabase.rpc('admin_manage_settings_item', {
                p_tab: 'regions',
                p_action: 'update',
                p_id: isEditing.code,
                p_params: {
                    currency: editForm.currency,
                    region: editForm.region,
                    timezone: editForm.timezone,
                    info: updatedInfo
                }
            });

            if (error) throw error;

            showToast(`Configuration for ${isEditing.code} updated.`, 'success');
            setIsEditing(null);
            fetchCountries();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update configuration.', 'error');
        } finally {
            setIsSaving(false);
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
        { header: 'Region', render: (c) => <div style={{ fontSize: '13px', opacity: 0.8, textTransform: 'capitalize' }}>{c.region.replace(/_/g, ' ')}</div> },
        { header: 'Timezone', render: (c) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{c.timezone}</div> },
        {
            header: 'Status',
            render: (c) => (
                <Toggle
                    enabled={c.is_active}
                    onChange={() => handleToggleCountry(c.code, c.is_active)}
                />
            ),
        },
    ];

    const getActions = (c: Country) => [
        {
            label: 'Edit Configuration',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => {
                setIsEditing(c);
                setEditForm({
                    phone_prefix: c.phone_prefix || '',
                    phone_digits: c.phone_digits?.toString() || '',
                    currency: c.currency,
                    region: c.region,
                    timezone: c.timezone,
                    require_id: c.info?.kyc_rules?.require_id || false,
                    require_address: c.info?.kyc_rules?.require_address || false,
                    min_age: c.info?.kyc_rules?.min_age?.toString() || '18'
                });
            },
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

            <Modal
                isOpen={!!isEditing}
                onClose={() => setIsEditing(null)}
                title={`Edit Configuration: ${isEditing?.name}`}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsEditing(null)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveConfig} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                }
            >
                {isEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className={adminStyles.label}>Country Code</label>
                            <input className={adminStyles.input} value={isEditing.code} disabled style={{ opacity: 0.6 }} />
                        </div>
                        <div>
                            <label className={adminStyles.label}>Currency Code (3 chars)</label>
                            <input
                                className={adminStyles.input}
                                value={editForm.currency}
                                onChange={e => setEditForm({ ...editForm, currency: e.target.value.toUpperCase() })}
                                maxLength={3}
                                placeholder="e.g. USD"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className={adminStyles.label}>Region</label>
                                <select
                                    className={adminStyles.input}
                                    value={editForm.region}
                                    onChange={e => setEditForm({ ...editForm, region: e.target.value })}
                                >
                                    <option value="africa">Africa</option>
                                    <option value="europe">Europe</option>
                                    <option value="north_america">North America</option>
                                    <option value="south_america">South America</option>
                                    <option value="middle_east">Middle East</option>
                                    <option value="south_asia">South Asia</option>
                                    <option value="east_asia">East Asia</option>
                                    <option value="southeast_asia">Southeast Asia</option>
                                    <option value="oceania">Oceania</option>
                                </select>
                            </div>
                            <div>
                                <label className={adminStyles.label}>Timezone</label>
                                <input
                                    className={adminStyles.input}
                                    value={editForm.timezone}
                                    onChange={e => setEditForm({ ...editForm, timezone: e.target.value })}
                                    placeholder="e.g. UTC"
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label className={adminStyles.label}>Phone Prefix</label>
                                <input
                                    className={adminStyles.input}
                                    value={editForm.phone_prefix}
                                    onChange={e => setEditForm({ ...editForm, phone_prefix: e.target.value })}
                                    placeholder="e.g. +1"
                                />
                            </div>
                            <div>
                                <label className={adminStyles.label}>Phone Digits</label>
                                <input
                                    type="number"
                                    className={adminStyles.input}
                                    value={editForm.phone_digits}
                                    onChange={e => setEditForm({ ...editForm, phone_digits: e.target.value })}
                                    placeholder="e.g. 10"
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: '11px', opacity: 0.5 }}>
                            These values are used for localized phone number validation and display.
                        </p>

                        <div style={{ marginTop: '8px', borderTop: '1px solid var(--color-interface-outline)', paddingTop: '16px' }}>
                            <label className={adminStyles.label} style={{ marginBottom: '12px', display: 'block' }}>KYC & Compliance Rules</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.require_id}
                                        onChange={e => setEditForm({ ...editForm, require_id: e.target.checked })}
                                    />
                                    <span style={{ fontSize: '14px', opacity: 0.8 }}>Require Identity Verification</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.require_address}
                                        onChange={e => setEditForm({ ...editForm, require_address: e.target.checked })}
                                    />
                                    <span style={{ fontSize: '14px', opacity: 0.8 }}>Require Address Verification</span>
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '14px', opacity: 0.8 }}>Minimum User Age:</span>
                                    <input
                                        type="number"
                                        className={adminStyles.input}
                                        style={{ width: '80px' }}
                                        value={editForm.min_age}
                                        onChange={e => setEditForm({ ...editForm, min_age: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
