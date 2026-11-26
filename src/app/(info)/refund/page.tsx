import HomeLayout from "@/components/public/HomeLayout";
import LynkXFooter from "@/components/public/LynkXFooter";
import { createPublicClient } from '@/utils/supabase/public';
import RichTextRenderer from '@/components/shared/RichTextRenderer/RichTextRenderer';
import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
    title: 'Refund Policy',
    description: 'Understand the Lynk-X refund policy for ticket purchases, including eligibility windows, cancellation rules and how to request a refund.',
    alternates: {
        canonical: '/refund',
    },
    openGraph: {
        title: 'Refund Policy | Lynk-X',
        description: 'Refund policy for ticket purchases on Lynk-X.',
        url: 'https://lynk-x.app/refund',
        siteName: 'Lynk-X',
        locale: 'en_GB',
        images: [
            {
                url: '/og-image.png?v=2',
                width: 1200,
                height: 630,
                alt: 'Lynk-X Refund Policy',
                type: 'image/png',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Refund Policy | Lynk-X',
        description: 'Refund policy for ticket purchases on Lynk-X.',
        site: '@lynkxapp',
        creator: '@lynkxapp',
        images: ['/og-image.png?v=2'],
    },
};

/**
 * Public Refund Policy page loaded from active legal documents via ISR.
 */
export default async function RefundPolicyPage() {
    const supabase = createPublicClient();

    const { data: doc } = await supabase
        .schema('api')
        .from('v1_legal_documents')
        .select('*')
        .eq('slug', 'refund_policy')
        .eq('is_active', true)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

    const title = doc?.title || 'Refund Policy';
    const content = doc?.content || 'Refund policy content is not available at this time.';
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
