"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors `report_reasons` table. */
interface ReportReason {
    id: string;
    category: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Support tab for `report_reasons`.
 * Admins can enable/disable report categories shown to users during moderation flows.
 */
export default function ReportReasonsTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [reasons, setReasons] = useState<ReportReason[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [newId, setNewId] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchReasons = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('report_reasons')
                .select('*')
                .order('category')
                .order('id');
            if (error) throw error;
            setReasons(data || []);
        } catch (err: any) {
            showToast(err.message || 'Failed to load report reasons', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchReasons(); }, [fetchReasons]);

    const handleToggle = async (reason: ReportReason) => {
        try {
            const { error } = await supabase
                .from('report_reasons')
                .update({ is_active: !reason.is_active, updated_at: new Date().toISOString() })
                .eq('id', reason.id);
            if (error) throw error;
            setReasons(prev => prev.map(r => r.id === reason.id ? { ...r, is_active: !reason.is_active } : r));
            showToast(`"${reason.id}" ${!reason.is_active ? 'enabled' : 'disabled'}`, 'success');
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleAdd = async () => {
        if (!newId.trim() || !newCategory.trim()) {
            showToast('ID and Category are required.', 'error');
            return;
        }
        setIsAdding(true);
        try {
            const { error } = await supabase.from('report_reasons').insert({
                id: newId.trim().toLowerCase().replace(/\s+/g, '_'),
                category: newCategory.trim(),
                description: newDescription.trim() || null,
                is_active: true,
            });
            if (error) throw error;
            showToast('Report reason added.', 'success');
            setNewId(''); setNewCategory(''); setNewDescription('');
            fetchReasons();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const columns: Column<ReportReason>[] = [
        {
            header: 'ID / Category',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' }}>{r.id}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{r.category}</div>
                </div>
            ),
        },
        {
            header: 'Description',
            render: (r) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{r.description ?? <span style={{ opacity: 0.4 }}>—</span>}</div>,
        },
        {
            header: 'Active',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (r) => <Toggle enabled={r.is_active} onChange={() => handleToggle(r)} />,
        },
    ];

    return (
        <div>
            {/* ── Add New Row ── */}
            <div style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Add Report Reason</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                        placeholder="ID (e.g. hate_speech)"
                        value={newId}
                        onChange={e => setNewId(e.target.value)}
                        style={{ flex: '1 1 140px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px', fontFamily: 'monospace' }}
                    />
                    <input
                        placeholder="Category (e.g. Hate & Harassment)"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        style={{ flex: '2 1 200px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px' }}
                    />
                    <input
                        placeholder="Description (optional)"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                        style={{ flex: '3 1 240px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '13px' }}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={isAdding}
                        style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--color-brand-primary)', border: 'none', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: isAdding ? 0.6 : 1 }}
                    >
                        {isAdding ? 'Adding...' : '+ Add'}
                    </button>
                </div>
            </div>

            <DataTable<ReportReason>
                data={reasons}
                columns={columns}
                isLoading={isLoading}
                emptyMessage="No report reasons defined."
            />
        </div>
    );
}
