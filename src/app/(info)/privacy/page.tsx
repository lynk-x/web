import HomeLayout from "@/components/public/home/HomeLayout";
import Footer from "@/components/public/shared/Footer";
import { createPublicClient } from '@/utils/supabase/public';
import RichTextRenderer from '@/components/shared/RichTextRenderer/RichTextRenderer';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'Learn how Lynk-X collects, uses and protects your personal information when you use our event ticketing and community platform.',
    alternates: {
        canonical: '/privacy',
    },
    openGraph: {
        title: 'Privacy Policy | Lynk-X',
        description: 'Learn how Lynk-X collects, uses and protects your personal information.',
        url: 'https://lynk-x.app/privacy',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X Privacy Policy',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Privacy Policy | Lynk-X',
        description: 'Learn how Lynk-X collects, uses and protects your personal information.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Public Privacy Policy page loaded from active legal documents via ISR.
 */
export default async function PrivacyPage() {
    const supabase = createPublicClient();

    const { data: doc } = await supabase
        .schema('api')
        .from('v1_legal_documents')
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
                    <RichTextRenderer content={content} />
                </div>
            </div>
            <Footer />
        </HomeLayout>
    );
}
