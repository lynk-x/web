import HomeLayout from "@/components/public/HomeLayout";
import LynkXFooter from "@/components/public/LynkXFooter";
import { createPublicClient } from '@/utils/supabase/public';
import RichTextRenderer from '@/components/shared/RichTextRenderer/RichTextRenderer';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Terms & Conditions',
    description: 'Read the terms and conditions governing use of the Lynk-X event ticketing platform, including organizer obligations and attendee rights.',
    alternates: {
        canonical: '/terms',
    },
    openGraph: {
        title: 'Terms & Conditions | Lynk-X',
        description: 'Terms and conditions for using the Lynk-X platform.',
        url: 'https://lynk-x.app/terms',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X Terms & Conditions',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Terms & Conditions | Lynk-X',
        description: 'Terms and conditions for using the Lynk-X platform.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Public Terms & Conditions page loaded from active legal documents via ISR.
 */
export default async function TermsPage() {
    const supabase = createPublicClient();

    const { data: doc } = await supabase
        .schema('api')
        .from('v1_legal_documents')
        .select('*')
        .eq('slug', 'terms_of_service')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    const title = doc?.title || 'Terms & Conditions';
    const content = doc?.content || 'Terms of service content is not available at this time.';
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
                    <RichTextRenderer content={content} />
                </div>
            </div>
            <LynkXFooter />
        </HomeLayout>
    );
}
