"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useMemo, use } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { exportToCSV } from '@/utils/export';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import AttendeeTable from '@/components/features/events/attendees/AttendeeTable';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import FilterChips from '@/components/shared/FilterChips';
import type { Attendee } from '@/types/organize';
import ProductTour from '@/components/dashboard/ProductTour';
import { useOrganization } from '@/context/OrganizationContext';

export default function EventAttendeesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchAttendees = async () => {
            setIsLoading(true);
            try {
                // First get event created_at and account_id
                const { data: eventData, error: evErr } = await supabase
                    .from('events')
                    .select('created_at, account_id')
                    .eq('id', id)
                    .maybeSingle();

                if (evErr) throw evErr;
                if (!eventData) throw new Error('Event not found');

                // Now get attendees via RPC
                const { data, error } = await supabase
                    .schema('api').rpc('get_organizer_attendees', {
                        p_account_id: activeAccount?.id || eventData.account_id,
                        p_event_id: id,
                        p_created_at: eventData.created_at,
                        p_limit: 10000,
                        p_offset: 0
                    });

                if (error) throw error;

                const mapped: Attendee[] = (data?.items || []).map((row: any) => ({
                    id: row.ticket_id,
                    name: row.full_name || row.user_name || 'Anonymous',
                    email: row.email || 'No email',
                    tierName: row.tier_name,
                    purchaseDate: new Date(row.created_at).toLocaleDateString(),
                    status: row.status,
                    ticketCode: row.ticket_code || 'N/A'
                }));

                setAttendees(mapped);
            } catch (err: unknown) {
                showToast(getErrorMessage(err) || 'Failed to load attendees.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendees();
    }, [id, supabase, showToast]);

    // Filter Logic
    const filteredAttendees = attendees.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.ticketCode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
    const paginatedAttendees = filteredAttendees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter]);

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedAttendees.length) {
            setSelectedIds(new Set());
        } else {
            const next = new Set(selectedIds);
            paginatedAttendees.forEach(a => next.add(a.id));
            setSelectedIds(next);
        }
    };

    const bulkActions: BulkAction[] = [
        {
            label: 'Check-in Selected',
            onClick: () => {
                showToast(`Checking in ${selectedIds.size} attendees...`, 'info');
                setSelectedIds(new Set());
            }
        }
    ];

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Attendee List"
                subtitle="Manage registrations and check-ins for this event."
                backLabel="Back to Event"
                hideDivider
                primaryAction={{
                    label: 'Export CSV',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                    onClick: () => {
                        showToast('Generating export...', 'info');
                        exportToCSV(filteredAttendees, `attendees_export_${id}`);
                    }
                }}
            />

            <TableToolbar
                searchPlaceholder="Search by name, email or order ID..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterChips
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'valid', label: 'Valid' },
                        { value: 'used', label: 'Used' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'transferred', label: 'Transferred' },
                        { value: 'expired', label: 'Expired' }
                    ]}
                    currentValue={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                />
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedIds(new Set())}
                itemTypeLabel="attendees"
            />

            <div style={{ marginTop: '16px' }} className="tour-attendee-list">
                <AttendeeTable
                    attendees={paginatedAttendees}
                    selectedIds={selectedIds}
                    onSelect={handleSelect}
                    onSelectAll={handleSelectAll}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            {isLoading && (
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    Loading attendees...
                </div>
            )}
            <ProductTour
                storageKey={activeAccount ? `hasSeenEventAttendeesJoyride_${activeAccount.id}_${id}` : `hasSeenEventAttendeesJoyride_guest_${id}`}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Attendee Management',
                        content: 'This list shows all registered attendees for your event. You can search, filter and perform bulk actions directly from here.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-attendee-list',
                        title: 'Registration Details',
                        content: 'View ticket status, purchase date and contact information for each attendee.',
                    },
                    {
                        target: 'button[onClick*="exportToCSV"]',
                        title: 'Data Portability',
                        content: 'Need your attendee list offline? Select participants and click "Export CSV" to download the data.',
                    }
                ]}
            />
        </div>
    );
}
