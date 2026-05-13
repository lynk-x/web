"use client";

import React, { useState } from 'react';
import Modal from '../../shared/Modal';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import type { AdminAccount } from '@/types/admin';
import adminStyles from '@/app/(protected)/dashboard/admin/admin.module.css';

interface BalanceAdjustmentModalProps {
    account: AdminAccount;
    onClose: () => void;
    onSuccess: () => void;
}

const BalanceAdjustmentModal: React.FC<BalanceAdjustmentModalProps> = ({
    account,
    onClose,
    onSuccess,
}) => {
    const supabase = createClient();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    const [balanceType, setBalanceType] = useState<'cash' | 'credit'>('credit');
    const [action, setAction] = useState<'add' | 'deduct'>('add');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!amount || Number(amount) <= 0) {
            showToast('Please enter a valid amount.', 'error');
            return;
        }

        if (!reason) {
            showToast('Please provide a reason for the adjustment.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const finalAmount = action === 'add' ? Number(amount) : -Number(amount);
            
            const { error } = await supabase.rpc('admin_adjust_wallet_balance', {
                p_account_id: account.id,
                p_currency: account.country_code === 'KE' ? 'KES' : 'USD', // Defaulting based on country, or we could fetch existing wallets
                p_amount: finalAmount,
                p_balance_type: balanceType,
                p_reason: reason,
                p_notes: notes
            });

            if (error) throw error;

            showToast(`Successfully ${action === 'add' ? 'added' : 'deducted'} ${balanceType} balance.`, 'success');
            onSuccess();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Failed to adjust balance.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={true}
            title={`Adjust Balance: ${account.display_name}`} 
            onClose={onClose}
            size="medium"
        >
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className={adminStyles.inputGroup}>
                        <label>Balance Type</label>
                        <select 
                            className={adminStyles.select}
                            value={balanceType}
                            onChange={(e) => setBalanceType(e.target.value as any)}
                            required
                        >
                            <option value="credit">Credit (Promo)</option>
                            <option value="cash">Cash (Withdrawable)</option>
                        </select>
                    </div>
                    <div className={adminStyles.inputGroup}>
                        <label>Action</label>
                        <select 
                            className={adminStyles.select}
                            value={action}
                            onChange={(e) => setAction(e.target.value as any)}
                            required
                        >
                            <option value="add">Add / Grant</option>
                            <option value="deduct">Deduct / Charge</option>
                        </select>
                    </div>
                </div>

                <div className={adminStyles.inputGroup}>
                    <label>Amount ({account.country_code === 'KE' ? 'KES' : 'USD'})</label>
                    <input 
                        type="number"
                        step="0.01"
                        className={adminStyles.input}
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>

                <div className={adminStyles.inputGroup}>
                    <label>Reason (Audit Trail)</label>
                    <select 
                        className={adminStyles.select}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    >
                        <option value="">Select Reason...</option>
                        <option value="promo_grant">Promotional Grant</option>
                        <option value="support_adjustment">Support Adjustment</option>
                        <option value="refund_credit">Refund as Credit</option>
                        <option value="system_correction">System Correction</option>
                        <option value="manual_debit">Manual Debit / Penalty</option>
                    </select>
                </div>

                <div className={adminStyles.inputGroup}>
                    <label>Internal Notes</label>
                    <textarea 
                        className={adminStyles.textarea}
                        style={{ minHeight: '80px' }}
                        placeholder="Describe why this adjustment is being made..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    <button 
                        type="button"
                        className={adminStyles.secondaryButton}
                        onClick={onClose}
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        className={adminStyles.primaryButton}
                        disabled={isLoading}
                        style={{ flex: 2 }}
                    >
                        {isLoading ? 'Processing...' : `${action === 'add' ? 'Grant' : 'Deduct'} ${balanceType.charAt(0).toUpperCase() + balanceType.slice(1)}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BalanceAdjustmentModal;
