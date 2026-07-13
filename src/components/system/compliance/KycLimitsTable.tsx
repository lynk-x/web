"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useMemo } from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import Toggle from '../../shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { ActionItem } from '../../shared/TableRowActions';
import type { KycLimit } from '@/types/admin';

interface KycLimitsTableProps {
    data: KycLimit[];
    isLoading?: boolean;
    onUpdate?: () => void;
    onEdit?: (limit: KycLimit) => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

function formatAmount(value: number | null, currency: string): string {
    if (value === null) return '— (inherits global)';
    return `${currency} ${value.toLocaleString()}`;
}

const KycLimitsTable: React.FC<KycLimitsTableProps> = ({
    data,
    isLoading,
    onUpdate,
    onEdit,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const handleToggleStatus = async (limit: KycLimit) => {
        try {
            const { error } = await supabase
                .schema('api')
                .rpc('admin_set_kyc_limits_status', { p_id: limit.id, p_is_active: !limit.is_active });

            if (error) throw error;
            showToast(`Limits for ${limit.country_name || limit.country_code} updated`, 'success');
            onUpdate?.();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const columns: Column<KycLimit>[] = [
        {
            header: 'Country',
            render: (l) => (
                <Badge
                    label={l.country_code === 'XX' ? 'Global default' : (l.country_name || l.country_code)}
                    variant={l.country_code === 'XX' ? 'info' : 'neutral'}
                />
            )
        },
        {
            header: 'Account Type',
            render: (l) => <Badge label={l.account_type} variant="subtle" />
        },
        {
            header: 'Tier',
            render: (l) => <div style={{ fontWeight: 600 }}>{l.tier_slug.replace(/_/g, ' ')}</div>
        },
        {
            header: 'Daily Transfer',
            render: (l) => <div>{formatAmount(l.daily_transfer, l.currency)}</div>
        },
        {
            header: 'Daily Withdrawal',
            render: (l) => <div>{formatAmount(l.daily_withdrawal, l.currency)}</div>
        },
        {
            header: 'Auto-Payout Max',
            render: (l) => <div>{formatAmount(l.auto_payout_max, l.currency)}</div>
        },
        {
            header: 'AML Flag Threshold',
            render: (l) => <div style={{ fontWeight: 700, color: 'var(--color-brand-primary)' }}>{formatAmount(l.aml_flag_threshold, l.currency)}</div>
        },
        {
            header: 'Status',
            render: (l) => (
                <Toggle
                    enabled={l.is_active}
                    onChange={() => handleToggleStatus(l)}
                />
            )
        }
    ];

    const getActions = (l: KycLimit): ActionItem[] => [
        {
            label: 'Edit Limits',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => onEdit?.(l)
        }
    ];

    return (
        <DataTable<KycLimit>
            data={data}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            emptyMessage="No KYC limits configured."
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
        />
    );
};

export default KycLimitsTable;
