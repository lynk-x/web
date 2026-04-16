import React from 'react';
import { createClient } from '@/utils/supabase/server';
import ResourceRenderer from '@/components/shared/ResourceRenderer/ResourceRenderer';
import ContactForm from '@/components/public/ContactForm/ContactForm';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Help Center | Lynk-X',
    description: 'Get support, find answers to common questions, and contact the Lynk-X team.',
};

export default async function HelpCenterPage() {
    const supabase = await createClient();

    const { data: page } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', '/resources/help')
        .eq('status', 'published')
        .single();

    if (!page) {
        notFound();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            <ResourceRenderer 
                title={page.title} 
                info={page.info as any} 
            />
            
            <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <ContactForm />
            </div>
        </div>
    );
}
