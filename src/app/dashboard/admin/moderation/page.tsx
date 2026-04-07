"use client";

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

    // Modals
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<ModerationEntry | null>(null);

    const fetchDashboardSummary = useCallback(async () => {
        const { data, error } = await supabase.rpc('admin_stat_summary');
        if (!error && data) {
            setSummary(data);
        }
    }, [supabase]);

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('moderation_reviews')
                .select('*', { count: 'exact' })
                .in('status', ['pending_review', 'flagged', 'appealed', 'rejected']);

            // Server-Side Filtering
            if (debouncedSearch) {
                query = query.ilike('reason', `%${debouncedSearch}%`);
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
        } catch (err: any) {
            showToast(err.message, 'error');
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

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, typeFilter]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleApprove = async (entry: ModerationEntry) => {
        showToast(`Approving ${entry.item_type}...`, 'info');
        try {
            const { error: modError } = await supabase
                .from('moderation_reviews')
                .update({ status: 'approved', resolved_at: new Date().toISOString() })
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
        } catch (err: any) {
            showToast(err.message, 'error');
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
                .from('moderation_reviews')
                .update({ 
                    status: 'rejected', 
                    reason,
                    resolved_at: new Date().toISOString() 
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
        } catch (err: any) {
            showToast(err.message, 'error');
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
                onConfirm={performRejection}
                title={`Reject ${selectedEntry?.item_type.toUpperCase()}`}
            />
        </div>
    );
}
