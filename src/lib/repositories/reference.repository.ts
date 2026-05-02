/**
 * Reference repository — wraps queries against read-mostly reference tables:
 *   tags, event_categories, category_tags, countries, feature_flags,
 *   system_config, legal_documents, system_banners, spotlights
 *
 * Used by event forms, onboarding, public landing pages, and admin config panels.
 */

import type { DbClient, RepoResult } from './types';
import { toError } from './types';

export interface Tag {
    id: string;
    name: string;
    type_id?: string;
    use_count?: number;
}

export interface EventCategory {
    id: string;
    display_name: string;
}

export interface CategoryTag {
    category_id: string;
    tag_id: string;
}

export interface Country {
    code: string;
    name: string;
    currency: string;
    timezone: string;
    is_active?: boolean;
}

export interface FeatureFlag {
    key: string;
    is_enabled: boolean;
    description?: string | null;
}

export interface SystemConfigEntry {
    key: string;
    value: string;
    data_type: 'string' | 'number' | 'boolean' | 'json';
}

/**
 * Legal documents are keyed by `(slug, version)` in the DB — there is no `type` column.
 * The `slug` field is the canonical document key (e.g. 'terms_of_service').
 */
export type LegalDocumentSlug =
    | 'terms_of_service'
    | 'privacy_policy'
    | 'organizer_agreement'
    | 'cookie_policy'
    | 'refund_policy';

export interface LegalDocument {
    id: string;
    slug: LegalDocumentSlug | string;
    version: string;
    title: string;
    /** content is jsonb in the DB: `{ sections: [{ title, body }] }` */
    content?: Record<string, unknown> | null;
    is_active: boolean;
    effective_date: string;
}

/** Matches DB enum `system_banner_target`. The PWA should request 'all' (and any web-relevant surface). */
export type SystemBannerTarget =
    | 'all'
    | 'home'
    | 'discover'
    | 'wallet'
    | 'profile'
    | 'organizer_dashboard'
    | 'advertiser_dashboard'
    | 'pulse_dashboard';

export interface SystemBanner {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'error' | 'success';
    target: SystemBannerTarget;
    is_active: boolean;
    starts_at: string;
    ends_at?: string | null;
    action_url?: string | null;
}

export interface Spotlight {
    id: string;
    title: string;
    subtitle?: string | null;
    target: 'all' | 'organize_dashboard' | 'ads_dashboard' | 'discovery_page';
    display_order: number;
    cta_text?: string | null;
    redirect_to?: string | null;
    background_url?: string | null;
    is_active: boolean;
}

export function createReferenceRepository(client: DbClient) {
    return {
        /** Fetch all active tags. Used by event form tag autocomplete. */
        async getTags(): Promise<RepoResult<Tag[]>> {
            const { data, error } = await client
                .from('tags')
                .select('id, name, type_id, use_count')
                .eq('is_active', true)
                .order('use_count', { ascending: false });

            if (error) return { data: null, error: toError(error) };
            return { data: data as Tag[], error: null };
        },

        /** Fetch all event categories ordered alphabetically. */
        async getEventCategories(): Promise<RepoResult<EventCategory[]>> {
            const { data, error } = await client
                .from('event_categories')
                .select('id, display_name')
                .order('display_name', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as EventCategory[], error: null };
        },

        /** Fetch category→tag mappings. Used for tag suggestions within a category. */
        async getCategoryTags(): Promise<RepoResult<CategoryTag[]>> {
            const { data, error } = await client
                .from('category_tags')
                .select('category_id, tag_id');

            if (error) return { data: null, error: toError(error) };
            return { data: data as CategoryTag[], error: null };
        },

        /** Fetch all active countries. */
        async getCountries(): Promise<RepoResult<Country[]>> {
            const { data, error } = await client
                .from('countries')
                .select('code, name, currency, timezone, is_active')
                .eq('is_active', true)
                .order('name', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as Country[], error: null };
        },

        /** Fetch all feature flags. */
        async getFeatureFlags(): Promise<RepoResult<FeatureFlag[]>> {
            const { data, error } = await client
                .from('feature_flags')
                .select('key, is_enabled, description');

            if (error) return { data: null, error: toError(error) };
            return { data: data as FeatureFlag[], error: null };
        },

        /** Fetch a single system config value by key. */
        async getSystemConfig(key: string): Promise<RepoResult<SystemConfigEntry>> {
            const { data, error } = await client
                .from('system_config')
                .select('key, value, data_type')
                .eq('key', key)
                .single();

            if (error) return { data: null, error: toError(error) };
            return { data: data as SystemConfigEntry, error: null };
        },

        /** Fetch all system config entries. */
        async getAllSystemConfig(): Promise<RepoResult<SystemConfigEntry[]>> {
            const { data, error } = await client
                .from('system_config')
                .select('key, value, data_type')
                .order('key', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as SystemConfigEntry[], error: null };
        },

        /** Fetch the active version of a legal document by its slug. */
        async getLegalDocument(slug: LegalDocumentSlug | string): Promise<RepoResult<LegalDocument | null>> {
            const { data, error } = await client
                .from('legal_documents')
                .select('id, slug, version, title, content, is_active, effective_date')
                .eq('slug', slug)
                .eq('is_active', true)
                .order('effective_date', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) return { data: null, error: toError(error) };
            return { data: data as LegalDocument | null, error: null };
        },

        /**
         * Fetch currently active banners targeted at the given surface (or 'all').
         * Filters by start/end window so callers don't see scheduled-future banners.
         */
        async getActiveSystemBanners(target: SystemBannerTarget = 'all'): Promise<RepoResult<SystemBanner[]>> {
            const now = new Date().toISOString();
            const targets = target === 'all' ? ['all'] : [target, 'all'];

            const { data, error } = await client
                .from('system_banners')
                .select('id, title, content, type, target, is_active, starts_at, ends_at, action_url')
                .eq('is_active', true)
                .in('target', targets)
                .lte('starts_at', now)
                .or(`ends_at.is.null,ends_at.gte.${now}`);

            if (error) return { data: null, error: toError(error) };
            return { data: data as SystemBanner[], error: null };
        },

        /** Fetch spotlights for a given target surface. */
        async getSpotlights(target: Spotlight['target']): Promise<RepoResult<Spotlight[]>> {
            const { data, error } = await client
                .from('spotlights')
                .select('id, title, subtitle, target, display_order, cta_text, redirect_to, background_url, is_active')
                .eq('is_active', true)
                .in('target', [target, 'all'])
                .order('display_order', { ascending: true });

            if (error) return { data: null, error: toError(error) };
            return { data: data as Spotlight[], error: null };
        },
    };
}
