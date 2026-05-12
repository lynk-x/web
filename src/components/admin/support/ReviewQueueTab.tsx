"use client";
import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import ModerationTable, { ModerationEntry } from '../moderation/ModerationTable';

interface ReviewQueueTabProps {
    searchQuery?: string;
    statusFilter?: string;
}

export default function ReviewQueueTab({
    searchQuery = '',
    statusFilter = 'all'
}: ReviewQueueTabProps) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [items, setItems] = useState<ModerationEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 15;

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const { data, error } = await supabase.rpc('get_admin_support_data', {
                p_tab: 'queue',
                p_params: {
                    search: searchQuery,
                    status: statusFilter,
                    limit: itemsPerPage,
                    offset: offset
                }
            });

            if (error) throw error;

            setTotalCount(data.total || 0);
            setItems(data.items || []);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load moderation queue', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, currentPage, statusFilter, searchQuery]);

    useEffect(() => { fetchQueue(); }, [fetchQueue]);
    useEffect(() => { setCurrentPage(1); }, [statusFilter, searchQuery]);

    const handleModerate = async (entry: ModerationEntry, status: string) => {
        try {
            const { error } = await supabase.rpc('moderate_item', {
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

    return (
        <ModerationTable
            entries={items}
            isLoading={isLoading}
            onApprove={(e) => handleModerate(e, 'approved')}
            onReject={(e) => handleModerate(e, 'rejected')}
            onViewDetails={(e) => showToast(`Viewing snapshot for ${e.id}`, 'info')}
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            onPageChange={setCurrentPage}
        />
    );
}
