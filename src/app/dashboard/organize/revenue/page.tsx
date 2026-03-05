"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import PayoutTable from '@/components/organize/PayoutTable';
import WalletsTable from '@/components/organize/WalletsTable';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { createClient } from '@/utils/supabase/client';
import Tabs from '@/components/dashboard/Tabs';
import StatCard from '@/components/dashboard/StatCard';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import { formatCurrency } from '@/utils/format';

function RevenueContent() {
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = (searchParams.get('tab') as any) || 'wallets';
    const [activeTab, setActiveTab] = useState<'payouts' | 'wallets'>(
        ['payouts', 'wallets'].includes(initialTab) ? initialTab : 'wallets'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as any;
        if (tab && ['payouts', 'wallets'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [payoutCurrentPage, setPayoutCurrentPage] = useState(1);
    const payoutItemsPerPage = 8;

    const [payouts, setPayouts] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Payout request modal state
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutCurrency, setPayoutCurrency] = useState('KES');

    useEffect(() => {
        if (activeAccount?.default_currency) {
            setPayoutCurrency(activeAccount.default_currency);
        }
    }, [activeAccount?.default_currency]);

    // ── fetchFinancialData ────────────────────────────────────────────────
    const fetchFinancialData = useCallback(async () => {
        if (!activeAccount) return;
        setIsLoading(true);

        try {
            // Payouts for this account
            const { data: payoutData, error: payoutError } = await supabase
                .from('payouts')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('created_at', { ascending: false });

            if (payoutError) throw payoutError;

            setPayouts((payoutData || []).map(p => ({
                id: p.id,
                recipient: activeAccount.name,
                amount: p.amount,
                status: p.status,
                requestedAt: new Date(p.created_at).toLocaleDateString(),
                reference: p.id.split('-')[0].toUpperCase(),
                notes: p.admin_notes
            })));

            // Wallets for this account
            const { data: walletData, error: walletError } = await supabase
                .from('account_wallets')
                .select('*')
                .eq('account_id', activeAccount.id)
                .order('currency');

            if (walletError) throw walletError;
            setWallets((walletData || []).map((w: any) => ({ ...w, id: w.currency })));

        } catch (err: any) {
            showToast(err.message || 'Failed to sync your financial records. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeAccount, supabase, showToast]);

    // Update default payout currency when wallets load
    useEffect(() => {
        if (wallets.length > 0) {
            const hasCurrent = wallets.some(w => w.currency === payoutCurrency);
            if (!hasCurrent) {
                setPayoutCurrency(wallets[0].currency);
            }
        }
    }, [wallets, payoutCurrency]);

    const totalBalance = useMemo(() => {
        if (isLoading && wallets.length === 0) return null;
        return wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
    }, [wallets, isLoading]);

    const pendingPayoutTotal = useMemo(() => {
        if (isLoading && payouts.length === 0) return null;
        return payouts
            .filter(p => p.status === 'requested')
            .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    }, [payouts, isLoading]);

    const totalProcessedPayouts = useMemo(() => {
        if (isLoading && payouts.length === 0) return null;
        return payouts
            .filter(p => p.status === 'completed')
            .reduce((acc, p) => acc + Number(p.amount || 0), 0);
    }, [payouts, isLoading]);

    const currency = activeAccount?.default_currency || 'KES';

    // ── Effect ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOrgLoading && activeAccount) {
            fetchFinancialData();
        } else if (!isOrgLoading && !activeAccount) {
            setIsLoading(false);
            setPayouts([]);
            setWallets([]);
        }
    }, [isOrgLoading, activeAccount, fetchFinancialData]);

    // ── Request Payout ────────────────────────────────────────────────────
    const handleRequestPayout = async () => {
        if (!activeAccount) return;
        const parsed = parseFloat(payoutAmount);
        if (!payoutAmount || isNaN(parsed) || parsed <= 0) {
            showToast('Please enter a valid payout amount.', 'error');
            return;
        }

        showToast('Submitting payout request…', 'info');
        try {
            // First find the primary payout method
            const { data: methodData, error: methodError } = await supabase
                .from('account_payment_methods')
                .select('id')
                .eq('account_id', activeAccount.id)
                .limit(1)
                .single();

            if (methodError || !methodData) {
                showToast('Please set up a payment method before requesting a payout.', 'error');
                return;
            }

            const { error } = await supabase.rpc('request_account_payout', {
                p_account_id: activeAccount.id,
                p_amount: parsed,
                p_payout_method_id: methodData.id,
                p_currency: payoutCurrency
            });

            if (error) throw error;
            showToast('Payout request submitted. Our team will review it shortly.', 'success');
            setPayoutAmount('');
            fetchFinancialData(); // Refresh payout list
        } catch (err: any) {
            showToast(err.message || 'Failed to submit payout request.', 'error');
        }
    };

    // Selection Logic
    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const paginatedPayouts = payouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage);
        if (selectedIds.size === paginatedPayouts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(paginatedPayouts.map(t => t.id)));
        }
    };

    return (
        <div className={styles.dashboardPage}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Revenue & Payouts</h1>
                    <p className={styles.pageSubtitle}>Track your earnings and transaction history.</p>
                </div>
                {/* Payout request: inline amount input + button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                        value={payoutCurrency}
                        onChange={(e) => setPayoutCurrency(e.target.value)}
                        className={styles.currencySelect}
                    >
                        {wallets.length > 0 ? (
                            wallets.map(w => (
                                <option key={w.currency} value={w.currency}>{w.currency}</option>
                            ))
                        ) : (
                            <option value={activeAccount?.default_currency || 'KES'}>
                                {activeAccount?.default_currency || 'KES'}
                            </option>
                        )}
                    </select>
                    <input
                        type="number"
                        min="1"
                        placeholder="Amount"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', width: '120px', fontSize: '14px' }}
                    />
                    <button className={styles.primaryBtn} onClick={handleRequestPayout}>
                        Request Payout
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className={sharedStyles.statsGrid} style={{ marginBottom: '24px' }}>
                <StatCard
                    label="Active Balance"
                    value={totalBalance !== null ? formatCurrency(totalBalance, currency) : null}
                    change="Across all wallets"
                    trend="neutral"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Pending Payouts"
                    value={pendingPayoutTotal !== null ? formatCurrency(pendingPayoutTotal, currency) : null}
                    change="Awaiting approval"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Total Payouts"
                    value={totalProcessedPayouts !== null ? formatCurrency(totalProcessedPayouts, currency) : null}
                    change="Total processed"
                    trend="positive"
                    isLoading={isLoading}
                />
            </div>

            {/* Tabs */}
            <Tabs
                options={[
                    { id: 'wallets', label: 'Wallets' },
                    { id: 'payouts', label: 'Payouts' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <div className={styles.tableWrapper}>
                {activeTab === 'payouts' ? (
                    <PayoutTable
                        payouts={payouts.slice((payoutCurrentPage - 1) * payoutItemsPerPage, payoutCurrentPage * payoutItemsPerPage)}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onSelectAll={handleSelectAll}
                        currentPage={payoutCurrentPage}
                        totalPages={Math.ceil(payouts.length / payoutItemsPerPage)}
                        onPageChange={setPayoutCurrentPage}
                        isLoading={isLoading}
                    />
                ) : (
                    <WalletsTable
                        data={wallets}
                        isLoading={isLoading}
                    />
                )}
            </div>
        </div>
    );
}

export default function OrganizerRevenuePage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading Revenue...</div>}>
            <RevenueContent />
        </Suspense>
    );
}
