"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Toggle from '@/components/shared/Toggle';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { useRouter } from 'next/navigation';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Badge from '@/components/shared/Badge';

interface TagType {
    id: string;
    description: string;
    is_active: boolean;
}

interface TagLibraryTabProps {
    forceView?: 'tags' | 'types';
}

interface Tag {
    id: string;
    name: string;
    slug: string;
    type_id: string;
    use_count: number;
    is_official: boolean;
    is_active: boolean;
}

export default function TagLibraryTab({ forceView }: TagLibraryTabProps) {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();

    const [tagTypes, setTagTypes] = useState<TagType[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const activeSubTab = forceView || 'tags';
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeSubTab]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [typesRes, tagsRes] = await Promise.all([
                supabase.from('tag_types').select('*').order('id'),
                supabase.from('tags').select('*').order('use_count', { ascending: false })
            ]);

            setTagTypes(typesRes.data || []);
            setTags(tagsRes.data || []);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to sync tag library data.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleTag = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('tags')
                .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setTags(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentValue } : t));
            showToast(`Tag status updated`, 'success');
        } catch (error: unknown) {
            showToast(`Update failed: ${getErrorMessage(error)}`, 'error');
        }
    };

    const handleToggleType = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('tag_types')
                .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            setTagTypes(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentValue } : t));
            showToast(`Type status updated`, 'success');
        } catch (error: unknown) {
            showToast(`Update failed: ${getErrorMessage(error)}`, 'error');
        }
    };

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTypes = tagTypes.filter(t =>
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedTags = filteredTags.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalTagPages = Math.ceil(filteredTags.length / itemsPerPage);

    const paginatedTypes = filteredTypes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalTypePages = Math.ceil(filteredTypes.length / itemsPerPage);

    const tagColumns: Column<Tag>[] = [
        {
            header: 'Tag Name',
            render: (tag) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{tag.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>/{tag.slug}</div>
                </div>
            )
        },
        {
            header: 'Type',
            render: (tag) => <Badge label={tag.type_id || 'untyped'} variant="neutral" />
        },
        {
            header: 'Usage',
            render: (tag) => <div style={{ fontSize: '14px', fontWeight: 500 }}>{tag.use_count}</div>
        },
        {
            header: 'Official',
            render: (tag) => tag.is_official ? <Badge label="Official" variant="info" /> : <span style={{ opacity: 0.3, fontSize: '12px' }}>User</span>
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (tag) => (
                <Toggle
                    enabled={tag.is_active}
                    onChange={() => handleToggleTag(tag.id, tag.is_active)}
                />
            )
        }
    ];

    const typeColumns: Column<TagType>[] = [
        {
            header: 'Type ID',
            render: (type) => <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{type.id}</div>
        },
        {
            header: 'Description',
            render: (type) => <div style={{ fontSize: '14px', opacity: 0.8 }}>{type.description}</div>
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (type) => (
                <Toggle
                    enabled={type.is_active}
                    onChange={() => handleToggleType(type.id, type.is_active)}
                />
            )
        }
    ];

    const getTagActions = (tag: Tag): ActionItem[] => [
        {
            label: 'Edit Tag',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/registry/tags/edit/${tag.id}`),
        },
        { divider: true },
        {
            label: 'Delete Tag',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => showToast('Delete action coming soon', 'info'),
        }
    ];

    const getTypeActions = (type: TagType): ActionItem[] => [
        {
            label: 'Edit Type',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => router.push(`/dashboard/admin/registry/types/edit/${type.id}`),
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {activeSubTab === 'tags' ? (
                <>
                    <TableToolbar
                        searchPlaceholder="Search tags..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/tags/create')}>
                            Add Tag
                        </button>
                    </TableToolbar>
                    <DataTable<any>
                        data={paginatedTags}
                        columns={tagColumns}
                        getActions={getTagActions}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalTagPages}
                        onPageChange={setCurrentPage}
                        emptyMessage="No tags found."
                    />
                </>
            ) : (
                <>
                    <TableToolbar
                        searchPlaceholder="Search types..."
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                    >
                        <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/types/create')}>
                            New Type
                        </button>
                    </TableToolbar>
                    <DataTable<any>
                        data={paginatedTypes}
                        columns={typeColumns}
                        getActions={getTypeActions}
                        isLoading={isLoading}
                        currentPage={currentPage}
                        totalPages={totalTypePages}
                        onPageChange={setCurrentPage}
                        emptyMessage="No tag types defined."
                    />
                </>
            )}
        </div>
    );
}
