"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';
import ForumMessagesTab from '@/components/admin/forums/ForumMessagesTab';

interface EventBasics {
    id: string;
    title: string;
    organizer: string;
}

/**
 * Admin sub-page for an event's forum & chat moderation — split out of the
 * event detail page's former "Forum & Chat" tab into a real sub-route,
 * matching the organizer dashboard's event detail layout.
 */
export default function AdminEventCommunityPage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className={adminStyles.container}><Spinner label="Loading..." centered /></div>}>
            <AdminEventCommunityContent {...props} />
        </Suspense>
    );
}

function AdminEventCommunityContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventCreatedAt = searchParams.get('created_at');
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventBasics | null>(null);
    const [forumId, setForumId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchEvent = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!eventCreatedAt) {
                showToast('Missing event reference — please open this page from the events list.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            const { data, error } = await supabase.schema('api').rpc('get_admin_event_details', {
                p_event_id: id,
                p_event_created_at: eventCreatedAt,
            });
            if (error) throw error;
            if (!data) {
                showToast('Event not found.', 'error');
                router.push('/dashboard/admin/events');
                return;
            }

            setEvent(data.event as EventBasics);

            const { data: forumRow } = await supabase
                .schema('api')
                .from('v1_forums')
                .select('id')
                .eq('event_id', id)
                .maybeSingle();
            setForumId(forumRow?.id || null);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load event details.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, eventCreatedAt, supabase, showToast, router]);

    useEffect(() => { fetchEvent(); }, [fetchEvent]);

    if (isLoading || !event) {
        return (
            <div className={adminStyles.container}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', width: '100%' }}>
                    <Spinner label="Loading event details..." centered />
                </div>
            </div>
        );
    }

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Forum & Chat"
                subtitle={`${event.title} — organized by ${event.organizer}.`}
                closeHref={`/dashboard/admin/events/${id}?created_at=${encodeURIComponent(eventCreatedAt || '')}`}
            />
            {forumId ? (
                <ForumMessagesTab forumId={forumId} />
            ) : (
                <div className={adminStyles.emptyState}>No forum exists for this event.</div>
            )}
        </div>
    );
}
