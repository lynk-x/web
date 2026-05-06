"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useMemo } from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import Toggle from '../../shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { ActionItem } from '../../shared/TableRowActions';
import type { TaxRate } from '@/types/admin';

interface TaxRateTableProps {
    data: TaxRate[];
    isLoading?: boolean;
    onUpdate?: () => void;
    onEdit?: (rate: TaxRate) => void;
}

const TaxRateTable: React.FC<TaxRateTableProps> = ({ data, isLoading, onUpdate, onEdit }) => {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const handleToggleStatus = async (rate: TaxRate) => {
        try {
            const { error } = await supabase
                .from('tax_rates')
                .update({ is_active: !rate.is_active, updated_at: new Date().toISOString() })
                .eq('id', rate.id);

            if (error) throw error;
            showToast(`${rate.display_name} updated`, 'success');
            onUpdate?.();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const columns: Column<TaxRate>[] = [
        {
            header: 'Rate Name',
            render: (r) => <div style={{ fontWeight: 600 }}>{r.display_name}</div>
        },
        {
            header: 'Reason',
            render: (r) => <Badge label={r.applicable_reason.replace(/_/g, ' ')} variant="subtle" />
        },
        {
            header: 'Country',
            render: (r: any) => <Badge label={r.country_name || r.country_code} variant="neutral" />
        },
        {
            header: 'Percentage',
            render: (r) => <div style={{ fontWeight: 700, color: 'var(--color-brand-primary)' }}>{r.rate_percent}%</div>
        },
        {
            header: 'Type',
            render: (r) => <Badge label={r.is_inclusive ? 'Inclusive' : 'Exclusive'} variant="info" />
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

    const getActions = (r: TaxRate): ActionItem[] => [
        {
            label: 'Edit Rate',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => onEdit?.(r)
        }
    ];

    return (
        <DataTable<TaxRate>
            data={data}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            emptyMessage="No tax configurations found."
        />
    );
};

export default TaxRateTable;
