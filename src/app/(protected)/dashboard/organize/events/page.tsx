"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import EventTable, { Event } from '@/components/features/events/EventTable';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import EventCancellationModal from '@/components/features/events/EventCancellationModal';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import FilterChips from '@/components/shared/FilterChips';
import { createClient } from '@/utils/supabase/client';
import type { OrganizerEvent } from '@/types/organize';
import { exportToCSV } from '@/utils/export';
import { formatDate, formatDateTime, formatTime } from '@/utils/format';
import ProductTour from '@/components/dashboard/ProductTour';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';

// Main Component
export default function OrganizerEventsPage() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();

    // Data State
    const [events, setEvents] = useState<OrganizerEvent[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // Cancellation modal: stores the event to cancel + how many tickets were sold
    const [cancelTarget, setCancelTarget] = useState<{ event: OrganizerEvent; ticketsSold: number } | null>(null);

    // Add Forum modal state
    const [isAddForumModalOpen, setIsAddForumModalOpen] = useState(false);
    const [isCreatingForum, setIsCreatingForum] = useState(false);
    const [forumImageFile, setForumImageFile] = useState<File | null>(null);
    const [forumImagePreview, setForumImagePreview] = useState<string | null>(null);
    const [forumStartDate, setForumStartDate] = useState('');
    const [forumStartTime, setForumStartTime] = useState('');
    const [forumEndDate, setForumEndDate] = useState('');
    const [forumEndTime, setForumEndTime] = useState('');

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | OrganizerEvent['status']>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

    // ── fetchEvents ─────────────────────────────────────────────────────────
    const fetchEvents = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoadingEvents(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_organizer_events', {
                p_account_id: activeAccount.id,
                p_params: {
                    search: searchTerm,
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage
                }
            });

            if (error) throw error;

            interface EventItem {
                id: string;
                title: string;
                starts_at: string;
                ends_at: string | null;
                timezone: string;
                location_name: string | null;
                status: OrganizerEvent['status'];
                attendees: number;
                capacity: number;
                revenue: number | string;
                thumbnail_url: string | null;
                event_reference: string;
                is_private: boolean;
                currency: string;
                created_at: string;
                forum_id: string | null;
                forum_reference: string | null;
                min_price?: number;
                max_price?: number;
            }

            const formattedEvents: OrganizerEvent[] = (data.items || []).map((e: EventItem) => ({
                id: e.id,
                title: e.title,
                organizer: activeAccount.name,
                date: formatDate(e.starts_at),
                endDate: e.ends_at ? formatDate(e.ends_at) : undefined,
                time: formatTime(e.starts_at),
                endTime: e.ends_at ? formatTime(e.ends_at) : undefined,
                timezone: e.timezone,
                location: e.location_name || 'TBD',
                status: e.status,
                attendees: e.attendees,
                capacity: e.capacity || 0,
                revenue: Number(e.revenue) || 0,
                thumbnailUrl: e.thumbnail_url,
                eventReference: e.event_reference,
                isPrivate: e.is_private,
                currency: e.currency,
                createdAt: e.created_at,
                forum_id: e.forum_id || undefined,
                forumReference: e.forum_reference || undefined,
                minPrice: e.min_price,
                maxPrice: e.max_price
            }));

            setEvents(formattedEvents);
            setTotalCount(data.total || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load events.', 'error');
        } finally {
            setIsLoadingEvents(false);
        }
    }, [activeAccount, supabase, showToast, currentPage, itemsPerPage, searchTerm, statusFilter]);

    // ── Initialization & Data Fetching ───────────────────────────────────────
    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchEvents();
            } else {
                setEvents([]);
                setIsLoadingEvents(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchEvents]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const paginatedEvents = events;

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [searchTerm, statusFilter, categoryFilter]);

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === paginatedEvents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedEvents.map(e => e.id)));
        }
    };

    const handleDuplicate = async (event: OrganizerEvent) => {
        showToast('Cloning event...', 'info');
        try {
            const { data: newId, error } = await supabase.schema('api').rpc('duplicate_event', {
                p_event_id: event.id,
                p_created_at: event.createdAt
            });
            if (error) throw error;
            showToast('Event duplicated to draft.', 'success');
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Duplication failed', 'error');
        }
    };

    const handleBulkDuplicate = async () => {
        if (selectedIds.size === 0) return;
        showToast(`Cloning ${selectedIds.size} events...`, 'info');
        try {
            // Group IDs and their partition keys
            const selectedEvents = events.filter(e => selectedIds.has(e.id));
            const ids = selectedEvents.map(e => e.id);
            const createdAts = selectedEvents.map(e => e.createdAt);

            const { data, error } = await supabase.schema('api').rpc('bulk_duplicate_events', {
                p_event_ids: ids,
                p_created_ats: createdAts
            });
            if (error) throw error;
            showToast(`Batch duplication complete: ${data.processed_count} events added to drafts.`, 'success');
            setSelectedIds(new Set());
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Bulk duplication failed', 'error');
        }
    };

    const handleBulkAction = (action: string) => {
        if (action === 'delete') {
            setSingleDeleteId(null);
            setIsDeleteModalOpen(true);
        } else if (action === 'duplicate') {
            handleBulkDuplicate();
        } else if (action === 'publish' || action === 'draft') {
            handleBulkStatusUpdate(action === 'publish' ? 'published' : 'draft');
        } else if (action === 'export') {
            handleBulkExport();
        }
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        if (!activeAccount || selectedIds.size === 0) return;
        showToast(`Updating ${selectedIds.size} events...`, 'info');
        
        try {
            // Group IDs by partition key (createdAt)
            const groups: Record<string, string[]> = {};
            events.forEach(e => {
                if (selectedIds.has(e.id)) {
                    if (!groups[e.createdAt]) groups[e.createdAt] = [];
                    groups[e.createdAt].push(e.id);
                }
            });

            // Call RPC for each partition group
            for (const [createdAt, ids] of Object.entries(groups)) {
                const { error } = await supabase.schema('api').rpc('bulk_update_events_status', {
                    p_account_id: activeAccount.id,
                    p_event_ids: ids,
                    p_created_at: createdAt,
                    p_status: newStatus
                });
                if (error) throw error;
            }

            showToast(`Successfully updated ${selectedIds.size} events to ${newStatus}.`, 'success');
            setSelectedIds(new Set());
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update events.', 'error');
        }
    };

    const handleBulkExport = async () => {
        showToast('Preparing attendee list...', 'info');
        try {
            // Fetch tickets for selected events with user profiles
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    id,
                    ticket_code,
                    status,
                    created_at,
                    event:events(title),
                    tier:ticket_tiers(display_name),
                    user:user_profile(full_name, email, user_name)
                `)
                .in('event_id', Array.from(selectedIds));

            if (error) throw error;

            if (!data || data.length === 0) {
                showToast('No attendees found for selected events.', 'warning');
                return;
            }

            const getFirst = <T,>(val: T | T[] | null | undefined): T | null | undefined => 
                Array.isArray(val) ? val[0] : (val as T | null | undefined);

            interface TicketExportRow {
                id: string;
                ticket_code: string;
                status: string;
                created_at: string;
                event: { title: string }[] | { title: string } | null;
                tier: { display_name: string }[] | { display_name: string } | null;
                user: { full_name: string; email: string; user_name: string }[] | { full_name: string; email: string; user_name: string } | null;
            }

            const exportData = (data || []).map((t: TicketExportRow) => {
                const event = getFirst(t.event);
                const user = getFirst(t.user);
                const tier = getFirst(t.tier);
                
                return {
                    'Event': event?.title,
                    'Attendee Name': user?.full_name || user?.user_name || 'Anonymous',
                    'Email': user?.email,
                    'Ticket Code': t.ticket_code,
                    'Tier': tier?.display_name,
                    'Status': t.status,
                    'Purchased At': formatDateTime(t.created_at)
                };
            });

            exportToCSV(exportData, `attendee_list_${new Date().toISOString().split('T')[0]}`);
            showToast('Attendee list exported successfully.', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to export attendee list.', 'error');
        }
    };

    const confirmDelete = async () => {
        const idsToDelete = singleDeleteId ? new Set([singleDeleteId]) : selectedIds;
        if (!activeAccount || idsToDelete.size === 0) return;
        showToast('Processing deletion...', 'info');
        try {
            // Group IDs by partition key (createdAt)
            const groups: Record<string, string[]> = {};
            events.forEach(e => {
                if (idsToDelete.has(e.id)) {
                    if (!groups[e.createdAt]) groups[e.createdAt] = [];
                    groups[e.createdAt].push(e.id);
                }
            });

            // Call RPC for each partition group
            for (const [createdAt, ids] of Object.entries(groups)) {
                const { error } = await supabase.schema('api').rpc('bulk_delete_events', {
                    p_account_id: activeAccount.id,
                    p_event_ids: ids,
                    p_created_at: createdAt
                });
                if (error) throw error;
            }

            showToast(`Successfully deleted ${idsToDelete.size} events.`, 'success');
            if (!singleDeleteId) {
                setSelectedIds(new Set());
            }
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to delete events.', 'error');
        } finally {
            setIsDeleteModalOpen(false);
            setSingleDeleteId(null);
        }
    };

    // ── Cancellation ───────────────────────────────────────────────────────────
    const handleCancelEvent = async (reason: string) => {
        if (!cancelTarget || !activeAccount) return;

        try {
            const { error } = await supabase.schema('api').rpc('cancel_event_full', {
                p_account_id: activeAccount.id,
                p_event_id: cancelTarget.event.id,
                p_created_at: cancelTarget.event.createdAt,
                p_reason: reason
            });

            if (error) throw error;

            showToast(`"${cancelTarget.event.title}" has been cancelled and tickets were refunded.`, 'success');
            setCancelTarget(null);
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to cancel event.', 'error');
        }
    };

    const handleEdit = (event: OrganizerEvent) => {
        router.push(`/dashboard/organize/events/edit/${event.id}`);
    };

    const handleStatusChange = async (event: OrganizerEvent, newStatus: string) => {
        if (!activeAccount) return;
        // Route cancellations through the modal so a reason is always captured
        if (newStatus === 'cancelled') {
            setCancelTarget({ event, ticketsSold: event.attendees || 0 });
            return;
        }
        try {
            const { error } = await supabase.schema('api').rpc('bulk_update_events_status', {
                p_account_id: activeAccount.id,
                p_event_ids: [event.id],
                p_created_at: event.createdAt,
                p_status: newStatus
            });

            if (error) throw error;
            showToast(`Event status updated to ${newStatus}.`, 'success');
            fetchEvents();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update event status.', 'error');
        }
    };

    const handleDeleteSingle = (event: OrganizerEvent) => {
        setSingleDeleteId(event.id);
        setIsDeleteModalOpen(true);
    };

    const handleAddForum = async (formData: { title: string; startDate: string; startTime: string; endDate: string; endTime: string; location: string }) => {
        if (!activeAccount) return;
        setIsCreatingForum(true);
        try {
            let uploadedImageUrl: string | null = null;

            if (forumImageFile) {
                const fileExt = forumImageFile.name.split('.').pop();
                const fileName = `${activeAccount.id}_${Date.now()}.${fileExt}`;

                const { data: signData, error: signError } = await supabase.functions.invoke('media-signer', {
                    body: {
                        action: 'upload',
                        folder: 'events',
                        filename: fileName,
                        contentType: forumImageFile.type,
                        mediaType: 'image',
                    }
                });

                if (signError || !signData?.uploadUrl) {
                    throw new Error(signError?.message || 'Failed to get upload URL');
                }

                const putResponse = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': forumImageFile.type,
                    },
                    body: forumImageFile,
                });

                if (!putResponse.ok) {
                    throw new Error('Failed to upload image');
                }

                uploadedImageUrl = signData.fileUrl;
            }

            const eventData: Record<string, any> = {
                title: formData.title,
                status: 'published',
                location: { venue: formData.location || 'External' },
                media: uploadedImageUrl ? { thumbnail: uploadedImageUrl } : {},
                ...(formData.startDate && formData.startTime ? { starts_at: new Date(`${formData.startDate}T${formData.startTime}`).toISOString() } : {}),
                ...(formData.endDate && formData.endTime ? { ends_at: new Date(`${formData.endDate}T${formData.endTime}`).toISOString() } : {})
            };

            const { data, error } = await supabase.schema('api').rpc('upsert_organizer_event', {
                p_account_id: activeAccount.id,
                p_event_id: null,
                p_created_at: null,
                p_data: eventData,
                p_tiers: []
            });

            if (error) throw error;

            const eventId = data?.event_id;
            const createdAt = data?.created_at;

            if (!eventId || !createdAt) {
                throw new Error('Event creation failed: missing event id or timestamp');
            }

            const { data: forumRow, error: forumError } = await supabase
                .schema('api')
                .from('v1_forums')
                .select('id, reference')
                .eq('event_id', eventId)
                .maybeSingle();

            if (forumError || !forumRow) {
                throw new Error('Forum was not created for this event.');
            }

            const forumLink = `https://app.lynk-x.app/forum/${forumRow.reference || forumRow.id}`;
            showToast('Forum created successfully.', 'success');
            setIsAddForumModalOpen(false);
            setForumImageFile(null);
            setForumImagePreview(null);
            setForumStartDate('');
            setForumStartTime('');
            setForumEndDate('');
            setForumEndTime('');
            fetchEvents();

            window.open(forumLink, '_blank');
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create forum.', 'error');
        } finally {
            setIsCreatingForum(false);
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="My Events"
                subtitle="Manage and track all your scheduled events."
                actionLabel="Create Event"
                onActionClick={() => router.push('/dashboard/organize/events/create')}
                actionIcon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                }
                secondaryAction={{
                    label: 'Add Forum',
                    onClick: () => setIsAddForumModalOpen(true),
                }}
            />

            {/* Toolbar */}
            <div className="tour-events-filter">
                <TableToolbar
                    searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search events..."
            >
                <FilterChips
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'published', label: 'Published' },
                        { value: 'active', label: 'Active' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                        { value: 'suspended', label: 'Suspended' }
                    ]}
                    currentValue={statusFilter}
                     onChange={(val) => setStatusFilter(val as OrganizerEvent['status'] | 'all')}
                />
                </TableToolbar>
            </div>

            {/* Bulk Actions */}
            <div className="tour-bulk-actions">
                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    onCancel={() => setSelectedIds(new Set())}
                    actions={[
                        { label: 'Duplicate Selected', onClick: () => handleBulkAction('duplicate'), variant: 'default' },
                        { label: 'Publish Selected', onClick: () => handleBulkAction('publish'), variant: 'default' },
                        { label: 'Delete Selected', onClick: () => handleBulkAction('delete'), variant: 'danger' }
                    ]}
                />
            </div>

            {/* Table */}
            <EventTable
                mode="organizer"
                events={paginatedEvents}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onEdit={handleEdit}
                onDelete={handleDeleteSingle}
                onDuplicate={handleDuplicate}
                onStatusChange={handleStatusChange}
                isLoading={isLoadingEvents}
                className="tour-events-table"
            />

            {/* Modals */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setSingleDeleteId(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Events?"
                message={`Are you sure you want to delete ${singleDeleteId ? 1 : selectedIds.size} selected event(s)? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
            {/* Cancellation modal */}
            {cancelTarget && (
                <EventCancellationModal
                    eventTitle={cancelTarget.event.title}
                    eventId={cancelTarget.event.id}
                    ticketsSold={cancelTarget.ticketsSold || 0}
                    onClose={() => setCancelTarget(null)}
                    onConfirm={handleCancelEvent}
                />
            )}

            {/* Add Forum Modal */}
            {isAddForumModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '16px'
                }} onClick={() => setIsAddForumModalOpen(false)}>
                    <div style={{
                        backgroundColor: 'var(--color-interface-surface)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        maxWidth: '480px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Add Event Forum</h2>
                            <button onClick={() => setIsAddForumModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '4px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' }}>
                            Create a minimal Lynk-X event to host your forum. You can link this from your external event page or send the forum link to attendees.
                        </p>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const fd = new FormData(form);
                            handleAddForum({
                                title: fd.get('title') as string,
                                startDate: forumStartDate,
                                startTime: forumStartTime,
                                endDate: forumEndDate,
                                endTime: forumEndTime,
                                location: fd.get('location') as string,
                            });
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Event Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setForumImageFile(file);
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => setForumImagePreview(ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            } else {
                                                setForumImagePreview(null);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            color: 'var(--color-utility-primaryText)',
                                            fontSize: '14px'
                                        }}
                                    />
                                    {forumImagePreview && (
                                        <div style={{ marginTop: '8px', position: 'relative', display: 'inline-block' }}>
                                            <img src={forumImagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.2)' }} />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForumImageFile(null);
                                                    setForumImagePreview(null);
                                                }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: 'rgba(0,0,0,0.8)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    color: 'white',
                                                    fontSize: '16px',
                                                    lineHeight: 1
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Event Title *</label>
                                    <input
                                        name="title"
                                        required
                                        placeholder="My Event Forum"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            color: 'var(--color-utility-primaryText)',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Start Date</label>
                                        <DatePicker
                                            value={forumStartDate}
                                            onChange={setForumStartDate}
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Start Time</label>
                                        <TimePicker
                                            value={forumStartTime}
                                            onChange={setForumStartTime}
                                            placeholder="HH:MM"
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>End Date</label>
                                        <DatePicker
                                            value={forumEndDate}
                                            onChange={setForumEndDate}
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>End Time</label>
                                        <TimePicker
                                            value={forumEndTime}
                                            onChange={setForumEndTime}
                                            placeholder="HH:MM"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>External Link</label>
                                    <input
                                        name="location"
                                        placeholder="https://example.com/event"
                                        type="url"
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            color: 'var(--color-utility-primaryText)',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddForumModalOpen(false)}
                                        disabled={isCreatingForum}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            backgroundColor: 'transparent',
                                            color: 'rgba(255,255,255,0.7)',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreatingForum}
                                        style={{
                                            padding: '10px 16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: 'none',
                                            backgroundColor: 'var(--color-brand-primary)',
                                            color: 'var(--color-utility-secondaryText)',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            opacity: isCreatingForum ? 0.6 : 1
                                        }}
                                    >
                                        {isCreatingForum ? 'Creating...' : 'Create Forum'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgEventsJoyride_${activeAccount.id}` : 'hasSeenOrgEventsJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Manage Your Events',
                        content: 'This is where all your Lynk-X events live. View status, dates, ticket sales and forum activity at a glance — then drill into any event for full details.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-events-filter',
                        title: 'Find Events Fast',
                        content: 'Use the status filter chips (Draft, Published, Active, Completed) or the search bar to quickly surface the events you need.',
                    },
                    {
                        target: '.tour-events-table',
                        title: 'Event Overview',
                        content: 'Each row shows the event status, ticket capacity and revenue at a glance. Click a row to open the full event detail page, or use the action menu to edit or cancel.',
                    },
                    {
                        target: '.tour-bulk-actions',
                        title: 'Bulk Operations',
                        content: 'Select multiple events using the checkboxes, then perform bulk actions like publishing drafts or deleting events — saving time when managing large portfolios.',
                    },
                ]}
            />
        </div>
    );
}

