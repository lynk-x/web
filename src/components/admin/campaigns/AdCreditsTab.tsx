"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { useConfirmModal } from '@/hooks/useConfirmModal';
import { createClient } from '@/utils/supabase/client';
import { formatCurrency, formatDate } from '@/utils/format';
import { DatePicker } from '@/components/ui/DatePicker';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import StatCard from '@/components/dashboard/StatCard';
import type { BadgeVariant } from '@/types/shared';
import { useCurrencies } from '@/hooks/useCurrencies';

interface AdCredit {
    id: string;
    account_id: string;
    account_name: string;
    currency: string;
    amount: number;
    remaining: number;
    expires_at: string | null;
    metadata: Record<string, any>;
    created_at: string;
    revoked_at: string | null;
}

interface AccountOption {
    id: string;
    display_name: string;
}

function creditStatus(c: AdCredit): { label: string; variant: BadgeVariant } {
    if (c.revoked_at) return { label: 'Revoked', variant: 'error' };
    if (c.remaining === 0) return { label: 'Exhausted', variant: 'neutral' };
    if (c.expires_at && new Date(c.expires_at) <= new Date()) return { label: 'Expired', variant: 'warning' };
    return { label: 'Active', variant: 'success' };
}

function isActive(c: AdCredit) {
    return !c.revoked_at && c.remaining > 0 && (!c.expires_at || new Date(c.expires_at) > new Date());
}

interface AdCreditsTabProps {
    hideToolbar?: boolean;
    hideStats?: boolean;
    isIssueModalOpen?: boolean;
    setIsIssueModalOpen?: (open: boolean) => void;
    searchTerm?: string;
}

export default function AdCreditsTab({
    hideToolbar = false,
    hideStats = false,
    isIssueModalOpen: propsIsIssueModalOpen,
    setIsIssueModalOpen: propsSetIsIssueModalOpen,
    searchTerm: propsSearchTerm = ''
}: AdCreditsTabProps) {
    const supabase = useMemo(() => createClient(), []);
    const { showToast } = useToast();
    const { confirm, ConfirmDialog } = useConfirmModal();

    const [credits, setCredits] = useState<AdCredit[]>([]);
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { currencies, isLoading: isLoadingCurrencies } = useCurrencies();

    const [internalIsIssueModalOpen, setInternalIsIssueModalOpen] = useState(false);
    const isIssueModalOpen = propsIsIssueModalOpen ?? internalIsIssueModalOpen;
    const setIsIssueModalOpen = propsSetIsIssueModalOpen ?? setInternalIsIssueModalOpen;

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = propsSearchTerm || internalSearchTerm;

    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [issueAccountId, setIssueAccountId] = useState('');
    const [issueCurrency, setIssueCurrency] = useState('USD');
    const [issueAmount, setIssueAmount] = useState('');
    const [issueExpiry, setIssueExpiry] = useState('');
    const [issueNote, setIssueNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCredits = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('ad_credits')
                .select('*, accounts(display_name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setCredits((data || []).map((r: any) => ({
                id: r.id,
                account_id: r.account_id,
                account_name: r.accounts?.display_name ?? 'Unknown',
                currency: r.currency,
                amount: parseFloat(r.amount),
                remaining: parseFloat(r.remaining),
                expires_at: r.expires_at,
                metadata: r.metadata ?? {},
                created_at: r.created_at,
                revoked_at: r.revoked_at,
            })));
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load credits', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, showToast]);

    const fetchAccounts = useCallback(async () => {
        const { data } = await supabase
            .from('accounts')
            .select('id, display_name')
            .eq('is_active', true)
            .order('display_name')
            .limit(200);
        setAccounts(data || []);
    }, [supabase]);

    useEffect(() => { fetchCredits(); fetchAccounts(); }, [fetchCredits, fetchAccounts]);

    const handleIssue = async () => {
        const amount = parseFloat(issueAmount);
        if (!issueAccountId) { showToast('Select an advertiser account', 'error'); return; }
        if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('ad_credits').insert({
                account_id: issueAccountId,
                currency: issueCurrency,
                amount,
                remaining: amount,
                expires_at: issueExpiry || null,
                metadata: {
                    source: 'platform_grant',
                    note: issueNote || null,
                },
            });
            if (error) throw error;
            showToast('Ad credit issued successfully.', 'success');
            setIsIssueModalOpen(false);
            setIssueAccountId(''); setIssueAmount(''); setIssueExpiry(''); setIssueNote('');
            fetchCredits();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to issue credit', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRevoke = async (credit: AdCredit) => {
        if (!await confirm(`Revoke this credit grant for ${credit.account_name}? The remaining ${formatCurrency(credit.remaining, credit.currency)} will no longer be usable.`, {
            title: 'Revoke Ad Credit',
            confirmLabel: 'Revoke',
        })) return;
        try {
            const { error } = await supabase
                .from('ad_credits')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', credit.id);
            if (error) throw error;
            showToast('Credit revoked.', 'success');
            fetchCredits();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to revoke credit', 'error');
        }
    };

    const filtered = credits.filter(c =>
        !searchTerm || c.account_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalOutstanding = credits.filter(isActive).reduce((s, c) => s + c.remaining, 0);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const issuedThisMonth = credits.filter(c => new Date(c.created_at) >= startOfMonth).length;
    const activeCount = credits.filter(isActive).length;

    const columns: Column<AdCredit>[] = [
        {
            header: 'Advertiser',
            render: (r) => (
                <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.account_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{r.currency}</div>
                </div>
            ),
        },
        {
            header: 'Granted',
            render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(r.amount, r.currency)}</span>,
        },
        {
            header: 'Remaining',
            render: (r) => {
                const pct = r.amount > 0 ? (r.remaining / r.amount) * 100 : 0;
                return (
                    <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 14 }}>{formatCurrency(r.remaining, r.currency)}</div>
                        <div style={{ marginTop: 4, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', width: 80 }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: pct > 20 ? 'var(--color-brand-primary)' : 'var(--color-error)' }} />
                        </div>
                    </div>
                );
            },
        },
        {
            header: 'Expires',
            render: (r) => r.expires_at
                ? <span style={{ fontSize: 13 }}>{formatDate(r.expires_at)}</span>
                : <span style={{ fontSize: 12, opacity: 0.4 }}>Never</span>,
        },
        {
            header: 'Note',
            render: (r) => <span style={{ fontSize: 12, opacity: 0.6 }}>{r.metadata?.note || '—'}</span>,
        },
        {
            header: 'Issued',
            render: (r) => <span style={{ fontSize: 12, opacity: 0.6 }}>{formatDate(r.created_at)}</span>,
        },
        {
            header: 'Status',
            render: (r) => { const s = creditStatus(r); return <Badge variant={s.variant} label={s.label} />; },
        },
    ];

    const getActions = (r: AdCredit) => isActive(r) ? [
        {
            label: 'Revoke',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
            onClick: () => handleRevoke(r),
            variant: 'danger' as const,
        }
    ] : [];

    return (
        <div className={adminStyles.container} style={{ gap: 'var(--spacing-xl)' }}>

            {ConfirmDialog}
            
            {!hideStats && (
                <div className={adminStyles.statsGrid}>
                    <StatCard 
                        label="Outstanding Credits" 
                        value={formatCurrency(totalOutstanding, 'USD')} 
                        change="Platform liability"
                        trend="neutral"
                    />
                    <StatCard 
                        label="Active Grants" 
                        value={activeCount} 
                        change="Currently usable"
                        trend="positive"
                    />
                    <StatCard 
                        label="Issued (30d)" 
                        value={issuedThisMonth} 
                        change="Promotion volume"
                        trend="neutral"
                    />
                </div>
            )}

            {!hideToolbar && (
                <TableToolbar
                    searchPlaceholder="Search by advertiser..."
                    searchValue={searchTerm}
                    onSearchChange={setInternalSearchTerm}
                >
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => setIsIssueModalOpen(true)}
                    >
                        + Issue Credit
                    </button>
                </TableToolbar>
            )}

            <DataTable<AdCredit>
                data={filtered}
                columns={columns}
                getActions={getActions}
                isLoading={isLoading}
                emptyMessage="No credit grants found."
            />

            {isIssueModalOpen && (
                <Modal isOpen title="Issue Ad Credit" onClose={() => setIsIssueModalOpen(false)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <label className={adminStyles.fieldLabel}>
                            Advertiser Account
                            <select
                                className={adminStyles.select}
                                value={issueAccountId}
                                onChange={e => setIssueAccountId(e.target.value)}
                                autoFocus
                            >
                                <option value="">Select account...</option>
                                {accounts.map(a => (
                                    <option key={a.id} value={a.id}>{a.display_name}</option>
                                ))}
                            </select>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                            <label className={adminStyles.fieldLabel}>
                                Amount
                                <input
                                    className={adminStyles.input}
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={issueAmount}
                                    onChange={e => setIssueAmount(e.target.value)}
                                />
                            </label>
                             <label className={adminStyles.fieldLabel}>
                                 Currency
                                 <select 
                                     className={adminStyles.select} 
                                     value={issueCurrency} 
                                     onChange={e => setIssueCurrency(e.target.value)}
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
                        </div>
                        <label className={adminStyles.fieldLabel}>
                            Expiry Date <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
                            <DatePicker
                                value={issueExpiry}
                                onChange={setIssueExpiry}
                                placeholder="dd/mm/yyyy"
                            />
                        </label>
                        <label className={adminStyles.fieldLabel}>
                            Note <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
                            <input
                                className={adminStyles.input}
                                type="text"
                                placeholder="e.g. Onboarding promotion"
                                value={issueNote}
                                onChange={e => setIssueNote(e.target.value)}
                            />
                        </label>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                            <button className={adminStyles.secondaryButton} onClick={() => setIsIssueModalOpen(false)}>Cancel</button>
                            <button className={adminStyles.btnPrimary} onClick={handleIssue} disabled={isSubmitting}>
                                {isSubmitting ? 'Issuing...' : 'Issue Credit'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
