"use client";
import { getErrorMessage } from '@/utils/error';

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
import { useCurrencies } from '@/hooks/useCurrencies';
import ProductTour from '@/components/dashboard/ProductTour';

interface WalletBalance {
    id: string;
    reference: string;
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

interface AdCredit {
    id: string;
    currency: string;
    amount: number;
    remaining: number;
    expires_at: string | null;
    created_at: string;
}

interface CreditTransaction {
    id: string;
    amount: number;
    created_at: string;
    campaign_title: string;
    currency: string;
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
    const [adCredits, setAdCredits] = useState<AdCredit[]>([]);
    const [creditTxns, setCreditTxns] = useState<CreditTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currencies, isLoading: isLoadingCurrencies } = useCurrencies();

    // Top-up modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('KES');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_organizer_wallet_data', {
                p_account_id: activeAccount.id
            });

            if (error) throw error;

            setBalances(data.wallets || []);
            setTopUps(data.top_ups || []);
            setAdCredits(data.ad_credits || []);
            setCreditTxns(data.credit_transactions || []);
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Failed to sync wallet records.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (activeAccount) {
            fetchData();
        }
    }, [activeAccount, fetchData]);

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
        } catch (e: unknown) {
            showToast(getErrorMessage(e) || 'Top-up failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={adminStyles.page}>
            <PageHeader
                title="Wallet"
                subtitle="Manage your account balances and fund your wallet"
                actionLabel="+ Top Up"
                onActionClick={() => setIsModalOpen(true)}
                actionClassName="tour-wallet-topup"
            />

            {isLoading ? (
                <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>
            ) : (
                <>
                    {/* Balance cards */}
                    <div className="tour-wallet-balances" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                        {balances.length === 0 ? (
                            <div className={adminStyles.card} style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                No wallets yet. Top up to get started.
                            </div>
                        ) : balances.map(b => (
                            <div key={b.id} className={adminStyles.card} style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{b.currency}</p>
                                    <p style={{ margin: 0, fontSize: 10, fontFamily: 'var(--font-mono)', opacity: 0.5 }}>{b.reference}</p>
                                </div>
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

                    {/* Ad Credits */}
                    {adCredits.length > 0 && (
                        <div className="tour-wallet-credits">
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '32px 0 4px' }}>Ad Credits</h3>
                            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                                Platform-issued credits applied to your ad spend. Non-withdrawable.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
                                {adCredits.map(c => {
                                    const pct = c.amount > 0 ? (c.remaining / c.amount) * 100 : 0;
                                    const isExpiringSoon = c.expires_at && (new Date(c.expires_at).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
                                    return (
                                        <div key={c.id} className={adminStyles.card} style={{ padding: 20 }}>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                                                {c.currency} Credit
                                            </p>
                                            <p style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700 }}>
                                                {formatCurrency(c.remaining, c.currency)}
                                            </p>
                                            <div style={{ margin: '8px 0 4px', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: 'var(--color-brand-primary)', transition: 'width 0.3s' }} />
                                            </div>
                                            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                                of {formatCurrency(c.amount, c.currency)} granted
                                                {c.expires_at && (
                                                    <span style={{ marginLeft: 6, color: isExpiringSoon ? 'var(--color-warning)' : undefined }}>
                                                        · expires {formatDate(c.expires_at)}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {creditTxns.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Credit Usage History</h3>
                                    <table className={adminStyles.table} style={{ marginBottom: 32 }}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Campaign</th>
                                                <th>Credits Used</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {creditTxns.map(t => (
                                                <tr key={t.id}>
                                                    <td>{formatDate(t.created_at)}</td>
                                                    <td>{t.campaign_title}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(t.amount, t.currency)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                        </div>
                    )}

                    {/* Top-up history */}
                    <h3 className="tour-wallet-history" style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top-up History</h3>
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
                                            <td><Badge variant={badge.variant} label={badge.label} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </>
            )}

            {isModalOpen && (
                <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title="Top Up Wallet">
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
                            <select 
                                className={adminStyles.select} 
                                value={currency} 
                                onChange={e => setCurrency(e.target.value)}
                                disabled={isLoadingCurrencies}
                            >
                                {isLoadingCurrencies ? (
                                    <option value="">Loading...</option>
                                ) : (
                                    currencies.map(c => (
                                        <option key={c.code} value={c.code}>{c.code} - {c.country_name}</option>
                                    ))
                                )}
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

            <ProductTour
                storageKey={activeAccount ? `hasSeenOrgWalletJoyride_${activeAccount.id}` : 'hasSeenOrgWalletJoyride_guest'}
                steps={[
                    {
                        target: 'body',
                        placement: 'center',
                        title: 'Your Wallet',
                        content: 'Manage your organization\'s funds here. You can top up your balance, view ad credits and track your transaction history.',
                        skipBeacon: true,
                    },
                    {
                        target: '.tour-wallet-topup',
                        title: 'Add Funds',
                        content: 'Need to run ads or pay for features? Click here to securely top up your wallet using mobile money or card.',
                    },
                    {
                        target: '.tour-wallet-balances',
                        title: 'Current Balances',
                        content: 'View your available and pending balances across different currencies.',
                    },
                    {
                        target: '.tour-wallet-credits',
                        title: 'Ad Credits',
                        content: 'Track any promotional credits issued by Lynk-X. These are automatically applied to your ad spend.',
                    },
                    {
                        target: '.tour-wallet-history',
                        title: 'Transaction Log',
                        content: 'Review all your past top-ups and their current status to stay on top of your finances.',
                    }
                ]}
            />
        </div>
    );
}
