"use client";
import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import ModerationTable, { ModerationEntry } from '../moderation/ModerationTable';

interface ReviewQueueTabProps {
    searchQuery?: string;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
}

export default function ReviewQueueTab({
    searchQuery = '',
    statusFilter = 'all',
    startDate = '',
    endDate = '',
}: ReviewQueueTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<ModerationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const itemsPerPage = 15;

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const { data, error } = await supabase.schema('api').rpc('get_admin_support_data', {
                p_tab: 'queue',
                p_params: {
                    search: searchQuery,
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: offset
                }
            });

            if (error) throw error;

            let raw = data.items || [];
            if (startDate || endDate) {
                const startTs = startDate ? new Date(startDate).getTime() : 0;
                const endTs   = endDate   ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
                raw = raw.filter((m: ModerationEntry) => {
                    const t = new Date(m.created_at).getTime();
                    return t >= startTs && t <= endTs;
                });
            }
            setTotalCount(data.total || 0);
            setItems(raw);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load moderation queue', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, statusFilter, searchQuery, startDate, endDate]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);
    useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery, startDate, endDate]);
    useEffect(() => { setSelectedIds(new Set()); }, [currentPage, statusFilter, searchQuery, startDate, endDate]);

    const handleModerate = async (entry: ModerationEntry, status: string) => {
        try {
            const { error } = await supabase.schema('api').rpc('moderate_item', {
                p_moderation_id: entry.id,
                p_status: status,
                p_reason: 'Reviewed via administrative dashboard'
            });
            if (error) throw error;
            showToast(`Item ${status}`, 'success');
            fetchQueue();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleBulkModerate = async (status: string) => {
        if (selectedIds.size === 0) return;
        try {
            const results = await Promise.all(Array.from(selectedIds).map(id => {
                const entry = items.find(i => i.id === id);
                if (!entry) return Promise.resolve({ error: null });
                return supabase.schema('api').rpc('moderate_item', {
                    p_moderation_id: entry.id,
                    p_status: status,
                    p_reason: 'Reviewed via administrative dashboard'
                });
            }));
            const failed = results.filter(r => r && r.error);
            if (failed.length > 0) {
                showToast(getErrorMessage(failed[0].error), 'error');
                return;
            }
            setSelectedIds(new Set());
            showToast(`Updated ${selectedIds.size} items to ${status}`, 'success');
            fetchQueue();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const bulkActions: BulkAction[] = selectedIds.size > 0 ? [
        { label: 'Approve Selected', onClick: () => handleBulkModerate('approved') },
        { label: 'Reject Selected', onClick: () => handleBulkModerate('rejected'), variant: 'danger' },
    ] : [];

    return (
        <>
            <BulkActionsBar
                selectedCount={selectedIds.size}
                actions={bulkActions}
                onCancel={() => setSelectedIds(new Set())}
                itemTypeLabel="items"
            />
            <ModerationTable
            entries={items}
            isLoading={isLoading}
            onApprove={(e) => handleModerate(e, 'approved')}
            onReject={(e) => handleModerate(e, 'rejected')}
            onViewDetails={(e) => showToast(`Viewing snapshot for ${e.id}`, 'info')}
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            onPageChange={setCurrentPage}
            selectedIds={selectedIds}
            onSelect={(id: string) => {
                const next = new Set(selectedIds);
                if (next.has(id)) next.delete(id); else next.add(id);
                setSelectedIds(next);
            }}
            onSelectAll={() => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map(i => i.id)))}
        />
        </>
    );
}
