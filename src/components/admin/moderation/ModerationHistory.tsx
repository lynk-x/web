"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Badge, { BadgeVariant } from '../../shared/Badge';
import { formatDate, formatString } from '@/utils/format';
import { createClient } from '@/utils/supabase/client';

interface ModerationHistoryProps {
    itemId: string;
    itemType: 'event' | 'campaign' | 'forum_message';
}

const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'approved': return 'success';
        case 'rejected': return 'error';
        case 'flagged': return 'warning';
        default: return 'neutral';
    }
};

/**
 * Historical audit trail for moderation reviews of a specific item.
 */
const ModerationHistory: React.FC<ModerationHistoryProps> = ({ itemId, itemType }) => {
    const supabase = useMemo(() => createClient(), []);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('moderation_reviews')
                .select('*')
                .eq('item_id', itemId)
                .eq('item_type', itemType)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setHistory(data);
            }
            setIsLoading(false);
        };

        fetchHistory();
    }, [itemId, itemType, supabase]);

    if (isLoading) return <div style={{ opacity: 0.5, fontSize: '14px' }}>Loading history...</div>;
    if (history.length === 0) return <div style={{ opacity: 0.4, fontSize: '14px', fontStyle: 'italic' }}>No moderation history found.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((entry) => (
                <div 
                    key={entry.id} 
                    style={{ 
                        padding: '16px', 
                        borderRadius: '12px', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge label={formatString(entry.status)} variant={getStatusVariant(entry.status)} showDot />
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>{formatDate(entry.created_at)}</span>
                    </div>

                    {entry.reason && (
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', opacity: 0.8 }}>
                            {entry.reason}
                        </p>
                    )}

                    {entry.metadata?.snapshot_version && (
                        <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>
                            Captured Snapshot: {entry.metadata.snapshot_version}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ModerationHistory;
