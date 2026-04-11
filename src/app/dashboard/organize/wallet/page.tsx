"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDate } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Badge from '@/components/shared/Badge';
import Modal from '@/components/shared/Modal';
import type { BadgeVariant } from '@/types/shared';

interface WalletBalance {
    id: string;
    currency: string;
    balance: number;
    pending_balance: number;
}

interface TopUp {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string | null;
    created_at: string;
}

const STATUS_MAP: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    completed: { label: 'Completed', variant: 'success' },
    failed: { label: 'Failed', variant: 'error' },
    cancelled: { label: 'Cancelled', variant: 'neutral' },
};

export default function WalletPage() {
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [balances, setBalances] = useState<WalletBalance[]>([]);
    const [topUps, setTopUps] = useState<TopUp[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Top-up modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('KES');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const [walletsRes, topUpsRes] = await Promise.all([
                supabase
                    .from('account_wallets')
                    .select('id, currency, balance, pending_balance')
                    .eq('account_id', activeAccount.id)
                    .order('currency'),
                supabase
                    .from('wallet_top_ups')
                    .select('id, amount, currency, status, provider, created_at')
                    .eq('account_id', activeAccount.id)
                    .order('created_at', { ascending: false })
                    .limit(50),
            ]);

            if (walletsRes.error) throw walletsRes.error;
            if (topUpsRes.error) throw topUpsRes.error;

            setBalances(walletsRes.data || []);
            setTopUps(topUpsRes.data || []);
        } catch (e: any) {
            showToast('Failed to load wallet data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleTopUp = async () => {
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0) {
            showToast('Enter a valid amount', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.rpc('initiate_wallet_topup', {
                p_account_id: activeAccount!.id,
                p_amount: numAmount,
                p_currency: currency,
            });

            if (error) throw error;

            const paymentUrl = data?.payment_url;
            if (paymentUrl) {
                window.open(paymentUrl, '_blank');
                showToast('Payment page opened. Complete the transaction there.', 'success');
            } else {
                showToast('Top-up initiated', 'success');
            }

            setIsModalOpen(false);
            setAmount('');
            fetchData();
        } catch (e: any) {
            showToast(e.message || 'Top-up failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={adminStyles.page}>
            <PageHeader
                title="Wallet"
                subtitle="Manage your account balances and fund your wallet"
                action={{ label: '+ Top Up', onClick: () => setIsModalOpen(true) }}
            />

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : (
                <>
                    {/* Balance cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                        {balances.length === 0 ? (
                            <div className={adminStyles.card} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                No wallets yet. Top up to get started.
                            </div>
                        ) : balances.map(b => (
                            <div key={b.id} className={adminStyles.card} style={{ padding: 20 }}>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{b.currency}</p>
                                <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700 }}>
                                    {formatCurrency(b.balance, b.currency)}
                                </p>
                                {b.pending_balance > 0 && (
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                        + {formatCurrency(b.pending_balance, b.currency)} pending
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Top-up history */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top-up History</h3>
                    {topUps.length === 0 ? (
                        <div className={adminStyles.emptyState}>
                            <p>No top-ups yet.</p>
                        </div>
                    ) : (
                        <table className={adminStyles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Provider</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topUps.map(t => {
                                    const badge = STATUS_MAP[t.status] || { label: t.status, variant: 'neutral' as BadgeVariant };
                                    return (
                                        <tr key={t.id}>
                                            <td>{formatDate(t.created_at)}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                                            <td>{t.provider || '—'}</td>
                                            <td><Badge variant={badge.variant}>{badge.label}</Badge></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)} title="Top Up Wallet">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label className={adminStyles.fieldLabel}>
                            Amount
                            <input
                                className={adminStyles.input}
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="Enter amount"
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            Currency
                            <select className={adminStyles.select} value={currency} onChange={e => setCurrency(e.target.value)}>
                                <option value="KES">KES</option>
                                <option value="NGN">NGN</option>
                                <option value="USD">USD</option>
                                <option value="GBP">GBP</option>
                            </select>
                        </label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className={adminStyles.primaryButton} onClick={handleTopUp} disabled={isSubmitting}>
                                {isSubmitting ? 'Processing...' : 'Continue to Payment'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
