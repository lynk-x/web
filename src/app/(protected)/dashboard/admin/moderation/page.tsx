"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import adminStyles from '../page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import TableToolbar from '@/components/shared/TableToolbar';
import ModerationTable, { ModerationEntry } from '@/components/admin/moderation/ModerationTable';
import ModerationDetailModal from '@/components/admin/moderation/ModerationDetailModal';
import RejectionModal from '@/components/shared/RejectionModal';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export default function AdminModerationPage() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [entries, setEntries] = useState<ModerationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [summary, setSummary] = useState<any>(null);
    const itemsPerPage = 10;

    const debouncedSearch = useDebounce(searchTerm, 500);

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modals
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<ModerationEntry | null>(null);

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (error) {
            return;
        }
        if (data) setSummary(data);
    }, [supabase]);

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .schema('api')
                .from('v1_moderation_queue')
                .select('*', { count: 'exact' })
                .in('status', ['pending_review', 'flagged', 'appealed']);

            // Server-Side Filtering
            if (debouncedSearch) {
                query = query.ilike('reason_label', `%${debouncedSearch}%`);
            }
            if (typeFilter !== 'all') {
                query = query.eq('item_type', typeFilter);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setEntries(data || []);
            setTotalCount(count || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, debouncedSearch, typeFilter, currentPage, showToast]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    useEffect(() => {
        fetchDashboardSummary();
    }, [fetchDashboardSummary]);

    // Real-time subscription for new moderation entries
    useEffect(() => {
        const channel = supabase
            .channel('moderation-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation' }, () => {
                fetchQueue();
                fetchDashboardSummary();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [supabase, fetchQueue, fetchDashboardSummary]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, typeFilter]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleApprove = async (entry: ModerationEntry) => {
        showToast(`Approving ${entry.item_type}...`, 'info');
        try {
            const { error: modError } = await supabase
                .from('moderation')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .eq('id', entry.id);

            if (modError) throw modError;

            const table = entry.item_type === 'event' ? 'events' : 'ad_campaigns';
            const { error: itemError } = await supabase
                .from(table)
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('id', entry.item_id);

            if (itemError) throw itemError;

            showToast(`${entry.item_type} approved and set to active.`, 'success');
            fetchQueue();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleReject = (entry: ModerationEntry) => {
        setSelectedEntry(entry);
        setIsRejectionModalOpen(true);
    };

    const performRejection = async (reason: string) => {
        if (!selectedEntry) return;

        showToast(`Rejecting ${selectedEntry.item_type}...`, 'info');
        try {
            const { error: modError } = await supabase
                .from('moderation')
                .update({
                    status: 'rejected',
                    review: { reason },
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedEntry.id);

            if (modError) throw modError;

            const table = selectedEntry.item_type === 'event' ? 'events' : 'ad_campaigns';
            const { error: itemError } = await supabase
                .from(table)
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', selectedEntry.item_id);

            if (itemError) throw itemError;

            showToast(`${selectedEntry.item_type} rejected with feedback.`, 'success');
            setIsRejectionModalOpen(false);
            fetchQueue();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleSelectEntry = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === entries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(entries.map(e => e.id)));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        showToast(`Approving ${selectedIds.size} items...`, 'info');
        try {
            const ids = Array.from(selectedIds);
            const { error } = await supabase
                .from('moderation')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .in('id', ids);

            if (error) throw error;

            // Activate the underlying items
            const selected = entries.filter(e => selectedIds.has(e.id));
            const eventIds = selected.filter(e => e.item_type === 'event').map(e => e.item_id);
            const campaignIds = selected.filter(e => e.item_type === 'campaign').map(e => e.item_id);

            if (eventIds.length > 0) {
                await supabase.from('events').update({ status: 'active', updated_at: new Date().toISOString() }).in('id', eventIds);
            }
            if (campaignIds.length > 0) {
                await supabase.from('ad_campaigns').update({ status: 'active', updated_at: new Date().toISOString() }).in('id', campaignIds);
            }

            showToast(`${ids.length} items approved.`, 'success');
            setSelectedIds(new Set());
            fetchQueue();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleBulkReject = () => {
        if (selectedIds.size === 0) return;
        // Use rejection modal for bulk — sets selectedEntry to null to indicate bulk mode
        setSelectedEntry(null);
        setIsRejectionModalOpen(true);
    };

    const performBulkRejection = async (reason: string) => {
        const ids = Array.from(selectedIds);
        showToast(`Rejecting ${ids.length} items...`, 'info');
        try {
            const { error } = await supabase
                .from('moderation')
                .update({ status: 'rejected', review: { reason }, updated_at: new Date().toISOString() })
                .in('id', ids);

            if (error) throw error;

            const selected = entries.filter(e => selectedIds.has(e.id));
            const eventIds = selected.filter(e => e.item_type === 'event').map(e => e.item_id);
            const campaignIds = selected.filter(e => e.item_type === 'campaign').map(e => e.item_id);

            if (eventIds.length > 0) {
                await supabase.from('events').update({ status: 'rejected', updated_at: new Date().toISOString() }).in('id', eventIds);
            }
            if (campaignIds.length > 0) {
                await supabase.from('ad_campaigns').update({ status: 'rejected', updated_at: new Date().toISOString() }).in('id', campaignIds);
            }

            showToast(`${ids.length} items rejected.`, 'success');
            setSelectedIds(new Set());
            setIsRejectionModalOpen(false);
            fetchQueue();
            fetchDashboardSummary();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Moderation Queue"
                subtitle="Review pending content, flag violations, and handle user reports from a single cockpit."
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard 
                    label="Global Pending" 
                    value={summary?.pending_moderation || 0} 
                    change="Items awaiting action" 
                    trend={summary?.pending_moderation > 0 ? "negative" : "positive"} 
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Active Events" 
                    value={summary?.active_events || 0} 
                    change="Cleared content" 
                    trend="positive" 
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Active Campaigns" 
                    value={summary?.active_campaigns || 0} 
                    change="Monetized content" 
                    trend="positive" 
                    isLoading={!summary} 
                />
                <StatCard 
                    label="Flagged History" 
                    value={totalCount} 
                    change="Items in current view" 
                    trend="neutral" 
                    isLoading={isLoading} 
                />
            </div>

            <TableToolbar
                searchPlaceholder="Search moderation reason..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                        { id: 'all', label: 'All Content' },
                        { id: 'event', label: 'Events' },
                        { id: 'campaign', label: 'Campaigns' },
                        { id: 'forum_message', label: 'Messages' }
                    ].map(type => (
                        <button 
                            key={type.id}
                            className={`${adminStyles.chip} ${typeFilter === type.id ? adminStyles.chipActive : ''}`}
                            onClick={() => setTypeFilter(type.id)}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            {selectedIds.size > 0 && (
                <div className={adminStyles.bulkBar}>
                    <span>{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={adminStyles.bulkApprove} onClick={handleBulkApprove}>
                            Approve All
                        </button>
                        <button className={adminStyles.bulkReject} onClick={handleBulkReject}>
                            Reject All
                        </button>
                        <button className={adminStyles.bulkClear} onClick={() => setSelectedIds(new Set())}>
                            Clear
                        </button>
                    </div>
                </div>
            )}

            <div className={adminStyles.pageCard}>
                <ModerationTable
                    entries={entries}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onViewDetails={(e) => {
                        setSelectedEntry(e);
                        setIsDetailModalOpen(true);
                    }}
                    selectedIds={selectedIds}
                    onSelect={handleSelectEntry}
                    onSelectAll={handleSelectAll}
                />
            </div>

            <ModerationDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                entry={selectedEntry}
            />

            <RejectionModal
                isOpen={isRejectionModalOpen}
                onClose={() => setIsRejectionModalOpen(false)}
                onConfirm={selectedEntry ? performRejection : performBulkRejection}
                title={selectedEntry ? `Reject ${selectedEntry.item_type.toUpperCase()}` : `Reject ${selectedIds.size} Items`}
            />
        </div>
    );
}
