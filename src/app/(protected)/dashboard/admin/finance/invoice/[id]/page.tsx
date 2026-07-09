"use client";
import { getErrorMessage } from '@/utils/error';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import styles from './InvoicePage.module.css';
import { useToast } from '@/components/ui/Toast';
import CloseButton from '@/components/shared/CloseButton';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useFinancialDocumentDownload } from '@/hooks/useFinancialDocumentDownload';
import type { FinancialDocument } from '@/types/financialDocument';

// PDF renderer is lazy-loaded via useFinancialDocumentDownload

interface TxDetail {
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    referenceId: string;
    senderName: string;
    recipientName: string;
    eventTitle: string;
}

/**
 * Admin finance invoice detail page.
 * Fetches the real transaction record by UUID and renders a printable invoice.
 * Falls back to a "not found" state if the transaction doesn't exist.
 */
export default function AdminInvoicePage() {
    return (
        <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading invoice...</div>}>
            <AdminInvoiceContent />
        </Suspense>
    );
}

function AdminInvoiceContent() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const searchParams = useSearchParams();
    const id = params.id as string;
    const createdAt = searchParams.get('createdAt');

    const [tx, setTx] = useState<TxDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransaction = async () => {
            setIsLoading(true);
            try {
                // Event/initiator/recipient names are resolved server-side —
                // PostgREST can't embed across the events/identity schema
                // split through a plain view. Visibility (own transaction,
                // owning account, or admin) is enforced inside the RPC.
                const { data, error } = await supabase
                    .schema('api')
                    .rpc('get_transaction_invoice', { p_transaction_id: id });

                if (error || !data) {
                    setTx(null);
                    return;
                }

                interface InvoiceRpcResult {
                    id: string;
                    amount: number;
                    status: string;
                    created_at: string;
                    currency: string;
                    reason: string;
                    reference: string;
                    event_title: string | null;
                    initiator_full_name: string | null;
                    initiator_user_name: string | null;
                    recipient_account_display_name: string | null;
                }
                const d = data as unknown as InvoiceRpcResult;

                setTx({
                    id: d.id,
                    date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    description: d.reason?.replace(/_/g, ' ') || 'Platform Transaction',
                    amount: Number(d.amount),
                    currency: d.currency || 'USD',
                    type: d.reason || 'transaction',
                    status: d.status,
                    referenceId: d.reference || `TXN-${d.id.slice(0, 8).toUpperCase()}`,
                    senderName: d.initiator_full_name || d.initiator_user_name || 'Platform',
                    recipientName: d.recipient_account_display_name || 'Platform',
                    eventTitle: d.event_title || '',
                });
            } catch (err: unknown) {
                showToast(getErrorMessage(err) || 'Failed to load invoice', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransaction();
    }, [id, supabase, showToast, createdAt]);

    const { download, isGenerating } = useFinancialDocumentDownload();

    const handleDownloadPDF = async () => {
        if (!tx) return;
        const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency });
        const doc: FinancialDocument = {
            documentType: 'Invoice',
            referenceId: tx.referenceId,
            date: tx.date,
            status: tx.status,
            from: { name: 'Lynk-X', sub: 'Lynk-X Financial Operations, Nairobi, Kenya' },
            to: { name: tx.recipientName },
            eventTitle: tx.eventTitle || undefined,
            lineItems: [{ description: tx.description, amount: formatter.format(tx.amount) }],
            subtotal: formatter.format(tx.amount),
            tax: formatter.format(0),
            total: formatter.format(tx.amount),
            currency: tx.currency,
            footerNote: 'This is a system-generated document. For inquiries, contact finance@lynk-x.com.',
        };
        const ok = await download(doc, `invoice-${tx.referenceId}.pdf`);
        if (!ok) showToast('Failed to generate PDF.', 'error');
    };

    if (isLoading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                Loading invoice...
            </div>
        );
    }

    if (!tx) {
        return (
            <div style={{ paddingBottom: '40px' }}>
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <CloseButton onClick={() => router.back()} />
                </div>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h1>Transaction Not Found</h1>
                    <p style={{ opacity: 0.6 }}>This transaction does not exist or you don&apos;t have permission to view it.</p>
                </div>
            </div>
        );
    }

    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency });

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div className={styles.container}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                    <CloseButton onClick={() => router.back()} />
                </div>
                <header className={styles.header}>
                    <div className={styles.logoArea}>
                        <Image
                            src="/lynk-x_combined_logo.svg"
                            alt="Lynk-X"
                            width={280}
                            height={60}
                            style={{ objectFit: 'contain', width: '280px', height: 'auto' }}
                        />
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>
                            Lynk-X Financial Operations<br />
                            Nairobi, Kenya
                        </div>
                    </div>
                    <div className={styles.invoiceMeta}>
                        <h1 className={styles.invoiceTitle}>Invoice</h1>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Invoice ID:</span>
                            <strong>{tx.referenceId}</strong>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Date:</span>
                            {tx.date}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <span className={`${styles.statusBadge} ${styles[tx.status]}`}>
                                {tx.status}
                            </span>
                        </div>
                    </div>
                </header>

                <div className={styles.infoGrid}>
                    <div>
                        <h2 className={styles.infoSectionTitle}>Billing Details</h2>
                        <div className={styles.address}>
                            <strong>From:</strong> {tx.senderName}<br />
                            <strong>To:</strong> {tx.recipientName}<br />
                            {tx.eventTitle && <><strong>Event:</strong> {tx.eventTitle}<br /></>}
                            <strong>Type:</strong> {tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 className={styles.infoSectionTitle}>Reference</h2>
                        <div className={styles.address}>
                            Platform Transaction ID:<br />
                            <strong style={{ fontSize: '11px', fontFamily: 'monospace' }}>{tx.id}</strong>
                        </div>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Amount ({tx.currency})</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{tx.description}</td>
                            <td style={{ textAlign: 'right' }}>{formatter.format(tx.amount)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className={styles.totalsArea}>
                    <div className={styles.totalsTable}>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Subtotal</span>
                            <span>{formatter.format(tx.amount)}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Tax (0%)</span>
                            <span>{formatter.format(0)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total Amount</span>
                            <span>{formatter.format(tx.amount)}</span>
                        </div>
                    </div>
                </div>

                <footer className={styles.footer}>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        This is a system-generated document. For inquiries, contact finance@lynk-x.com.
                    </div>
                    <div className={styles.actions}>
                        <button
                            className={`${styles.btn} ${styles.btnDownload}`}
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            {isGenerating ? 'Generating...' : 'Download PDF'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
