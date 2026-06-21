"use client";

/**
 * Global Finance Administration page.
 * Manages currency markets, payment network configuration, and subscription plan billing constants.
 */

import { getErrorMessage } from '@/utils/error';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import styles from './page.module.css';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import FXRateTable from '@/components/admin/finance/FXRateTable';
import PaymentProvidersTab from '@/components/admin/settings/PaymentProvidersTab';
import TableToolbar from '@/components/shared/TableToolbar';
import Modal from '@/components/shared/Modal';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import DataTable from '@/components/shared/DataTable';
import Badge from '@/components/shared/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/utils/supabase/client';
import type { FXRate } from '@/types/admin';
import { useDebounce } from '@/hooks/useDebounce';

interface SubscriptionPlan {
    id: string;
    display_name: string;
    description: string;
    product_type: string;
    interval: string;
    status: string;
    created_at: string;
}

function GlobalFinanceContent() {
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'fx-rates');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [fxRates, setFxRates] = useState<FXRate[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isSyncingFX, setIsSyncingFX] = useState(false);

    const debouncedSearch = useDebounce(searchTerm, 300);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', value);
        router.push(`${pathname}?${params.toString()}`);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'fx-rates') {
                const { data, error } = await supabase.schema('api' as any).from('v1_fx_rates').select('*').order('currency');
                if (error) throw error;
                setFxRates(data || []);
            } else if (activeTab === 'billing-constants') {
                const { data, error } = await supabase.from('subscription_plans').select('*').order('display_name');
                if (error) throw error;
                setPlans(data || []);
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, supabase, showToast]);

    useEffect(() => {
        fetchData();
    }, [activeTab, debouncedSearch, fetchData]);

    const handleSyncFX = async () => {
        setIsSyncingFX(true);
        showToast('Syncing with global rates...', 'info');
        try {
            const { error } = await supabase.rpc('sync_fx_rates');
            if (error) throw error;
            showToast('FX rates synchronized successfully.', 'success');
            fetchData();
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'FX sync function not available.', 'error');
        } finally {
            setIsSyncingFX(false);
        }
    };

    // Filter plans based on search
    const filteredPlans = plans.filter(p => 
        p.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const planColumns = [
        {
            header: 'Plan Name',
            render: (plan: SubscriptionPlan) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{plan.display_name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>{plan.id}</div>
                </div>
            )
        },
        {
            header: 'Product Type',
            render: (plan: SubscriptionPlan) => (
                <Badge variant="subtle" label={plan.product_type} />
            )
        },
        {
            header: 'Billing Interval',
            render: (plan: SubscriptionPlan) => (
                <span style={{ textTransform: 'capitalize' }}>{plan.interval}</span>
            )
        },
        {
            header: 'Status',
            render: (plan: SubscriptionPlan) => (
                <Badge variant={plan.status === 'active' ? 'success' : 'warning'} label={plan.status} />
            )
        }
    ];

    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Global Finance"
                subtitle="Configure foreign exchange currency markets, payment networks, and subscription plans."
            />

            <TableToolbar
                searchPlaceholder="Search currency, providers, or plans..."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="fx-rates">FX Markets</TabsTrigger>
                        <TabsTrigger value="payment-providers">Payment Networks</TabsTrigger>
                        <TabsTrigger value="billing-constants">Billing Constants</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'fx-rates' && (
                            <button
                                className={adminStyles.btnSecondary}
                                onClick={handleSyncFX}
                                disabled={isSyncingFX}
                            >
                                <svg className={isSyncingFX ? adminStyles.spinner : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                                    <path d="M23 4v6h-6M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                {isSyncingFX ? 'Syncing...' : 'Sync Live Rates'}
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                    <TabsContent value="fx-rates">
                        <FXRateTable
                            data={fxRates.filter(f => f.currency.toLowerCase().includes(searchTerm.toLowerCase()))}
                            isLoading={isLoading}
                            onUpdate={fetchData}
                        />
                    </TabsContent>

                    <TabsContent value="payment-providers">
                        <PaymentProvidersTab searchTerm={searchTerm} />
                    </TabsContent>

                    <TabsContent value="billing-constants">
                        <div style={{ border: '1px solid var(--color-interface-outline)', borderRadius: '12px', overflow: 'hidden' }}>
                            <DataTable
                                data={filteredPlans}
                                columns={planColumns}
                                isLoading={isLoading}
                                emptyMessage="No subscription plans configured."
                            />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

export default function GlobalFinancePage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Finance...</div>}>
            <GlobalFinanceContent />
        </Suspense>
    );
}
