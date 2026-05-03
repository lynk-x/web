"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './InvoicePage.module.css';
import { useToast } from '@/components/ui/Toast';
import BackButton from '@/components/shared/BackButton';
import { formatCurrency } from '@/utils/format';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

// Lazy-load the PDF renderer — it's large and only needed on click
const InvoicePDF = dynamic(() => import('./InvoicePDF'), { ssr: false });

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
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);
    const id = params.id as string;

    const [tx, setTx] = useState<TxDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransaction = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .schema('transactions')
                    .from('transactions')
                    .select(`
                        id, amount, status, created_at, currency, reason, reference,
                        event:events!event_id(title),
                        initiator:user_profile!initiated_by(full_name, user_name),
                        recipient_account:accounts!recipient_account_id(display_name)
                    `)
                    .eq('id', id)
                    .maybeSingle();

                if (error || !data) {
                    setTx(null);
                    return;
                }

                const d = data as any; // Using any for joined Supabase data to avoid verbose interface duplication
                setTx({
                    id: d.id,
                    date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    description: d.description || d.reason?.replace(/_/g, ' ') || 'Platform Transaction',
                    amount: Number(d.amount),
                    currency: d.currency || 'USD',
                    type: d.reason || 'transaction',
                    status: d.status,
                    referenceId: d.reference || `TXN-${d.id.slice(0, 8).toUpperCase()}`,
                    senderName: d.initiator?.full_name || d.initiator?.user_name || 'Platform',
                    recipientName: d.recipient_account?.display_name || 'Platform',
                    eventTitle: d.event?.title || '',
                });
            } catch (err: any) {
                showToast(err.message || 'Failed to load invoice', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTransaction();
    }, [id, supabase, showToast]);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const { enabled: isPdfExportEnabled } = useFeatureFlag('enable_invoice_pdf_export');

    const handlePrint = () => window.print();

    const handleDownloadPDF = async () => {
        if (!tx) return;
        setIsGeneratingPdf(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { default: InvoicePDFDoc } = await import('./InvoicePDF');
            const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: tx.currency });
            const blob = await pdf(
                <InvoicePDFDoc
                    id={tx.id}
                    date={tx.date}
                    referenceId={tx.referenceId}
                    status={tx.status}
                    senderName={tx.senderName}
                    recipientName={tx.recipientName}
                    eventTitle={tx.eventTitle}
                    type={tx.type}
                    description={tx.description}
                    amount={tx.amount}
                    currency={tx.currency}
                    formattedAmount={formatter.format(tx.amount)}
                />
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${tx.referenceId}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast('Failed to generate PDF.', 'error');
        } finally {
            setIsGeneratingPdf(false);
        }
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
                <div style={{ padding: '24px' }}>
                    <BackButton label="Back to Finance" />
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
                <BackButton label="Back to Finance" />
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
                        <button onClick={handlePrint} className={`${styles.btn} ${styles.btnPrint}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print Invoice
                        </button>
                        {isPdfExportEnabled && (
                            <button
                                className={`${styles.btn} ${styles.btnDownload}`}
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPdf}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                            </button>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
}
