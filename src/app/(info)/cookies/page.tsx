import { createPublicClient } from '@/utils/supabase/public';
import HomeLayout from "@/components/public/home/HomeLayout";
import Footer from "@/components/public/shared/Footer";
import CookieConsentManager from "@/components/public/modals/CookieConsentManager";
import RichTextRenderer from '@/components/shared/RichTextRenderer/RichTextRenderer';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Cookie Policy',
    description: 'Understand how Lynk-X uses cookies and manage your cookie preferences for analytics and personalisation.',
    alternates: {
        canonical: '/cookies',
    },
    openGraph: {
        title: 'Cookie Policy | Lynk-X',
        description: 'Manage your cookie preferences on Lynk-X.',
        url: 'https://lynk-x.app/cookies',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X Cookie Policy',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Cookie Policy | Lynk-X',
        description: 'Manage your cookie preferences on Lynk-X.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Public Cookie Policy page loaded from active legal documents via ISR,
 * paired with interactive cookie consent controls.
 */
export default async function CookiePolicyPage() {
    const supabase = createPublicClient();

    const { data: doc } = await supabase
        .schema('api')
        .from('v1_legal_documents')
        .select('*')
        .eq('slug', 'cookie_policy')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    const title = doc?.title || 'Cookie Policy';
    const content = doc?.content || 'Cookie policy content is not available at this time.';
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

                    <div style={{
                        marginTop: '48px',
                        padding: '32px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-interface-outline)'
                    }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Your Cookie Preferences</h2>
                        <p style={{ fontSize: '15px', opacity: 0.6, marginBottom: '24px', lineHeight: '1.5' }}>
                            You can manage your consent preferences for non-essential cookies below. Essential cookies are always active.
                        </p>

                        <CookieConsentManager />
                    </div>
                </div>
            </div>
            <Footer />
        </HomeLayout>
    );
}
