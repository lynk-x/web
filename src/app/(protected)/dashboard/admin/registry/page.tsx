"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import adminStyles from '../page.module.css';
import TagLibraryTab from '@/components/admin/registry/TagLibraryTab';
import MappingTab from '@/components/admin/registry/MappingTab';
import DisclaimerTable from '@/components/admin/regions/DisclaimerTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';

type RegistryTab = 'tags' | 'types' | 'logic' | 'disclaimer';

function RegistryContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const initialTab = (searchParams.get('tab') as string) || 'tags';
    const validTabs: RegistryTab[] = ['tags', 'types', 'logic', 'disclaimer'];
    const [activeTab, setActiveTab] = useState<RegistryTab>(
        validTabs.includes(initialTab as RegistryTab) ? initialTab as RegistryTab : 'tags'
    );
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const tab = searchParams.get('tab') as string;
        if (tab && validTabs.includes(tab as RegistryTab)) {
            setActiveTab(tab as RegistryTab);
        }
    }, [searchParams]);

    const handleTabChange = (newTab: string) => {
        const tab = newTab as RegistryTab;
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', newTab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Registry & Disclaimers" 
                subtitle="Manage platform taxonomy, tag hierarchies and event disclaimers." 
            />

            <div style={{ width: '100%', margin: 'var(--spacing-lg) 0' }}>
                <TableToolbar 
                    searchPlaceholder="Search tags, types, or disclaimers..." 
                    searchValue={searchTerm} 
                    onSearchChange={setSearchTerm} 
                />
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className={adminStyles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="tags">Tags Registry</TabsTrigger>
                        <TabsTrigger value="types">Tag Types</TabsTrigger>
                        <TabsTrigger value="logic">Category Logic</TabsTrigger>
                        <TabsTrigger value="disclaimer">Disclaimers</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'tags' && (
                            <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/tags/create')}>
                                + Add Tag
                            </button>
                        )}
                        {activeTab === 'types' && (
                            <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/types/create')}>
                                + New Type
                            </button>
                        )}
                        {activeTab === 'logic' && (
                            <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/mappings/create')}>
                                + Create Mapping
                            </button>
                        )}
                        {activeTab === 'disclaimer' && (
                            <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/disclaimers/create')}>
                                + New Disclaimer
                            </button>
                        )}
                    </div>
                </div>

                <TabsContent value="tags">
                    <TagLibraryTab forceView="tags" hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="types">
                    <TagLibraryTab forceView="types" hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="logic">
                    <MappingTab forceView="category" hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="disclaimer">
                    <DisclaimerTable hideToolbar searchTerm={searchTerm} />
                </TabsContent>
            </Tabs>
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
