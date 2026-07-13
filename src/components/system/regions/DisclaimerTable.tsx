import { getErrorMessage } from '@/utils/error';
import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import Modal from '@/components/shared/Modal';
import FormRow from '@/components/shared/FormRow';
import { DatePicker } from '@/components/ui/DatePicker';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Toggle from '@/components/shared/Toggle';
import { useConfirmModal } from '@/hooks/useConfirmModal';

interface Disclaimer {
    id: string;
    tag_id: string;
    title: string;
    content: string;
    is_active: boolean;
    effective_date: string;
    updated_at: string;
    tags?: { name: string };
}

interface DisclaimerTableProps {
    hideToolbar?: boolean;
    searchTerm?: string;
}

export interface DisclaimerTableHandle {
    openCreate: () => void;
}

const emptyDisclaimerForm = {
    title: '',
    content: '',
    tag_id: '',
    effective_date: new Date().toISOString().split('T')[0],
    is_active: true
};

const DisclaimerTable = forwardRef<DisclaimerTableHandle, DisclaimerTableProps>(function DisclaimerTable({ hideToolbar, searchTerm: externalSearchTerm }, ref) {
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();
    const supabase = useMemo(() => createClient().schema('api' as any), []);

    const [disclaimers, setDisclaimers] = useState<Disclaimer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // ─── Create/Edit Modal ──────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDisclaimer, setEditingDisclaimer] = useState<Disclaimer | null>(null);
    const [tags, setTags] = useState<{ id: string, name: string }[]>([]);
    const [form, setForm] = useState(emptyDisclaimerForm);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchDisclaimers = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', {
                p_tab: 'disclaimers'
            });

            if (error) throw error;
            setDisclaimers(data || []);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to load disclaimers. Please check your connection.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchDisclaimers();
    }, [fetchDisclaimers]);

    useEffect(() => {
        if (!isModalOpen) return;
        const fetchTags = async () => {
            const { data, error } = await supabase.schema('api').rpc('get_admin_registry_data', { p_tab: 'tags' });
            if (error) { showToast(getErrorMessage(error), 'error'); return; }
            if (data) setTags(data);
        };
        fetchTags();
    }, [isModalOpen, supabase, showToast]);

    const openCreate = useCallback(() => {
        setEditingDisclaimer(null);
        setForm(emptyDisclaimerForm);
        setIsModalOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ openCreate }));

    const openEdit = (d: Disclaimer) => {
        setEditingDisclaimer(d);
        setForm({
            title: d.title,
            content: d.content,
            tag_id: d.tag_id,
            effective_date: d.effective_date ? d.effective_date.split('T')[0] : '',
            is_active: d.is_active
        });
        setIsModalOpen(true);
    };

    const updateField = (field: keyof typeof emptyDisclaimerForm, value: string | boolean) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!form.title || !form.content || !form.tag_id) {
            showToast('All fields are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.schema('api').rpc('admin_upsert_registry_item', {
                p_tab: 'disclaimers',
                p_data: editingDisclaimer ? { ...form, id: editingDisclaimer.id } : form
            });

            if (error) throw error;

            showToast(`Compliance rule ${editingDisclaimer ? 'updated' : 'created'} successfully`, 'success');
            setIsModalOpen(false);
            fetchDisclaimers();
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await supabase.schema('api').rpc('admin_manage_registry_item', {
                p_tab: 'disclaimers',
                p_action: 'toggle',
                p_id: id,
                p_params: { is_active: !currentValue }
            });

            if (error) throw error;
            setDisclaimers(prev => prev.map(d => d.id === id ? { ...d, is_active: !currentValue } : d));
            showToast(`Disclaimer updated successfully.`, 'success');
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || `Failed to update disclaimer.`, 'error');
        }
    };

    const filtered = disclaimers.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.tags?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filtered.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filtered.map(d => d.id)));
    };

    const columns: Column<Disclaimer>[] = [
        {
            header: 'Title',
            render: (d) => <div style={{ fontWeight: 600 }}>{d.title}</div>
        },
        {
            header: 'Target Tag',
            render: (d) => <Badge label={d.tags?.name || 'Unknown'} variant="neutral" />
        },
        {
            header: 'Preview',
            render: (d) => (
                <div style={{ maxWidth: '300px', fontSize: '13px', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.content}
                </div>
            )
        },
        {
            header: 'Effective Date',
            render: (d) => <span style={{ fontSize: '13px' }}>{new Date(d.effective_date).toLocaleDateString()}</span>
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (d) => (
                <Toggle
                    enabled={d.is_active}
                    onChange={() => handleToggle(d.id, d.is_active)}
                />
            )
        }
    ];

    const handleDelete = async (id: string) => {
        if (!await confirm('Delete this disclaimer? This action cannot be undone.', {
            title: 'Delete Disclaimer',
            confirmLabel: 'Delete'
        })) return;
        try {
            const { error } = await supabase.schema('api').rpc('admin_manage_registry_item', {
                p_tab: 'disclaimers',
                p_action: 'delete',
                p_id: id
            });

            if (error) throw error;
            showToast('Disclaimer deleted successfully', 'success');
            fetchDisclaimers();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to delete disclaimer', 'error');
        }
    };

    const getActions = (d: Disclaimer): ActionItem[] => [
        {
            label: 'Edit Disclaimer',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => openEdit(d)
        },
        {
            label: 'Delete',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => handleDelete(d.id)
        }
    ];

    const bulkActions: BulkAction[] = [
        {
            label: 'Activate Selected',
            onClick: async () => {
                const ids = Array.from(selectedIds);
                const results = await Promise.all(ids.map(id =>
                    supabase.schema('api').rpc('admin_manage_registry_item', {
                        p_tab: 'disclaimers',
                        p_action: 'toggle',
                        p_id: id,
                        p_params: { is_active: true }
                    })
                ));
                const errors = results.filter(r => r.error);
                if (errors.length === 0) {
                    showToast('Activated selected disclaimers', 'success');
                    fetchDisclaimers();
                    setSelectedIds(new Set());
                } else {
                    showToast('Some updates failed', 'error');
                }
            },
            variant: 'success' as const
        },
        {
            label: 'Deactivate Selected',
            onClick: async () => {
                const ids = Array.from(selectedIds);
                const results = await Promise.all(ids.map(id =>
                    supabase.schema('api').rpc('admin_manage_registry_item', {
                        p_tab: 'disclaimers',
                        p_action: 'toggle',
                        p_id: id,
                        p_params: { is_active: false }
                    })
                ));
                const errors = results.filter(r => r.error);
                if (errors.length === 0) {
                    showToast('Deactivated selected disclaimers', 'warning');
                    fetchDisclaimers();
                    setSelectedIds(new Set());
                } else {
                    showToast('Some updates failed', 'error');
                }
            },
            variant: 'danger' as const
        }
    ];

    const paginated = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!hideToolbar && (
                <TableToolbar searchPlaceholder="Search disclaimers..." searchValue={searchTerm} onSearchChange={setSearchTerm}>
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={openCreate}
                    >
                        + New Disclaimer
                    </button>
                </TableToolbar>
            )}

            <BulkActionsBar selectedCount={selectedIds.size} actions={bulkActions} onCancel={() => setSelectedIds(new Set())} itemTypeLabel="disclaimers" />

            <DataTable<Disclaimer>
                data={paginated}
                columns={columns}
                getActions={getActions}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
                emptyMessage="No disclaimers found."
            />

            {/* Disclaimer Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingDisclaimer ? 'Edit Compliance Rule' : 'New Compliance Rule'}
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : editingDisclaimer ? 'Save Changes' : 'Create Rule'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={adminStyles.formGrid}>
                        <FormRow label="Rule Title">
                            <input
                                type="text"
                                className={adminStyles.input}
                                placeholder="e.g. Alcohol Warning"
                                value={form.title}
                                onChange={(e) => updateField('title', e.target.value)}
                            />
                        </FormRow>

                        <FormRow label="Target Tag">
                            <select
                                className={adminStyles.select}
                                value={form.tag_id}
                                onChange={(e) => updateField('tag_id', e.target.value)}
                            >
                                <option value="">Select a tag...</option>
                                {tags.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </FormRow>

                        <FormRow label="Effective Date">
                            <DatePicker
                                value={form.effective_date}
                                onChange={(val) => updateField('effective_date', val)}
                                placeholder="dd/mm/yyyy"
                            />
                        </FormRow>

                        {editingDisclaimer && (
                            <FormRow label="Status">
                                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={form.is_active}
                                            onChange={(e) => updateField('is_active', e.target.checked)}
                                        />
                                        <span style={{ fontSize: '14px' }}>Active</span>
                                    </label>
                                </div>
                            </FormRow>
                        )}

                        <FormRow label="Disclaimer Content" style={{ gridColumn: '1 / -1' }}>
                            <textarea
                                className={adminStyles.textarea}
                                rows={6}
                                placeholder="Detailed legal text..."
                                value={form.content}
                                onChange={(e) => updateField('content', e.target.value)}
                            />
                        </FormRow>
                    </div>
                </div>
            </Modal>

            {ConfirmDialog}
        </div>
    );
});

export default DisclaimerTable;
