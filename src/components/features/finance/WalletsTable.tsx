"use client";

import React, { useState, useEffect } from 'react';
import DataTable from '@/components/shared/DataTable';
import Button from '@/components/shared/Button';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Select from '@/components/shared/Select';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { AccountWallet, AccountPaymentMethod } from '@/types/organize';
import type { ActionItem } from '@/components/shared/TableRowActions';
import { useAccountPermissions } from '@/hooks/useAccountPermissions';

interface WalletsTableProps {
    data: AccountWallet[];
    isLoading: boolean;
    accountId?: string;
    onRefresh?: () => void;
}

export default function WalletsTable({ data, isLoading, accountId, onRefresh }: WalletsTableProps) {
    const { showToast } = useToast();
    const supabase = createClient();

    const { can } = useAccountPermissions(accountId);
    const hasManageBilling = can('can_manage_billing');

    const [selectedWallet, setSelectedWallet] = useState<AccountWallet | null>(null);
    const [activeModal, setActiveModal] = useState<'none' | 'withdraw' | 'topup' | 'transfer' | 'history'>('none');

    // Withdraw State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedPayoutMethod, setSelectedPayoutMethod] = useState('');
    const [payoutMethods, setPayoutMethods] = useState<AccountPaymentMethod[]>([]);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Topup State
    const [topupAmount, setTopupAmount] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('');
    const [payerIdentity, setPayerIdentity] = useState('');
    const [topupProviders, setTopupProviders] = useState<{id: string; provider_name: string; display_name: string}[]>([]);
    const [isToppingUp, setIsToppingUp] = useState(false);

    // Transfer State
    const [transferAmount, setTransferAmount] = useState('');
    const [transferToCurrency, setTransferToCurrency] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    // History State
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    useEffect(() => {
        if (activeModal === 'withdraw' && accountId) {
            // Fetch payout methods
            supabase.schema('finance' as any).from('account_payment_methods').select('*').eq('account_id', accountId)
                .then(({ data }) => setPayoutMethods(data || []));
        }
        if (activeModal === 'topup') {
            // Fetch top up providers
            supabase.schema('finance' as any).from('platform_payment_providers').select('*').eq('is_active', true).eq('supports_inbound', true)
                .then(({ data }) => setTopupProviders(data || []));
        }
        if (activeModal === 'history' && accountId && selectedWallet) {
            setIsHistoryLoading(true);
            supabase.schema('api').rpc('get_organizer_transactions', {
                p_account_id: accountId,
                p_limit: 50,
                p_offset: 0
            }).then(({ data, error }) => {
                if (!error && data) {
                    const items = data.items || [];
                    const filtered = items.filter((t: any) => t.currency === selectedWallet.currency);
                    setTransactions(filtered);
                }
                setIsHistoryLoading(false);
            });
        }
    }, [activeModal, accountId, selectedWallet, supabase]);

    const handleWithdraw = async () => {
        if (!accountId || !selectedWallet) return;
        if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
            showToast("Please enter a valid amount", "error");
            return;
        }
        if (!selectedPayoutMethod) {
            showToast("Please select a payout method", "error");
            return;
        }

        setIsWithdrawing(true);
        try {
            const { error } = await supabase.schema('api').rpc('request_account_payout', {
                p_account_id: accountId,
                p_amount: Number(withdrawAmount),
                p_payout_method_id: selectedPayoutMethod,
                p_currency: selectedWallet.currency
            });
            if (error) throw error;
            showToast("Withdrawal requested successfully.", "success");
            closeModal();
            if (onRefresh) onRefresh();
        } catch (err: any) {
            showToast(err.message || "Failed to request withdrawal", "error");
        } finally {
            setIsWithdrawing(false);
        }
    };

    const handleTopUp = async () => {
        if (!accountId || !selectedWallet) return;
        if (!topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) <= 0) {
            showToast("Please enter a valid amount", "error");
            return;
        }
        if (!selectedProvider) {
            showToast("Please select a provider", "error");
            return;
        }
        if (!payerIdentity) {
            showToast("Please enter your payer identity", "error");
            return;
        }

        setIsToppingUp(true);
        try {
            const { error } = await supabase.schema('api').rpc('initiate_wallet_topup', {
                p_account_id: accountId,
                p_amount: Number(topupAmount),
                p_currency: selectedWallet.currency,
                p_provider_name: selectedProvider,
                p_payer_identity: payerIdentity
            });
            if (error) throw error;
            showToast("Top-up initiated successfully. Check your provider for payment prompt.", "success");
            closeModal();
            if (onRefresh) onRefresh();
        } catch (err: any) {
            showToast(err.message || "Failed to initiate top-up", "error");
        } finally {
            setIsToppingUp(false);
        }
    };

    const handleTransfer = async () => {
        if (!accountId || !selectedWallet) return;
        if (!transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
            showToast("Please enter a valid amount", "error");
            return;
        }
        if (!transferToCurrency) {
            showToast("Please select a destination wallet", "error");
            return;
        }

        setIsTransferring(true);
        try {
            const { error } = await supabase.schema('api').rpc('transfer_wallet_funds', {
                p_account_id: accountId,
                p_amount: Number(transferAmount),
                p_from_currency: selectedWallet.currency,
                p_to_currency: transferToCurrency
            });
            if (error) throw error;
            showToast("Transfer completed successfully.", "success");
            closeModal();
            if (onRefresh) onRefresh();
        } catch (err: any) {
            showToast(err.message || "Failed to transfer funds", "error");
        } finally {
            setIsTransferring(false);
        }
    };

    const closeModal = () => {
        setActiveModal('none');
        setSelectedWallet(null);
        setWithdrawAmount('');
        setSelectedPayoutMethod('');
        setTopupAmount('');
        setSelectedProvider('');
        setPayerIdentity('');
        setTransferAmount('');
        setTransferToCurrency('');
        setTransactions([]);
    };

    const columns = [
        {
            header: 'Reference',
            render: (wallet: AccountWallet) => (
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', opacity: 0.8 }}>
                    {wallet.reference}
                </div>
            )
        },
        {
            header: 'Currency',
            render: (wallet: AccountWallet) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px'
                    }}>
                        {wallet.currency}
                    </div>
                </div>
            )
        },
        {
            header: 'Cash Balance',
            render: (wallet: AccountWallet) => {
                return (
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency }).format(wallet.cash_balance || 0)}
                    </div>
                );
            }
        },
        {
            header: 'Credit Balance',
            render: (wallet: AccountWallet) => {
                return (
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency }).format(wallet.credit_balance || 0)}
                    </div>
                );
            }
        },
        {
            header: 'Reserved (Escrow)',
            render: (wallet: AccountWallet) => {
                return (
                    <div style={{ opacity: 0.8, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: wallet.currency }).format(wallet.escrow_balance || 0)}
                    </div>
                );
            }
        }
    ];

    const getActions = (wallet: AccountWallet): ActionItem[] => {
        const actions: ActionItem[] = [];
        if (hasManageBilling) {
            actions.push(
                {
                    label: 'Top Up',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
                    onClick: () => { setSelectedWallet(wallet); setActiveModal('topup'); }
                },
                {
                    label: 'Transfer',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>,
                    onClick: () => { setSelectedWallet(wallet); setActiveModal('transfer'); }
                },
                {
                    label: 'Withdraw',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>,
                    onClick: () => { setSelectedWallet(wallet); setActiveModal('withdraw'); }
                }
            );
        }
        actions.push({
            label: 'History',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
            onClick: () => { setSelectedWallet(wallet); setActiveModal('history'); }
        });
        return actions;
    };

    return (
        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px' }}>
            <DataTable
                data={data}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                emptyMessage="No balances available in this wallet."
            />

            {/* Withdraw Modal */}
            <Modal isOpen={activeModal === 'withdraw'} onClose={closeModal} title={`Withdraw ${selectedWallet?.currency}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ opacity: 0.8, fontSize: '14px' }}>
                        Cash Balance: <strong style={{ color: 'var(--color-text-primary)' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedWallet?.currency || 'USD' }).format(selectedWallet?.cash_balance || 0)}</strong>
                    </p>
                    <Input
                        label="Amount"
                        type="number"
                        placeholder="0.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <Select
                        label="Payout Method"
                        options={[{ value: '', label: 'Select a destination...' }, ...payoutMethods.map(m => ({
                            value: m.id,
                            label: `${m.provider} - ${m.metadata?.label || 'Hidden Identity'}`
                        }))]}
                        value={selectedPayoutMethod}
                        onChange={(e) => setSelectedPayoutMethod(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleWithdraw} isLoading={isWithdrawing} style={{ marginTop: '8px' }}>
                        Submit Withdrawal Request
                    </Button>
                </div>
            </Modal>

            {/* Top Up Modal */}
            <Modal isOpen={activeModal === 'topup'} onClose={closeModal} title={`Top Up ${selectedWallet?.currency}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ opacity: 0.8, fontSize: '14px' }}>
                        Add funds to your {selectedWallet?.currency} wallet for refunds or ad purchases.
                    </p>
                    <Input
                        label="Amount"
                        type="number"
                        placeholder="0.00"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                    />
                    <Select
                        label="Payment Provider"
                        options={[{ value: '', label: 'Select a provider...' }, ...topupProviders.map(p => ({
                            value: p.provider_name,
                            label: p.display_name
                        }))]}
                        value={selectedProvider}
                        onChange={(e) => setSelectedProvider(e.target.value)}
                    />
                    <Input
                        label="Payer Identity"
                        placeholder="e.g. 254700000000 for M-Pesa"
                        value={payerIdentity}
                        onChange={(e) => setPayerIdentity(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleTopUp} isLoading={isToppingUp} style={{ marginTop: '8px' }}>
                        Initiate Top Up
                    </Button>
                </div>
            </Modal>

            {/* Transfer Modal */}
            <Modal isOpen={activeModal === 'transfer'} onClose={closeModal} title={`Transfer ${selectedWallet?.currency}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ opacity: 0.8, fontSize: '14px' }}>
                        Transfer funds from {selectedWallet?.currency} to another wallet.
                        <br />
                        Cash Balance: <strong style={{ color: 'var(--color-text-primary)' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedWallet?.currency || 'USD' }).format(selectedWallet?.cash_balance || 0)}</strong>
                    </p>
                    <Input
                        label="Amount to Transfer"
                        type="number"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                    />
                    <Select
                        label="Destination Wallet"
                        options={[
                            { value: '', label: 'Select destination...' },
                            ...data.filter(w => w.currency !== selectedWallet?.currency).map(w => ({
                                value: w.currency,
                                label: `${w.currency} Wallet (${new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency }).format(w.cash_balance || 0)})`
                            }))
                        ]}
                        value={transferToCurrency}
                        onChange={(e) => setTransferToCurrency(e.target.value)}
                    />
                    <Button variant="primary" onClick={handleTransfer} isLoading={isTransferring} style={{ marginTop: '8px' }}>
                        Transfer Funds
                    </Button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal isOpen={activeModal === 'history'} onClose={closeModal} title={`${selectedWallet?.currency} Transaction History`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isHistoryLoading ? (
                        <p>Loading history...</p>
                    ) : transactions.length > 0 ? (
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                        <th style={{ padding: '8px', opacity: 0.8, fontWeight: 500 }}>Date</th>
                                        <th style={{ padding: '8px', opacity: 0.8, fontWeight: 500 }}>Reason</th>
                                        <th style={{ padding: '8px', opacity: 0.8, fontWeight: 500 }}>Amount</th>
                                        <th style={{ padding: '8px', opacity: 0.8, fontWeight: 500 }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '8px' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.reason.replace(/_/g, ' ')}</td>
                                            <td style={{ padding: '8px', color: t.category === 'incoming' ? 'var(--color-success)' : 'inherit' }}>
                                                {t.category === 'incoming' ? '+' : '-'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: t.currency }).format(t.amount)}
                                            </td>
                                            <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ opacity: 0.8, fontSize: '14px' }}>No transactions found for this wallet.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
