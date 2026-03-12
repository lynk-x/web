"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import Toggle from '@/components/shared/Toggle';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import { useToast } from '@/components/ui/Toast';
import type { ActionItem } from '@/types/shared';
import { useRouter } from 'next/navigation';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/shared/Modal';

export interface SystemConfig {
    key: string;
    value: string;
    data_type: 'string' | 'boolean' | 'number' | 'json';
    description: string;
    is_active: boolean;
    updated_at: string;
}

export default function ConfigTab() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedConfigKeys, setSelectedConfigKeys] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
    const [formValues, setFormValues] = useState<Partial<SystemConfig>>({
        key: '',
        value: '',
        data_type: 'string',
        description: '',
        is_active: true
    });

    const fetchConfigs = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_config')
                .select('*')
                .order('key', { ascending: true });

            if (error) throw error;
            setConfigs(data || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to fetch configurations', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    const handleToggleConfig = async (key: string, currentValue: boolean) => {
        try {
            const { error } = await supabase
                .from('system_config')
                .update({ is_active: !currentValue, updated_at: new Date().toISOString() })
                .eq('key', key);

            if (error) throw error;

            // Optimistic update
            setConfigs(prev => prev.map(c =>
                c.key === key ? { ...c, is_active: !currentValue } : c
            ));

            showToast(`Configuration "${key}" ${!currentValue ? 'enabled' : 'disabled'}`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to update configuration', 'error');
        }
    };

    const handleOpenCreate = () => {
        setEditingConfig(null);
        setFormValues({
            key: '',
            value: '',
            data_type: 'string',
            description: '',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (config: SystemConfig) => {
        setEditingConfig(config);
        setFormValues({ ...config });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formValues.key || !formValues.value) {
            showToast('Key and Value are required', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                ...formValues,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('system_config')
                .upsert(payload, { onConflict: 'key' });

            if (error) throw error;

            showToast(`Configuration ${editingConfig ? 'updated' : 'created'} successfully`, 'success');
            setIsModalOpen(false);
            fetchConfigs();
        } catch (error: any) {
            showToast(error.message || 'Failed to save configuration', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredConfigs = configs.filter(config => {
        const matchesSearch = config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            config.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && config.is_active) ||
            (statusFilter === 'inactive' && !config.is_active);
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
    const paginatedConfigs = filteredConfigs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const handleSelectConfig = (key: string) => {
        const newSelected = new Set(selectedConfigKeys);
        if (newSelected.has(key)) newSelected.delete(key);
        else newSelected.add(key);
        setSelectedConfigKeys(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedConfigKeys.size === paginatedConfigs.length) {
            setSelectedConfigKeys(new Set());
        } else {
            const newSelected = new Set(selectedConfigKeys);
            paginatedConfigs.forEach(config => newSelected.add(config.key));
            setSelectedConfigKeys(newSelected);
        }
    };

    const bulkActions: BulkAction[] = [
        {
            label: 'Enable Selected',
            onClick: async () => {
                const keys = Array.from(selectedConfigKeys);
                const { error } = await supabase.from('system_config').update({ is_active: true }).in('key', keys);
                if (!error) {
                    showToast('Enabled selection', 'success');
                    fetchConfigs();
                    setSelectedConfigKeys(new Set());
                }
            },
            variant: 'success'
        },
        {
            label: 'Disable Selected',
            onClick: async () => {
                const keys = Array.from(selectedConfigKeys);
                const { error } = await supabase.from('system_config').update({ is_active: false }).in('key', keys);
                if (!error) {
                    showToast('Disabled selection', 'warning');
                    fetchConfigs();
                    setSelectedConfigKeys(new Set());
                }
            },
            variant: 'danger'
        }
    ];

    const columns: Column<SystemConfig>[] = [
        {
            header: 'Config Key',
            render: (config) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'monospace' }}>{config.key}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{config.description}</div>
                </div>
            )
        },
        {
            header: 'Value',
            render: (config) => <div style={{ fontSize: '14px', fontWeight: 500, fontFamily: 'monospace' }}>{config.value}</div>
        },
        {
            header: 'Status',
            headerStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            cellStyle: { width: '60px', textAlign: 'right', paddingRight: '0' },
            render: (config) => (
                <Toggle
                    enabled={config.is_active}
                    onChange={() => handleToggleConfig(config.key, config.is_active)}
                />
            )
        }
    ];

    const getRowActions = (config: SystemConfig): ActionItem[] => [
        {
            label: 'Edit',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => handleOpenEdit(config),
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <TableToolbar
                searchPlaceholder="Search configs..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <button className={adminStyles.btnPrimary} onClick={handleOpenCreate}>
                    Add Config
                </button>
            </TableToolbar>

            <BulkActionsBar
                selectedCount={selectedConfigKeys.size}
                actions={bulkActions}
                onCancel={() => setSelectedConfigKeys(new Set())}
                itemTypeLabel="configs"
            />

            <DataTable<any>
                data={paginatedConfigs.map(c => ({ ...c, id: c.key }))}
                columns={columns}
                getActions={getRowActions}
                selectedIds={selectedConfigKeys}
                onSelect={handleSelectConfig}
                onSelectAll={handleSelectAll}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                isLoading={isLoading}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => !isSaving && setIsModalOpen(false)}
                title={editingConfig ? 'Edit Configuration' : 'Create New Configuration'}
                footer={
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
                        <button
                            className={adminStyles.btnSecondary}
                            onClick={() => setIsModalOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            className={adminStyles.btnPrimary}
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className={adminStyles.inputGroup}>
                        <label className={adminStyles.label}>Config Key</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            placeholder="e.g. ad_frequency_cap"
                            value={formValues.key}
                            onChange={e => setFormValues({ ...formValues, key: e.target.value })}
                            disabled={!!editingConfig || isSaving}
                        />
                        <p style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
                            Unique identifier used by the platform to look up this setting.
                        </p>
                    </div>

                    <div className={adminStyles.inputGroup}>
                        <label className={adminStyles.label}>Value</label>
                        <input
                            type="text"
                            className={adminStyles.input}
                            placeholder="Enter value..."
                            value={formValues.value}
                            onChange={e => setFormValues({ ...formValues, value: e.target.value })}
                            disabled={isSaving}
                        />
                    </div>

                    <div className={adminStyles.inputGroup}>
                        <label className={adminStyles.label}>Data Type</label>
                        <select
                            className={adminStyles.input}
                            value={formValues.data_type}
                            onChange={e => setFormValues({ ...formValues, data_type: e.target.value as 'string' | 'number' | 'boolean' | 'json' })}
                            disabled={isSaving}
                        >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="json">JSON</option>
                        </select>
                    </div>

                    <div className={adminStyles.inputGroup}>
                        <label className={adminStyles.label}>Description</label>
                        <textarea
                            className={adminStyles.input}
                            style={{ height: '80px', paddingTop: '8px' }}
                            placeholder="What does this configuration control?"
                            value={formValues.description}
                            onChange={e => setFormValues({ ...formValues, description: e.target.value })}
                            disabled={isSaving}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
