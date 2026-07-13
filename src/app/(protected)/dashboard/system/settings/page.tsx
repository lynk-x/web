"use client";

/**
 * Global System Settings page.
 * Allows platform operators to configure feature flags, payment providers,
 * active regions, and generic system constants in a secure space.
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import adminStyles from '../../admin/page.module.css'; // Leverage utility styles for tabs/chips
import ConfigTab from '@/components/system/settings/ConfigTab';
import FeatureFlagTab from '@/components/system/settings/FeatureFlagTab';
import PaymentProvidersTab from '@/components/system/settings/PaymentProvidersTab';
import RegionsTab from '@/components/system/settings/RegionsTab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import TableToolbar from '@/components/shared/TableToolbar';
import PageHeader from '@/components/dashboard/PageHeader';

type Tab = 'config' | 'feature-flags' | 'regions';

function SystemSettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const initialTab = searchParams.get('tab') as Tab;
    const [activeTab, setActiveTab] = useState<Tab>(
        (initialTab && ['config', 'feature-flags', 'regions'].includes(initialTab))
            ? initialTab
            : 'config'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['config', 'feature-flags', 'regions'].includes(tab)) {
            setActiveTab(tab);
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
            case 'regions': return 'Search supported countries...';
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
        <div className={sharedStyles.container}>
            <PageHeader
                title="Global System Settings"
                subtitle="Configure system-wide parameters, feature flags, gateways, and legal regions."
            />

            <div style={{ marginTop: '24px' }}>
                <TableToolbar
                    searchPlaceholder={getSearchPlaceholder()}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                >
                    {getTabActionLabel() && (
                        <button
                            className={adminStyles.btnPrimary}
                            onClick={() => setTriggerCreate(prev => prev + 1)}
                            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}
                        >
                            {getTabActionLabel()}
                        </button>
                    )}
                </TableToolbar>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className={adminStyles.tabsHeaderRow} style={{ borderBottom: 'none', marginTop: '16px' }}>
                    <TabsList>
                        <TabsTrigger value="config">System Config</TabsTrigger>
                        <TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
                        <TabsTrigger value="regions">Available Regions</TabsTrigger>
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

                <div style={{ marginTop: '24px' }}>
                    <TabsContent value="config">
                        <ConfigTab searchTerm={searchTerm} statusFilter={statusFilter} triggerCreate={triggerCreate} />
                    </TabsContent>
                    <TabsContent value="feature-flags">
                        <FeatureFlagTab searchTerm={searchTerm} triggerCreate={triggerCreate} />
                    </TabsContent>
                    <TabsContent value="regions">
                        <RegionsTab searchTerm={searchTerm} statusFilter={statusFilter} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

export default function SystemSettingsPage() {
    return (
        <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading Settings...</div>}>
            <SystemSettingsContent />
        </Suspense>
    );
}
