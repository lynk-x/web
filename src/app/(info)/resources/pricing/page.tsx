import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing & Fees | Lynk-X',
    description: 'Transparent pricing for Lynk-X event ticketing — commissions, payment processing fees, and payout schedules.',
};

export default async function PricingFeesPage() {
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', '/resources/pricing')
        .eq('status', 'published')
        .single();

    if (!page) {
        notFound();
    }

    return (
        <ResourceRenderer 
            title={page.title} 
            info={page.info as any} 
        />
    );
}
