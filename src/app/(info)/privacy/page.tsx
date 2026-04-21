import Link from 'next/link';
import HomeLayout from "@/components/public/HomeLayout";
import { createClient } from '@/utils/supabase/server';
import CmsRenderer from '@/components/shared/CmsRenderer/CmsRenderer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | Lynk-X',
    description: 'Learn how Lynk-X collects, uses, and protects your personal information when you use our event ticketing and social platform.',
    openGraph: {
        title: 'Privacy Policy | Lynk-X',
        description: 'Learn how Lynk-X collects, uses, and protects your personal information.',
        type: 'website',
    },
};

export default async function PrivacyPage() {
    const supabase = await createClient();

    const { data: doc } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('slug', 'privacy_policy')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    const title = doc?.title || 'Privacy Policy';
    const content = doc?.content || 'Privacy policy content is not available at this time.';
    const lastUpdated = doc?.updated_at ? new Date(doc.updated_at).toLocaleDateString() : new Date().toLocaleDateString();

    return (
        <HomeLayout hideCart={true} showBack={true}>
            <div style={{
                maxWidth: '800px',
                margin: '0 auto',
                padding: '40px 20px',
                color: 'var(--color-utility-primaryText)',
                position: 'relative'
            }}>
                <h1 style={{
                    fontSize: '42px',
                    fontFamily: 'var(--font-heading)',
                    marginBottom: '8px',
                    textAlign: 'center',
                    fontWeight: 800
                }}>{title}</h1>
                <p style={{
                    marginBottom: '40px',
                    opacity: 0.5,
                    textAlign: 'center',
                    fontSize: '14px'
                }}>Last updated: {lastUpdated}</p>

                <div style={{
                    background: 'var(--color-interface-surface)',
                    padding: '48px',
                    borderRadius: 'var(--radius-2xl)',
                    border: '1px solid var(--color-interface-outline)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                    <CmsRenderer content={content} />
                </div>
            </div>
        </HomeLayout>
    );
}
