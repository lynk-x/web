"use client";

/**
 * Operational Proxy console.
 * Allows global system administrators to query territory-specific metrics and audit
 * active records across any supported jurisdiction.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import adminStyles from '../page.module.css';
import styles from './page.module.css';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import { useRouter } from 'next/navigation';
import Badge from '@/components/shared/Badge';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';

interface CountryItem {
    code: string;
    display_name: string;
    currency: string;
    region: string;
    status: string;
}

interface RegionalStats {
    totalAccounts: number;
    organizersCount: number;
    advertisersCount: number;
    totalEvents: number;
    liveEvents: number;
}

function OperationalProxyContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [countries, setCountries] = useState<CountryItem[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [isLoadingCountries, setIsLoadingCountries] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const [stats, setStats] = useState<RegionalStats>({
        totalAccounts: 0,
        organizersCount: 0,
        advertisersCount: 0,
        totalEvents: 0,
        liveEvents: 0
    });

    const [recentLogs, setRecentLogs] = useState<any[]>([]);

    // 1. Fetch supported countries
    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoadingCountries(true);
            try {
                const { data, error } = await supabase
                    .from('countries')
                    .select('code, display_name, currency, region, status')
                    .order('display_name');
                
                if (error) throw error;
                if (data && data.length > 0) {
                    setCountries(data);
                    // Default to first active country
                    const firstActive = data.find(c => c.status === 'approved') || data[0];
                    setSelectedCountry(firstActive.code);
                }
            } catch (err) {
                showToast(getErrorMessage(err) || 'Failed to load countries', 'error');
            } finally {
                setIsLoadingCountries(false);
            }
        };
        fetchCountries();
    }, [supabase, showToast]);

    // 2. Fetch stats for selected country
    const fetchRegionalData = useCallback(async (countryCode: string) => {
        if (!countryCode) return;
        setIsLoadingStats(true);
        try {
            // A. Fetch Accounts stats in parallel
            const [
                totalAccRes,
                orgAccRes,
                advAccRes,
                totalEvsRes,
                liveEvsRes
            ] = await Promise.all([
                supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('country_code', countryCode),
                supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('country_code', countryCode).eq('type', 'organizer'),
                supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('country_code', countryCode).eq('type', 'advertiser'),
                supabase.from('events').select('id', { count: 'exact', head: true }).eq('country_code', countryCode),
                supabase.from('events').select('id', { count: 'exact', head: true }).eq('country_code', countryCode).eq('status', 'published')
            ]);

            setStats({
                totalAccounts: totalAccRes.count || 0,
                organizersCount: orgAccRes.count || 0,
                advertisersCount: advAccRes.count || 0,
                totalEvents: totalEvsRes.count || 0,
                liveEvents: liveEvsRes.count || 0
            });

            // B. Fetch recent registrations / event additions
            const { data: recAccs } = await supabase
                .from('accounts')
                .select('id, name, type, created_at')
                .eq('country_code', countryCode)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentLogs(recAccs || []);
        } catch (err) {
            console.error('Failed to fetch regional proxy stats:', err);
        } finally {
            setIsLoadingStats(false);
        }
    }, [supabase]);

    useEffect(() => {
        if (selectedCountry) {
            fetchRegionalData(selectedCountry);
        }
    }, [selectedCountry, fetchRegionalData]);

    const activeCountryObj = useMemo(() => {
        return countries.find(c => c.code === selectedCountry);
    }, [countries, selectedCountry]);

    const handleSwitchContext = () => {
        if (!activeCountryObj) return;
        localStorage.setItem('lynks_proxy_country_code', activeCountryObj.code);
        showToast(`Proxy context established: scoped to ${activeCountryObj.display_name} (${activeCountryObj.code})`, 'success');
        router.push('/dashboard/admin');
    };

    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Operational Proxy Console"
                subtitle="Query localized territory metrics, browse regional database states and audit context boundaries."
            />

            {/* Select Country Territory */}
            <div style={{ background: 'var(--color-interface-surface-alt)', border: '1px solid var(--color-interface-border-subtle)', padding: '20px', borderRadius: '12px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Active Scope:</div>
                    {isLoadingCountries ? (
                        <div style={{ opacity: 0.5 }}>Loading Territories...</div>
                    ) : (
                        <select 
                            className={adminStyles.select}
                            style={{ minWidth: '220px', margin: 0 }}
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                        >
                            {countries.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.display_name} ({c.code})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <button className={adminStyles.btnPrimary} onClick={handleSwitchContext} disabled={!selectedCountry}>
                    Override Session Scope
                </button>
            </div>

            {/* Selected Country Details */}
            {activeCountryObj && (
                <div style={{ marginTop: '24px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 className={sharedStyles.sectionTitle} style={{ margin: 0 }}>
                            {activeCountryObj.display_name} Registry Insights
                        </h2>
                        <Badge variant={activeCountryObj.status === 'approved' ? 'success' : 'warning'} label={activeCountryObj.status === 'approved' ? 'Active Territory' : 'Inactive'} />
                    </div>

                    <div className={adminStyles.statsGrid}>
                        <StatCard 
                            label="Total Regional Accounts" 
                            value={stats.totalAccounts} 
                            change="Registrations inside scope"
                            trend="neutral"
                            isLoading={isLoadingStats}
                        />
                        <StatCard 
                            label="Active Organizers" 
                            value={stats.organizersCount} 
                            change="Local merchants"
                            trend="neutral"
                            isLoading={isLoadingStats}
                        />
                        <StatCard 
                            label="Brand Partners" 
                            value={stats.advertisersCount} 
                            change="Active advertisers"
                            trend="neutral"
                            isLoading={isLoadingStats}
                        />
                        <StatCard 
                            label="Total Events" 
                            value={stats.totalEvents} 
                            change={`${stats.liveEvents} currently published`}
                            trend="neutral"
                            isLoading={isLoadingStats}
                        />
                    </div>

                    {/* Regional Logs feed */}
                    <div className={adminStyles.activitySection} style={{ marginTop: '32px' }}>
                        <h2 className={sharedStyles.sectionTitle}>Recent Accounts Registered inside {activeCountryObj.display_name}</h2>
                        <div className={adminStyles.activityFeed} style={{ marginTop: '16px' }}>
                            {isLoadingStats ? (
                                <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>Syncing records...</div>
                            ) : recentLogs.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5, fontSize: '13px' }}>
                                    No accounts registered inside this country jurisdiction.
                                </div>
                            ) : (
                                recentLogs.map((act) => (
                                    <div key={act.id} className={adminStyles.activityItem}>
                                        <div className={adminStyles.activityIcon}>
                                            👤
                                        </div>
                                        <div className={adminStyles.activityContent}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span className={adminStyles.activityText}>{act.name}</span>
                                                <span style={{ fontSize: '12.5px', opacity: 0.7 }}>
                                                    Onboarded as a {act.type} merchant.
                                                </span>
                                            </div>
                                            <span className={adminStyles.activityTime}>
                                                {new Date(act.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function OperationalProxyPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Operational Proxy Console...</div>}>
            <OperationalProxyContent />
        </Suspense>
    );
}
