"use client";

import React, { use, useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useOrganization } from '@/context/OrganizationContext';

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
    };
    items: InvoiceItem[];
    subtotal: string;
    tax: string;
    total: string;
    currency: string;
}

/**
 * Invoice detail page.
 * Fetches a real transaction record by ID and renders it as a printable invoice.
 * Falls back to a "not found" state if the transaction doesn't exist.
 */
export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { activeAccount } = useOrganization();
    const supabase = useMemo(() => createClient(), []);

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            setIsLoading(true);
            try {
                // Try wallet_top_ups first (billing page lists these as invoices)
                const { data: topUp } = await supabase
                    .from('wallet_top_ups')
                    .select('id, amount, status, created_at, currency, provider_ref, metadata')
                    .eq('id', id)
                    .eq('account_id', activeAccount?.id)
                    .maybeSingle();

                if (topUp) {
                    const amount = Number(topUp.amount);
                    const currency = topUp.currency || activeAccount?.wallet_currency || 'USD';
                    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });

                    setInvoice({
                        id: topUp.id.slice(0, 8).toUpperCase(),
                        date: new Date(topUp.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                        dueDate: new Date(topUp.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                        status: topUp.status === 'completed' ? 'paid' : topUp.status === 'pending' ? 'pending' : 'overdue',
                        billedTo: {
                            name: activeAccount?.name || 'Account Owner',
                            email: ''
                        },
                        items: [{
                            description: 'Wallet Top-Up',
                            quantity: 1,
                            rate: formatter.format(amount),
                            amount: formatter.format(amount)
                        }],
                        subtotal: formatter.format(amount),
                        tax: formatter.format(0),
                        total: formatter.format(amount),
                        currency
                    });
                    return;
                }

                // Fallback: try transactions table (filter by recipient_account_id)
                const { data, error } = await supabase
                    .from('transactions')
                    .select('id, amount, status, created_at, currency, reason, metadata')
                    .eq('id', id)
                    .eq('recipient_account_id', activeAccount?.id)
                    .maybeSingle();

                if (error || !data) {
                    setInvoice(null);
                    return;
                }

                const amount = Number(data.amount);
                const currency = data.currency || activeAccount?.wallet_currency || 'USD';
                const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });

                setInvoice({
                    id: data.id.slice(0, 8).toUpperCase(),
                    date: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    dueDate: new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    status: data.status === 'completed' ? 'paid' : data.status === 'pending' ? 'pending' : 'overdue',
                    billedTo: {
                        name: activeAccount?.name || 'Account Owner',
                        email: ''
                    },
                    items: [{
                        description: `Ad Campaign Payment (${data.reason || 'ad_campaign_payment'})`,
                        quantity: 1,
                        rate: formatter.format(amount),
                        amount: formatter.format(amount)
                    }],
                    subtotal: formatter.format(amount),
                    tax: formatter.format(0),
                    total: formatter.format(amount),
                    currency
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [id, supabase, activeAccount]);

    const handlePrint = () => window.print();

    if (isLoading && !activeAccount) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>Loading invoice...</div>
        );
    }

    if (!invoice) {
        return (
            <div style={{ paddingBottom: '40px' }}>
                <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnBack}`}>
                    ← Back to Billing
                </button>
                <div className={styles.container} style={{ textAlign: 'center', padding: '60px' }}>
                    <h1>Invoice Not Found</h1>
                    <p style={{ opacity: 0.6 }}>This transaction record does not exist or you don&apos;t have permission to view it.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '40px' }}>
            <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnBack}`}>
                ← Back to Billing
            </button>

            <div className={styles.container}>
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
                            Lynk-X Ltd<br />
                            Nairobi, Kenya
                        </div>
                    </div>
                    <div className={styles.invoiceMeta}>
                        <h1 className={styles.invoiceTitle}>Invoice</h1>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Invoice ID:</span>
                            <strong>INV-{invoice.id}</strong>
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
                            {invoice.billedTo.email}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 className={styles.infoSectionTitle}>Transaction Reference</h2>
                        <div className={styles.address}>
                            TXN-{id.slice(0, 8).toUpperCase()}
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
                    </div>
                </footer>
            </div>
        </div>
    );
}
