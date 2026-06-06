/**
 * Support repository — wraps queries against:
 *   reports.support_tickets, reports.support_ticket_messages
 *
 * Used by the public/organizer facing support dashboard.
 */

import type { DbClient, ListOptions, RepoListResult, RepoResult } from './types';
import { toError } from './types';

export interface SupportTicket {
    id: string;
    reference: string;
    user_id: string;
    assigned_to: string | null;
    full_name: string | null;
    email: string;
    subject: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'new' | 'investigating' | 'resolved' | 'dismissed';
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface SupportTicketMessage {
    id: string;
    ticket_id: string;
    author_id: string | null;
    content: string;
    attachments: any[];
    is_internal: boolean;
    created_at: string;
}

export function createSupportRepository(client: DbClient) {
    return {
        /** Create a new support ticket */
        async createTicket(
            data: {
                user_id?: string;
                email: string;
                full_name?: string;
                subject: string;
                message: string;
                priority?: 'low' | 'normal' | 'high' | 'urgent';
            }
        ): Promise<RepoResult<SupportTicket>> {
            const { data: ticket, error } = await client
                .from('support_tickets')
                .insert(data)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: ticket as SupportTicket, error: null };
        },

        /** Get all tickets for a user */
        async getUserTickets(
            userId: string,
            opts?: ListOptions
        ): Promise<RepoListResult<SupportTicket>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            let query = client
                .from('support_tickets')
                .select('*', { count: opts?.withCount ? 'exact' : undefined })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            const { data, count, error } = await query;

            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as SupportTicket[], total: count, error: null };
        },

        /** Get a single ticket by id */
        async getTicket(ticketId: string): Promise<RepoResult<SupportTicket>> {
            const { data, error } = await client
                .from('support_tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as SupportTicket, error: null };
        },

        /** Get all messages for a ticket */
        async getTicketMessages(ticketId: string): Promise<RepoResult<SupportTicketMessage[]>> {
            const { data, error } = await client
                .from('support_ticket_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as SupportTicketMessage[], error: null };
        },

        /** Add a message to a ticket */
        async addMessage(
            ticketId: string,
            content: string,
            authorId?: string
        ): Promise<RepoResult<SupportTicketMessage>> {
            const { data, error } = await client
                .from('support_ticket_messages')
                .insert({
                    ticket_id: ticketId,
                    content,
                    author_id: authorId,
                    is_internal: false
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as SupportTicketMessage, error: null };
        }
    };
}
