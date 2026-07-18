"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Toggle from '@/components/shared/Toggle';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import FormRow from '@/components/shared/FormRow';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { sanitizeInput } from '@/utils/sanitization';
import { generateTagEmbedding } from '@/utils/embedding';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import Badge from '@/components/shared/Badge';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface TagType {
    id: string;
    description: string;
    is_active: boolean;
}

interface TagLibraryTabProps {
    forceView?: 'tags' | 'types';
    hideToolbar?: boolean;
    searchTerm?: string;
}

interface Tag {
    id: string;
    name: string;
    slug: string;
    type_id: string;
    use_count: number;
    is_official: boolean;
    is_active: boolean;
    has_embedding: boolean;
}

const emptyTagForm = { name: '', slug: '', type_id: '', is_official: true, is_active: true };
const emptyTypeForm = { id: '', description: '', is_active: true };

export interface TagLibraryTabHandle {
    /** Opens the create modal for whichever sub-view (tags/types) is active. */
    openCreate: () => void;
}

const TagLibraryTab = forwardRef<TagLibraryTabHandle, TagLibraryTabProps>(function TagLibraryTab({ forceView, hideToolbar, searchTerm: externalSearchTerm }, ref) {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const supabase = useMemo(() => createClient().schema('api' as any), []);
    const { enabled: isEmbedEnabled } = useFeatureFlag('enable_client_embeddings');

    const [tagTypes, setTagTypes] = useState<TagType[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
    const activeSubTab = forceView || 'tags';
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // ─── Tag Modal ──────────────────────────────────────────────────────
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [tagForm, setTagForm] = useState(emptyTagForm);
    const [isSavingTag, setIsSavingTag] = useState(false);

    // ─── Type Modal ─────────────────────────────────────────────────────
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<TagType | null>(null);
    const [typeForm, setTypeForm] = useState(emptyTypeForm);
    const [isSavingType, setIsSavingType] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeSubTab]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [typesRes, tagsRes] = await Promise.all([
                supabase.schema('api').rpc('get_tag_types'),
                supabase.schema('api').rpc('get_tags')
            ]);

            if (typesRes.error) throw typesRes.error;
            if (tagsRes.error) throw tagsRes.error;

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
            const { error } = await supabase.schema('api').rpc('toggle_tag', {
                p_id: id,
                p_is_active: !currentValue
            });

            if (error) throw error;
            setTags(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentValue } : t));
            showToast(`Tag status updated`, 'success');
        } catch (error: unknown) {
            showToast(`Update failed: ${getErrorMessage(error)}`, 'error');
        }
    };

    const handleToggleType = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase.schema('api').rpc('toggle_tag_type', {
                p_id: id,
                p_is_active: !currentValue
            });

            if (error) throw error;
            setTagTypes(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentValue } : t));
            showToast(`Type status updated`, 'success');
        } catch (error: unknown) {
            showToast(`Update failed: ${getErrorMessage(error)}`, 'error');
        }
    };

    // ─── Tag Modal Handlers ─────────────────────────────────────────────
    const openCreateTag = () => {
        setEditingTag(null);
        setTagForm(emptyTagForm);
        setIsTagModalOpen(true);
    };

    const openEditTag = (tag: Tag) => {
        setEditingTag(tag);
        setTagForm({
            name: tag.name,
            slug: tag.slug,
            type_id: tag.type_id || '',
            is_official: tag.is_official,
            is_active: tag.is_active
        });
        setIsTagModalOpen(true);
    };

    const updateTagField = (field: keyof typeof emptyTagForm, value: string | boolean) => {
        const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
        setTagForm(prev => {
            const next = { ...prev, [field]: sanitizedValue };
            // Auto-slugify on create only, matching previous name -> slug behavior
            if (!editingTag && field === 'name' && typeof value === 'string' &&
                (!prev.slug || prev.slug === prev.name.toLowerCase().replace(/\s+/g, '-'))) {
                next.slug = value.toLowerCase().replace(/\s+/g, '-');
            }
            return next;
        });
    };

    const handleSaveTag = async () => {
        if (!tagForm.name || !tagForm.slug) {
            showToast('Name and Slug are required', 'error');
            return;
        }

        setIsSavingTag(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('upsert_tag', {
                p_data: editingTag ? { ...tagForm, id: editingTag.id } : tagForm
            });

            if (error) throw error;

            const tagId = (data as any)?.id || editingTag?.id;
            if (tagId && isEmbedEnabled === true) {
                try {
                    const vector = await generateTagEmbedding(tagForm.name, tagForm.type_id);
                    if (vector && vector.length > 0) {
                        const { error: embedError } = await supabase
                            .schema('api')
                            .rpc('admin_save_tag_embedding', { p_tag_id: tagId, p_embedding: vector });
                        if (embedError) {
                            console.error('[Embedding] Failed to save tag embedding:', embedError);
                        }
                    }
                } catch (embedErr) {
                    console.error('[Embedding] Failed to generate/save tag embedding:', embedErr);
                }
            }

            showToast(`Tag ${editingTag ? 'updated' : 'created'} successfully`, 'success');
            setIsTagModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSavingTag(false);
        }
    };

    // ─── Type Modal Handlers ────────────────────────────────────────────
    const openCreateType = () => {
        setEditingType(null);
        setTypeForm(emptyTypeForm);
        setIsTypeModalOpen(true);
    };

    const openEditType = (type: TagType) => {
        setEditingType(type);
        setTypeForm({ id: type.id, description: type.description || '', is_active: type.is_active });
        setIsTypeModalOpen(true);
    };

    useImperativeHandle(ref, () => ({
        openCreate: () => {
            if (activeSubTab === 'types') openCreateType();
            else openCreateTag();
        }
    }));

    const updateTypeField = (field: keyof typeof emptyTypeForm, value: string | boolean) => {
        const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
        setTypeForm(prev => ({ ...prev, [field]: sanitizedValue }));
    };

    const handleSaveType = async () => {
        if (!typeForm.id) {
            showToast('Type ID is required', 'error');
            return;
        }

        setIsSavingType(true);
        try {
            const { error } = await supabase.schema('api').rpc('upsert_tag_type', {
                p_id: editingType ? editingType.id : typeForm.id.toLowerCase().replace(/\s+/g, '_'),
                p_description: typeForm.description,
                p_is_active: typeForm.is_active
            });

            if (error) throw error;

            showToast(`Tag type ${editingType ? 'updated' : 'created'} successfully`, 'success');
            setIsTypeModalOpen(false);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSavingType(false);
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
            header: 'Embedding',
            render: (tag) => tag.has_embedding ? <Badge label="Yes" variant="success" /> : <Badge label="No" variant="subtle" />
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

    const handleDeleteTag = async (tag: Tag) => {
        if (tag.use_count > 0) {
            showToast(`Cannot delete "${tag.name}" — it's applied to ${tag.use_count} item${tag.use_count === 1 ? '' : 's'}. Remove those associations first.`, 'error');
            return;
        }
        if (!await confirm(`Delete tag "${tag.name}"? This cannot be undone.`, {
            title: 'Delete Tag',
            confirmLabel: 'Delete'
        })) return;

        try {
            const { error } = await supabase.schema('api').rpc('delete_tag', {
                p_id: tag.id
            });
            if (error) throw error;
            showToast(`Tag "${tag.name}" deleted`, 'success');
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to delete tag.', 'error');
        }
    };

    const getTagActions = (tag: Tag): ActionItem[] => [
        {
            label: 'Edit Tag',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => openEditTag(tag),
        },
        { divider: true },
        {
            label: 'Delete Tag',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => handleDeleteTag(tag),
        }
    ];

    const getTypeActions = (type: TagType): ActionItem[] => [
        {
            label: 'Edit Type',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => openEditType(type),
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {activeSubTab === 'tags' ? (
                <>
                    {!hideToolbar && (
                        <TableToolbar
                            searchPlaceholder="Search tags..."
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                        >
                            <button className={adminStyles.btnPrimary} onClick={openCreateTag}>
                                Add Tag
                            </button>
                        </TableToolbar>
                    )}
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
                    {!hideToolbar && (
                        <TableToolbar
                            searchPlaceholder="Search types..."
                            searchValue={searchTerm}
                            onSearchChange={setSearchTerm}
                        >
                            <button className={adminStyles.btnPrimary} onClick={openCreateType}>
                                New Type
                            </button>
                        </TableToolbar>
                    )}
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

            {/* Tag Form Modal */}
            <Modal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                title={editingTag ? `Edit Tag: ${editingTag.name}` : 'Add New Tag'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsTagModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveTag} disabled={isSavingTag}>
                            {isSavingTag ? 'Saving...' : editingTag ? 'Save Changes' : 'Create Tag'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={adminStyles.formGrid}>
                        <FormRow label="Display Name">
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. Jazz Music"
                                value={tagForm.name}
                                onChange={(e) => updateTagField('name', e.target.value)}
                            />
                        </FormRow>
                        <FormRow label={editingTag ? 'URL Slug (Immutable)' : 'URL Slug'}>
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. jazz-music"
                                value={tagForm.slug}
                                disabled={!!editingTag}
                                style={editingTag ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                                onChange={(e) => updateTagField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            />
                        </FormRow>
                    </div>

                    <FormRow label="Tag Type">
                        <select
                            className={adminStyles.select}
                            value={tagForm.type_id}
                            onChange={(e) => updateTagField('type_id', e.target.value)}
                        >
                            <option value="">Select a type...</option>
                            {tagTypes.filter(t => t.is_active).map(t => (
                                <option key={t.id} value={t.id}>{t.id}</option>
                            ))}
                        </select>
                    </FormRow>

                    <FormRow label={editingTag ? 'Settings' : 'Ownership'}>
                        <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={tagForm.is_official}
                                    onChange={(e) => updateTagField('is_official', e.target.checked)}
                                />
                                <span style={{ fontSize: '14px' }}>Official Tag</span>
                            </label>
                            {editingTag && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={tagForm.is_active}
                                        onChange={(e) => updateTagField('is_active', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '14px' }}>Enabled</span>
                                </label>
                            )}
                        </div>
                    </FormRow>
                </div>
            </Modal>

            {/* Tag Type Form Modal */}
            <Modal
                isOpen={isTypeModalOpen}
                onClose={() => setIsTypeModalOpen(false)}
                title={editingType ? `Edit Type: ${editingType.id}` : 'Create Tag Type'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsTypeModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveType} disabled={isSavingType}>
                            {isSavingType ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {!editingType && (
                        <FormRow label="Type Identifier (ID)">
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. music_style"
                                value={typeForm.id}
                                onChange={(e) => updateTypeField('id', e.target.value)}
                            />
                            <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                                Lowercase, use underscores for spaces.
                            </p>
                        </FormRow>
                    )}

                    <FormRow label="Description">
                        <textarea
                            className={adminStyles.textarea}
                            rows={3}
                            placeholder="Describe what tags in this category represent..."
                            value={typeForm.description}
                            onChange={(e) => updateTypeField('description', e.target.value)}
                        />
                    </FormRow>

                    {editingType && (
                        <FormRow label="Status">
                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={typeForm.is_active}
                                        onChange={(e) => updateTypeField('is_active', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '14px' }}>Active / Enabled</span>
                                </label>
                            </div>
                        </FormRow>
                    )}
                </div>
            </Modal>

            {ConfirmDialog}
        </div>
    );
});

export default TagLibraryTab;
