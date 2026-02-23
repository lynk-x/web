"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './InvoicePage.module.css';
import adminStyles from '../../page.module.css';
import { useToast } from '@/components/ui/Toast';
import Badge from '@/components/shared/Badge';
import BackButton from '@/components/shared/BackButton';
import { formatCurrency } from '@/utils/format';
import Image from 'next/image';

// Mock data fetch
const mockTransactions = [
    { id: '1', date: 'Oct 24, 2025', description: 'Monthly Subscription - Premium Plan', amount: 49.00, type: 'subscription', status: 'completed', referenceId: 'SUB-8821' },
    { id: '2', date: 'Oct 23, 2025', description: 'Payout to EventPro Ltd - Oct Earnings', amount: 1250.00, type: 'payout', status: 'pending', referenceId: 'PO-9921' },
];

export default function AdminInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const id = params.id as string;

    const tx = mockTransactions.find(t => t.id === id) || mockTransactions[0];

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div className={styles.container}>
                <BackButton label="Back to Finance" />
                <header className={styles.header}>
                    <div className={styles.logoArea}>
                        <Image
                            src="/images/lynk-x_text.png"
                            alt="Lynk-X"
                            width={280}
                            height={60}
                            style={{ objectFit: 'contain', width: '280px', height: 'auto' }}
                        />
                        <div style={{ fontSize: '12px', opacity: 0.6 }}>
                            Lynk-X Financial Operations<br />
                            Main Headquarters, Digital City
                        </div>
                    </div>
                    <div className={styles.invoiceMeta}>
                        <h1 className={styles.invoiceTitle}>Invoice</h1>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Invoice ID:</span>
                            <strong>{tx.referenceId || `TXN-${id}`}</strong>
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
                            <strong>Transaction Description:</strong><br />
                            {tx.description}<br />
                            <strong>Type:</strong> {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 className={styles.infoSectionTitle}>Reference</h2>
                        <div className={styles.address}>
                            Platform Transaction ID: {id}<br />
                            Internal Audit Code: AUD-77291
                        </div>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{tx.description}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(tx.amount)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className={styles.totalsArea}>
                    <div className={styles.totalsTable}>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Subtotal</span>
                            <span>{formatCurrency(tx.amount)}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Tax (0%)</span>
                            <span>$0.00</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total Amount</span>
                            <span>{formatCurrency(tx.amount)}</span>
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
                        <button className={`${styles.btn} ${styles.btnDownload}`} onClick={() => showToast('Generating PDF...', 'info')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download PDF
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
