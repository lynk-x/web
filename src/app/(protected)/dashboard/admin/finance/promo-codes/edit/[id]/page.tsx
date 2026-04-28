"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PromoCodeForm, { PromoCodeFormData } from '@/components/admin/finance/PromoCodeForm';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';

export default function EditPromoCodePage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const [initialData, setInitialData] = useState<PromoCodeFormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const id = params.id as string;

    useEffect(() => {
        const fetchPromoCode = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('promo_codes')
                    .select(`
                        *,
                        event_promos(event_id)
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Promo code not found');

                // Get the first event ID from the junction table if it exists
                const eventId = data.event_promos && (data.event_promos as any[]).length > 0 
                    ? (data.event_promos[0] as any).event_id 
                    : undefined;

                setInitialData({
                    id: data.id,
                    event_id: eventId,
                    code: data.code,
                    type: data.type,
                    value: parseFloat(data.value),
                    max_uses: data.max_uses,
                    one_per_user: data.one_per_user,
                    valid_from: data.valid_from,
                    valid_until: data.valid_until,
                    is_active: data.is_active,
                });
            } catch (err: any) {
                showToast(err.message || 'Failed to load promo code.', 'error');
                router.push('/dashboard/admin/finance?tab=promo-codes');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPromoCode();
    }, [id, supabase, router, showToast]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center', opacity: 0.6 }}>Loading promo code details...</div>
            </div>
        );
    }

    if (!initialData) return null;

    return (
        <div className={adminStyles.container}>
            <SubPageHeader 
                title={`Edit Code: ${initialData.code}`}
                subtitle="Modify discount values, usage limits, or validity periods."
            />
            <PromoCodeForm initialData={initialData} isEditing={true} />
        </div>
    );
}
