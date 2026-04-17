import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Safety & Security | Lynk-X',
    description: 'Learn about Lynk-X safety protocols for organizers and attendees, including venue security and incident reporting.',
};

export default async function SafetySecurityPage() {
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', '/resources/safety')
        .eq('status', 'published')
        .single();

    if (!page) {
        notFound();
    }

    return (
        <ResourceRenderer 
            title={page.title} 
            info={page.content as any} 
        />
    );
}
