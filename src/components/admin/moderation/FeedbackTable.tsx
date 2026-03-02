"use client";

import React from 'react';
import styles from './ReportTable.module.css';
import DataTable, { Column } from '../../shared/DataTable';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { useToast } from '@/components/ui/Toast';

export interface AppFeedback {
    id: string;
    userName: string;
    category: string;
    rating: number;
    content: string;
    deviceInfo: any;
    appVersion: string;
    date: string;
}

interface FeedbackTableProps {
    data: AppFeedback[];
    isLoading?: boolean;
}

const getCategoryVariant = (category: string): BadgeVariant => {
    switch (category) {
        case 'bug': return 'error';
        case 'feature_request': return 'info';
        case 'complaint': return 'warning';
        default: return 'neutral';
    }
};

const FeedbackTable: React.FC<FeedbackTableProps> = ({ data, isLoading }) => {
    const { showToast } = useToast();

    const columns: Column<AppFeedback>[] = [
        {
            header: 'Rating',
            render: (item) => (
                <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} style={{ color: s <= item.rating ? '#FFD700' : 'rgba(255,255,255,0.1)' }}>★</span>
                    ))}
                </div>
            )
        },
        {
            header: 'Category',
            render: (item) => <Badge label={item.category.toUpperCase()} variant={getCategoryVariant(item.category)} />
        },
        {
            header: 'Feedback',
            render: (item) => (
                <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.content}</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>By {item.userName}</div>
                </div>
            )
        },
        {
            header: 'Device/App',
            render: (item) => (
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                    v{item.appVersion} • {item.deviceInfo?.model || 'Unknown Device'}
                </div>
            )
        },
        {
            header: 'Date',
            render: (item) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{item.date}</div>
        }
    ];

    return (
        <DataTable<AppFeedback>
            data={data}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No app feedback received yet."
        />
    );
};

export default FeedbackTable;
