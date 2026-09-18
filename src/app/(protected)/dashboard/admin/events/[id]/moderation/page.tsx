"use client";

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';
import ReportTable from '@/components/admin/moderation/ReportTable';
import type { Report } from '@/types/admin';

interface EventBasics {
    id: string;
    title: string;
    organizer: string;
}

/**
 * Admin sub-page listing moderation reports filed against an event — split
 * out of the event detail page's former "Moderation Queue" tab into a real
 * sub-route, matching the organizer dashboard's event detail layout.
 */
export default function AdminEventModerationPage(props: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<div className={adminStyles.container}><Spinner label="Loading..." centered /></div>}>
            <AdminEventModerationContent {...props} />
        </Suspense>
    );
}

function AdminEventModerationContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventCreatedAt = searchParams.get('created_at');
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [event, setEvent] = useState<EventBasics | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
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

            const { data: reportRows } = await supabase
                .schema('api')
                .from('v1_reports')
                .select('*')
                .eq('target_event_id', id);
            setReports((reportRows || []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                targetType: 'event',
                targetId: r.target_event_id as string,
                title: (r.reason_display_name as string) || `Report #${(r.id as string).slice(0, 8)}`,
                description: (r.info as Record<string, unknown>)?.description as string || 'No description provided.',
                date: new Date(r.created_at as string).toLocaleDateString(),
                reporter: (r.reporter_username as string) || 'Anonymous',
                status: (r.status === 'under_investigation' ? 'investigating' : r.status) as Report['status'],
                createdAt: r.created_at as string,
                reasonId: r.reason_id as string,
            })));
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
                title="Moderation Queue"
                subtitle={`${event.title} — organized by ${event.organizer}.`}
                closeHref={`/dashboard/admin/events/${id}?created_at=${encodeURIComponent(eventCreatedAt || '')}`}
            />
            <ReportTable reports={reports} isLoading={isLoading} />
        </div>
    );
}
