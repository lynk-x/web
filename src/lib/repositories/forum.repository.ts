/**
 * Forum repository — wraps queries against:
 *   forums, forum_channels, forum_members, forum_messages, forum_media, message_reactions
 *
 * Used by the in-event community feature on both organizer and attendee surfaces.
 */

import type { DbClient, ListOptions, RepoResult } from './types';
import { toError } from './types';
import type { ForumStatus } from '@/types/status';

export interface Forum {
    id: string;
    event_id: string;
    status: ForumStatus;
    member_count: number;
    created_at: string;
}

export interface ForumChannel {
    id: string;
    forum_id: string;
    name: string;
    description?: string | null;
    type: 'chat' | 'announcement' | 'media';
    created_at: string;
}

export interface ForumMember {
    id: string;
    forum_id: string;
    user_id: string;
    is_moderator: boolean;
    joined_at: string;
}

export interface ForumMessage {
    id: string;
    forum_id: string;
    channel_id: string;
    user_id: string;
    content: string;
    category: 'chat' | 'announcement';
    is_approved: boolean;
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
    user_id: string;
    media_type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnail_url?: string | null;
    caption?: string | null;
    mime_type: string;
    file_size: number;
    is_approved: boolean;
    created_at: string;
}

export function createForumRepository(client: DbClient) {
    return {
        /** Fetch the forum for a given event. */
        async findByEventId(eventId: string): Promise<RepoResult<Forum>> {
            const { data, error } = await client
                .from('forums')
                .select('id, event_id, status, member_count, created_at')
                .eq('event_id', eventId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as Forum, error: null };
        },

        /** Fetch all channels in a forum. */
        async getChannels(forumId: string): Promise<RepoResult<ForumChannel[]>> {
            const { data, error } = await client
                .from('forum_channels')
                .select('id, forum_id, name, description, type, created_at')
                .eq('forum_id', forumId)
                .order('created_at', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumChannel[], error: null };
        },

        /** Fetch members of a forum. */
        async getMembers(forumId: string, opts?: ListOptions): Promise<RepoResult<ForumMember[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('forum_members')
                .select('id, forum_id, user_id, is_moderator, joined_at')
                .eq('forum_id', forumId)
                .order('joined_at', { ascending: true })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumMember[], error: null };
        },

        /** Fetch messages in a channel, newest first. */
        async getMessages(forumId: string, channelId: string, opts?: ListOptions): Promise<RepoResult<ForumMessage[]>> {
            const page = opts?.page ?? 1;
            const size = opts?.pageSize ?? 50;
            const from = (page - 1) * size;

            const { data, error } = await client
                .from('forum_messages')
                .select(`
                    id, forum_id, channel_id, user_id, content, category, is_approved, created_at, updated_at,
                    user_profile:user_id (full_name, avatar_url)
                `)
                .eq('forum_id', forumId)
                .eq('channel_id', channelId)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };

            const messages: ForumMessage[] = (data ?? []).map((row: any) => ({
                id: row.id,
                forum_id: row.forum_id,
                channel_id: row.channel_id,
                user_id: row.user_id,
                content: row.content,
                category: row.category,
                is_approved: row.is_approved,
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
            category?: 'chat' | 'announcement';
        }): Promise<RepoResult<ForumMessage>> {
            const { data, error } = await client
                .from('forum_messages')
                .insert({
                    forum_id: params.forumId,
                    channel_id: params.channelId,
                    content: params.content,
                    category: params.category ?? 'chat',
                })
                .select()
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumMessage, error: null };
        },

        /** Delete a message (author or moderator). */
        async deleteMessage(messageId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('forum_messages')
                .delete()
                .eq('id', messageId);

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
                .select('id, forum_id, user_id, media_type, url, thumbnail_url, caption, mime_type, file_size, is_approved, created_at')
                .eq('forum_id', forumId)
                .eq('is_approved', true)
                .order('created_at', { ascending: false })
                .range(from, from + size - 1);

            if (error) return { data: null, error: toError(error) };
            return { data: data as ForumMedia[], error: null };
        },

        /** Add a reaction to a message. */
        async addReaction(messageId: string, emoji: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('message_reactions')
                .insert({ message_id: messageId, emoji });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Remove a reaction from a message (own reaction only). */
        async removeReaction(reactionId: string): Promise<RepoResult<null>> {
            const { error } = await client
                .from('message_reactions')
                .delete()
                .eq('id', reactionId);

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },
    };
}
