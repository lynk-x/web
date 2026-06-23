"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { AccountPaymentMethod } from '@/types/organize';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import Badge from '@/components/shared/Badge';
import { useAccountPermissions } from '@/hooks/useAccountPermissions';

interface Props {
    accountId: string;
}

export default function PaymentMethodsManager({ accountId }: Props) {
    const { showToast } = useToast();
    const supabase = createClient();
    
    const { can, loading: permissionsLoading } = useAccountPermissions(accountId);
    const hasManageBilling = can('can_manage_billing');

    const [methods, setMethods] = useState<AccountPaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMethod, setNewMethod] = useState({ provider: 'mpesa', identity: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Dropdown state for "More" menu
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Edit modal states
    const [editingMethod, setEditingMethod] = useState<AccountPaymentMethod | null>(null);
    const [editForm, setEditForm] = useState({ provider: 'mpesa', identity: '', label: '' });

    const [methodToDelete, setMethodToDelete] = useState<AccountPaymentMethod | null>(null);
    const [providers, setProviders] = useState<any[]>([]);

    const fetchMethods = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('account_payment_methods')
                .select('*, provider:platform_payment_providers(provider_name)')
                .eq('account_id', accountId)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            
            // Flatten the provider name from the join
            const flattenedData = (data || []).map((item: any) => ({
                ...item,
                provider: item.provider?.provider_name || 'unknown'
            }));
            
            setMethods(flattenedData);
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [accountId, supabase, showToast]);

    const fetchProviders = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('platform_payment_providers')
                .select('*')
                .eq('supports_outbound', true)
                .order('display_name');
            if (error) throw error;
            setProviders(data || []);
            if (data && data.length > 0) {
                setNewMethod(prev => ({ ...prev, provider: data[0].provider_name }));
            }
        } catch (err: unknown) {
            console.error('Failed to load payment providers', err);
        }
    }, [supabase]);

    useEffect(() => {
        fetchMethods();
        fetchProviders();
    }, [fetchMethods, fetchProviders]);

    // Close the dropdown menu if user clicks anywhere else
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-dropdown-trigger]') || target.closest('[data-dropdown-menu]')) {
                return;
            }
            setActiveMenuId(null);
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const handleAddMethod = async () => {
        if (!newMethod.identity.trim()) {
            showToast('Please enter an account identity.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const isFirst = methods.length === 0;

            // Use RPC instead of direct insert to handle provider name to ID mapping
            const { data: methodId, error: rpcError } = await supabase.rpc('add_payout_method', {
                p_provider_name: newMethod.provider,
                p_identity: newMethod.identity,
                p_label: newMethod.provider === 'mpesa' ? `M-Pesa (${newMethod.identity.slice(-4)})` : undefined
            });

            if (rpcError) throw rpcError;

            // If it's the first method, set it as primary
            if (isFirst && methodId) {
                await supabase
                    .from('account_payment_methods')
                    .update({ is_primary: true })
                    .eq('id', methodId);
            }

            showToast('New payout destination added successfully.', 'success', 'Success');
            setIsAddModalOpen(false);
            setNewMethod({ provider: providers.length > 0 ? providers[0].provider_name : 'mpesa', identity: '' });
            fetchMethods();

        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to add payout destination.', 'error', 'Error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetPrimary = async (method: AccountPaymentMethod) => {
        try {
            // Unset all first (ideally done via DB function, but fallback is double query)
            await supabase
                .from('account_payment_methods')
                .update({ is_primary: false })
                .eq('account_id', accountId);

            const { error } = await supabase
                .from('account_payment_methods')
                .update({ is_primary: true })
                .eq('id', method.id);

            if (error) throw error;
            showToast('Default payout destination updated.', 'success', 'Success');
            fetchMethods();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error', 'Error');
        }
    };

    const handleDelete = async () => {
        if (!methodToDelete) return;
        try {
            const { error } = await supabase
                .from('account_payment_methods')
                .delete()
                .eq('id', methodToDelete.id);

            if (error) throw error;
            showToast('Payout destination removed.', 'success', 'Success');
            setMethodToDelete(null);
            fetchMethods();
        } catch (err: unknown) {
            showToast(getErrorMessage(err), 'error', 'Error');
        }
    };

    /**
     * Prepopulates the edit form fields and opens the edit modal.
     */
    const handleStartEdit = (method: AccountPaymentMethod) => {
        setEditingMethod(method);
        setEditForm({
            provider: method.provider,
            identity: '', // Remains blank unless the user intentionally overwrites it
            label: method.metadata?.label || ''
        });
        setActiveMenuId(null);
    };

    /**
     * Saves changes to the payout method, supporting renaming labels and updating write-only identity info.
     */
    const handleSaveEdit = async () => {
        if (!editingMethod) return;

        setIsSaving(true);
        try {
            const selectedProvider = providers.find(p => p.provider_name === editForm.provider);
            if (!selectedProvider) throw new Error('Provider not found.');

            const updateData: any = {
                provider_id: selectedProvider.id,
                metadata: {
                    ...editingMethod.metadata,
                    label: editForm.label.trim() || `${selectedProvider.display_name} payout destination`
                }
            };

            // Only update identity if a new non-empty value was provided (encrypted at rest by DB trigger)
            if (editForm.identity.trim()) {
                updateData.provider_identity = editForm.identity.trim();
                // Set default label automatically if they didn't input one
                if (!editForm.label.trim()) {
                    updateData.metadata.label = editForm.provider === 'mpesa'
                        ? `M-Pesa (${editForm.identity.trim().slice(-4)})`
                        : `${selectedProvider.display_name} payout destination`;
                }
            }

            const { error } = await supabase
                .from('account_payment_methods')
                .update(updateData)
                .eq('id', editingMethod.id);

            if (error) throw error;

            showToast('Payout destination updated successfully.', 'success', 'Success');
            setEditingMethod(null);
            fetchMethods();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to update payout destination.', 'error', 'Error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading payment methods...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 8px 0' }}>Payout Methods</h2>
                    <p style={{ margin: 0, fontSize: '14px', opacity: 0.7 }}>Manage where funds from ticket sales and sponsorships are sent.</p>
                </div>
                {hasManageBilling && (
                    <button className={adminStyles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
                        + Add New Destination
                    </button>
                )}
            </div>

            {methods.length === 0 ? (
                <div style={{ padding: '40px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ opacity: 0.7, marginBottom: '16px' }}>You haven't added any payout methods yet.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {methods.map(method => (
                        <div key={method.id} style={{
                            padding: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${method.is_primary ? '#2196f3' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {method.provider.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {providers.find(p => p.provider_name === method.provider)?.display_name || method.provider}
                                        {method.is_primary && <Badge label="PRIMARY" variant="info" />}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                                        {method.metadata?.label || "Account identity securely encrypted"}
                                    </div>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button
                                    data-dropdown-trigger="true"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === method.id ? null : method.id);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: 0.7,
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="1.5"></circle>
                                        <circle cx="12" cy="5" r="1.5"></circle>
                                        <circle cx="12" cy="19" r="1.5"></circle>
                                    </svg>
                                </button>

                                {activeMenuId === method.id && (
                                    <div 
                                        data-dropdown-menu="true"
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            marginTop: '8px',
                                            backgroundColor: '#1a1c23',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                        zIndex: 100,
                                        minWidth: '150px',
                                        overflow: 'hidden'
                                    }}>
                                        <button
                                            onClick={() => handleStartEdit(method)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 16px',
                                                textAlign: 'left',
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#ffffff',
                                                cursor: 'pointer',
                                                fontSize: '14px',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            Edit
                                        </button>
                                        {hasManageBilling && !method.is_primary && (
                                            <button
                                                onClick={() => {
                                                    handleSetPrimary(method);
                                                    setActiveMenuId(null);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 16px',
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ffffff',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                            >
                                                Set as Primary
                                            </button>
                                        )}
                                        {hasManageBilling && (
                                            <button
                                                onClick={() => {
                                                    setMethodToDelete(method);
                                                    setActiveMenuId(null);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 16px',
                                                    textAlign: 'left',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ff4d4f',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    transition: 'background 0.2s',
                                                    borderTop: '1px solid rgba(255,255,255,0.05)'
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Payout Destination"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleAddMethod} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Add Destination'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className={adminStyles.label}>Provider / Route</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={newMethod.provider}
                            onChange={(e) => setNewMethod({ ...newMethod, provider: e.target.value })}
                        >
                            {providers.map(p => (
                                <option key={p.provider_name} value={p.provider_name}>{p.display_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={adminStyles.label}>Account Identity</label>
                        <input
                            type="text"
                            placeholder="Enter account identity (e.g. Phone, IBAN, Email)"
                            className={adminStyles.input}
                            value={newMethod.identity}
                            onChange={(e) => setNewMethod({ ...newMethod, identity: e.target.value })}
                        />
                        <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '6px', margin: 0 }}>
                            This information is encrypted at rest. Must match the destination precisely.
                        </p>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!editingMethod}
                onClose={() => setEditingMethod(null)}
                title="Edit Payout Destination"
                footer={
                    <>
                        <button className={adminStyles.btnSecondary} onClick={() => setEditingMethod(null)}>Cancel</button>
                        <button className={adminStyles.btnPrimary} onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label className={adminStyles.label}>Provider / Route</label>
                        <select
                            className={adminStyles.select}
                            style={{ width: '100%' }}
                            value={editForm.provider}
                            onChange={(e) => setEditForm({ ...editForm, provider: e.target.value })}
                        >
                            {providers.map(p => (
                                <option key={p.provider_name} value={p.provider_name}>{p.display_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={adminStyles.label}>Label / Friendly Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Primary M-Pesa account"
                            className={adminStyles.input}
                            value={editForm.label}
                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={adminStyles.label}>New Account Identity (Optional)</label>
                        <input
                            type="text"
                            placeholder="Leave blank to keep existing encrypted identity"
                            className={adminStyles.input}
                            value={editForm.identity}
                            onChange={(e) => setEditForm({ ...editForm, identity: e.target.value })}
                        />
                        <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '6px', margin: 0 }}>
                            For security, the existing identity is encrypted at rest and cannot be displayed. Fill this in only if you want to replace it.
                        </p>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!methodToDelete}
                onClose={() => setMethodToDelete(null)}
                onConfirm={handleDelete}
                title="Remove Payment Method?"
                message="Are you sure you want to delete this payout destination? Any pending payouts routed here may fail."
                confirmLabel="Remove Destination"
                variant="danger"
            />
        </div>
    );
}
