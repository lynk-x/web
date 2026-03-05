"use client";

import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import adminStyles from '@/app/dashboard/admin/page.module.css';
import Modal from '@/components/shared/Modal';
import type { PlatformPaymentProvider } from '@/types/admin';

export default function PaymentProvidersTab() {
    const { showToast } = useToast();
    const supabase = createClient();

    const [data, setData] = useState<PlatformPaymentProvider[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isEditing, setIsEditing] = useState<PlatformPaymentProvider | null>(null);
    const [editForm, setEditForm] = useState({
        processing_fee_percent: 0,
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: res, error } = await supabase
                .from('platform_payment_providers')
                .select('*')
                .order('provider_name');
            if (error) throw error;
            setData(res || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to load payment providers', 'error');
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
            const { error } = await supabase
                .from('platform_payment_providers')
                .update({
                    processing_fee_percent: Number(editForm.processing_fee_percent),
                    is_active: editForm.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', isEditing.id);

            if (error) throw error;
            showToast('Payment provider updated successfully.', 'success');
            setIsEditing(null);
            fetchData();
        } catch (error: any) {
            showToast(error.message || 'Failed to update payment provider.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActiveStatus = async (provider: PlatformPaymentProvider) => {
        const newStatus = !provider.is_active;
        try {
            const { error } = await supabase
                .from('platform_payment_providers')
                .update({
                    is_active: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', provider.id);

            if (error) throw error;
            showToast(`Provider ${newStatus ? 'activated' : 'deactivated'} successfully.`, 'success');
            setData(prev => prev.map(p => p.id === provider.id ? { ...p, is_active: newStatus } : p));
        } catch (error: any) {
            showToast(error.message || 'Failed to toggle status.', 'error');
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
                    {provider.supported_currencies.map(c => (
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
                <Badge
                    label={provider.is_active ? 'Active' : 'Inactive'}
                    variant={provider.is_active ? 'success' : 'neutral'}
                />
            )
        }
    ];

    const getActions = (provider: PlatformPaymentProvider) => [
        {
            label: 'Edit Configuration',
            onClick: () => {
                setIsEditing(provider);
                setEditForm({
                    processing_fee_percent: provider.processing_fee_percent,
                    is_active: provider.is_active
                });
            }
        },
        {
            label: provider.is_active ? 'Deactivate' : 'Activate',
            variant: provider.is_active ? 'danger' : 'success',
            onClick: () => toggleActiveStatus(provider)
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Payment Providers</div>
                    <div style={{ fontSize: '13px', opacity: 0.6 }}>Global configuration for available checkout gateways.</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search providers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ flex: '1 1 220px', padding: '9px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '14px' }}
                />
            </div>

            <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                <DataTable
                    data={filteredData}
                    columns={columns}
                    getActions={getActions as any}
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
                            <div>
                                <label className={adminStyles.label}>Provider Name</label>
                                <input className={adminStyles.input} value={isEditing.display_name} disabled style={{ opacity: 0.6 }} />
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={editForm.is_active}
                                    onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                                />
                                <span style={{ fontSize: '14px', opacity: 0.8 }}>Enable this provider for checkouts</span>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </div>
    );
}
