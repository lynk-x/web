"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { useDebounce } from '@/hooks/useDebounce';
import KycVerificationTable from './KycVerificationTable';
import KycDetailModal from './KycDetailModal';
import type { KycVerification } from '@/types/admin';
import TableToolbar from '@/components/shared/TableToolbar';
import StatusFilterChips from '@/components/shared/StatusFilterChips';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

interface KYCTabProps {
    searchTerm: string;
    onSearchChange: (val: string) => void;
    statusFilter: string;
}

const KYCTab: React.FC<KYCTabProps> = ({ searchTerm, onSearchChange, statusFilter }) => {
    const supabase = createClient();
    const { showToast } = useToast();
    
    const [queue, setQueue] = useState<KycVerification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [selectedVerification, setSelectedVerification] = useState<KycVerification | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const itemsPerPage = 20;

    const fetchQueue = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_kyc_queue', {
                p_params: {
                    status: statusFilter,
                    search: debouncedSearch,
                    limit: itemsPerPage,
                    offset: (currentPage - 1) * itemsPerPage
                }
            });

            if (error) throw error;

            setQueue(data.queue || []);
            setTotalCount(data.total_count || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load KYC queue', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast, statusFilter, currentPage]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Reset pagination on filter or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, debouncedSearch]);

    const handleManageRequest = async (id: string, action: string, reason?: string) => {
        try {
            const { error } = await supabase.rpc('admin_manage_kyc_request', {
                p_action: action,
                p_id: id,
                p_params: reason ? { reason } : {}
            });

            if (error) throw error;

            showToast(`KYC request ${action}ed successfully`, 'success');
            fetchQueue();
            setIsDetailModalOpen(false);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || `Failed to ${action} KYC request`, 'error');
        }
    };

    return (
        <div className={adminStyles.container}>

            <KycVerificationTable
                data={queue}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                onPageChange={setCurrentPage}
                onViewDetails={(v) => {
                    setSelectedVerification(v);
                    setIsDetailModalOpen(true);
                }}
                onApprove={(v) => handleManageRequest(v.id, 'approve')}
                onReject={(v) => {
                    const reason = window.prompt('Enter rejection reason:');
                    if (reason) handleManageRequest(v.id, 'reject', reason);
                }}
            />

            {selectedVerification && (
                <KycDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    verification={selectedVerification}
                    onApprove={(v) => handleManageRequest(v.id, 'approve')}
                    onReject={(v, reason) => handleManageRequest(v.id, 'reject', reason)}
                />
            )}
        </div>
    );
};

export default KYCTab;
