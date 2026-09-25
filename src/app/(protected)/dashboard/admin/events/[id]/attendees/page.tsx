"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/utils/format';
import { exportToCSV } from '@/utils/export';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';
import Badge from '@/components/shared/Badge';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterChips from '@/components/shared/FilterChips';

interface EventBasics {
    id: string;
    title: string;
    organizer: string;
    created_at: string;
}

interface AttendeeRow {
    id: string;
    ticket_id: string;
    ticket_code: string;
    status: string;
    created_at: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    tier_name: string;
    purchased_price: number | null;
    purchased_currency: string | null;
}

/**
 * Admin sub-page listing every attendee/ticket for an event — split out of
 * the event detail page's former "Attendees" tab into a real sub-route,
 * matching the organizer dashboard's event detail layout.
 */
export default function AdminEventAttendeesPage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className={adminStyles.container}><Spinner label="Loading..." centered /></div>}>
            <AdminEventAttendeesContent {...props} />
        </Suspense>
    );
}

function AdminEventAttendeesContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventCreatedAt = searchParams.get('created_at');
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventBasics | null>(null);
    const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAttendeesLoading, setIsAttendeesLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchEvent = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!eventCreatedAt) {
                showToast('Missing event reference — please open this page from the events list.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            const { data, error } = await supabase.schema('api').rpc('get_admin_event_details', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
            });
            if (error) throw error;
            if (!data) {
                showToast('Event not found.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            setEvent(data.event as EventBasics);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast, router]);

    const fetchAttendees = useCallback(async () => {
        if (!event) return;
        setIsAttendeesLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_event_attendees', {
                p_event_id: id,
                p_created_at: event.created_at,
                p_limit: 100,
                p_offset: 0,
            });
            if (error) throw error;
            const items = (data?.items || []) as Omit<AttendeeRow, 'id'>[];
            setAttendees(items.map((a) => ({ ...a, id: a.ticket_id })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load attendees.', 'error');
        } finally {
            setIsAttendeesLoading(false);
        }
    }, [id, event, supabase, showToast]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);
    useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading event details..." centered />
                </div>
            </div>
        );
    }

    const currency = attendees[0]?.purchased_currency || 'USD';

    const filteredAttendees = attendees.filter((a) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term
            || (a.full_name && a.full_name.toLowerCase().includes(term))
            || (a.email && a.email.toLowerCase().includes(term))
            || a.ticket_code.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const attendeeColumns: Column<AttendeeRow>[] = [
        {
            header: 'Attendee',
            render: (a) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{a.full_name || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{a.email}</div>
                </div>
            ),
        },
        { header: 'Ticket Code', render: (a) => <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{a.ticket_code}</span> },
        { header: 'Tier', render: (a) => a.tier_name },
        {
            header: 'Price Paid',
            render: (a) => a.purchased_price != null ? formatCurrency(a.purchased_price, a.purchased_currency || currency) : '—',
        },
        {
            header: 'Status',
            render: (a) => <Badge label={a.status.toUpperCase()} variant={a.status === 'valid' ? 'success' : a.status === 'used' ? 'info' : 'subtle'} showDot />,
        },
        { header: 'Purchased', render: (a) => formatDate(a.created_at) },
    ];

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Attendees"
                subtitle={`${event.title} — organized by ${event.organizer}.`}
                closeHref={`/dashboard/admin/events/${id}?created_at=${encodeURIComponent(eventCreatedAt || '')}`}
                secondaryAction={{
                    label: 'Export CSV',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                    onClick: () => {
                        showToast('Generating export...', 'info');
                        exportToCSV(filteredAttendees, `attendees_export_${id}`);
                    }
                }}
            />

            <TableToolbar
                searchPlaceholder="Search by name, email or ticket code..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterChips
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'valid', label: 'Valid' },
                        { value: 'used', label: 'Used' },
                        { value: 'refunded', label: 'Refunded' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'transferred', label: 'Transferred' },
                        { value: 'expired', label: 'Expired' },
                    ]}
                    currentValue={statusFilter}
                    onChange={setStatusFilter}
                />
            </TableToolbar>

            <div style={{ marginTop: '16px' }}>
                <DataTable<AttendeeRow>
                    data={filteredAttendees}
                    columns={attendeeColumns}
                    isLoading={isAttendeesLoading}
                    emptyMessage="No attendees have purchased tickets for this event yet."
                />
            </div>
        </div>
    );
}
