"use client";

import { useState, useEffect, useMemo, use } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { exportToCSV } from '@/utils/export';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import AttendeeTable from '@/components/features/events/attendees/AttendeeTable';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import SubPageHeader from '@/components/shared/SubPageHeader';
import type { Attendee } from '@/types/organize';

export default function EventAttendeesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { showToast } = useToast();
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
                const { data, error } = await supabase
                    .from('vw_attendees_list')
                    .select('*')
                    .eq('event_id', id)
                    .order('purchase_date', { ascending: false });

                if (error) throw error;

                const mapped: Attendee[] = (data || []).map((row: any) => ({
                    id: row.ticket_id,
                    name: row.attendee_name || 'Anonymous',
                    email: row.attendee_email || 'No email',
                    tierName: row.tier_name,
                    purchaseDate: new Date(row.purchase_date).toLocaleDateString(),
                    status: row.ticket_status,
                    ticketCode: row.ticket_code
                }));

                setAttendees(mapped);
            } catch (err: any) {
                showToast(err.message || 'Failed to load attendees.', 'error');
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
        },
        {
            label: 'Export CSV',
            onClick: () => {
                showToast('Generating export...', 'info');
                exportToCSV(filteredAttendees, `attendees_export_${id}`);
            }
        }
    ];

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Attendee List"
                subtitle="Manage registrations and check-ins for this event."
                backLabel="Back to Event"
            />

            <TableToolbar
                searchPlaceholder="Search by name, email, or order ID..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div className={adminStyles.filterGroup}>
                    {['all', 'valid', 'used', 'cancelled', 'transferred'].map(status => (
                        <button
                            key={status}
                            className={`${adminStyles.chip} ${statusFilter === status ? adminStyles.chipActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedIds(new Set())}
                itemTypeLabel="attendees"
            />

            <div style={{ marginTop: '16px' }}>
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
        </div>
    );
}
