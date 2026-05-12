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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedVerification, setSelectedVerification] = useState<KycVerification | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isBulkLoading, setIsBulkLoading] = useState(false);

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
        setSelectedIds(new Set());
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
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || `Failed to ${action} KYC request`, 'error');
        }
    };

    const handleBulkAction = async (action: 'approve' | 'reject') => {
        if (selectedIds.size === 0) return;
        
        let reason = '';
        if (action === 'reject') {
            reason = window.prompt('Enter rejection reason for all selected items:') || '';
            if (!reason) return;
        }

        if (!window.confirm(`Are you sure you want to bulk ${action} ${selectedIds.size} requests?`)) return;

        setIsBulkLoading(true);
        try {
            const { error } = await supabase.rpc('bulk_update_kyc_status', {
                p_verification_ids: Array.from(selectedIds),
                p_new_status: action === 'approve' ? 'approved' : 'rejected',
                p_rejection_reason: reason || null
            });

            if (error) throw error;

            showToast(`Bulk ${action} completed successfully`, 'success');
            fetchQueue();
            setSelectedIds(new Set());
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Bulk action failed', 'error');
        } finally {
            setIsBulkLoading(false);
        }
    };

    return (
        <div className={adminStyles.container}>

            {selectedIds.size > 0 && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    animation: 'slideIn 0.2s ease-out'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, marginRight: 'auto' }}>
                        {selectedIds.size} requests selected
                    </span>
                    <button 
                        className={adminStyles.actionButton}
                        onClick={() => handleBulkAction('approve')}
                        disabled={isBulkLoading}
                        style={{ background: 'var(--color-status-success)', color: 'white', border: 'none' }}
                    >
                        Bulk Approve
                    </button>
                    <button 
                        className={adminStyles.actionButton}
                        onClick={() => handleBulkAction('reject')}
                        disabled={isBulkLoading}
                        style={{ background: 'var(--color-status-error)', color: 'white', border: 'none' }}
                    >
                        Bulk Reject
                    </button>
                    <button 
                        className={adminStyles.actionButton}
                        onClick={() => setSelectedIds(new Set())}
                        disabled={isBulkLoading}
                    >
                        Cancel
                    </button>
                </div>
            )}

            <KycVerificationTable
                data={queue}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelect={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    setSelectedIds(next);
                }}
                onSelectAll={() => {
                    if (selectedIds.size === queue.length) {
                        setSelectedIds(new Set());
                    } else {
                        setSelectedIds(new Set(queue.map(q => q.id)));
                    }
                }}
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
