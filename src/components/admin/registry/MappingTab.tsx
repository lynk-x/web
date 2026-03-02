"use client";

import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';
import adminStyles from '@/app/dashboard/admin/page.module.css';
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

interface EventMapping {
    id: string;
    event_id: string;
    tag_id: string;
    event_title: string;
    tag_name: string;
}

export default function MappingTab() {
    const { showToast } = useToast();
    const router = useRouter();
    const supabase = createClient();

    const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([]);
    const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSubTab, setActiveSubTab] = useState<'category' | 'event'>('category');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMappings = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeSubTab === 'category') {
                const { data, error } = await supabase
                    .from('category_tags')
                    .select(`
                        category_id,
                        tag_id,
                        event_categories(name),
                        tags(name)
                    `);

                if (error) throw error;

                const mapped = (data || []).map((m: any) => ({
                    id: `${m.category_id}-${m.tag_id}`,
                    category_id: m.category_id,
                    tag_id: m.tag_id,
                    category_name: m.event_categories?.name || m.category_id,
                    tag_name: m.tags?.name || 'Unknown Tag'
                }));
                setCategoryMappings(mapped);
            } else {
                const { data, error } = await supabase
                    .from('event_tags')
                    .select(`
                        event_id,
                        tag_id,
                        events(title),
                        tags(name)
                    `)
                    .limit(50);

                if (error) throw error;

                const mapped = (data || []).map((m: any) => ({
                    id: `${m.event_id}-${m.tag_id}`,
                    event_id: m.event_id,
                    tag_id: m.tag_id,
                    event_title: m.events?.title || 'Unknown Event',
                    tag_name: m.tags?.name || 'Unknown Tag'
                }));
                setEventMappings(mapped);
            }
        } catch (error: any) {
            console.error("Fetch error:", error);
            showToast(`Error fetching mappings: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [supabase, activeSubTab, showToast]);

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

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
            variant: 'danger',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => showToast('Removal coming soon', 'info'),
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={() => setActiveSubTab('category')}
                    style={{
                        padding: '8px 4px',
                        background: 'none',
                        border: 'none',
                        color: activeSubTab === 'category' ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.5)',
                        borderBottom: activeSubTab === 'category' ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    Category Logic
                </button>
                <button
                    onClick={() => setActiveSubTab('event')}
                    style={{
                        padding: '8px 4px',
                        background: 'none',
                        border: 'none',
                        color: activeSubTab === 'event' ? 'var(--color-brand-primary)' : 'rgba(255,255,255,0.5)',
                        borderBottom: activeSubTab === 'event' ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    Event Mappings
                </button>
            </div>

            <TableToolbar
                searchPlaceholder={`Search ${activeSubTab === 'category' ? 'categories' : 'events'}...`}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
            >
                <button className={adminStyles.btnPrimary} onClick={() => router.push('/dashboard/admin/registry/mappings/create')}>
                    Create Mapping
                </button>
            </TableToolbar>

            {activeSubTab === 'category' ? (
                <DataTable<any>
                    data={categoryMappings}
                    columns={catColumns}
                    getActions={getActions}
                    isLoading={isLoading}
                    emptyMessage="No category mappings found."
                />
            ) : (
                <DataTable<any>
                    data={eventMappings}
                    columns={eventColumns}
                    getActions={getActions}
                    isLoading={isLoading}
                    emptyMessage="No event mappings found."
                />
            )}
        </div>
    );
}
