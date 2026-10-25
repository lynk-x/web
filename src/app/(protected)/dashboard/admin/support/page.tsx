"use client";
import { getErrorMessage } from '@/utils/error';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import styles from './page.module.css';
import adminStyles from '../page.module.css';

import DataTable, { Column } from '@/components/shared/DataTable';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import TableToolbar from '@/components/shared/TableToolbar';
import BulkActionsBar, { BulkAction } from '@/components/shared/BulkActionsBar';
import sharedStyles from '@/components/dashboard/DashboardShared.module.css';
import PageHeader from '@/components/dashboard/PageHeader';
import StatCard from '@/components/dashboard/StatCard';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import FilterChips from '@/components/shared/FilterChips';
import DateRangeRow from '@/components/shared/DateRangeRow';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/shared/Modal';
import { createClient } from '@/utils/supabase/client';
import { useUrlTab } from '@/hooks/useUrlTab';
type SupportTab = 'queue' | 'tickets';

import ReviewQueueTab from '@/components/admin/support/ReviewQueueTab';
import SupportTicketsTab from '@/components/admin/support/SupportTicketsTab';

function SupportContent() {
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, handleTabChange] = useUrlTab('tab', 'tickets', { validValues: ['tickets', 'queue'] }) as [SupportTab, (value: SupportTab) => void];
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newTicket, setNewTicket] = useState({ email: '', subject: '', message: '', priority: 'normal' });
    const [isCreating, setIsCreating] = useState(false);
    const [ticketRefresh, setTicketRefresh] = useState(0);

    // ── Filtering State ───────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
    const [queueStatusFilter, setQueueStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.schema('api').rpc('get_moderation_stat_summary');
            if (!error && data) setSummary(data);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handleCreateTicket = async () => {
        if (!newTicket.email || !newTicket.subject || !newTicket.message) {
            showToast('Email, subject, and message are required.', 'error');
            return;
        }
        setIsCreating(true);
        try {
            const { error } = await supabase.schema('reports').from('support_tickets').insert({
                email: newTicket.email,
                subject: newTicket.subject,
                message: newTicket.message,
                priority: newTicket.priority,
            });
            if (error) throw error;
            showToast('Ticket created', 'success');
            setShowNewTicket(false);
            setNewTicket({ email: '', subject: '', message: '', priority: 'normal' });
            setTicketRefresh(k => k + 1);
        } catch (err: unknown) {
            showToast(getErrorMessage(err) || 'Failed to create ticket', 'error');
        } finally {
            setIsCreating(false);
        }
    };


    return (
        <div className={sharedStyles.container}>
            <PageHeader
                title="Support & Safety"
                subtitle="Platform-wide moderation and user assistance."
                primaryAction={{ label: '+ New Ticket', onClick: () => setShowNewTicket(true) }}
            />

            <div className={sharedStyles.statsGrid}>
                <StatCard
                    label="Pending Reports"
                    value={summary?.total_reports || 0}
                    change="Requires Attention"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Unresolved Moderation"
                    value={summary?.pending || 0}
                    change="Content flagged"
                    trend="negative"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Resolved (30d)"
                    value={summary?.resolved_30d || 0}
                    change="Closed tickets"
                    trend="positive"
                    isLoading={isLoading}
                />
                <StatCard
                    label="Max Toxicity"
                    value={summary?.max_toxicity !== undefined ? `${summary.max_toxicity.toFixed(1)}%` : '—'}
                    change="Community health"
                    trend={(summary?.max_toxicity || 0) < 5 ? "positive" : "negative"}
                    isLoading={isLoading}
                />
            </div>

            <TableToolbar 
                searchPlaceholder="Search reports, feedback, or blocks..." 
                searchValue={searchTerm} 
                onSearchChange={setSearchTerm} 
            >
                <DateRangeRow 
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />
            </TableToolbar>

            <Tabs value={activeTab} onValueChange={(id) => handleTabChange(id as SupportTab)} className={styles.tabsReset}>
                <div className={adminStyles.tabsHeaderRow}>
                    <TabsList>
                        <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
                        <TabsTrigger value="queue">Review Queue</TabsTrigger>
                    </TabsList>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {activeTab === 'tickets' && (
                            <FilterChips
                                options={['all', 'new', 'open', 'waiting_on_user', 'resolved', 'closed'].map(s => ({
                                    value: s,
                                    label: s === 'all' ? 'All' : s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                                }))}
                                currentValue={feedbackStatusFilter}
                                onChange={setFeedbackStatusFilter}
                            />
                        )}
                        {activeTab === 'queue' && (
                            <FilterChips
                                options={['all', 'pending_review', 'approved', 'rejected', 'flagged', 'appealed', 'resolved'].map(s => ({ 
                                    value: s, 
                                    label: s === 'all' ? 'All' : s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
                                }))}
                                currentValue={queueStatusFilter}
                                onChange={setQueueStatusFilter}
                            />
                        )}
                    </div>
                </div>

                <TabsContent value="tickets">
                    <SupportTicketsTab 
                        searchQuery={searchTerm}
                        statusFilter={feedbackStatusFilter}
                        startDate={startDate}
                        endDate={endDate}
                        refreshKey={ticketRefresh}
                    />
                </TabsContent>

                <TabsContent value="queue">
                    <ReviewQueueTab searchQuery={searchTerm} statusFilter={queueStatusFilter} startDate={startDate} endDate={endDate} />
                </TabsContent>
            </Tabs>


            <Modal isOpen={showNewTicket} onClose={() => setShowNewTicket(false)} title="New Support Ticket" size="medium">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input className={adminStyles.input} placeholder="Email" value={newTicket.email} onChange={e => setNewTicket({ ...newTicket, email: e.target.value })} />
                    <input className={adminStyles.input} placeholder="Subject" value={newTicket.subject} onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} />
                    <textarea className={adminStyles.input} placeholder="Message" value={newTicket.message} onChange={e => setNewTicket({ ...newTicket, message: e.target.value })} />
                    <select className={adminStyles.select} value={newTicket.priority} onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}>
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                    <button className={adminStyles.btnPrimary} onClick={handleCreateTicket} disabled={isCreating}>{isCreating ? 'Creating...' : 'Create'}</button>
                </div>
            </Modal>
        </div>
    );
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className={adminStyles.loading}>Loading Support...</div>}>
            <SupportContent />
        </Suspense>
    );
}
