import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/server';
import AnalyticsClient from './AnalyticsClient';

interface TimeSeriesItem {
    name: string;
    revenue: number;
}

interface PerformanceEvent {
    id: string;
    event: string;
    status: string;
    ticketsSold: number;
    totalRevenue: number;
    netRevenue: number;
    currency?: string;
}

interface AnalyticsData {
    insights: PerformanceEvent[];
    timeSeries: TimeSeriesItem[];
}

export default async function Page() {
    const supabase = await createClient();
    const queryClient = new QueryClient();

    // Fetch the active account on the server side so we can prefetch the queries!
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // Query the default primary account or active account for the user
        const { data: account } = await supabase
            .schema('api' as any)
            .from('v1_account_memberships')
            .select('account_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

        if (account?.account_id) {
            // Prefetch the organizer metrics RPC for 30 days
            await queryClient.prefetchQuery({
                queryKey: ['organizer-performance-metrics', account.account_id, '30'],
                queryFn: async () => {
                    const { data: metrics, error } = await supabase.schema('api').rpc('get_organizer_performance_metrics', {
                        p_account_id: account.account_id,
                        p_days: 30
                    });
                    if (error) throw error;
                    return (metrics as AnalyticsData | null) || { insights: [], timeSeries: [] };
                }
            });
        }
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <AnalyticsClient />
        </HydrationBoundary>
    );
}
