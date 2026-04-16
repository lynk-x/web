import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Hosting Guide | Lynk-X',
    description: 'Step-by-step guide to hosting events and running ad campaigns on the Lynk-X platform.',
};

export default async function HostingGuidePage() {
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', '/resources/guide')
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
