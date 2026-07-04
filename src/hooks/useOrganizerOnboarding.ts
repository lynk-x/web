"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getErrorMessage } from '@/utils/error';

export interface OrganizerOnboardingStatus {
    account_details_complete: boolean;
    kyc_status: string;
    wallet_exists: boolean;
    can_create_paid_events: boolean;
}

export function useOrganizerOnboarding(accountId: string | undefined) {
    const [status, setStatus] = useState<OrganizerOnboardingStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = useMemo(() => createClient(), []);

    const refetch = useCallback(async () => {
        if (!accountId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .schema('api')
                .rpc('get_organizer_onboarding_status', { p_account_id: accountId });

            if (error) throw error;
            setStatus(data as OrganizerOnboardingStatus);
            setError(null);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to load onboarding status');
        } finally {
            setIsLoading(false);
        }
    }, [accountId, supabase]);

    useEffect(() => { refetch(); }, [refetch]);

    return { status, isLoading, error, refetch };
}
