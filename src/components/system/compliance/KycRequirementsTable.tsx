"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useMemo } from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import Toggle from '../../shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { ActionItem } from '../../shared/TableRowActions';
import type { KycRequirement } from '@/types/admin';

interface KycRequirementsTableProps {
    data: KycRequirement[];
    isLoading?: boolean;
    onUpdate?: () => void;
    onEdit?: (requirement: KycRequirement) => void;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

const KycRequirementsTable: React.FC<KycRequirementsTableProps> = ({
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

    const handleToggleStatus = async (req: KycRequirement) => {
        try {
            const { error } = await supabase
                .schema('api')
                .rpc('admin_set_kyc_requirements_status', { p_id: req.id, p_is_active: !req.is_active });

            if (error) throw error;
            showToast(`Requirements for ${req.country_name || req.country_code} updated`, 'success');
            onUpdate?.();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const columns: Column<KycRequirement>[] = [
        {
            header: 'Country',
            render: (r) => (
                <Badge
                    label={r.country_code === 'XX' ? 'Global default' : (r.country_name || r.country_code)}
                    variant={r.country_code === 'XX' ? 'info' : 'neutral'}
                />
            )
        },
        {
            header: 'Account Type',
            render: (r) => <Badge label={r.account_type} variant="subtle" />
        },
        {
            header: 'Tier',
            render: (r) => <div style={{ fontWeight: 600 }}>{r.tier_slug.replace(/_/g, ' ')}</div>
        },
        {
            header: 'Steps',
            render: (r) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {r.required_steps.length === 0
                        ? <span style={{ opacity: 0.5, fontSize: '13px' }}>No steps defined</span>
                        : r.required_steps.map((step, i) => (
                            <Badge key={step.id || i} label={step.label || step.type} variant={step.mandatory ? 'warning' : 'subtle'} />
                        ))}
                </div>
            )
        },
        {
            header: 'Status',
            render: (r) => (
                <Toggle
                    enabled={r.is_active}
                    onChange={() => handleToggleStatus(r)}
                />
            )
        }
    ];

    const getActions = (r: KycRequirement): ActionItem[] => [
        {
            label: 'Edit Requirements',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => onEdit?.(r)
        }
    ];

    return (
        <DataTable<KycRequirement>
            data={data}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            emptyMessage="No KYC document requirements configured."
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
        />
    );
};

export default KycRequirementsTable;
