"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { useOrganization } from '@/context/OrganizationContext';
import { formatDate } from '@/utils/format';
import type { OrganizerPromoCode } from '@/types/organize';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import formStyles from '@/components/admin/finance/PromoCodeForm.module.css';

interface EventDetail {
    id: string;
    title: string;
    created_at: string;
}

interface PromoFormState {
    id: string | null;
    code: string;
    type: 'percent' | 'fixed' | 'free_entry';
    value: number;
    max_uses: number | null;
    one_per_user: boolean;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
}

const emptyForm: PromoFormState = {
    id: null,
    code: '',
    type: 'percent',
    value: 0,
    max_uses: null,
    one_per_user: false,
    valid_from: '',
    valid_until: '',
    is_active: true,
};

const getTypeVariant = (type: OrganizerPromoCode['type']): BadgeVariant => {
    switch (type) {
        case 'percent': return 'info';
        case 'fixed': return 'neutral';
        case 'free_entry': return 'success';
        default: return 'neutral';
    }
};

/**
 * Promo code management for a specific event in the organizer dashboard.
 * Codes are always scoped to this one event — organizers cannot create
 * platform-wide codes (that remains an admin-only capability).
 */
export default function EventPromoCodesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [promoCodes, setPromoCodes] = useState<OrganizerPromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState<PromoFormState>(emptyForm);

    const fetchData = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const { data: eventData, error: eventError } = await supabase
                .schema('api')
                .rpc('get_organizer_event_details', { p_account_id: activeAccount.id, p_event_id: id });

            if (eventError) throw eventError;
            if (!eventData) {
                showToast('Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }
            setEvent({ id: eventData.event.id, title: eventData.event.title, created_at: eventData.event.created_at });

            const { data: promoData, error: promoError } = await supabase
                .schema('api')
                .from('v1_organizer_promo_codes')
                .select('*')
                .eq('event_id', id)
                .order('created_at', { ascending: false });

            if (promoError) throw promoError;
            setPromoCodes((promoData || []) as OrganizerPromoCode[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load promo codes.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredCodes = useMemo(() => {
        if (!searchTerm) return promoCodes;
        return promoCodes.filter((p) => p.code.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [promoCodes, searchTerm]);

    const openCreateModal = () => {
        setForm(emptyForm);
        setIsModalOpen(true);
    };

    const openEditModal = (promo: OrganizerPromoCode) => {
        setForm({
            id: promo.id,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            max_uses: promo.max_uses,
            one_per_user: promo.one_per_user,
            valid_from: promo.valid_from ? promo.valid_from.substring(0, 16) : '',
            valid_until: promo.valid_until ? promo.valid_until.substring(0, 16) : '',
            is_active: promo.is_active,
        });
        setIsModalOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null = value;
        if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
        }
        setForm((prev) => {
            const next = { ...prev, [name]: finalValue } as PromoFormState;
            if (name === 'type' && finalValue === 'free_entry') {
                next.value = 0;
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) return;

        setIsSubmitting(true);
        try {
            const { error } = await supabase.schema('api').rpc('organizer_upsert_promo_code', {
                p_account_id: activeAccount.id,
                p_id: form.id,
                p_event_id: id,
                p_code: form.code.toUpperCase().trim(),
                p_type: form.type,
                p_value: form.value,
                p_max_uses: form.max_uses,
                p_one_per_user: form.one_per_user,
                p_valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
                p_valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
                p_is_active: form.is_active,
            });
            if (error) throw error;

            showToast(form.id ? 'Promo code updated.' : 'Promo code created.', 'success');
            setIsModalOpen(false);
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to save promo code.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (promo: OrganizerPromoCode) => {
        if (!activeAccount) return;
        const action = promo.is_active ? 'deactivate' : 'activate';
        if (!await confirm(`Are you sure you want to ${action} promo code ${promo.code}?`)) return;

        try {
            const { error } = await supabase.schema('api').rpc('organizer_set_promo_code_status', {
                p_account_id: activeAccount.id,
                p_ids: [promo.id],
                p_is_active: !promo.is_active,
            });
            if (error) throw error;
            showToast(`Promo code ${action}d.`, 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || `Failed to ${action} promo code.`, 'error');
        }
    };

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading promo codes..." centered />
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className={adminStyles.container}>
                <EmptyState message="Event not found." />
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            {ConfirmDialog}
            <PageHeader
                title="Promo Codes"
                subtitle={`Manage discount codes for "${event.title}"`}
                closeHref={`/dashboard/organize/events/${id}`}
                actionLabel="Create Promo Code"
                onActionClick={openCreateModal}
            />

            <TableToolbar
                searchPlaceholder="Search by code..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <div className={adminStyles.pageCard}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                <th style={thStyle}>Code</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Value</th>
                                <th style={thStyle}>Usage</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Created</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCodes.map((promo) => (
                                <tr key={promo.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 600, color: 'var(--color-brand-primary)', letterSpacing: '0.05em' }}>
                                            {promo.code}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <Badge label={promo.type.replace('_', ' ').toUpperCase()} variant={getTypeVariant(promo.type)} />
                                    </td>
                                    <td style={tdStyle}>
                                        {promo.type === 'percent' ? `${promo.value}%` : promo.type === 'free_entry' ? 'FREE' : `${promo.value}`}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 600 }}>{promo.uses_count}</span>
                                        <span style={{ opacity: 0.5 }}> / {promo.max_uses ?? '∞'}</span>
                                    </td>
                                    <td style={tdStyle}>
                                        <Badge label={promo.is_active ? 'ACTIVE' : 'INACTIVE'} variant={promo.is_active ? 'success' : 'subtle'} showDot />
                                    </td>
                                    <td style={{ ...tdStyle, fontSize: '12px', opacity: 0.7 }}>{formatDate(promo.created_at)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button className={adminStyles.btnSecondary} onClick={() => openEditModal(promo)}>Edit</button>
                                            <button className={adminStyles.btnSecondary} onClick={() => handleToggleActive(promo)}>
                                                {promo.is_active ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredCodes.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5, padding: '30px 16px' }}>
                                        {searchTerm ? 'No promo codes match your search.' : 'No promo codes configured for this event yet.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={form.id ? 'Edit Promo Code' : 'Create Promo Code'}
                size="large"
            >
                <form onSubmit={handleSubmit} className={formStyles.container}>
                    <div className={formStyles.grid}>
                        <div className={formStyles.section}>
                            <h3 className={formStyles.sectionTitle}>General Settings</h3>

                            <div className={formStyles.inputGroup}>
                                <label className={formStyles.label}>Promo Code (unique)</label>
                                <input
                                    type="text"
                                    name="code"
                                    value={form.code}
                                    onChange={handleInputChange}
                                    className={formStyles.input}
                                    placeholder="SUMMER2024"
                                    style={{ textTransform: 'uppercase' }}
                                    required
                                />
                            </div>

                            <div className={formStyles.row}>
                                <div className={formStyles.inputGroup}>
                                    <label className={formStyles.label}>Discount Type</label>
                                    <select name="type" value={form.type} onChange={handleInputChange} className={formStyles.input}>
                                        <option value="percent">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                        <option value="free_entry">Free Entry</option>
                                    </select>
                                </div>
                                <div className={formStyles.inputGroup}>
                                    <label className={formStyles.label}>{form.type === 'percent' ? 'Value (%)' : 'Amount'}</label>
                                    <input
                                        type="number"
                                        name="value"
                                        value={form.value}
                                        onChange={handleInputChange}
                                        className={formStyles.input}
                                        disabled={form.type === 'free_entry'}
                                        min="0"
                                        step="0.01"
                                        max={form.type === 'percent' ? '100' : undefined}
                                        required
                                    />
                                </div>
                            </div>

                            <div className={formStyles.row}>
                                <div className={formStyles.inputGroup}>
                                    <label className={formStyles.label}>Max Uses (empty for unlimited)</label>
                                    <input
                                        type="number"
                                        name="max_uses"
                                        value={form.max_uses ?? ''}
                                        onChange={handleInputChange}
                                        className={formStyles.input}
                                        placeholder="Unlimited"
                                        min="1"
                                    />
                                </div>
                                <div className={formStyles.inputGroup} style={{ justifyContent: 'center', paddingTop: '28px' }}>
                                    <label className={formStyles.checkboxLabel}>
                                        <input type="checkbox" name="one_per_user" checked={form.one_per_user} onChange={handleInputChange} />
                                        One per user
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={formStyles.section}>
                            <h3 className={formStyles.sectionTitle}>Validity</h3>

                            <div className={formStyles.row}>
                                <div className={formStyles.inputGroup}>
                                    <label className={formStyles.label}>Valid From</label>
                                    <input
                                        type="datetime-local"
                                        name="valid_from"
                                        value={form.valid_from}
                                        onChange={handleInputChange}
                                        className={formStyles.input}
                                    />
                                </div>
                                <div className={formStyles.inputGroup}>
                                    <label className={formStyles.label}>Valid Until</label>
                                    <input
                                        type="datetime-local"
                                        name="valid_until"
                                        value={form.valid_until}
                                        onChange={handleInputChange}
                                        className={formStyles.input}
                                    />
                                </div>
                            </div>

                            <div className={formStyles.inputGroup} style={{ paddingTop: '12px' }}>
                                <label className={formStyles.checkboxLabel}>
                                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleInputChange} />
                                    Is Active
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className={formStyles.formActions}>
                        <button type="button" onClick={() => setIsModalOpen(false)} className={adminStyles.btnSecondary}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className={adminStyles.btnPrimary}>
                            {isSubmitting ? 'Saving...' : (form.id ? 'Update Promo Code' : 'Create Promo Code')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: '16px 16px',
};
