"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Badge from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import { useRouter } from 'next/navigation';
import type { ActionItem } from '@/types/shared';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface MappingTabProps {
    forceView?: 'category' | 'event';
    hideToolbar?: boolean;
    searchTerm?: string;
}

interface EventMapping {
    id: string;
    event_id: string;
    tag_id: string;
    event_title: string;
    tag_name: string;
}

interface MatrixCategory {
    id: string;
    display_name: string;
    description: string | null;
    is_active: boolean;
}

interface MatrixTag {
    id: string;
    name: string;
    type_id: string;
}

// Category ↔ Tag matrix — mirrors the IAM "Role Permissions" tab: categories
// on the left act like roles, tags on the right (grouped by tag type) act
// like permissions, each with a toggle reflecting whether the
// identity.category_tags mapping exists for the selected category.
function CategoryLogicMatrix({ hideToolbar, searchTerm: externalSearchTerm }: { hideToolbar?: boolean; searchTerm?: string }) {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient().schema('api' as any), []);

    const [categories, setCategories] = useState<MatrixCategory[]>([]);
    const [tags, setTags] = useState<MatrixTag[]>([]);
    const [categoryTags, setCategoryTags] = useState<{ [categoryId: string]: Set<string> }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('');

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;

    const fetchMatrix = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', {
                p_tab: 'categories_matrix'
            });
            if (error) throw error;

            const cats: MatrixCategory[] = data?.categories || [];
            const allTags: MatrixTag[] = data?.tags || [];
            const mappings: { category_id: string; tag_id: string }[] = data?.mappings || [];

            setCategories(cats);
            setTags(allTags);
            setActiveCategoryId(prev => prev || cats[0]?.id || '');

            const grouped: { [categoryId: string]: Set<string> } = {};
            cats.forEach(c => { grouped[c.id] = new Set<string>(); });
            mappings.forEach(m => {
                if (!grouped[m.category_id]) grouped[m.category_id] = new Set<string>();
                grouped[m.category_id].add(m.tag_id);
            });
            setCategoryTags(grouped);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to load category logic matrix.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchMatrix();
    }, [fetchMatrix]);

    const handleToggleMapping = async (categoryId: string, tagId: string) => {
        const currentTags = new Set(categoryTags[categoryId] || []);
        const isMapped = currentTags.has(tagId);

        // Optimistic update — reverted on failure, mirroring IAM's handleTogglePermission.
        if (isMapped) currentTags.delete(tagId); else currentTags.add(tagId);
        setCategoryTags(prev => ({ ...prev, [categoryId]: currentTags }));

        try {
            const { error } = isMapped
                ? await supabase.schema('api').rpc('admin_manage_registry_item', {
                    p_tab: 'mappings_category',
                    p_action: 'delete',
                    p_id: `${categoryId}-${tagId}`
                })
                : await supabase.schema('api').rpc('admin_upsert_registry_item', {
                    p_tab: 'mappings_category',
                    p_data: { category_id: categoryId, tag_id: tagId }
                });
            if (error) throw error;
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update category mapping', 'error');
            fetchMatrix();
        }
    };

    const filteredCategories = useMemo(() => (
        categories.filter(c => c.display_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [categories, searchTerm]);

    const groupedTags = useMemo(() => {
        const groups: { [typeId: string]: MatrixTag[] } = {};
        tags.forEach(t => {
            if (!groups[t.type_id]) groups[t.type_id] = [];
            groups[t.type_id].push(t);
        });
        return groups;
    }, [tags]);

    const activeCategory = categories.find(c => c.id === activeCategoryId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!hideToolbar && (
                <TableToolbar searchPlaceholder="Search categories..." searchValue={searchTerm} onSearchChange={setSearchTerm} />
            )}

            <div style={{ display: 'flex', gap: '32px', minHeight: '550px', flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Left Column: Categories list */}
                <div style={{
                    flex: '1 1 260px',
                    maxWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderRight: '1px solid var(--color-interface-outline)',
                    paddingRight: '24px'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                        Event Categories
                    </div>
                    {isLoading && categories.length === 0 && (
                        <div style={{ opacity: 0.5, fontSize: '13px' }}>Loading categories...</div>
                    )}
                    {filteredCategories.map(cat => {
                        const isActive = activeCategoryId === cat.id;
                        const activeCount = categoryTags[cat.id]?.size || 0;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveCategoryId(cat.id)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--color-interface-surface)',
                                    border: isActive ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-interface-outline)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                    transition: 'background-color 0.2s, border-color 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                    <span style={{ fontWeight: isActive ? 600 : 500, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                                        {cat.display_name}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        backgroundColor: isActive ? 'var(--color-brand-primary)' : 'rgba(255, 255, 255, 0.08)',
                                        color: isActive ? '#000000' : 'var(--color-text-primary)',
                                        fontWeight: 600
                                    }}>
                                        {activeCount} tags
                                    </span>
                                </div>
                                <span style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
                                    {cat.id}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Right Column: Grouped tags with toggle switches */}
                <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {activeCategory ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-interface-outline)', paddingBottom: '12px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        {activeCategory.display_name} Tags
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.6 }}>
                                        Configure which tags surface events under this category.
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {Object.keys(groupedTags).map(typeId => {
                                    const typeTags = groupedTags[typeId];
                                    return (
                                        <div key={typeId} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-primary)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {typeId} ({typeTags.filter(t => categoryTags[activeCategoryId]?.has(t.id)).length} / {typeTags.length} Active)
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {typeTags.map(tag => {
                                                    const isChecked = !!categoryTags[activeCategoryId]?.has(tag.id);
                                                    return (
                                                        <div
                                                            key={tag.id}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                padding: '12px 16px',
                                                                borderRadius: '8px',
                                                                backgroundColor: 'var(--color-interface-surface)',
                                                                border: '1px solid var(--color-interface-outline)',
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                        >
                                                            <div style={{ paddingRight: '16px' }}>
                                                                <code style={{ fontSize: '12px', color: 'var(--color-status-success)' }}>
                                                                    {tag.name}
                                                                </code>
                                                            </div>
                                                            <Toggle
                                                                enabled={isChecked}
                                                                onChange={() => handleToggleMapping(activeCategoryId, tag.id)}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', opacity: 0.5 }}>
                            Select a category from the sidebar to configure its tags.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function MappingTab({ forceView, hideToolbar, searchTerm: externalSearchTerm }: MappingTabProps) {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const router = useRouter();
    const supabase = useMemo(() => createClient().schema('api' as any), []);

    const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const activeSubTab = forceView || 'category';
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeSubTab]);

    const fetchMappings = useCallback(async () => {
        if (activeSubTab === 'category') return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', {
                p_tab: 'mappings_event'
            });

            if (error) throw error;

            const mapped = (data || []).map((m: any) => ({
                id: `${m.event_id}-${m.tag_id}`,
                event_id: m.event_id,
                tag_id: m.tag_id,
                event_title: m.event_title || 'Unknown Event',
                tag_name: m.tag_name || 'Unknown Tag'
            }));
            setEventMappings(mapped);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to synchronize tag mappings.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, activeSubTab, showToast]);

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    const filteredEvent = eventMappings.filter(m =>
        m.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const paginatedEvent = filteredEvent.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalEventPages = Math.ceil(filteredEvent.length / itemsPerPage);

    const eventColumns: Column<EventMapping>[] = [
        {
            header: 'Event Title',
            render: (m) => <div style={{ fontWeight: 600 }}>{m.event_title}</div>
        },
        {
            header: 'Tag',
            render: (m) => <Badge label={m.tag_name} variant="success" />
        },
        {
            header: 'Event ID',
            render: (m) => <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{m.event_id}</div>
        }
    ];

    const handleDeleteMapping = async (id: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.schema('api').rpc('admin_manage_registry_item', {
                p_tab: 'mappings_event',
                p_action: 'delete',
                p_id: id
            });

            if (error) throw error;

            showToast('Mapping removed successfully', 'success');
            fetchMappings();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to delete mapping.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getActions = (item: any): ActionItem[] => [
        {
            label: 'Remove Mapping',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: async () => {
                if (!await confirm(`Remove the mapping between "${item.event_title}" and "${item.tag_name}"?`, {
                    title: 'Remove Mapping',
                    confirmLabel: 'Remove'
                })) return;
                handleDeleteMapping(item.id);
            },
        }
    ];

    if (activeSubTab === 'category') {
        return <CategoryLogicMatrix hideToolbar={hideToolbar} searchTerm={externalSearchTerm} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!hideToolbar && (
                <TableToolbar
                    searchPlaceholder="Search events..."
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                >
                    <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/system/registry/mappings/create')}>
                        Create Mapping
                    </button>
                </TableToolbar>
            )}

            <DataTable<any>
                data={paginatedEvent}
                columns={eventColumns}
                getActions={getActions}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalEventPages}
                onPageChange={setCurrentPage}
                emptyMessage="No event mappings found."
            />

            {ConfirmDialog}
        </div>
    );
}
