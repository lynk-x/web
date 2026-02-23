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
    name: string;
    client: string;
    budget: number;
    spend: number;
    impressions: number;
    clicks: number;
    status: 'active' | 'pending' | 'paused' | 'rejected' | 'completed';
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
    eventName: string;
    status: 'active' | 'locked' | 'flagged' | 'hidden';
    announcementsCount: number;
    liveChatsCount: number;
    mediaCount: number;
    lastActivity: string;
}

/** A user- or system-generated report. */
export interface Report {
    id: string;
    type: 'content' | 'bug' | 'user' | 'system';
    title: string;
    description: string;
    date: string;
    reporter: string;
    status: 'open' | 'in_review' | 'resolved' | 'dismissed';
}

/** A system configuration key-value pair. */
export interface EnvVar {
    key: string;
    value: string;
}

/** A support ticket. */
export interface Ticket {
    id: string;
    subject: string;
    requester: string;
    priority: 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignedTo?: string;
    lastUpdated: string;
}

/** A platform user managed by admin. */
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'organizer' | 'advertiser' | 'user';
    status: 'active' | 'suspended' | 'partially_active';
    lastActive: string;
}
