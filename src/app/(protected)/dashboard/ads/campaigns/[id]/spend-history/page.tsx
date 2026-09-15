"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatCurrency, formatDateTime } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';

interface SpendTransaction {
    id: string;
    reference: string;
    amount: number;
    currency: string;
    created_at: string;
}

/**
 * Per-campaign spend history: the individual ad_campaign_payment charges
 * debited against this campaign, distinct from Analytics (impressions/clicks
 * over time) and Variants (per-creative stats) — this page is the money
 * trail, not a performance view.
 */
export default function CampaignSpendHistoryPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [transactions, setTransactions] = useState<SpendTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSpendHistory = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [campRes, spendRes] = await Promise.all([
                supabase.schema('api').from('v1_ad_campaigns').select('title').eq('id', id).eq('account_id', activeAccount.id).maybeSingle(),
                supabase.schema('api').rpc('get_campaign_billing_history', { p_account_id: activeAccount.id, p_campaign_id: id }),
            ]);

            if (!campRes.data) {
                showToast('Campaign not found or access denied.', 'error');
                router.push('/dashboard/ads/campaigns');
                return;
            }
            if (spendRes.error) throw spendRes.error;

            setTransactions((spendRes.data?.transactions || []) as SpendTransaction[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load spend history.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchSpendHistory(); }, [fetchSpendHistory]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner label="Loading spend history..." />
                </div>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Spend History"
                subtitle="The charges billed against this campaign's budget."
                closeHref={`/dashboard/ads/campaigns/${id}`}
            />

            <div className={adminStyles.pageCard}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-interface-outline)', textAlign: 'left' }}>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Reference</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', opacity: 0.5 }}>
                                        No charges recorded yet for this campaign.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map(tx => (
                                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-interface-outline)' }}>
                                        <td style={tdStyle}>{formatDateTime(tx.created_at)}</td>
                                        <td style={{ ...tdStyle, opacity: 0.7 }}>{tx.reference}</td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(tx.amount, tx.currency)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.5,
    fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
    padding: '14px 16px',
};
