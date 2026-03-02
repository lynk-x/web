"use client";

import React, { useMemo } from 'react';
import DataTable, { Column } from '../../shared/DataTable';
import Badge from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { FXRate } from '@/types/admin';

interface FXRateTableProps {
    data: FXRate[];
    isLoading?: boolean;
    onUpdate?: () => void;
}

const FXRateTable: React.FC<FXRateTableProps> = ({ data, isLoading, onUpdate }) => {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const columns: Column<FXRate>[] = [
        {
            header: 'Currency',
            render: (r) => <div style={{ fontWeight: 700, fontSize: '15px' }}>{r.currency}</div>
        },
        {
            header: 'Rate to USD/Base',
            render: (r) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', opacity: 0.5 }}>1.00 USD =</span>
                    <span style={{ fontWeight: 600 }}>{r.rate_to_base} {r.currency}</span>
                </div>
            )
        },
        {
            header: 'Last Updated',
            render: (r) => <span style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(r.updated_at || Date.now()).toLocaleDateString()}</span>
        }
    ];

    return (
        <DataTable<any>
            data={data.map(r => ({ ...r, id: r.currency }))}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No exchange rates available."
        />
    );
};

export default FXRateTable;
