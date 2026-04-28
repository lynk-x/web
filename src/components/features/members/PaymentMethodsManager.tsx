"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { AccountPaymentMethod } from '@/types/organize';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import Modal from '@/components/shared/Modal';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import Badge from '@/components/shared/Badge';

interface Props {
    accountId: string;
}

export default function PaymentMethodsManager({ accountId }: Props) {
    const { showToast } = useToast();
    const supabase = createClient();
    const [methods, setMethods] = useState<AccountPaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newMethod, setNewMethod] = useState({ provider: 'mpesa', identity: '' });
    const [isSaving, setIsSaving] = useState(false);

    const [methodToDelete, setMethodToDelete] = useState<AccountPaymentMethod | null>(null);

    const fetchMethods = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('account_payment_methods')
                .select('*')
                .eq('account_id', accountId)
                .order('is_primary', { ascending: false });

            if (error) throw error;
            setMethods(data || []);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [accountId, supabase, showToast]);

    useEffect(() => {
        fetchMethods();
    }, [fetchMethods]);

    const handleAddMethod = async () => {
        if (!newMethod.identity.trim()) {
            showToast('Please enter an account identity.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const isFirst = methods.length === 0;

            const { error } = await supabase
                .from('account_payment_methods')
                .insert({
                    account_id: accountId,
                    provider: newMethod.provider,
                    provider_identity: newMethod.identity,
                    is_primary: isFirst
                });

            if (error) throw error;
            showToast('New payout destination added successfully.', 'success', 'Success');
            setIsAddModalOpen(false);
            setNewMethod({ provider: 'mpesa', identity: '' });
            fetchMethods();

        } catch (err: any) {
            showToast(err.message || 'Failed to add payout destination.', 'error', 'Error');
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
        } catch (err: any) {
            showToast(err.message, 'error', 'Error');
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
        } catch (err: any) {
            showToast(err.message, 'error', 'Error');
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
                <button className={adminStyles.btnPrimary} onClick={() => setIsAddModalOpen(true)}>
                    + Add New Destination
                </button>
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
                                        {method.provider_identity}
                                        {method.is_primary && <Badge label="PRIMARY" variant="info" />}
                                    </div>
                                    <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '4px' }}>
                                        {method.provider === 'mpesa' ? 'Mobile Money' : method.provider === 'bank_transfer' ? 'Bank Account' : 'Gateway'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {!method.is_primary && (
                                    <button className={adminStyles.btnSecondary} onClick={() => handleSetPrimary(method)}>
                                        Set as Primary
                                    </button>
                                )}
                                <button
                                    onClick={() => setMethodToDelete(method)}
                                    style={{
                                        background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer',
                                        padding: '8px', borderRadius: '8px'
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
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
                            <option value="mpesa">M-Pesa</option>
                            <option value="bank_transfer">Bank Transfer (Swift)</option>
                            <option value="stripe_connect">Stripe Connect</option>
                            <option value="paypal">PayPal</option>
                        </select>
                    </div>
                    <div>
                        <label className={adminStyles.label}>Account Identity</label>
                        <input
                            type="text"
                            placeholder={newMethod.provider === 'mpesa' ? "+254..." : newMethod.provider === 'bank_transfer' ? "IBAN or Account Number" : "Email or Account ID"}
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
