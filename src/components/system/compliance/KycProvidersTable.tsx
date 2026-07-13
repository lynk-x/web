"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useMemo } from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import Toggle from '../../shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { KycProvider } from '@/types/admin';

interface KycProvidersTableProps {
    data: KycProvider[];
    isLoading?: boolean;
    onUpdate?: () => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

/**
 * Read-only-plus-status-toggle list for third-party KYC vendors. Unlike
 * KycLimitsTable/KycRequirementsTable this has no add/edit modal — the
 * underlying table holds vendor credentials (api_url, info.api_key/
 * webhook_secret) that this UI never surfaces, and new providers are added
 * via migration/seed, not the admin console, since it's a rare deliberate
 * integration event rather than routine per-country config.
 */
const KycProvidersTable: React.FC<KycProvidersTableProps> = ({
    data,
    isLoading,
    onUpdate,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const handleToggleStatus = async (provider: KycProvider) => {
        const nextStatus = provider.status === 'approved' ? 'pending' : 'approved';
        try {
            const { error } = await supabase
                .schema('api')
                .rpc('admin_set_kyc_provider_status', { p_id: provider.id, p_status: nextStatus });

            if (error) throw error;
            showToast(`${provider.display_name} ${nextStatus === 'approved' ? 'enabled' : 'disabled'}`, 'success');
            onUpdate?.();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const columns: Column<KycProvider>[] = [
        {
            header: 'Provider',
            render: (p) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{p.display_name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{p.provider_name}</div>
                </div>
            )
        },
        {
            header: 'Status',
            render: (p) => {
                if (p.status === 'approved' || p.status === 'pending') {
                    return <Toggle enabled={p.status === 'approved'} onChange={() => handleToggleStatus(p)} />;
                }
                // Any other status (rejected/flagged/etc.) is set outside this
                // toggle's scope — show it plainly rather than offering a
                // two-state control that can't represent it.
                return <Badge label={p.status} variant="warning" />;
            }
        }
    ];

    return (
        <DataTable<KycProvider>
            data={data}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No KYC providers configured."
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
        />
    );
};

export default KycProvidersTable;
