"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import { useOrganization } from '@/context/OrganizationContext';
import { formatNumber } from '@/utils/format';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import Spinner from '@/components/shared/Spinner';
import EmptyState from '@/components/shared/EmptyState';

interface CountryReach {
    country_code: string;
    reach: number;
}

interface DemographicReach {
    age_bucket: string;
    gender: string;
    reach: number;
}

const GENDER_LABELS: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
    unknown: 'Unknown',
};

const AGE_BUCKET_ORDER = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+', 'Unknown'];

let regionNames: Intl.DisplayNames | null = null;
function countryLabel(code: string): string {
    if (code === 'Unknown') return code;
    try {
        regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
        return regionNames.of(code) || code;
    } catch {
        return code;
    }
}

export default function CampaignAudiencePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [campaignTitle, setCampaignTitle] = useState('');
    const [countryReach, setCountryReach] = useState<CountryReach[]>([]);
    const [demographicReach, setDemographicReach] = useState<DemographicReach[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAudience = useCallback(async () => {
        if (!id || !activeAccount) return;
        setIsLoading(true);
        try {
            const [campRes, countryRes, demoRes] = await Promise.all([
                supabase.schema('api').from('v1_ad_campaigns').select('title').eq('id', id).eq('account_id', activeAccount.id).maybeSingle(),
                supabase.schema('api').rpc('get_campaign_audience_by_country', { p_account_id: activeAccount.id, p_campaign_id: id }),
                supabase.schema('api').rpc('get_campaign_audience_by_demographic', { p_account_id: activeAccount.id, p_campaign_id: id }),
            ]);

            if (!campRes.data) {
                showToast('Campaign not found or access denied.', 'error');
                router.push('/dashboard/ads/campaigns');
                return;
            }
            if (countryRes.error) throw countryRes.error;
            if (demoRes.error) throw demoRes.error;

            setCampaignTitle(campRes.data.title);
            setCountryReach((countryRes.data || []) as CountryReach[]);
            setDemographicReach((demoRes.data || []) as DemographicReach[]);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to load audience data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [id, activeAccount, supabase, showToast, router]);

    useEffect(() => { fetchAudience(); }, [fetchAudience]);

    if (isLoading) {
        return (
            <div className={adminStyles.container}>
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Spinner label="Loading audience data..." />
                </div>
            </div>
        );
    }

    const totalReach = countryReach.reduce((sum, r) => sum + r.reach, 0);
    const maxCountryReach = Math.max(1, ...countryReach.map(r => r.reach));

    // Fold the per-(age_bucket, gender) rows into a per-age-bucket total and a
    // per-gender total — two separate breakdowns shown side by side, rather
    // than a full age-by-gender grid which would be sparse for most campaigns.
    const byAgeBucket = new Map<string, number>();
    const byGender = new Map<string, number>();
    for (const row of demographicReach) {
        byAgeBucket.set(row.age_bucket, (byAgeBucket.get(row.age_bucket) || 0) + row.reach);
        byGender.set(row.gender, (byGender.get(row.gender) || 0) + row.reach);
    }
    const ageRows = AGE_BUCKET_ORDER
        .filter(bucket => byAgeBucket.has(bucket))
        .map(bucket => ({ label: bucket, reach: byAgeBucket.get(bucket)! }));
    const genderRows = Array.from(byGender.entries())
        .map(([gender, reach]) => ({ label: GENDER_LABELS[gender] || gender, reach }))
        .sort((a, b) => b.reach - a.reach);
    const maxAgeReach = Math.max(1, ...ageRows.map(r => r.reach));
    const maxGenderReach = Math.max(1, ...genderRows.map(r => r.reach));

    return (
        <div className={adminStyles.container}>
            <PageHeader
                title="Audience Insights"
                subtitle={campaignTitle}
                closeHref={`/dashboard/ads/campaigns/${id}`}
            />

            {totalReach === 0 ? (
                <EmptyState message="No impressions recorded yet for this campaign. Audience data will appear here once your ads start delivering." />
            ) : (
                <>
                    {/* Reach by Country */}
                    <div className={adminStyles.pageCard} style={{ marginBottom: '24px' }}>
                        <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Reach by Country</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {countryReach.map(row => (
                                <BreakdownBar
                                    key={row.country_code}
                                    label={countryLabel(row.country_code)}
                                    reach={row.reach}
                                    total={totalReach}
                                    maxReach={maxCountryReach}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Reach by Age & Gender */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Reach by Age</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {ageRows.map(row => (
                                    <BreakdownBar key={row.label} label={row.label} reach={row.reach} total={totalReach} maxReach={maxAgeReach} />
                                ))}
                            </div>
                        </div>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle} style={{ marginBottom: '20px' }}>Reach by Gender</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {genderRows.map(row => (
                                    <BreakdownBar key={row.label} label={row.label} reach={row.reach} total={totalReach} maxReach={maxGenderReach} />
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────

function BreakdownBar({ label, reach, total, maxReach }: { label: string; reach: number; total: number; maxReach: number }) {
    const pct = total > 0 ? ((reach / total) * 100).toFixed(1) : '0';
    const barWidth = (reach / maxReach) * 100;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ opacity: 0.6 }}>{formatNumber(reach)} &middot; {pct}%</span>
            </div>
            <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: '4px', background: 'var(--color-brand-primary)' }} />
            </div>
        </div>
    );
}
