"use client";

import { useRouter } from 'next/navigation';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { formatDate } from '@/utils/format';
import { PromoCode } from '@/types/admin';
import type { ActionItem } from '../../shared/TableRowActions';

interface PromoCodeTableProps {
    data: PromoCode[];
    isLoading?: boolean;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
}

/**
 * Maps promo code types to badge variants.
 */
const getTypeVariant = (type: PromoCode['type']): BadgeVariant => {
    switch (type) {
        case 'percent': return 'info';
        case 'fixed': return 'neutral';
        case 'free_entry': return 'success';
        default: return 'neutral';
    }
};

/**
 * Admin promo code management table.
 */
const PromoCodeTable: React.FC<PromoCodeTableProps> = ({
    data,
    isLoading = false,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const router = useRouter();

    const getActions = (promo: PromoCode): ActionItem[] => [
        {
            label: 'Edit Code',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/finance/promo-codes/edit/${promo.id}`),
        }
    ];

    const columns: Column<PromoCode>[] = [
        {
            header: 'Code',
            render: (promo) => (
                <span style={{ fontWeight: 600, color: 'var(--color-brand-primary)', letterSpacing: '0.05em' }}>
                    {promo.code}
                </span>
            ),
        },
        {
            header: 'Type',
            render: (promo) => (
                <Badge 
                    label={promo.type.replace('_', ' ').toUpperCase()} 
                    variant={getTypeVariant(promo.type)} 
                />
            ),
        },
        {
            header: 'Value',
            render: (promo) => (
                <span style={{ fontWeight: 500 }}>
                    {promo.type === 'percent' ? `${promo.value}%` : promo.type === 'free_entry' ? 'FREE' : `${promo.value}`}
                </span>
            ),
        },
        {
            header: 'Usage',
            render: (promo) => (
                <div style={{ fontSize: '13px' }}>
                    <span style={{ fontWeight: 600 }}>{promo.uses_count}</span>
                    <span style={{ opacity: 0.5 }}> / {promo.max_uses ?? '∞'}</span>
                </div>
            ),
        },
        {
            header: 'Scope',
            render: (promo) => (
                <div style={{ fontWeight: 500, fontSize: '13px' }}>
                    {promo.event_title || 'Global Platform'}
                </div>
            ),
        },
        {
            header: 'Status',
            render: (promo) => (
                <Badge 
                    label={promo.is_active ? 'ACTIVE' : 'INACTIVE'} 
                    variant={promo.is_active ? 'success' : 'subtle'} 
                    showDot
                />
            ),
        },
        {
            header: 'Created',
            render: (promo) => (
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{formatDate(promo.created_at)}</span>
            ),
        },
    ];

    return (
        <DataTable<PromoCode>
            data={data}
            columns={columns}
            getActions={getActions}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            emptyMessage="No promo codes found matching criteria."
        />
    );
};

export default PromoCodeTable;
