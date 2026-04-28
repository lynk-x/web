/**
 * Users repository — wraps queries against `user_profile` and `user_devices`.
 *
 * Used by AuthContext and profile settings pages.
 */

import type { DbClient, RepoResult } from './types';
import { toError } from './types';

export interface UserProfile {
    id: string;
    email: string;
    user_name: string;
    full_name: string | null;
    avatar_url: string | null;
    country_code?: string | null;
    gender?: string | null;
    last_seen_at?: string | null;
    created_at?: string;
}

export function createUsersRepository(client: DbClient) {
    return {
        /** Fetch a single user's profile by their auth UID. Used in AuthContext. */
        async getProfile(userId: string): Promise<RepoResult<UserProfile>> {
            const { data, error } = await client
                .from('user_profile')
                .select('id, email, user_name, full_name, avatar_url, country_code, gender, last_seen_at, created_at')
                .eq('id', userId)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as UserProfile, error: null };
        },

        /** Check whether a username is available. Wraps `is_username_available` RPC. */
        async isUsernameAvailable(username: string): Promise<RepoResult<boolean>> {
            const { data, error } = await client.rpc('is_username_available', {
                username_to_check: username,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: data as boolean, error: null };
        },

        /** Update the authenticated user's own profile. Wraps `update_my_profile` RPC. */
        async updateMyProfile(params: {
            fullName?: string;
            avatarUrl?: string;
            info?: Record<string, any>;
            countryCode?: string;
        }): Promise<RepoResult<null>> {
            const { error } = await client.rpc('update_my_profile', {
                p_full_name: params.fullName ?? null,
                p_avatar_url: params.avatarUrl ?? null,
                p_info: params.info ?? null,
                p_country_code: params.countryCode ?? null,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },

        /** Register or refresh the user's push notification device token. */
        async registerDevice(fcmToken: string, deviceInfo: Record<string, unknown>): Promise<RepoResult<null>> {
            const { error } = await client.rpc('register_user_device', {
                p_fcm_token: fcmToken,
                p_info: deviceInfo,
            });

            if (error) return { data: null, error: toError(error) };
            return { data: null, error: null };
        },
    };
}
