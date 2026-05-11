"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import FilterGroup from '@/components/dashboard/FilterGroup';
import KycVerificationTable from '@/components/admin/users/KycVerificationTable';
import KycDetailModal from '@/components/admin/users/KycDetailModal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from '../../page.module.css';
import type { KycVerification } from '@/types/admin';

function KycVerificationsContent() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [verifications, setVerifications] = useState<KycVerification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 20;

    // Modals
    const [selectedVerification, setSelectedVerification] = useState<KycVerification | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const debouncedSearch = useDebounce(searchTerm, 500);

    const fetchVerifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            let query = supabase
                .from('identity_verifications')
                .select(`
                    *,
                    account:accounts(display_name),
                    provider:platform_kyc_providers(display_name)
                `, { count: 'exact' });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // JOIN searches are tricky in Supabase without functions, 
            // but we can at least filter by status and tier easily.
            
            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const mapped: KycVerification[] = (data || []).map((v: any) => ({
                ...v,
                account_name: v.account?.display_name,
                provider_name: v.provider?.display_name
            }));

            setVerifications(mapped);
            setTotalCount(count || 0);
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, statusFilter, currentPage, showToast]);

    useEffect(() => {
        fetchVerifications();
    }, [fetchVerifications]);

    const handleApprove = async (v: KycVerification) => {
        showToast(`Approving identity for ${v.account_name}...`, 'info');
        try {
            const { error } = await supabase.rpc('moderate_kyc_verification', {
                p_verification_id: v.id,
                p_status: 'approved'
            });

            if (error) throw error;
            showToast('Verification approved successfully.', 'success');
            setIsDetailModalOpen(false);
            fetchVerifications();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleReject = async (v: KycVerification, reason: string) => {
        showToast(`Rejecting identity request...`, 'info');
        try {
            const { error } = await supabase.rpc('moderate_kyc_verification', {
                p_verification_id: v.id,
                p_status: 'rejected',
                p_reason: reason
            });

            if (error) throw error;
            showToast('Verification rejected with feedback.', 'success');
            setIsDetailModalOpen(false);
            fetchVerifications();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return (
        <div className={sharedStyles.container}>
            <PageHeader 
                title="Identity Verification"
                subtitle="Review and manage KYC submissions from organizers and advertisers."
            />

            <TableToolbar
                searchPlaceholder="Search by account..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <FilterGroup
                    options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'submitted', label: 'Submitted' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'suspended', label: 'Suspended' },
                        { value: 'expired', label: 'Expired' },
                        { value: 'all', label: 'All Requests' },
                    ]}
                    currentValue={statusFilter}
                    onChange={setStatusFilter}
                />
            </TableToolbar>

            <KycVerificationTable 
                data={verifications}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                onViewDetails={(v) => {
                    setSelectedVerification(v);
                    setIsDetailModalOpen(true);
                }}
                onApprove={handleApprove}
                onReject={(v) => {
                    setSelectedVerification(v);
                    setIsDetailModalOpen(true);
                    // The modal itself handles the rejection UI
                }}
            />

            <KycDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                verification={selectedVerification}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}

export default function AdminKycPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading KYC Queue...</div>}>
            <KycVerificationsContent />
        </Suspense>
    );
}
