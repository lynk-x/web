import { createClient } from '@/utils/supabase/server';
import HomeLayout from "@/components/public/HomeLayout";
import CookieConsentManager from "@/components/public/CookieConsentManager";
import CmsRenderer from '@/components/shared/CmsRenderer/CmsRenderer';

export default async function CookiePolicyPage() {
    const supabase = await createClient();

    const { data: doc } = await supabase
        .from('legal_documents')
        .select('*')
        .eq('type', 'privacy_policy') // Fallback to privacy_policy as cookie_policy enum is missing
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
                    <CmsRenderer content={content} />

                    <div style={{
                        marginTop: '48px',
                        padding: '32px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-xl)',
                        border: '1px solid var(--color-interface-outline)'
                    }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Your Cookie Preferences</h3>
                        <p style={{ fontSize: '15px', opacity: 0.6, marginBottom: '24px', lineHeight: '1.5' }}>
                            You can manage your consent preferences for non-essential cookies below. Essential cookies are always active.
                        </p>

                        <CookieConsentManager />
                    </div>
                </div>
            </div>
        </HomeLayout>
    );
}
