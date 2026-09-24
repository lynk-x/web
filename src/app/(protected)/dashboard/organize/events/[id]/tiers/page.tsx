"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import { createEventsRepository } from '@/lib/repositories';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterChips from '@/components/shared/FilterChips';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';
import Modal from '@/components/shared/Modal';
import DateRangeRow from '@/components/shared/DateRangeRow';

interface TicketTier {
    id: string;
    display_name: string;
    price: number;
    capacity: number;
    tickets_sold: number;
    sales_start: string | null;
    sales_end: string | null;
    max_per_order: number | null;
}

/** Converts an ISO timestamp to the YYYY-MM-DD value DatePicker/DateRangeRow expect. */
const toDateOnlyValue = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface EventDetail {
    id: string;
    title: string;
    currency: string;
    reference: string;
    created_at: string;
    starts_at: string;
}

/**
 * Ticket tiers management view for a specific event in the organizer dashboard.
 * Displays tier sales statistics, remaining capacities, pricing, and ticket sales window status.
 */
export default function EventTiersPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventDetail | null>(null);
    const [tiers, setTiers] = useState<TicketTier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [editingTier, setEditingTier] = useState<TicketTier | null>(null);

    const fetchTiersData = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_organizer_event_details', {
                p_account_id: activeAccount.id,
                p_event_id: id,
            });

            if (error) throw error;
            if (!data) {
                showToast('Event not found or access denied.', 'error');
                router.push('/dashboard/organize/events');
                return;
            }

            setEvent({
                id: data.event.id,
                title: data.event.title,
                currency: data.event.currency,
                reference: data.event.reference,
                created_at: data.event.created_at,
                starts_at: data.event.starts_at,
            });
            setTiers(data.tiers || []);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load ticket tiers.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => {
        fetchTiersData();
    }, [fetchTiersData]);

    const filteredTiers = useMemo(() => {
        return tiers.filter((tier) => {
            const matchesSearch = tier.display_name.toLowerCase().includes(searchTerm.toLowerCase());
            let matchesFilter = true;
            if (filter === 'paid') {
                matchesFilter = tier.price > 0;
            } else if (filter === 'free') {
                matchesFilter = tier.price === 0;
            } else if (filter === 'available') {
                matchesFilter = tier.capacity === 0 || tier.tickets_sold < tier.capacity;
            } else if (filter === 'sold_out') {
                matchesFilter = tier.capacity > 0 && tier.tickets_sold >= tier.capacity;
            }
            return matchesSearch && matchesFilter;
        });
    }, [tiers, searchTerm, filter]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading ticket tiers..." centered />
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
            <PageHeader
                title="Ticket Tiers"
                subtitle={`Manage and track ticket tier distribution for "${event.title}"`}
                closeHref={`/dashboard/organize/events/${id}`}
            />

            {/* Search & Filter Toolbar */}
            <TableToolbar
                searchPlaceholder="Search tier by name..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterChips
                    options={[
                        { value: 'all', label: 'All Tiers' },
                        { value: 'paid', label: 'Paid' },
                        { value: 'free', label: 'Free' },
                        { value: 'available', label: 'Available' },
                        { value: 'sold_out', label: 'Sold Out' },
                    ]}
                    currentValue={filter}
                    onChange={setFilter}
                />
            </TableToolbar>

            {/* Tiers List Card */}
            <div className={adminStyles.pageCard}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                <th style={thStyle}>Tier Name</th>
                                <th style={thStyle}>Price</th>
                                <th style={thStyle}>Sold / Capacity</th>
                                <th style={thStyle}>Sell-through</th>
                                <th style={thStyle}>Sale Window</th>
                                <th style={thStyle}>Max Per Order</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTiers.map(tier => {
                                const fill = tier.capacity > 0 ? ((tier.tickets_sold / tier.capacity) * 100).toFixed(0) : '0';

                                let saleWindow = 'Always Active';
                                if (tier.sales_start || tier.sales_end) {
                                    const startStr = tier.sales_start ? formatDate(tier.sales_start) : 'Now';
                                    const endStr = tier.sales_end ? formatDate(tier.sales_end) : 'Event End';
                                    saleWindow = `${startStr} — ${endStr}`;
                                }

                                return (
                                    <tr key={tier.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                        <td style={tdStyle}>
                                            <span style={{ fontWeight: 600 }}>{tier.display_name}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            {tier.price > 0 ? formatCurrency(tier.price, event.currency) : 'Free'}
                                        </td>
                                        <td style={tdStyle}>
                                            {formatNumber(tier.tickets_sold)} / {formatNumber(tier.capacity)}
                                        </td>
                                        <td style={tdStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '80px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            width: `${fill}%`,
                                                            height: '100%',
                                                            borderRadius: '3px',
                                                            background: Number(fill) >= 90 ? 'var(--color-interface-error)' : 'var(--color-brand-primary)'
                                                        }}
                                                    />
                                                </div>
                                                <span style={{ opacity: 0.8, fontSize: '13px', fontWeight: 500 }}>{fill}%</span>
                                            </div>
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: '13px', opacity: 0.8 }}>
                                            {saleWindow}
                                        </td>
                                        <td style={{ ...tdStyle, fontSize: '13px', opacity: 0.8 }}>
                                            {tier.max_per_order ? `${tier.max_per_order} tickets` : 'Unlimited'}
                                        </td>
                                        <td style={tdStyle}>
                                            <button
                                                className={adminStyles.btnSecondary}
                                                style={{ padding: '6px 14px', fontSize: '13px' }}
                                                onClick={() => setEditingTier(tier)}
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTiers.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5, padding: '30px 16px' }}>
                                        {searchTerm || filter !== 'all' ? 'No ticket tiers match your search and filter criteria.' : 'No ticket tiers configured for this event.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingTier && event && (
                <TierEditModal
                    tier={editingTier}
                    event={event}
                    onClose={() => setEditingTier(null)}
                    onSaved={(updated) => {
                        setTiers(prev => prev.map(t => t.id === updated.id ? updated : t));
                        setEditingTier(null);
                    }}
                />
            )}
        </div>
    );
}

interface TierEditModalProps {
    tier: TicketTier;
    event: EventDetail;
    onClose: () => void;
    onSaved: (updated: TicketTier) => void;
}

/**
 * Edits a tier's sale window and max-per-order in a modal rather than
 * inline in the table — DateRangeRow's popup calendar needs room to render
 * outside the table's own horizontal-scroll container, which clips any
 * absolutely-positioned popup that tries to open from inside a cell.
 *
 * A tier with no sale window/max-per-order set yet presets to the event's
 * own created_at -> starts_at span and a max of 1 per order, rather than
 * opening blank — the common case is "sales open now through the event
 * start," so this saves the organizer from typing it every time.
 */
const TierEditModal: React.FC<TierEditModalProps> = ({ tier, event, onClose, onSaved }) => {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [startDate, setStartDate] = useState(
        () => toDateOnlyValue(tier.sales_start) || toDateOnlyValue(event.created_at)
    );
    const [endDate, setEndDate] = useState(
        () => toDateOnlyValue(tier.sales_end) || toDateOnlyValue(event.starts_at)
    );
    const [maxPerOrder, setMaxPerOrder] = useState(tier.max_per_order?.toString() ?? '1');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const eventsRepo = createEventsRepository(supabase);
            const fields = {
                sales_start: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : null,
                sales_end: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : null,
                max_per_order: maxPerOrder ? parseInt(maxPerOrder, 10) : null,
            };
            const { error } = await eventsRepo.updateTier(tier.id, fields);
            if (error) throw error;

            showToast('Ticket tier updated.', 'success');
            onSaved({ ...tier, ...fields });
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update ticket tier.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={true} title={`Edit ${tier.display_name}`} onClose={onClose} size="medium">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
                <div>
                    <label style={{ ...labelStyle, marginBottom: '8px', display: 'block' }}>Sale Window</label>
                    <DateRangeRow
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onClear={() => { setStartDate(''); setEndDate(''); }}
                    />
                </div>

                <div className={adminStyles.inputGroup}>
                    <label style={labelStyle}>Max Per Order</label>
                    <input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        className={adminStyles.input}
                        value={maxPerOrder}
                        onChange={(e) => setMaxPerOrder(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button type="button" className={adminStyles.btnSecondary} onClick={onClose} style={{ flex: 1 }}>
                        Cancel
                    </button>
                    <button type="submit" className={adminStyles.btnPrimary} disabled={isSaving} style={{ flex: 2 }}>
                        {isSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

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

const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.6,
};
