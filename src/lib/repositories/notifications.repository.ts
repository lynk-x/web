/**
 * Notifications repository — wraps queries against:
 *   notifications.notifications, notification_preferences
 *
 * Used by the notification bell/drawer on all dashboard surfaces.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';

/**
 * Matches the DB enum `notification_type`. The DB has more values than the original
 * client union; keep this in sync with the enum at PART 02 of initial_schema.sql.
 */
export type NotificationType =
    | 'system'
    | 'marketing'
    | 'mention'
    | 'event_update'
    | 'money_in'
    | 'money_out'
    | 'announcements'
    | 'forum_update'
    | 'invitation'
    | 'payout_approved'
    | 'payout_rejected'
    | 'ticket_purchased'
    | 'ticket_cancelled'
    | 'event_cancelled'
    | 'account_suspended'
    | 'event_reminder'
    | 'sponsorship_accepted'
    | 'ticket_resale_offer'
    | 'identity'
    | 'auth'
    | 'moderation';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    action_url: string | null;
    data: Record<string, unknown>;
    metadata: Record<string, unknown>;
    is_read: boolean;
    created_at: string;
}

/**
 * Per-type preference row. The DB key is composite `(user_id, type)`; one row per type.
 * `marketing_consent` is the GDPR/CAN-SPAM opt-in (only enforced for marketing-class types).
 */
export interface NotificationPreference {
    user_id: string;
    type: NotificationType;
    in_app: boolean;
    push: boolean;
    email: boolean;
    marketing_consent: boolean;
}

export function createNotificationsRepository(client: DbClient) {
    return {
        /** Fetch notifications for a user, newest first. */
        async getForUser(userId: string, opts?: ListOptions): Promise<RepoResult<Notification[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .schema('notifications').from('notifications')
                .select('id, user_id, type, title, body, action_url, data, metadata, is_read, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as Notification[], error: null };
        },

        /** Count unread notifications for a user. */
        async countUnread(userId: string): Promise<RepoResult<number>> {
            const { count, error } = await client
                .schema('notifications').from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) return { data: null, error: toError(error) };
            return { data: count ?? 0, error: null };
        },

        /**
         * Mark a single notification as read. Requires `created_at` because the table is
         * partitioned by created_at and the PK is composite (id, created_at).
         */
        async markRead(notificationId: string, createdAt: string): Promise<RepoResult<null>> {
            const { error } = await client
                .schema('notifications').from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('created_at', createdAt);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Mark all notifications for a user as read. */
        async markAllRead(userId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .schema('notifications').from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Delete a notification. Requires `created_at` for the partitioned PK. */
        async delete(notificationId: string, createdAt: string): Promise<RepoResult<null>> {
            const { error } = await client
                .schema('notifications').from('notifications')
                .delete()
                .eq('id', notificationId)
                .eq('created_at', createdAt);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /**
         * Fetch all notification preferences for a user — returns one row per
         * notification_type. Caller renders these as a per-type matrix.
         */
        async getPreferences(userId: string): Promise<RepoResult<NotificationPreference[]>> {
            const { data, error } = await client
                .from('notification_preferences')
                .select('user_id, type, in_app, push, email, marketing_consent')
                .eq('user_id', userId);

            if (error) return { data: null, error: toError(error) };
            return { data: data as NotificationPreference[], error: null };
        },

        /**
         * Upsert a single preference row keyed by (user_id, type). Use this once per
         * type the user toggled rather than batching — keeps the transactional surface
         * small and respects per-type RLS checks.
         */
        async upsertPreference(
            userId: string,
            type: NotificationType,
            channels: { in_app?: boolean; push?: boolean; email?: boolean; marketing_consent?: boolean }
        ): Promise<RepoResult<null>> {
            const { error } = await client
                .from('notification_preferences')
                .upsert(
                    { user_id: userId, type, ...channels },
                    { onConflict: 'user_id,type' }
                );

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /**
         * Subscribe to new notifications for a user. Fires `onInsert` for each row
         * inserted into `notifications.notifications` matching `user_id`.
         *
         * Returns an unsubscribe function — caller should invoke it on unmount.
         */
        subscribeToUserNotifications(
            userId: string,
            onInsert: (n: Notification) => void
        ): () => void {
            const channel = client
                .channel(`notifications:${userId}`)
                .on(
                    'postgres_changes' as never,
                    {
                        event: 'INSERT',
                        schema: 'notifications',
                        table: 'notifications',
                        filter: `user_id=eq.${userId}`,
                    } as never,
                    (payload: { new: Record<string, unknown> }) => {
                        const row = payload.new as any;
                        onInsert({
                            id: row.id,
                            user_id: row.user_id,
                            type: row.type,
                            title: row.title,
                            body: row.body,
                            action_url: row.action_url,
                            data: row.data ?? {},
                            metadata: row.metadata ?? {},
                            is_read: row.is_read,
                            created_at: row.created_at,
                        });
                    }
                )
                .subscribe();

            return () => {
                client.removeChannel(channel);
            };
        },
    };
}
