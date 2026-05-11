/**
 * Tickets repository — wraps queries against:
 *   tickets, ticket_scan_logs, ticket_transfers, ticket_reservations
 *
 * Used by attendee ticket lists, organizer scanner, and attendee export pages.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { TicketStatus } from '@/types/status';

export interface Ticket {
    id: string;
    event_id: string;
    ticket_tier_id: string;
    user_id: string;
    status: TicketStatus;
    ticket_code: string;
    purchased_price?: number | null;
    purchased_currency?: string | null;
    created_at: string;
    updated_at: string;
    /** Joined: ticket_tiers.display_name */
    tier_name?: string;
    /** Joined: user_profile.full_name */
    holder_name?: string;
    /** Joined: user_profile.email */
    holder_email?: string;
}

/** Matches DB enum `ticket_scan_status`. */
export type TicketScanStatus = 'success' | 'duplicate' | 'invalid' | 'expired';

export interface TicketScanLog {
    id: string;
    ticket_id: string;
    ticket_created_at: string;
    scanned_by?: string | null;
    status: TicketScanStatus;
    scanned_at: string;
}

/** Matches DB enum `transfer_status`. */
export type TransferStatus = 'pending' | 'accepted' | 'rejected' | 'completed';

export interface TicketTransfer {
    id: string;
    ticket_id: string;
    sender_id: string;
    recipient_id: string;
    status: TransferStatus;
    expires_at: string;
    transferred_at: string;
}

/**
 * Return shape of `verify_and_use_ticket` RPC — the function returns a TABLE
 * of (status, message, ticket_id, attendee_id, attendee_name, tier_name).
 */
export interface TicketVerificationResult {
    status: 'valid' | 'used' | 'invalid' | 'expired' | string;
    message: string;
    ticket_id?: string;
    attendee_id?: string;
    attendee_name?: string;
    tier_name?: string;
}

export function createTicketsRepository(client: DbClient) {
    return {
        /** Fetch all tickets for an event (organizer attendee list). */
        async findByEventId(eventId: string, opts?: ListOptions): Promise<RepoResult<Ticket[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('tickets')
                .select(`
                    id, event_id, ticket_tier_id, user_id, status, ticket_code,
                    purchased_price, purchased_currency, created_at, updated_at,
                    ticket_tiers:ticket_tier_id (display_name),
                    user_profile:user_id (full_name, email)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const tickets: Ticket[] = (data ?? []).map((row: any) => ({
                id: row.id,
                event_id: row.event_id,
                ticket_tier_id: row.ticket_tier_id,
                user_id: row.user_id,
                status: row.status,
                ticket_code: row.ticket_code,
                purchased_price: row.purchased_price,
                purchased_currency: row.purchased_currency,
                created_at: row.created_at,
                updated_at: row.updated_at,
                tier_name: row.ticket_tiers?.display_name,
                holder_name: row.user_profile?.full_name,
                holder_email: row.user_profile?.email,
            }));

            return { data: tickets, error: null };
        },

        /** Fetch all tickets belonging to the authenticated user. */
        async findByUserId(userId: string, opts?: ListOptions): Promise<RepoResult<Ticket[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('tickets')
                .select(`
                    id, event_id, ticket_tier_id, user_id, status, ticket_code,
                    purchased_price, purchased_currency, created_at, updated_at,
                    ticket_tiers:ticket_tier_id (display_name)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const tickets: Ticket[] = (data ?? []).map((row: any) => ({
                id: row.id,
                event_id: row.event_id,
                ticket_tier_id: row.ticket_tier_id,
                user_id: row.user_id,
                status: row.status,
                ticket_code: row.ticket_code,
                purchased_price: row.purchased_price,
                purchased_currency: row.purchased_currency,
                created_at: row.created_at,
                updated_at: row.updated_at,
                tier_name: row.ticket_tiers?.display_name,
            }));

            return { data: tickets, error: null };
        },

        /**
         * Validate and mark a ticket as used at the event gate. Wraps `verify_and_use_ticket` RPC.
         * The RPC returns a one-row TABLE — Supabase represents this as an array.
         */
        async verifyAndUse(params: {
            ticketCode: string;
            eventId: string;
            scannerPin?: string;
        }): Promise<RepoResult<TicketVerificationResult>> {
            const { data, error } = await client.rpc('verify_and_use_ticket', {
                p_ticket_code: params.ticketCode,
                p_event_id: params.eventId,
                p_scanner_pin: params.scannerPin ?? null,
            });

            if (error) return { data: null, error: toError(error) };
            const row = Array.isArray(data) ? data[0] : data;
            return { data: row as TicketVerificationResult, error: null };
        },

        /**
         * Fetch scan log entries for an event. Filters by joining tickets — `event_id` is
         * not denormalized onto scan_logs, so we filter through the FK.
         */
        async getScanLogs(eventId: string, opts?: ListOptions): Promise<RepoResult<TicketScanLog[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('ticket_scan_logs')
                .select(`
                    id, ticket_id, ticket_created_at, scanned_by, status, scanned_at,
                    tickets:ticket_id!inner (event_id)
                `)
                .eq('tickets.event_id', eventId)
                .order('scanned_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const logs: TicketScanLog[] = (data ?? []).map((row: any) => ({
                id: row.id,
                ticket_id: row.ticket_id,
                ticket_created_at: row.ticket_created_at,
                scanned_by: row.scanned_by,
                status: row.status,
                scanned_at: row.scanned_at,
            }));

            return { data: logs, error: null };
        },

        /** Fetch ticket transfers for a user (sent or received). */
        async getTransfersByUser(userId: string): Promise<RepoResult<TicketTransfer[]>> {
            const { data, error } = await client
                .from('ticket_transfers')
                .select('id, ticket_id, sender_id, recipient_id, status, expires_at, transferred_at')
                .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
                .order('transferred_at', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTransfer[], error: null };
        },
    };
}
