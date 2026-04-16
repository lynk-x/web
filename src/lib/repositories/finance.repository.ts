/**
 * Finance repository — wraps queries against:
 *   transactions, payouts, wallet_top_ups, refund_requests, promo_codes, fx_rates, tax_rates
 *
 * Used by organizer revenue pages, admin finance panel, and wallet management.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { PaymentStatus, PayoutStatus, TransactionReason } from '@/types/status';

export interface Transaction {
    id: string;
    account_id?: string;
    sender_id?: string;
    recipient_id?: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    reason: TransactionReason;
    category: 'incoming' | 'outgoing' | 'internal' | 'hold';
    reference?: string;
    event_id?: string;
    initiated_by?: string;
    created_at: string;
}

export interface Payout {
    id: string;
    account_id: string;
    amount: number;
    currency: string;
    status: PayoutStatus;
    payout_method_id?: string;
    reference?: string;
    notes?: string;
    requested_at: string;
    processed_at?: string;
}

export interface WalletTopUp {
    id: string;
    account_id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    provider: string;
    created_at: string;
}

export interface RefundRequest {
    id: string;
    ticket_id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    reason?: string;
    created_at: string;
}

export interface FxRate {
    currency: string;
    rate_to_base: number;
    updated_at: string;
}

export interface TaxRate {
    id: string;
    country_code: string;
    name: string;
    rate_percent: number;
    is_inclusive: boolean;
    is_active: boolean;
    updated_at: string;
}

export function createFinanceRepository(client: DbClient) {
    return {
        /** Fetch transactions for an account. */
        async getTransactions(
            accountId: string,
            opts?: ListOptions & { reason?: TransactionReason; category?: string }
        ): Promise<RepoResult<Transaction[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            let query = client
                .from('transactions')
                .select('id, account_id, sender_id, recipient_id, amount, currency, status, reason, category, reference, event_id, initiated_by, created_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.reason) query = query.eq('reason', opts.reason);
            if (opts?.category) query = query.eq('category', opts.category);

            const { data, error } = await query;
            if (error) return { data: null, error: toError(error) };
            return { data: data as Transaction[], error: null };
        },

        /** Fetch payouts for an account. */
        async getPayouts(
            accountId: string,
            opts?: ListOptions & { status?: PayoutStatus }
        ): Promise<RepoResult<Payout[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            let query = client
                .from('payouts')
                .select('id, account_id, amount, currency, status, payout_method_id, reference, notes, requested_at, processed_at')
                .eq('account_id', accountId)
                .order('requested_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.status) query = query.eq('status', opts.status);

            const { data, error } = await query;
            if (error) return { data: null, error: toError(error) };
            return { data: data as Payout[], error: null };
        },

        /** Request a payout. Wraps `request_account_payout` RPC. */
        async requestPayout(params: {
            accountId: string;
            amount: number;
            payoutMethodId: string;
            currency: string;
        }): Promise<RepoResult<{ payout_id: string }>> {
            const { data, error } = await client.rpc('request_account_payout', {
                p_account_id: params.accountId,
                p_amount: params.amount,
                p_payout_method_id: params.payoutMethodId,
                p_currency: params.currency,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { payout_id: string }, error: null };
        },

        /** Fetch wallet top-up history for a user. */
        async getTopUps(userId: string, opts?: ListOptions): Promise<RepoResult<WalletTopUp[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('wallet_top_ups')
                .select('id, account_id, user_id, amount, currency, status, provider, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as WalletTopUp[], error: null };
        },

        /** Initiate a wallet top-up. Wraps `initiate_wallet_topup` RPC. */
        async initiateTopUp(params: {
            accountId: string;
            amount: number;
            provider: string;
        }): Promise<RepoResult<{ top_up_id: string; checkout_request_id?: string }>> {
            const { data, error } = await client.rpc('initiate_wallet_topup', {
                p_account_id: params.accountId,
                p_amount: params.amount,
                p_provider: params.provider,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { top_up_id: string; checkout_request_id?: string }, error: null };
        },

        /** Fetch refund requests for a user. */
        async getRefundRequests(userId: string, opts?: ListOptions): Promise<RepoResult<RefundRequest[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('refund_requests')
                .select('id, ticket_id, user_id, amount, currency, status, reason, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as RefundRequest[], error: null };
        },

        /** Fetch all active FX rates. */
        async getFxRates(): Promise<RepoResult<FxRate[]>> {
            const { data, error } = await client
                .from('fx_rates')
                .select('currency, rate_to_base, updated_at')
                .order('currency', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as FxRate[], error: null };
        },

        /** Fetch active tax rates, optionally filtered by country. */
        async getTaxRates(countryCode?: string): Promise<RepoResult<TaxRate[]>> {
            let query = client
                .from('tax_rates')
                .select('id, country_code, name, rate_percent, is_inclusive, is_active, updated_at')
                .eq('is_active', true);

            if (countryCode) query = query.eq('country_code', countryCode);

            const { data, error } = await query;
            if (error) return { data: null, error: toError(error) };
            return { data: data as TaxRate[], error: null };
        },
    };
}
