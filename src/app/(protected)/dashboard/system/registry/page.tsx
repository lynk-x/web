"use client";

import { useState, useRef, Suspense } from 'react';
import adminStyles from '../page.module.css';
import TagLibraryTab, { TagLibraryTabHandle } from '@/components/system/registry/TagLibraryTab';
import MappingTab, { MappingTabHandle } from '@/components/system/registry/MappingTab';
import DisclaimerTable, { DisclaimerTableHandle } from '@/components/system/regions/DisclaimerTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import PageHeader from '@/components/dashboard/PageHeader';
import TableToolbar from '@/components/shared/TableToolbar';
import { useUrlTab } from '@/hooks/useUrlTab';

type RegistryTab = 'disclaimer' | 'tags' | 'types' | 'logic';

function RegistryContent() {
    const [activeTab, handleTabChange] = useUrlTab('tab', 'disclaimer', {
        validValues: ['disclaimer', 'tags', 'types', 'logic']
    }) as [RegistryTab, (value: RegistryTab) => void];
    const [searchTerm, setSearchTerm] = useState('');

    const disclaimerRef = useRef<DisclaimerTableHandle>(null);
    const tagsRef = useRef<TagLibraryTabHandle>(null);
    const typesRef = useRef<TagLibraryTabHandle>(null);
    const logicRef = useRef<MappingTabHandle>(null);

    return (
        <div className={adminStyles.container}>
            <PageHeader 
                title="Registry & Disclaimers" 
                subtitle="Manage platform taxonomy, tag hierarchies and event disclaimers." 
            />

            <TableToolbar 
                searchPlaceholder="Search tags, types, or disclaimers..." 
                searchValue={searchTerm} 
                onSearchChange={setSearchTerm} 
            />

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id as RegistryTab)} className={adminStyles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="disclaimer">Disclaimers</TabsTrigger>
                        <TabsTrigger value="tags">Tags Registry</TabsTrigger>
                        <TabsTrigger value="types">Tag Types</TabsTrigger>
                        <TabsTrigger value="logic">Category Logic</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'disclaimer' && (
                            <button className={adminStyles.btnPrimary} onClick={() => disclaimerRef.current?.openCreate()}>
                                + New Disclaimer
                            </button>
                        )}
                        {activeTab === 'tags' && (
                            <button className={adminStyles.btnPrimary} onClick={() => tagsRef.current?.openCreate()}>
                                + Add Tag
                            </button>
                        )}
                        {activeTab === 'types' && (
                            <button className={adminStyles.btnPrimary} onClick={() => typesRef.current?.openCreate()}>
                                + New Type
                            </button>
                        )}
                        {activeTab === 'logic' && (
                            <button className={adminStyles.btnPrimary} onClick={() => logicRef.current?.openCreate()}>
                                + Create Mapping
                            </button>
                        )}
                    </div>
                </div>

                <TabsContent value="disclaimer">
                    <DisclaimerTable ref={disclaimerRef} hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="tags">
                    <TagLibraryTab ref={tagsRef} forceView="tags" hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="types">
                    <TagLibraryTab ref={typesRef} forceView="types" hideToolbar searchTerm={searchTerm} />
                </TabsContent>

                <TabsContent value="logic">
                    <MappingTab ref={logicRef} forceView="category" hideToolbar searchTerm={searchTerm} />
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
