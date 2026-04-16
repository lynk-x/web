/**
 * Notifications repository — wraps queries against:
 *   notifications, notification_preferences
 *
 * Used by the notification bell/drawer on all dashboard surfaces.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';

export type NotificationType =
    | 'system'
    | 'marketing'
    | 'event_update'
    | 'money_in'
    | 'money_out'
    | 'mention'
    | 'announcements'
    | 'livechats'
    | 'media';

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    is_read: boolean;
    action_url?: string | null;
    created_at: string;
}

export interface NotificationPreferences {
    user_id: string;
    email_enabled: boolean;
    push_enabled: boolean;
    sms_enabled: boolean;
    marketing_enabled: boolean;
    event_updates_enabled: boolean;
    money_alerts_enabled: boolean;
    updated_at: string;
}

export function createNotificationsRepository(client: DbClient) {
    return {
        /** Fetch notifications for a user, newest first. */
        async getForUser(userId: string, opts?: ListOptions): Promise<RepoResult<Notification[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('notifications')
                .select('id, user_id, type, title, body, is_read, action_url, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as Notification[], error: null };
        },

        /** Count unread notifications for a user. */
        async countUnread(userId: string): Promise<RepoResult<number>> {
            const { count, error } = await client
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) return { data: null, error: toError(error) };
            return { data: count ?? 0, error: null };
        },

        /** Mark a single notification as read. */
        async markRead(notificationId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Mark all notifications for a user as read. */
        async markAllRead(userId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Delete a notification. */
        async delete(notificationId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Fetch notification preferences for a user. */
        async getPreferences(userId: string): Promise<RepoResult<NotificationPreferences>> {
            const { data, error } = await client
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as NotificationPreferences, error: null };
        },

        /** Upsert notification preferences for a user. */
        async upsertPreferences(
            userId: string,
            prefs: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>
        ): Promise<RepoResult<null>> {
            const { error } = await client
                .from('notification_preferences')
                .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },
    };
}
