"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import Modal from '@/components/shared/Modal';
import Toggle from '@/components/shared/Toggle';
import type { PlatformPaymentProvider } from '@/types/admin';

export default function PaymentProvidersTab({ searchTerm = '' }: { searchTerm?: string }) {
    const { showToast } = useToast();
    const supabase = createClient();

    const [data, setData] = useState<PlatformPaymentProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isEditing, setIsEditing] = useState<PlatformPaymentProvider | null>(null);
    const [editForm, setEditForm] = useState({
        processing_fee_percent: 0,
        is_active: true,
        environment: 'sandbox',
        config: {} as any
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: res, error } = await supabase.rpc('get_admin_settings_data', {
                p_tab: 'payment_providers'
            });
            if (error) throw error;

            setData(res || []);
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to load payment providers', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        if (!isEditing) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.rpc('admin_manage_settings_item', {
                p_tab: 'payment_providers',
                p_action: 'update',
                p_id: isEditing.id,
                p_params: {
                    processing_fee_percent: Number(editForm.processing_fee_percent),
                    is_active: editForm.is_active,
                    metadata: {
                        environment: editForm.environment,
                        config: editForm.config
                    }
                }
            });

            if (error) throw error;
            showToast('Payment provider updated successfully.', 'success');
            setIsEditing(null);
            fetchData();
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to update payment provider.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActiveStatus = async (provider: PlatformPaymentProvider) => {
        const newStatus = !provider.is_active;
        try {
            const { error } = await supabase.rpc('admin_manage_settings_item', {
                p_tab: 'payment_providers',
                p_action: 'toggle',
                p_id: provider.id,
                p_params: { is_active: newStatus }
            });

            if (error) throw error;
            showToast(`Provider ${newStatus ? 'activated' : 'deactivated'} successfully.`, 'success');
            setData(prev => prev.map(p => p.id === provider.id ? { ...p, is_active: newStatus } : p));
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || 'Failed to toggle status.', 'error');
        }
    };

    const filteredData = data.filter(p => p.display_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const columns = [
        {
            header: 'Provider',
            render: (provider: PlatformPaymentProvider) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {provider.logo_url ? (
                            <img src={provider.logo_url} alt={provider.display_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontSize: '16px', fontWeight: 600 }}>{provider.display_name.charAt(0)}</span>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500 }}>{provider.display_name}</div>
                        <div style={{ fontSize: '13px', opacity: 0.6 }}>{provider.provider_name}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Currencies',
            render: (provider: PlatformPaymentProvider) => (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {provider.supported_currencies?.map(c => (
                        <span key={c} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                            {c}
                        </span>
                    ))}
                </div>
            )
        },
        {
            header: 'Processing Fee',
            render: (provider: PlatformPaymentProvider) => (
                <div>{provider.processing_fee_percent}%</div>
            )
        },
        {
            header: 'Status',
            render: (provider: PlatformPaymentProvider) => (
                <Toggle
                    enabled={provider.is_active}
                    onChange={() => toggleActiveStatus(provider)}
                />
            )
        }
    ];

    const getActions = (provider: PlatformPaymentProvider) => [
        {
            label: 'Edit Configuration',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
            onClick: () => {
                setIsEditing(provider);
                setEditForm({
                    processing_fee_percent: provider.processing_fee_percent,
                    is_active: provider.is_active,
                    environment: provider.metadata?.environment || 'sandbox',
                    config: provider.metadata?.config || {}
                });
            }
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            
            <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                <DataTable
                    data={filteredData}
                    columns={columns}
                    getActions={getActions}
                    isLoading={isLoading}
                    emptyMessage="No payment providers configured."
                />

                <Modal
                    isOpen={!!isEditing}
                    onClose={() => setIsEditing(null)}
                    title="Edit Payment Provider"
                    footer={
                        <>
                            <button className={adminStyles.btnSecondary} onClick={() => setIsEditing(null)}>Cancel</button>
                            <button className={adminStyles.btnPrimary} onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    }
                >
                    {isEditing && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label className={adminStyles.label}>Provider Name</label>
                                    <input className={adminStyles.input} value={isEditing.display_name} disabled style={{ opacity: 0.6 }} />
                                </div>
                                <div>
                                    <label className={adminStyles.label}>Environment</label>
                                    <select
                                        className={adminStyles.input}
                                        value={editForm.environment}
                                        onChange={e => setEditForm({ ...editForm, environment: e.target.value })}
                                    >
                                        <option value="sandbox">Sandbox (Testing)</option>
                                        <option value="live">Live (Production)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={adminStyles.label}>Processing Fee (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className={adminStyles.input}
                                    value={editForm.processing_fee_percent}
                                    onChange={e => setEditForm(prev => ({ ...prev, processing_fee_percent: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <label className={adminStyles.label}>Configuration JSON</label>
                                <textarea
                                    className={adminStyles.input}
                                    style={{ height: '100px', fontFamily: 'monospace', fontSize: '12px' }}
                                    value={JSON.stringify(editForm.config, null, 2)}
                                    onChange={e => {
                                        try {
                                            const parsed = JSON.parse(e.target.value);
                                            setEditForm({ ...editForm, config: parsed });
                                        } catch (err) {
                                            // Handle invalid JSON silently or with local error state
                                        }
                                    }}
                                    placeholder='{ "apiKey": "..." }'
                                />
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
