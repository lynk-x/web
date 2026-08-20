"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatNumber, formatDate } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterChips from '@/components/shared/FilterChips';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';

interface TicketTier {
    id: string;
    display_name: string;
    price: number;
    capacity: number;
    tickets_sold: number;
    sale_starts_at: string | null;
    sale_ends_at: string | null;
    max_per_order: number | null;
}

interface EventDetail {
    id: string;
    title: string;
    currency: string;
    reference: string;
    created_at: string;
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
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTiers.map(tier => {
                                const fill = tier.capacity > 0 ? ((tier.tickets_sold / tier.capacity) * 100).toFixed(0) : '0';
                                
                                // Format sale window dates
                                let saleWindow = 'Always Active';
                                if (tier.sale_starts_at || tier.sale_ends_at) {
                                    const startStr = tier.sale_starts_at ? `${formatDate(tier.sale_starts_at)}` : 'Now';
                                    const endStr = tier.sale_ends_at ? `${formatDate(tier.sale_ends_at)}` : 'Event End';
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
                                    </tr>
                                );
                            })}
                            {filteredTiers.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5, padding: '30px 16px' }}>
                                        {searchTerm || filter !== 'all' ? 'No ticket tiers match your search and filter criteria.' : 'No ticket tiers configured for this event.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
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
