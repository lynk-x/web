import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import ContactForm from '@/components/public/ContactForm/ContactForm';
import { notFound } from 'next/navigation';
import type { Metadata, ResolvingMetadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('title, content')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (!page) {
        return {
            title: 'Page Not Found | Lynk-X',
        };
    }

    return {
        title: `${page.title} | Lynk-X`,
        description: (page.content as any)?.description || `Learn more about ${page.title} on Lynk-X.`,
    };
}

export default async function ResourcePage({ params }: Props) {
    const { slug } = await params;
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

    if (!page) {
        notFound();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            <ResourceRenderer 
                title={page.title} 
                info={page.content as any} 
            />
        </div>
    );
}
