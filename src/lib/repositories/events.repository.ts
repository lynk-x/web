/**
 * Events repository — wraps queries against:
 *   events, ticket_tiers, event_tags, event_categories, event_sessions, event_waitlists
 *
 * Used by organizer dashboard, public event pages, and admin event management.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { EventStatus } from '@/types/status';

export interface EventRow {
    id: string;
    account_id: string;
    title: string;
    description?: string | null;
    status: EventStatus;
    // start_datetime / end_datetime are aliases provided by api.v1_events
    // (the raw table columns are starts_at / ends_at)
    start_datetime: string;
    end_datetime: string;
    timezone?: string | null;
    location?: Record<string, unknown> | null;
    media?: Record<string, unknown> | null;
    category_id?: string | null;
    category_name?: string | null;
    is_private: boolean;
    is_featured?: boolean;
    is_online?: boolean;
    currency?: string | null;
    total_capacity?: number | null;
    reference?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TicketTier {
    id: string;
    event_id: string;
    display_name: string;
    price: number;
    quantity_total: number;
    quantity_sold: number;
    description?: string | null;
    sale_start_at?: string | null;
    sale_end_at?: string | null;
    max_per_order?: number | null;
    status: string;
    created_at: string;
}

export interface EventAnalytics {
    tickets_sold: number;
    total_capacity: number;
    gross_revenue: number;
    waitlist_count: number;
    scan_count: number;
    forum_members: number;
}

export interface EventWaitlistEntry {
    id: string;
    event_id: string;
    user_id: string;
    status: 'waiting' | 'invited' | 'joined' | 'expired';
    created_at: string;
}

export function createEventsRepository(client: DbClient) {
    return {
        /** Fetch a single event by ID. */
        async findById(eventId: string): Promise<RepoResult<EventRow>> {
            const { data, error } = await client
                .from('api.v1_events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow, error: null };
        },

        /** Fetch all events for an account (organizer dashboard). */
        async findByAccountId(accountId: string, opts?: ListOptions): Promise<RepoResult<EventRow[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            // Queries api.v1_events which aliases starts_at→start_datetime, ends_at→end_datetime
            // and provides category_name via a JOIN on event_categories.
            const { data, error } = await client
                .from('api.v1_events')
                .select('id, account_id, title, status, start_datetime, end_datetime, timezone, location, media, category_id, category_name, is_private, is_featured, is_online, currency, total_capacity, reference, created_at, updated_at')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow[], error: null };
        },

        /** Fetch published events for public discovery. */
        async findPublished(opts?: ListOptions & { category_id?: string }): Promise<RepoResult<EventRow[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            let query = client
                .from('api.v1_events')
                .select('id, account_id, title, description, start_datetime, end_datetime, timezone, location, media, category_id, category_name, currency, is_featured, is_online')
                .eq('status', 'published')
                .order('start_datetime', { ascending: true })
                .range(from, from + size - 1);

            if (opts?.category_id) {
                query = query.eq('category_id', opts.category_id);
            }

            const { data, error } = await query;
            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow[], error: null };
        },

        /** Fetch an event by its organizer-assigned PIN. Wraps `get_event_by_pin` RPC. */
        async findByPin(pin: string): Promise<RepoResult<EventRow>> {
            const { data, error } = await client.rpc('get_event_by_pin', { p_pin: pin });

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow, error: null };
        },

        /** Create a new event. */
        async create(params: {
            accountId: string;
            title: string;
            description?: string;
            category?: string;
            startDatetime: string;
            endDatetime: string;
            timezone?: string;
            location?: Record<string, unknown>;
            media?: Record<string, unknown>;
            isPrivate?: boolean;
            currency?: string;
            status?: EventStatus;
        }): Promise<RepoResult<EventRow>> {
            const { data, error } = await client
                .from('events')
                .insert({
                    account_id: params.accountId,
                    title: params.title,
                    description: params.description,
                    category_id: params.category,
                    starts_at: params.startDatetime,
                    ends_at: params.endDatetime,
                    timezone: params.timezone,
                    location: params.location,
                    media: params.media,
                    is_private: params.isPrivate ?? false,
                    currency: params.currency,
                    status: params.status ?? 'draft',
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow, error: null };
        },

        /** Update an event's fields. */
        async update(eventId: string, fields: Partial<Omit<EventRow, 'id' | 'account_id' | 'created_at' | 'updated_at'>>): Promise<RepoResult<EventRow>> {
            // Translate view-aliased names back to the real table column names.
            // EventRow uses start_datetime/end_datetime/category_id as returned by api.v1_events;
            // public.events stores them as starts_at/ends_at/category_id.
            // category_name and total_capacity are read-only computed/joined fields — strip them.
            const { start_datetime, end_datetime, category_name, total_capacity, ...rest } = fields as any;
            const dbFields: Record<string, unknown> = { ...rest };
            if (start_datetime !== undefined) dbFields.starts_at = start_datetime;
            if (end_datetime !== undefined) dbFields.ends_at = end_datetime;

            const { data, error } = await client
                .from('events')
                .update(dbFields)
                .eq('id', eventId)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow, error: null };
        },

        /** Change an event's status. */
        async updateStatus(eventId: string, status: EventStatus): Promise<RepoResult<null>> {
            const { error } = await client
                .from('events')
                .update({ status })
                .eq('id', eventId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Soft-delete an event. */
        async delete(eventId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('events')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', eventId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Fetch analytics for a single event. Wraps `get_event_analytics` RPC. */
        async getAnalytics(eventId: string): Promise<RepoResult<EventAnalytics>> {
            const { data, error } = await client.rpc('get_event_analytics', {
                p_event_id: eventId,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventAnalytics, error: null };
        },

        /** Fetch all ticket tiers for an event. */
        async getTiers(eventId: string): Promise<RepoResult<TicketTier[]>> {
            const { data, error } = await client
                .from('ticket_tiers')
                .select('*')
                .eq('event_id', eventId)
                .order('price', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier[], error: null };
        },

        /** Create a ticket tier for an event. */
        async createTier(params: {
            eventId: string;
            displayName: string;
            price: number;
            quantityTotal: number;
            description?: string;
            saleStartAt?: string;
            saleEndAt?: string;
            maxPerOrder?: number;
        }): Promise<RepoResult<TicketTier>> {
            const { data, error } = await client
                .from('ticket_tiers')
                .insert({
                    event_id: params.eventId,
                    display_name: params.displayName,
                    price: params.price,
                    quantity_total: params.quantityTotal,
                    description: params.description,
                    sale_start_at: params.saleStartAt,
                    sale_end_at: params.saleEndAt,
                    max_per_order: params.maxPerOrder,
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier, error: null };
        },

        /** Update a ticket tier. */
        async updateTier(tierId: string, fields: Partial<Pick<TicketTier, 'display_name' | 'price' | 'quantity_total' | 'description' | 'sale_start_at' | 'sale_end_at' | 'max_per_order' | 'status'>>): Promise<RepoResult<TicketTier>> {
            const { data, error } = await client
                .from('ticket_tiers')
                .update(fields)
                .eq('id', tierId)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier, error: null };
        },

        /** Delete a ticket tier. */
        async deleteTier(tierId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('ticket_tiers')
                .delete()
                .eq('id', tierId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Get all waitlist entries for an event. */
        async getWaitlist(eventId: string, opts?: ListOptions): Promise<RepoResult<EventWaitlistEntry[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('event_waitlists')
                .select('id, event_id, user_id, status, created_at')
                .eq('event_id', eventId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventWaitlistEntry[], error: null };
        },
    };
}
