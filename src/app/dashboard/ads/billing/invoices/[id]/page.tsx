"use client";

import React, { use } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Types
interface InvoiceItem {
    description: string;
    quantity: number;
    rate: string;
    amount: string;
}

interface InvoiceDetail {
    id: string;
    date: string;
    dueDate: string;
    status: 'paid' | 'pending' | 'overdue';
    billedTo: {
        name: string;
        email: string;
        address: string[];
    };
    items: InvoiceItem[];
    subtotal: string;
    tax: string;
    total: string;
    paymentMethod: string;
}

// Mock Data
const mockInvoice: InvoiceDetail = {
    id: 'INV-2025-001',
    date: 'Oct 01, 2025',
    dueDate: 'Oct 15, 2025',
    status: 'paid',
    billedTo: {
        name: 'John Doe',
        email: 'john@example.com',
        address: [
            '123 Digital Avenue',
            'Business District, NY 10001',
            'United States'
        ]
    },
    items: [
        {
            description: 'Summer Music Festival - Campaign Boost',
            quantity: 1,
            rate: '$350.00',
            amount: '$350.00'
        },
        {
            description: 'Ad Set Optimization Layout (Premium)',
            quantity: 2,
            rate: '$50.00',
            amount: '$100.00'
        }
    ],
    subtotal: '$450.00',
    tax: '$0.00',
    total: '$450.00',
    paymentMethod: 'Visa ending in 4242'
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    // In a real app, we'd fetch the invoice using the ID
    const invoice = { ...mockInvoice, id: id.startsWith('INV') ? id : `INV-2025-${id.padStart(3, '0')}` };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ paddingBottom: '40px' }}>
            <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnBack}`}>
                ← Back to Billing
            </button>

            <div className={styles.container}>
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
                            #todo: add company name<br />
                            #todo: add address
                        </div>
                    </div>
                    <div className={styles.invoiceMeta}>
                        <h1 className={styles.invoiceTitle}>Invoice</h1>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Invoice ID:</span>
                            <strong>{invoice.id}</strong>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Date:</span>
                            {invoice.date}
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Due Date:</span>
                            {invoice.dueDate}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <span className={`${styles.statusBadge} ${styles[invoice.status]}`}>
                                {invoice.status}
                            </span>
                        </div>
                    </div>
                </header>

                <div className={styles.infoGrid}>
                    <div>
                        <h2 className={styles.infoSectionTitle}>Billed To</h2>
                        <div className={styles.address}>
                            <strong>{invoice.billedTo.name}</strong><br />
                            {invoice.billedTo.email}<br />
                            {invoice.billedTo.address.map((line, i) => (
                                <React.Fragment key={i}>{line}<br /></React.Fragment>
                            ))}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 className={styles.infoSectionTitle}>Payment Method</h2>
                        <div className={styles.address}>
                            {invoice.paymentMethod}<br />
                            Transaction ID: TXN_882910BB
                        </div>
                    </div>
                </div>

                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style={{ textAlign: 'center' }}>Quantity</th>
                            <th style={{ textAlign: 'right' }}>Rate</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td>{item.description}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right' }}>{item.rate}</td>
                                <td style={{ textAlign: 'right' }}>{item.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.totalsArea}>
                    <div className={styles.totalsTable}>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Subtotal</span>
                            <span>{invoice.subtotal}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span className={styles.metaLabel}>Tax (0%)</span>
                            <span>{invoice.tax}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total Due</span>
                            <span>{invoice.total}</span>
                        </div>
                    </div>
                </div>

                <footer className={styles.footer}>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>
                        Thank you for your business! Reach out to support@lynk-x.com for any questions.
                    </div>
                    <div className={styles.actions}>
                        <button onClick={handlePrint} className={`${styles.btn} ${styles.btnPrint}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print Invoice
                        </button>
                        <button className={`${styles.btn} ${styles.btnDownload}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Download PDF
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
}
