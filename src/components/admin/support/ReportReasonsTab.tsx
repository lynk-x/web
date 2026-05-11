"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';

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
            const { data, error } = await supabase.rpc('get_admin_support_data', {
                p_tab: 'reasons'
            });
            if (error) throw error;
            setReasons(data || []);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load report reasons', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchReasons(); }, [fetchReasons]);

    const handleToggle = async (reason: ReportReason) => {
        try {
            const { error } = await supabase.rpc('admin_update_support_status', {
                p_tab: 'reasons',
                p_id: reason.id,
                p_status: !reason.is_active ? 'active' : 'inactive'
            });
            if (error) throw error;
            setReasons(prev => prev.map(r => r.id === reason.id ? { ...r, is_active: !reason.is_active } : r));
            showToast(`"${reason.id}" ${!reason.is_active ? 'enabled' : 'disabled'}`, 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const handleAdd = async () => {
        if (!newId.trim() || !newCategory.trim()) {
            showToast('ID and Category are required.', 'error');
            return;
        }
        setIsAdding(true);
        try {
            // Reasons are currently in public schema, but we should eventually move to reports.
            // For now, use direct insert but ensure system admin check is handled by RLS.
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
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsAdding(false);
        }
    };

    const columns: Column<ReportReason>[] = [
        {
            header: 'ID / Category',
            headerStyle: { width: '180px' },
            cellStyle: { width: '180px' },
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' }}>{r.id}</div>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>{r.category}</div>
                </div>
            ),
        },
        {
            header: 'Description',
            headerStyle: { width: '33%', textAlign: 'left' },
            cellStyle: { width: '33%' },
            render: (r) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{r.description ?? <span style={{ opacity: 0.4 }}>—</span>}</div>,
        },
        {
            header: 'Active',
            headerStyle: { textAlign: 'right', paddingRight: '16px' },
            cellStyle: { textAlign: 'right', paddingRight: '16px' },
            render: (r) => <Toggle enabled={r.is_active} onChange={() => handleToggle(r)} />,
        },
    ];

    return (
        <div>
            <div style={{ marginBottom: '16px', padding: '24px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-interface-outline)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-utility-primaryText)' }}>Add New Report Reason</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>ID (slug)</label>
                        <input
                            placeholder="e.g. hate_speech"
                            value={newId}
                            onChange={e => setNewId(e.target.value)}
                            className={adminStyles.input}
                            style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Category Name</label>
                        <input
                            placeholder="e.g. Hate & Harassment"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            className={adminStyles.input}
                            style={{ margin: 0, fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5 }}>Description (Optional)</label>
                        <input
                            placeholder="Explain the criteria for this category..."
                            value={newDescription}
                            onChange={e => setNewDescription(e.target.value)}
                            className={adminStyles.input}
                            style={{ margin: 0, fontSize: '13px' }}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={isAdding}
                        className={adminStyles.btnPrimary}
                        style={{ height: '42px', padding: '0 24px', borderRadius: '8px' }}
                    >
                        {isAdding ? 'Adding...' : '+ Add Reason'}
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
