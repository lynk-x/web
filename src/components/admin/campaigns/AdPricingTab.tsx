"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Mirrors `ad_pricing_config` table.
 * PK is composite (ad_type, interaction_type), so we derive a string `id` for DataTable.
 */
interface PricingRow {
    /** Derived: `${ad_type}:${interaction_type}` — used as DataTable id. */
    id: string;
    ad_type: string;
    interaction_type: string;
    /** USD base price per impression or click. */
    base_price: number;
    updated_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Admin tab for managing `ad_pricing_config`.
 * Shows CPM / CPC base prices per ad type and allows inline editing.
 */
export default function AdPricingTab() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [rows, setRows] = useState<PricingRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    /** Key of the currently editing row, or null. */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    const fetchPricing = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('ad_pricing_config')
                .select('*')
                .order('ad_type')
                .order('interaction_type');
            if (error) throw error;
            setRows((data || []).map((r: any) => ({
                id: `${r.ad_type}:${r.interaction_type}`,
                ad_type: r.ad_type,
                interaction_type: r.interaction_type,
                base_price: parseFloat(r.base_price),
                updated_at: r.updated_at,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load pricing', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchPricing(); }, [fetchPricing]);

    /** Saves an inline price edit back to `ad_pricing_config`. */
    const handleSaveEdit = async (row: PricingRow) => {
        const parsed = parseFloat(editValue);
        if (isNaN(parsed) || parsed < 0) {
            showToast('Invalid price — must be a positive number.', 'error');
            return;
        }
        try {
            const { error } = await supabase
                .from('ad_pricing_config')
                .update({ base_price: parsed, updated_at: new Date().toISOString() })
                .eq('ad_type', row.ad_type)
                .eq('interaction_type', row.interaction_type);
            if (error) throw error;
            showToast(`Updated ${row.ad_type} / ${row.interaction_type} → $${parsed.toFixed(4)}`, 'success');
            setEditingId(null);
            fetchPricing();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    const interactionLabel: Record<string, string> = {
        impression: 'CPM (per impression)',
        click: 'CPC (per click)',
    };

    const adTypeLabel: Record<string, string> = {
        banner: 'Banner',
        interstitial: 'Interstitial',
    };

    const columns: Column<PricingRow>[] = [
        {
            header: 'Ad Format',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{adTypeLabel[r.ad_type] ?? r.ad_type}</div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>{interactionLabel[r.interaction_type] ?? r.interaction_type}</div>
                </div>
            ),
        },
        {
            header: 'Base Price (USD)',
            render: (r) => {
                if (editingId === r.id) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ opacity: 0.5 }}>$</span>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(r); if (e.key === 'Escape') setEditingId(null); }}
                                autoFocus
                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '4px 8px', color: 'white', fontSize: '14px', width: '100px' }}
                            />
                            <button
                                onClick={() => handleSaveEdit(r)}
                                style={{ background: 'var(--color-brand-primary)', border: 'none', borderRadius: '6px', color: 'white', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                            >Save</button>
                            <button
                                onClick={() => setEditingId(null)}
                                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                            >Cancel</button>
                        </div>
                    );
                }
                return (
                    <div style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '15px' }}>
                        ${r.base_price.toFixed(4)}
                    </div>
                );
            },
        },
        {
            header: 'Last Updated',
            render: (r) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(r.updated_at).toLocaleDateString()}</div>,
        },
    ];

    const getActions = (r: PricingRow) => [
        {
            label: 'Edit Price',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
            onClick: () => { setEditingId(r.id); setEditValue(r.base_price.toString()); },
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <TableToolbar>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Ad Pricing Config</div>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>USD base rates per ad format and interaction. A 1.2× peak multiplier applies between 18:00–22:00.</div>
                </div>
            </TableToolbar>
            <DataTable<PricingRow>
                data={rows}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                emptyMessage="No pricing config rows found."
            />
        </div>
    );
}
