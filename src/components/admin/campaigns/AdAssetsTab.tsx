"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useConfirmModal } from '@/hooks/useConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Mirrors `ad_media` joined with `ad_campaigns!campaign_id(title, type, status)`. */
interface AdAsset {
    id: string;
    campaign_id: string;
    campaign_title: string;
    campaign_type: string;
    campaign_status: string;
    /** asset MIME/media type (e.g. 'image', 'video') */
    media_type: string;
    call_to_action: string | null;
    url: string;
    is_primary: boolean;
    created_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Campaigns tab showing all `ad_media` across all campaigns.
 * Allows admins to review uploaded creative assets and delete rogue uploads.
 */
export default function AdAssetsTab() {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const supabase = useMemo(() => createClient(), []);

    const [assets, setAssets] = useState<AdAsset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .schema('ad_analytics')
                .from('ad_media')
                .select('*, campaign:ad_campaigns!campaign_id(title, type, status)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAssets((data || []).map((a: any) => ({
                id: a.id,
                campaign_id: a.campaign_id,
                campaign_title: a.campaign?.title ?? 'Unknown Campaign',
                campaign_type: a.campaign?.type ?? '—',
                campaign_status: a.campaign?.status ?? '—',
                media_type: a.media_type,
                call_to_action: a.call_to_action,
                url: a.url,
                is_primary: a.is_primary,
                created_at: a.created_at,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load ad assets', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => { fetchAssets(); }, [fetchAssets]);

    const handleDelete = async (asset: AdAsset) => {
        if (!await confirm(`Delete asset for campaign "${asset.campaign_title}"? This cannot be undone.`)) return;
        try {
            const { error } = await supabase
                .schema('ad_analytics')
                .from('ad_media')
                .delete()
                .eq('id', asset.id);
            if (error) throw error;
            setAssets(prev => prev.filter(a => a.id !== asset.id));
            showToast('Asset deleted.', 'success');
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        }
    };

    // Unique MIME type groups for filtering
    const mediaGroups = ['all', 'image', 'video', 'html'];

    const filtered = assets.filter(a => {
        const matchSearch =
            a.campaign_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.media_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.call_to_action ?? '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = typeFilter === 'all' || a.media_type.startsWith(typeFilter);
        return matchSearch && matchType;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const columns: Column<AdAsset>[] = [
        {
            header: 'Campaign',
            render: (a) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.campaign_title}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <Badge label={a.campaign_type} variant="info" />
                        <Badge
                            label={a.campaign_status}
                            variant={a.campaign_status === 'active' ? 'success' : a.campaign_status === 'rejected' ? 'error' : 'neutral'}
                        />
                    </div>
                </div>
            ),
        },
        {
            header: 'Asset',
            render: (a) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Thumbnail preview for images */}
                    {a.media_type === 'image' ? (
                        <img src={a.url} alt="ad asset" style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                        <div style={{ width: 48, height: 32, borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', opacity: 0.5 }}>
                            {a.media_type.toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.7 }}>{a.media_type}</div>
                        {a.is_primary && <Badge label="Primary" variant="warning" />}
                    </div>
                </div>
            ),
        },
        {
            header: 'CTA',
            render: (a) => <div style={{ fontSize: '13px', opacity: 0.8 }}>{a.call_to_action ?? <span style={{ opacity: 0.4 }}>—</span>}</div>,
        },
        {
            header: 'Uploaded',
            render: (a) => <div style={{ fontSize: '12px', opacity: 0.6 }}>{new Date(a.created_at).toLocaleDateString()}</div>,
        },
    ];

    const getActions = (a: AdAsset) => [
        {
            label: 'View Asset',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
            onClick: () => window.open(a.url, '_blank'),
        },
        {
            label: 'Delete Asset', variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
            onClick: () => handleDelete(a),
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {ConfirmDialog}
            <TableToolbar searchPlaceholder="Search by campaign or asset type..." searchValue={searchTerm} onSearchChange={v => { setSearchTerm(v); setCurrentPage(1); }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {mediaGroups.map(g => (
                        <button key={g} className={`${adminStyles.chip} ${typeFilter === g ? adminStyles.chipActive : ''}`} onClick={() => { setTypeFilter(g); setCurrentPage(1); }}>
                            {g === 'all' ? 'All Media' : g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            <DataTable<AdAsset>
                data={paginated}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                emptyMessage="No ad assets found."
            />
        </div>
    );
}
