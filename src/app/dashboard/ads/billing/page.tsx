"use client";

import { useState } from 'react';
import styles from '../../page.module.css';
import AdsInvoiceTable, { Invoice } from '@/components/ads/AdsInvoiceTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { useToast } from '@/components/ui/Toast';

export default function AdsBillingPage() {
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const invoices: Invoice[] = [
        { id: '1', date: 'Oct 01, 2025', amount: '$450.00', status: 'paid' },
        { id: '2', date: 'Sep 01, 2025', amount: '$320.50', status: 'paid' },
        { id: '3', date: 'Aug 01, 2025', amount: '$150.00', status: 'paid' },
    ];

    const filteredInvoices = invoices.filter(inv =>
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Billing & Payments</h1>
                    <p className={styles.subtitle}>Manage your payment methods and view invoices.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Payment Methods */}
                <section className={styles.section} style={{ padding: '24px', backgroundColor: 'var(--color-interface-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-interface-outline)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Payment Methods</h2>
                        <button className={styles.createBtn} style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => showToast('Opening add payment method dialog...', 'info')}>+ Add Method</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}>
                        <div style={{ width: '40px', height: '25px', backgroundColor: '#fff', borderRadius: '4px' }}></div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>Visa ending in 4242</div>
                            <div style={{ fontSize: '12px', opacity: 0.6 }}>Expires 12/28 • Default</div>
                        </div>
                        <button
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-utility-primaryText)', opacity: 0.5, cursor: 'pointer' }}
                            onClick={() => showToast('Redirecting to payment method editor...', 'info')}
                        >
                            Edit
                        </button>
                    </div>
                </section>

                {/* Current Spend */}
                <section className={styles.section} style={{ padding: '24px', backgroundColor: 'var(--color-interface-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-interface-outline)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0', opacity: 0.7 }}>Current Balance</h2>
                            <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>$0.00</div>
                            <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>
                                No payment due. Next billing date: Nov 01, 2025.
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', flex: 1, marginLeft: '24px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 8px 0', opacity: 0.7 }}>Spend Limit</h3>
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '8px' }}>
                                <div style={{ width: '25%', height: '100%', backgroundColor: 'var(--color-brand-primary)', borderRadius: '3px' }}></div>
                            </div>
                            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>$1240 spent</span>
                                <span>$5000 limit</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Invoice History */}
            <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Invoice History</h2>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <TableToolbar
                        onSearchChange={setSearchQuery}
                        searchValue={searchQuery}
                        searchPlaceholder="Search invoices..."
                    />
                </div>

                <AdsInvoiceTable
                    invoices={filteredInvoices}
                    currentPage={currentPage}
                    totalPages={5}
                    onPageChange={setCurrentPage}
                />
            </section>
        </div>
    );
}
