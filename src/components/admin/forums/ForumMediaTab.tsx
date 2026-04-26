"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { formatRelativeTime, formatFileSize } from '@/utils/format';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import TableToolbar from '@/components/shared/TableToolbar';
import Badge from '@/components/shared/Badge';
import { ForumMedia } from '@/types/admin';
import { useConfirmModal } from '@/hooks/useConfirmModal';

export default function ForumMediaTab() {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [media, setMedia] = useState<ForumMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const fetchMedia = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('forum_media')
                .select(`
                    *,
                    forum:forums!forum_id(event:events!event_id(title)),
                    uploader:user_profile!uploader_id(full_name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setMedia((data || []).map((m: any) => ({
                id: m.id,
                forum_id: m.forum_id,
                event_title: m.forum?.event?.title || 'Unknown Event',
                uploader_name: m.uploader?.full_name || 'System',
                media_type: m.media_type,
                url: m.url,
                thumbnail_url: m.thumbnail_url,
                caption: m.caption,
                mime_type: m.mime_type,
                file_size: m.file_size,
                is_approved: m.is_approved,
                created_at: m.created_at,
            })));
        } catch (err: any) {
            showToast(err.message || 'Failed to load media', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    const handleDelete = async (id: string) => {
        if (!await confirm('Are you sure you want to delete this media?')) return;
        
        try {
            const { error } = await supabase
                .from('forum_media')
                .delete()
                .eq('id', id);

            if (error) throw error;
            showToast('Media deleted', 'success');
            setMedia(prev => prev.filter(m => m.id !== id));
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filtered = media.filter(m => {
        const matchesSearch = (m.caption?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.event_title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             m.uploader_name?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = typeFilter === 'all' || m.media_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedMedia = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {ConfirmDialog}
            <TableToolbar 
                searchPlaceholder="Search by caption, event, or uploader..." 
                searchValue={searchTerm} 
                onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            >
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'image', 'video', 'audio', 'document'].map(type => (
                        <button
                            key={type}
                            className={`${adminStyles.chip} ${typeFilter === type ? adminStyles.chipActive : ''}`}
                            onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                    ))}
                </div>
            </TableToolbar>

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading media...</div>
            ) : filtered.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    No media found matching your criteria.
                </div>
            ) : (
                <>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {paginatedMedia.map(m => (
                            <div key={m.id} style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                borderRadius: '12px', 
                                border: '1px solid rgba(255,255,255,0.08)',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            }}
                            >
                                <div style={{ 
                                    aspectRatio: '16/9', 
                                    background: 'black', 
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden'
                                }}>
                                    {m.media_type === 'image' ? (
                                        <img src={m.url} alt={m.caption || 'Forum Media'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : m.media_type === 'video' ? (
                                        <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ opacity: 0.4 }}>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                                <polyline points="13 2 13 9 20 9"></polyline>
                                            </svg>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                        <Badge label={m.media_type.toUpperCase()} variant={m.media_type === 'image' ? 'success' : 'info'} />
                                    </div>
                                </div>
                                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'white', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {m.caption || 'No caption'}
                                        </div>
                                        <button 
                                            onClick={() => handleDelete(m.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
                                            title="Delete Media"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                                        Uploaded by <span style={{ color: 'var(--color-brand-primary)' }}>{m.uploader_name}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                                        In <span style={{ opacity: 0.8 }}>{m.event_title}</span>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', opacity: 0.4 }}>
                                        <span>{formatFileSize(m.file_size)}</span>
                                        <span>{formatRelativeTime(m.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                            <button 
                                className={adminStyles.btnSecondary} 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                                Previous
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', opacity: 0.6 }}>
                                Page {currentPage} of {totalPages}
                            </div>
                            <button 
                                className={adminStyles.btnSecondary} 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
