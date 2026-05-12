"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/(protected)/dashboard/admin/page.module.css';
import { createClient } from '@/utils/supabase/client';
import Badge from '@/components/shared/Badge';
import { useRouter } from 'next/navigation';
import type { ActionItem } from '@/types/shared';

interface CategoryMapping {
    id: string;
    category_id: string;
    tag_id: string;
    category_name: string;
    tag_name: string;
}

interface MappingTabProps {
    forceView?: 'category' | 'event';
    hideToolbar?: boolean;
    searchTerm?: string;
}

interface EventMapping {
    id: string;
    event_id: string;
    tag_id: string;
    event_title: string;
    tag_name: string;
}

export default function MappingTab({ forceView, hideToolbar, searchTerm: externalSearchTerm }: MappingTabProps) {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();

    const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
    const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const activeSubTab = forceView || 'category';
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
    const setSearchTerm = externalSearchTerm !== undefined ? () => {} : setInternalSearchTerm;
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeSubTab]);

    const fetchMappings = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_registry_data', {
                p_tab: activeSubTab === 'category' ? 'mappings_category' : 'mappings_event'
            });

            if (error) throw error;
            
            if (activeSubTab === 'category') {
                const mapped = (data || []).map((m: any) => ({
                    id: `${m.category_id}-${m.tag_id}`,
                    category_id: m.category_id,
                    tag_id: m.tag_id,
                    category_name: m.category_name || m.category_id,
                    tag_name: m.tag_name || 'Unknown Tag'
                }));
                setCategoryMappings(mapped);
            } else {
                const mapped = (data || []).map((m: any) => ({
                    id: `${m.event_id}-${m.tag_id}`,
                    event_id: m.event_id,
                    tag_id: m.tag_id,
                    event_title: m.event_title || 'Unknown Event',
                    tag_name: m.tag_name || 'Unknown Tag'
                }));
                setEventMappings(mapped);
            }
        } catch (error: unknown) {
            showToast(getErrorMessage(error) || "Failed to synchronize tag mappings.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, activeSubTab, showToast]);

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    const filteredCategory = categoryMappings.filter(m => 
        m.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const paginatedCategory = filteredCategory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalCatPages = Math.ceil(filteredCategory.length / itemsPerPage);

    const filteredEvent = eventMappings.filter(m => 
        m.event_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const paginatedEvent = filteredEvent.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalEventPages = Math.ceil(filteredEvent.length / itemsPerPage);

    const catColumns: Column<CategoryMapping>[] = [
        {
            header: 'Category',
            render: (m) => <div style={{ fontWeight: 600 }}>{m.category_name}</div>
        },
        {
            header: 'Associated Tag',
            render: (m) => <Badge label={m.tag_name} variant="info" />
        },
        {
            header: 'Mapping ID',
            render: (m) => <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{m.id}</div>
        }
    ];

    const eventColumns: Column<EventMapping>[] = [
        {
            header: 'Event Title',
            render: (m) => <div style={{ fontWeight: 600 }}>{m.event_title}</div>
        },
        {
            header: 'Tag',
            render: (m) => <Badge label={m.tag_name} variant="success" />
        },
        {
            header: 'Event ID',
            render: (m) => <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace' }}>{m.event_id}</div>
        }
    ];

    const getActions = (item: any): ActionItem[] => [
        {
            label: 'Remove Mapping',
            variant: 'danger' as const,
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => showToast('Removal coming soon', 'info'),
        }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {!hideToolbar && (
                <TableToolbar
                    searchPlaceholder={`Search ${activeSubTab === 'category' ? 'categories' : 'events'}...`}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                >
                    <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/mappings/create')}>
                        Create Mapping
                    </button>
                </TableToolbar>
            )}

            {activeSubTab === 'category' ? (
                <DataTable<any>
                    data={paginatedCategory}
                    columns={catColumns}
                    getActions={getActions}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    totalPages={totalCatPages}
                    onPageChange={setCurrentPage}
                    emptyMessage="No category mappings found."
                />
            ) : (
                <DataTable<any>
                    data={paginatedEvent}
                    columns={eventColumns}
                    getActions={getActions}
                    isLoading={isLoading}
                    currentPage={currentPage}
                    totalPages={totalEventPages}
                    onPageChange={setCurrentPage}
                    emptyMessage="No event mappings found."
                />
            )}
        </div>
    );
}
