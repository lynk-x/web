import HomeLayout from "@/components/public/HomeLayout";
import { createClient } from '@/utils/supabase/server';
import CmsRenderer from '@/components/shared/CmsRenderer/CmsRenderer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Organizer Agreement | Lynk-X',
    description: 'Review the Lynk-X organizer agreement covering event hosting responsibilities, payment terms, and platform policies for event organizers.',
    openGraph: {
        title: 'Organizer Agreement | Lynk-X',
        description: 'Agreement for event organizers on the Lynk-X platform.',
        type: 'website',
    },
};

export default async function OrganizerAgreementPage() {
    const supabase = await createClient();

    const { data: doc } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('slug', 'organizer_agreement')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    const title = doc?.title || 'Organizer Agreement';
    const content = doc?.content || 'Organizer agreement content is not available at this time.';
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
