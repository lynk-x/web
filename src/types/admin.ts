/**
 * Admin domain types.
 *
 * Centralised definitions used by admin dashboard tables and components.
 * Components re-export these for backward compatibility.
 */

/** A single row in the audit log. */
export interface AuditLog {
    id: string;
    action: string;
    actor: {
        name: string;
        email: string;
        avatar?: string;
    };
    target: string;
    targetType: string;
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    changes?: Record<string, { old: any; new: any }>;
    details?: string;
}

/** An admin-managed advertising campaign. */
export interface Campaign {
    id: string;
    /** Human-readable reference code (e.g. CAMP-001) — from `ad_campaigns` */
    campaignRef?: string;
    name: string;
    client: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    /** Aligned to `campaign_status` enum: draft replaces the old 'pending' */
    status: 'active' | 'draft' | 'paused' | 'rejected' | 'completed';
    /** Aligned to `ad_type` enum: banner | interstitial | feed_card | map_pin */
    adType?: 'banner' | 'interstitial' | 'feed_card' | 'map_pin';
    startDate: string;
    endDate: string;
}

/** A content item in the CMS. */
export interface ContentItem {
    id: string;
    title: string;
    slug: string;
    type: 'page' | 'post' | 'announcement';
    author: string;
    lastUpdated: string;
    status: 'published' | 'draft' | 'archived';
    content?: string;
}

export interface ForumThread {
    id: string;
    title: string;
    /** Forums are 1:1 with events in the schema */
    eventName: string;
    /** Optional FK to `events.id` for deep-linking */
    eventId?: string;
    /**
     * Aligned to `forum_status` schema enum.
     * Note: exact casing preserved from DB enum definition.
     */
    status: 'Open' | 'Read_only' | 'Archived';
    /** Count of `forum_messages` where `category = 'announcement'` */
    announcementsCount: number;
    /** Count of `forum_messages` where `category = 'chat'` */
    liveChatsCount: number;
    /** Count of `forum_media` attachments for this forum's event */
    mediaCount: number;
    lastActivity: string;
}

/**
 * Mirrors the `reports` DB table.
 *
 * Schema: reports (
 *   id uuid, reporter_id uuid, reason_id text,
 *   target_user_id uuid, target_event_id uuid, target_message_id uuid,
 *   -- Exactly ONE of the three target columns must be non-null (CONSTRAINT one_target)
 *   status report_status DEFAULT 'pending', admin_notes text, resolved_at timestamptz
 * )
 *
 * `report_status` enum: pending | investigating | resolved | dismissed
 *
 * When wiring up:
 *   supabase.from('reports')
 *     .select('*, reporter:profiles!reporter_id(user_name), reason:report_reasons(category, description)')
 *     .order('created_at', { ascending: false })
 */
export interface Report {
    id: string;
    /**
     * Which type of content was reported.
     * Derived from which target FK column is non-null in the DB:
     *   target_user_id    → 'user'
     *   target_event_id   → 'event'
     *   target_message_id → 'message' (targets `forum_messages` table)
     */
    targetType: 'user' | 'event' | 'message';
    /** UUID of the reported object (user / event / message) */
    targetId: string;
    /** Human-readable title summarising the report (derived from reason_id + description) */
    title: string;
    /** Full description text submitted by the reporter */
    description: string;
    /** Human-readable relative timestamp for the UI */
    date: string;
    /** Display name of the reporting user (from profiles join) */
    reporter: string;
    /** Aligned to `report_status` schema enum */
    status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
    /** From `report_reasons.category` via reason_id FK */
    reasonId?: string;
    /** Admin notes added during investigation or resolution */
    adminNotes?: string;
}

/** A system configuration key-value pair. */
export interface EnvVar {
    key: string;
    value: string;
}

/** A support ticket — mirrors the `support_tickets` DB table. */
export interface Ticket {
    id: string;
    subject: string;
    requester: string;
    /** Aligned to CHECK constraint in `support_tickets.priority` — includes critical */
    priority: 'critical' | 'high' | 'medium' | 'low';
    /** Aligned to CHECK constraint in `support_tickets.status` */
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;
    lastUpdated: string;
}

/** A platform user managed by admin. */
export interface User {
    id: string;
    name: string;
    /** Email lives in `auth.users` — join via RPC or auth.admin API when wiring up */
    email: string;
    /** Aligned to `user_type` enum: attendee | organizer | advertiser | platform | admin */
    role: 'admin' | 'organizer' | 'advertiser' | 'attendee' | 'platform';
    /** No dedicated status column in schema yet — pending decision on suspension mechanism */
    status: 'active' | 'suspended' | 'partially_active';
    lastActive: string;
    /** From `profiles.verification_status` enum: none | verified | official */
    verificationStatus?: 'none' | 'verified' | 'official';
    /** From `profiles.subscription_tier` enum: free | pro */
    subscriptionTier?: 'free' | 'pro';
}


