/**
 * Events repository — wraps queries against:
 *   events, ticket_tiers, event_tags, event_categories, event_sessions, event_waitlists
 *
 * Used by organizer dashboard, public event pages, and admin event management.
 */

import type { DbClient, ListOptions, RepoResult, RepoListResult } from './types';
import { toError } from './types';
import type { EventStatus } from '@/types/status';

export interface EventRow {
    id: string;
    account_id: string;
    title: string;
    /** NOT NULL in DB. */
    description: string;
    status: EventStatus;
    /** Aliased by api.v1_events from `starts_at`. */
    start_datetime: string;
    end_datetime: string;
    /** NOT NULL in DB. */
    timezone: string;
    location?: Record<string, unknown> | null;
    media?: Record<string, unknown> | null;
    category_id?: string | null;
    /** Joined from event_categories.display_name. Read-only. */
    category_name?: string | null;
    is_private: boolean;
    is_featured?: boolean;
    is_online?: boolean;
    currency: string;
    total_capacity?: number | null;
    reference?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TicketTier {
    id: string;
    event_id: string;
    display_name: string;
    description?: string | null;
    price: number;
    capacity: number;
    tickets_sold: number;
    tickets_reserved: number;
    sales_start?: string | null;
    sales_end?: string | null;
    min_per_order: number;
    max_per_order?: number | null;
    is_hidden: boolean;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}

/** Shape returned by `get_event_analytics` RPC (jsonb). */
export interface EventAnalytics {
    tickets_sold: number;
    total_capacity: number;
    gross_revenue: number;
    waitlist_count: number;
    scan_count: number;
    forum_members: number;
}

/** Matches DB enum `waitlist_status`. */
export type WaitlistStatus = 'pending' | 'invited' | 'joined' | 'expired';

export interface EventWaitlistEntry {
    id: string;
    event_id: string;
    user_id: string;
    ticket_tier_id?: string | null;
    status: WaitlistStatus;
    position: number;
    invited_at?: string | null;
    expires_at?: string | null;
    created_at: string;
}

export function createEventsRepository(client: DbClient) {
    return {
        /** Fetch a single event by ID. */
        async findById(eventId: string): Promise<RepoResult<EventRow>> {
            const { data, error } = await client
                .from('v1_events')
                .select('*')
                .eq('id', eventId)
                .maybeSingle();

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventRow, error: null };
        },

        /** Fetch all events for an account (organizer dashboard). */
        async findByAccountId(accountId: string, opts?: ListOptions): Promise<RepoListResult<EventRow>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const selectOpts = opts?.withCount ? { count: 'exact' as const } : undefined;
            const { data, error, count } = await client
                .from('v1_events')
                .select(
                    'id, account_id, title, status, start_datetime, end_datetime, timezone, location, media, category_id, category_name, is_private, is_featured, is_online, currency, total_capacity, reference, created_at, updated_at',
                    selectOpts
                )
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as EventRow[], total: count ?? null, error: null };
        },

        /** Fetch published events for public discovery. */
        async findPublished(opts?: ListOptions & { category_id?: string }): Promise<RepoListResult<EventRow>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const selectOpts = opts?.withCount ? { count: 'exact' as const } : undefined;
            let query = client
                .from('v1_events')
                .select(
                    'id, account_id, title, description, start_datetime, end_datetime, timezone, location, media, category_id, category_name, currency, is_featured, is_online',
                    selectOpts
                )
                .eq('status', 'published')
                .order('start_datetime', { ascending: true })
                .range(from, from + size - 1);

            if (opts?.category_id) {
                query = query.eq('category_id', opts.category_id);
            }

            const { data, error, count } = await query;
            if (error) return { data: null, total: null, error: toError(error) };
            return { data: data as EventRow[], total: count ?? null, error: null };
        },

        /**
         * Fetch an event by its organizer-assigned PIN. Wraps `get_event_by_pin` RPC.
         * RPC returns a TABLE (id, title) — Supabase represents this as an array.
         */
        async findByPin(pin: string): Promise<RepoResult<{ id: string; title: string }>> {
            const { data, error } = await client.rpc('get_event_by_pin', { p_pin: pin });

            if (error) return { data: null, error: toError(error) };
            const row = Array.isArray(data) ? data[0] : data;
            return { data: row as { id: string; title: string }, error: null };
        },

        /**
         * Create a new event. `description`, `timezone`, and `currency` are NOT NULL in the DB.
         * `media.thumbnail` is required when status is 'published' or 'active' (CHECK constraint).
         */
        async create(params: {
            accountId: string;
            title: string;
            description: string;
            timezone: string;
            currency: string;
            startDatetime: string;
            endDatetime: string;
            category?: string;
            location?: Record<string, unknown>;
            media?: Record<string, unknown>;
            isPrivate?: boolean;
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

        /** Update an event's fields. Translates view-aliased names back to real columns. */
        async update(eventId: string, fields: Partial<Omit<EventRow, 'id' | 'account_id' | 'created_at' | 'updated_at'>>): Promise<RepoResult<EventRow>> {
            // EventRow uses start_datetime/end_datetime as returned by api.v1_events;
            // public.events stores them as starts_at/ends_at.
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

        /**
         * Soft-delete an event. The `trg_cascade_event_soft_delete` trigger fans out to
         * forums, tickets, etc. RLS gates write access to organizer/owner roles.
         */
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
                .select('id, event_id, display_name, description, price, capacity, tickets_sold, tickets_reserved, sales_start, sales_end, min_per_order, max_per_order, is_hidden, deleted_at, created_at, updated_at')
                .eq('event_id', eventId)
                .is('deleted_at', null)
                .order('price', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier[], error: null };
        },

        /** Create a ticket tier for an event. */
        async createTier(params: {
            eventId: string;
            displayName: string;
            price: number;
            capacity: number;
            description?: string;
            salesStart?: string;
            salesEnd?: string;
            minPerOrder?: number;
            maxPerOrder?: number;
        }): Promise<RepoResult<TicketTier>> {
            const { data, error } = await client
                .from('ticket_tiers')
                .insert({
                    event_id: params.eventId,
                    display_name: params.displayName,
                    description: params.description,
                    price: params.price,
                    capacity: params.capacity,
                    sales_start: params.salesStart,
                    sales_end: params.salesEnd,
                    min_per_order: params.minPerOrder ?? 1,
                    max_per_order: params.maxPerOrder,
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier, error: null };
        },

        /** Update a ticket tier. */
        async updateTier(tierId: string, fields: Partial<Pick<TicketTier, 'display_name' | 'description' | 'price' | 'capacity' | 'sales_start' | 'sales_end' | 'min_per_order' | 'max_per_order' | 'is_hidden'>>): Promise<RepoResult<TicketTier>> {
            const { data, error } = await client
                .from('ticket_tiers')
                .update(fields)
                .eq('id', tierId)
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as TicketTier, error: null };
        },

        /** Soft-delete a ticket tier. */
        async deleteTier(tierId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('ticket_tiers')
                .update({ deleted_at: new Date().toISOString() })
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
                .select('id, event_id, user_id, ticket_tier_id, status, position, invited_at, expires_at, created_at')
                .eq('event_id', eventId)
                .order('position', { ascending: true })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventWaitlistEntry[], error: null };
        },
    };
}
