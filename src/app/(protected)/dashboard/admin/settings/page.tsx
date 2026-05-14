"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '../page.module.css';
import ConfigTab from '@/components/admin/settings/ConfigTab';
import FeatureFlagTab from '@/components/admin/settings/FeatureFlagTab';
import PaymentProvidersTab from '@/components/admin/settings/PaymentProvidersTab';
import RegionsTab from '@/components/admin/settings/RegionsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import TableToolbar from '@/components/shared/TableToolbar';

type Tab = 'config' | 'feature-flags' | 'payment-providers' | 'regions';

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = searchParams.get('tab') as Tab;
    const [activeTab, setActiveTab] = useState<Tab>(
        (initialTab && ['config', 'feature-flags', 'payment-providers', 'regions'].includes(initialTab))
            ? initialTab
            : 'config'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['config', 'feature-flags', 'payment-providers', 'regions'].includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [triggerCreate, setTriggerCreate] = useState(0);

    const getSearchPlaceholder = () => {
        switch (activeTab) {
            case 'config': return 'Search configurations...';
            case 'feature-flags': return 'Search feature flags...';
            case 'payment-providers': return 'Search providers...';
            case 'regions': return 'Search regions...';
            default: return 'Search...';
        }
    };

    const getTabActionLabel = () => {
        switch (activeTab) {
            case 'config': return 'Add Config';
            case 'feature-flags': return 'Create Flag';
            default: return null;
        }
    };

    return (
        <div className={adminStyles.container}>
            <header className={adminStyles.header}>
                <div>
                    <h1 className={adminStyles.title}>Platform Settings</h1>
                    <p className={adminStyles.subtitle}>Manage global configurations and feature rollouts.</p>
                </div>
            </header>

            <TableToolbar
                searchPlaceholder={getSearchPlaceholder()}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                {getTabActionLabel() && (
                    <button
                        className={adminStyles.btnPrimary}
                        onClick={() => setTriggerCreate(prev => prev + 1)}
                    >
                        {getTabActionLabel()}
                    </button>
                )}
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none' }}>
                    <TabsList>
                        <TabsTrigger value="config">System Config</TabsTrigger>
                        <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
                        <TabsTrigger value="payment-providers">Payment Providers</TabsTrigger>
                        <TabsTrigger value="regions">Supported Regions</TabsTrigger>
                    </TabsList>

                    {['config', 'regions'].includes(activeTab) && (
                        <div className={adminStyles.filterGroup} style={{ marginBottom: 0 }}>
                            {[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map(({ value, label }) => (
                                <button
                                    key={value}
                                    className={`${adminStyles.chip} ${statusFilter === value ? adminStyles.chipActive : ''}`}
                                    onClick={() => setStatusFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <TabsContent value="config">
                    <ConfigTab searchTerm={searchTerm} statusFilter={statusFilter} triggerCreate={triggerCreate} />
                </TabsContent>
                <TabsContent value="feature-flags">
                    <FeatureFlagTab searchTerm={searchTerm} triggerCreate={triggerCreate} />
                </TabsContent>
                <TabsContent value="payment-providers">
                    <PaymentProvidersTab searchTerm={searchTerm} />
                </TabsContent>
                <TabsContent value="regions">
                    <RegionsTab searchTerm={searchTerm} statusFilter={statusFilter} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function AdminSettingsPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
