/**
 * Forum repository — wraps queries against:
 *   forums, forum_channels, forum_members, forum_messages, forum_media, message_reactions
 *
 * Used by the in-event community feature on both organizer and attendee surfaces.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { ForumStatus } from '@/types/status';

/** Matches DB enum `message_type`. */
export type MessageType = 'announcement' | 'chat' | 'system_announcement' | 'system_chat';

/** Matches DB enum `media_type` (subset used by forum media). */
export type ForumMediaType = 'image' | 'video' | 'audio' | 'document';

export interface Forum {
    id: string;
    event_id: string;
    status: ForumStatus;
    /** Computed via vw_forum_with_stats — not a real column on `forums`. */
    member_count?: number;
    created_at: string;
}

export interface ForumChannel {
    id: string;
    forum_id: string;
    slug: string;
    display_name: string;
    description?: string | null;
    status: ForumStatus;
    created_at: string;
}

export interface ForumMember {
    forum_id: string;
    user_id: string;
    role_id: string;
    /** Derived: role_id IN ('moderator', 'admin'). */
    is_moderator: boolean;
    joined_at: string;
}

export interface ForumMessage {
    id: string;
    forum_id: string;
    channel_id: string;
    author_id: string;
    content: string;
    title?: string | null;
    message_type: MessageType;
    is_pinned: boolean;
    is_hidden: boolean;
    edit_count: number;
    created_at: string;
    updated_at: string;
    /** Joined: user_profile.full_name */
    author_name?: string;
    /** Joined: user_profile.avatar_url */
    author_avatar?: string | null;
}

export interface ForumMedia {
    id: string;
    forum_id: string;
    uploader_id: string;
    media_type: ForumMediaType;
    /** jsonb: { thumbnail, full_res, blur_hash } */
    media_url: Record<string, unknown>;
    /** jsonb: { width, height, file_size, mime_type } */
    metadata: Record<string, unknown>;
    caption?: string | null;
    is_approved: boolean;
    created_at: string;
}

export function createForumRepository(client: DbClient) {
    return {
        /** Fetch the forum for a given event. Returns null when no forum exists for the event. */
        async findByEventId(eventId: string): Promise<RepoResult<Forum | null>> {
            const { data, error } = await client
                .from('forums')
                .select('id, event_id, status, created_at')
                .eq('event_id', eventId)
                .maybeSingle();

            if (error) return { data: null, error: toError(error) };
            return { data: data as Forum | null, error: null };
        },

        /** Fetch all channels in a forum. */
        async getChannels(forumId: string): Promise<RepoResult<ForumChannel[]>> {
            const { data, error } = await client
                .from('forum_channels')
                .select('id, forum_id, slug, display_name, description, status, created_at')
                .eq('forum_id', forumId)
                .order('created_at', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumChannel[], error: null };
        },

        /** Fetch members of a forum with derived `is_moderator` flag. */
        async getMembers(forumId: string, opts?: ListOptions): Promise<RepoResult<ForumMember[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('forum_members')
                .select('forum_id, user_id, role_id, joined_at')
                .eq('forum_id', forumId)
                .order('joined_at', { ascending: true })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const members: ForumMember[] = (data ?? []).map((row: any) => ({
                forum_id: row.forum_id,
                user_id: row.user_id,
                role_id: row.role_id,
                is_moderator: row.role_id === 'moderator' || row.role_id === 'admin' || row.role_id === 'owner',
                joined_at: row.joined_at,
            }));

            return { data: members, error: null };
        },

        /** Fetch messages in a channel, newest first. */
        async getMessages(forumId: string, channelId: string, opts?: ListOptions): Promise<RepoResult<ForumMessage[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('forum_messages')
                .select(`
                    id, forum_id, channel_id, author_id, content, title, message_type,
                    is_pinned, is_hidden, edit_count, created_at, updated_at,
                    user_profile:author_id (full_name, avatar_url)
                `)
                .eq('forum_id', forumId)
                .eq('channel_id', channelId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const messages: ForumMessage[] = (data ?? []).map((row: any) => ({
                id: row.id,
                forum_id: row.forum_id,
                channel_id: row.channel_id,
                author_id: row.author_id,
                content: row.content,
                title: row.title,
                message_type: row.message_type,
                is_pinned: row.is_pinned,
                is_hidden: row.is_hidden,
                edit_count: row.edit_count,
                created_at: row.created_at,
                updated_at: row.updated_at,
                author_name: row.user_profile?.full_name,
                author_avatar: row.user_profile?.avatar_url,
            }));

            return { data: messages, error: null };
        },

        /** Post a new message in a forum channel. */
        async postMessage(params: {
            forumId: string;
            channelId: string;
            content: string;
            title?: string;
            messageType?: MessageType;
        }): Promise<RepoResult<ForumMessage>> {
            const { data, error } = await client
                .from('forum_messages')
                .insert({
                    forum_id: params.forumId,
                    channel_id: params.channelId,
                    content: params.content,
                    title: params.title,
                    message_type: params.messageType ?? 'chat',
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumMessage, error: null };
        },

        /**
         * Soft-delete a message (author or moderator). Sets `deleted_at` rather than
         * issuing DELETE — the table is partitioned and rows are retained for moderation audit.
         */
        async deleteMessage(messageId: string, createdAt: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('forum_messages')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', messageId)
                .eq('created_at', createdAt);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Fetch approved media for a forum. */
        async getMedia(forumId: string, opts?: ListOptions): Promise<RepoResult<ForumMedia[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 20;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('forum_media')
                .select('id, forum_id, uploader_id, media_type, media_url, metadata, caption, is_approved, created_at')
                .eq('forum_id', forumId)
                .eq('is_approved', true)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumMedia[], error: null };
        },

        /**
         * Add a reaction to a message. The composite FK to partitioned forum_messages
         * requires `messageCreatedAt` (caller already has this from the message row).
         */
        async addReaction(params: {
            messageId: string;
            messageCreatedAt: string;
            emojiCode: string;
        }): Promise<RepoResult<null>> {
            const { error } = await client
                .from('message_reactions')
                .insert({
                    message_id: params.messageId,
                    message_created_at: params.messageCreatedAt,
                    emoji_code: params.emojiCode,
                });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Remove a reaction by id (author of the reaction only — enforced by RLS). */
        async removeReaction(reactionId: string, createdAt: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('message_reactions')
                .delete()
                .eq('id', reactionId)
                .eq('created_at', createdAt);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /**
         * Subscribe to new messages in a channel. The handler receives the freshly
         * inserted row (mapped to the `ForumMessage` shape — without joined author
         * fields, since postgres_changes payloads do not include embeds).
         *
         * Returns an unsubscribe function — caller should invoke it on unmount.
         */
        subscribeToChannelMessages(
            forumId: string,
            channelId: string,
            onInsert: (msg: ForumMessage) => void
        ): () => void {
            const channel = client
                .channel(`forum:${forumId}:channel:${channelId}`)
                .on(
                    'postgres_changes' as never,
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'forum_messages',
                        filter: `channel_id=eq.${channelId}`,
                    } as never,
                    (payload: { new: Record<string, unknown> }) => {
                        const row = payload.new as any;
                        if (row.forum_id !== forumId) return;
                        onInsert({
                            id: row.id,
                            forum_id: row.forum_id,
                            channel_id: row.channel_id,
                            author_id: row.author_id,
                            content: row.content,
                            title: row.title,
                            message_type: row.message_type,
                            is_pinned: row.is_pinned,
                            is_hidden: row.is_hidden,
                            edit_count: row.edit_count,
                            created_at: row.created_at,
                            updated_at: row.updated_at,
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
