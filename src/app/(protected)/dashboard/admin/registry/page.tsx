"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '../page.module.css';
import TagLibraryTab from '@/components/admin/registry/TagLibraryTab';
import MappingTab from '@/components/admin/registry/MappingTab';
import DisclaimerTable from '@/components/admin/regions/DisclaimerTable';
import Tabs from '@/components/dashboard/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';

type Tab = 'tags' | 'types' | 'logic' | 'disclaimer';

function RegistryContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'tags';
    const validTabs: Tab[] = ['tags', 'types', 'logic', 'disclaimer'];
    const [activeTab, setActiveTab] = useState<Tab>(
        (validTabs as string[]).includes(initialTab) ? initialTab as Tab : 'tags'
    );

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && (validTabs as string[]).includes(tab)) {
            setActiveTab(tab as typeof activeTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as Tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Registry &amp; Disclaimers" 
                subtitle="Manage platform taxonomy, tag hierarchies, and event disclaimers." 
            />

            <Tabs
                options={[
                    { id: 'tags', label: 'Tags Registry' },
                    { id: 'types', label: 'Tag Types' },
                    { id: 'logic', label: 'Category Logic' },
                    { id: 'disclaimer', label: 'Disclaimers' }
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {activeTab === 'tags' && <TagLibraryTab forceView="tags" />}
                {activeTab === 'types' && <TagLibraryTab forceView="types" />}
                {activeTab === 'logic' && <MappingTab forceView="category" />}
                {activeTab === 'disclaimer' && <DisclaimerTable />}
            </div>

        </div>
    );
}

export default function AdminRegistryPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Registry...</div>}>
            <RegistryContent />
        </Suspense>
    );
}
