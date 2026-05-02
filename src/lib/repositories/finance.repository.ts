/**
 * Finance repository — wraps queries against:
 *   transactions, payouts, wallet_top_ups, refund_requests, promo_codes, fx_rates, tax_rates
 *
 * Used by organizer revenue pages, admin finance panel, and wallet management.
 */

import type { DbClient, ListOptions, RepoResult, RepoListResult } from './types';
import { toError } from './types';
import type { PaymentStatus, PayoutStatus, TransactionReason } from '@/types/status';

/**
 * The `transactions.transactions` table does not have a single `account_id` column —
 * payments flow through `recipient_account_id` with `sender_id`/`recipient_id` pointing
 * to user_profile. This shape exposes both directions for UI rendering.
 */
export interface Transaction {
    id: string;
    sender_id?: string | null;
    recipient_id?: string | null;
    initiated_by?: string | null;
    recipient_account_id?: string | null;
    amount: number;
    currency: string;
    platform_fee: number;
    platform_tax: number;
    net_amount: number;
    status: PaymentStatus;
    reason: TransactionReason;
    category: 'incoming' | 'outgoing' | 'internal' | 'hold';
    reference: string;
    event_id?: string | null;
    ticket_id?: string | null;
    provider_id?: string | null;
    provider_ref?: string | null;
    created_at: string;
}

export interface Payout {
    id: string;
    account_id: string;
    payout_method_id?: string | null;
    reference: string;
    amount: number;
    fee: number;
    currency: string;
    net_disbursement: number;
    status: PayoutStatus;
    failure_reason?: string | null;
    processed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface WalletTopUp {
    id: string;
    account_id: string;
    provider_id: string;
    provider_ref?: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
    metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

/** Matches DB enum `refund_status`. */
export type RefundStatusValue = 'pending' | 'approved' | 'rejected' | 'processed';

export interface RefundRequest {
    id: string;
    user_id: string;
    event_id?: string | null;
    ticket_id: string;
    reason: string;
    amount?: number | null;
    currency?: string | null;
    status: RefundStatusValue;
    processed_at?: string | null;
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

/**
 * `request_account_payout` returns a jsonb envelope. The shape comes directly from
 * the function body (success, payout_id, status, amount, currency).
 */
export interface RequestPayoutResult {
    success: boolean;
    payout_id: string;
    status: PayoutStatus;
    amount: number;
    currency: string;
}

export function createFinanceRepository(client: DbClient) {
    return {
        /**
         * Fetch transactions for an account. Filters across both directions:
         *   - recipient_account_id (incoming to this account's wallet)
         *   - any transaction the account's owner sent (best-effort; full coverage
         *     would require a `senders_account_id` denormalization).
         */
        async getTransactionsForAccount(
            accountId: string,
            opts?: ListOptions & { reason?: TransactionReason; category?: string }
        ): Promise<RepoListResult<Transaction>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const selectOpts = opts?.withCount ? { count: 'exact' as const } : undefined;
            let query = client
                .schema('transactions').from('transactions')
                .select(
                    'id, sender_id, recipient_id, initiated_by, recipient_account_id, amount, currency, platform_fee, platform_tax, net_amount, status, reason, category, reference, event_id, ticket_id, provider_id, provider_ref, created_at',
                    selectOpts
                )
                .eq('recipient_account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.reason) query = query.eq('reason', opts.reason);
            if (opts?.category) query = query.eq('category', opts.category);

            const { data, error, count } = await query;
            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as Transaction[], total: count ?? null, error: null };
        },

        /** Fetch payouts for an account. */
        async getPayouts(
            accountId: string,
            opts?: ListOptions & { status?: PayoutStatus }
        ): Promise<RepoListResult<Payout>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const selectOpts = opts?.withCount ? { count: 'exact' as const } : undefined;
            let query = client
                .schema('payouts').from('payouts')
                .select(
                    'id, account_id, payout_method_id, reference, amount, fee, currency, net_disbursement, status, failure_reason, processed_at, created_at, updated_at',
                    selectOpts
                )
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (opts?.status) query = query.eq('status', opts.status);

            const { data, error, count } = await query;
            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as Payout[], total: count ?? null, error: null };
        },

        /** Request a payout. Wraps `request_account_payout` RPC. */
        async requestPayout(params: {
            accountId: string;
            amount: number;
            payoutMethodId: string;
            currency: string;
        }): Promise<RepoResult<RequestPayoutResult>> {
            const { data, error } = await client.rpc('request_account_payout', {
                p_account_id: params.accountId,
                p_amount: params.amount,
                p_payout_method_id: params.payoutMethodId,
                p_currency: params.currency,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as RequestPayoutResult, error: null };
        },

        /** Fetch wallet top-up history for an account (top-ups are account-scoped, not user-scoped). */
        async getTopUpsForAccount(accountId: string, opts?: ListOptions): Promise<RepoResult<WalletTopUp[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .schema('wallet_top_ups').from('wallet_top_ups')
                .select('id, account_id, provider_id, provider_ref, amount, currency, status, metadata, created_at, updated_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as WalletTopUp[], error: null };
        },

        /** Initiate a wallet top-up. Wraps `initiate_wallet_topup` RPC. */
        async initiateTopUp(params: {
            accountId: string;
            amount: number;
            currency: string;
            providerName: string;
            payerIdentity: string;
        }): Promise<RepoResult<{ top_up_id: string; provider_ref: string | null }>> {
            const { data, error } = await client.rpc('initiate_wallet_topup', {
                p_account_id: params.accountId,
                p_amount: params.amount,
                p_currency: params.currency,
                p_provider_name: params.providerName,
                p_payer_identity: params.payerIdentity,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as { top_up_id: string; provider_ref: string | null }, error: null };
        },

        /** Fetch refund requests for a user. */
        async getRefundRequests(userId: string, opts?: ListOptions): Promise<RepoResult<RefundRequest[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .schema('refund_requests').from('refund_requests')
                .select('id, user_id, event_id, ticket_id, reason, amount, currency, status, processed_at, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as RefundRequest[], error: null };
        },

        /** Fetch all FX rates (rate_to_base relative to USD). */
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
