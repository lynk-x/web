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
    tier_id: string;
    user_id: string;
    status: TicketStatus;
    ticket_code: string;
    created_at: string;
    updated_at: string;
    /** Joined: ticket_tiers.display_name */
    tier_name?: string;
    /** Joined: user_profile.full_name */
    holder_name?: string;
    /** Joined: user_profile.email */
    holder_email?: string;
}

export interface TicketScanLog {
    id: string;
    ticket_id: string;
    event_id: string;
    scanned_by: string;
    scan_result: 'success' | 'duplicate' | 'invalid' | 'expired';
    created_at: string;
}

export interface TicketTransfer {
    id: string;
    ticket_id: string;
    from_user_id: string;
    to_user_id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    created_at: string;
}

export interface TicketVerificationResult {
    success: boolean;
    message: string;
    ticket?: {
        id: string;
        event_title: string;
        holder_name: string;
        tier_name: string;
    };
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
                    id, event_id, tier_id, user_id, status, ticket_code, created_at, updated_at,
                    ticket_tiers:tier_id (display_name),
                    user_profile:user_id (full_name, email)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const tickets: Ticket[] = (data ?? []).map((row: any) => ({
                id: row.id,
                event_id: row.event_id,
                tier_id: row.tier_id,
                user_id: row.user_id,
                status: row.status,
                ticket_code: row.ticket_code,
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
                    id, event_id, tier_id, user_id, status, ticket_code, created_at, updated_at,
                    ticket_tiers:tier_id (display_name)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const tickets: Ticket[] = (data ?? []).map((row: any) => ({
                id: row.id,
                event_id: row.event_id,
                tier_id: row.tier_id,
                user_id: row.user_id,
                status: row.status,
                ticket_code: row.ticket_code,
                created_at: row.created_at,
                updated_at: row.updated_at,
                tier_name: row.ticket_tiers?.display_name,
            }));

            return { data: tickets, error: null };
        },

        /** Validate and mark a ticket as used at the event gate. Wraps `verify_and_use_ticket` RPC. */
        async verifyAndUse(ticketCode: string): Promise<RepoResult<TicketVerificationResult>> {
            const { data, error } = await client.rpc('verify_and_use_ticket', {
                p_ticket_code: ticketCode,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketVerificationResult, error: null };
        },

        /** Fetch scan log entries for an event. Used by organizer scanner page. */
        async getScanLogs(eventId: string, opts?: ListOptions): Promise<RepoResult<TicketScanLog[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('ticket_scan_logs')
                .select('id, ticket_id, event_id, scanned_by, scan_result, created_at')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketScanLog[], error: null };
        },

        /** Fetch ticket transfers for a user (sent or received). */
        async getTransfersByUser(userId: string): Promise<RepoResult<TicketTransfer[]>> {
            const { data, error } = await client
                .from('ticket_transfers')
                .select('id, ticket_id, from_user_id, to_user_id, status, created_at')
                .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
                .order('created_at', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTransfer[], error: null };
        },
    };
}
