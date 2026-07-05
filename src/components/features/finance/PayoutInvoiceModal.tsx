"use client";

import React, { useEffect } from 'react';
import Image from 'next/image';
import styles from './PayoutInvoiceModal.module.css';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { formatCurrency, formatDate } from '@/utils/format';
import { useFinancialDocumentDownload } from '@/hooks/useFinancialDocumentDownload';
import { useToast } from '@/components/ui/Toast';
import type { Payout } from '@/types/organize';
import type { FinancialDocument } from '@/types/financialDocument';

interface PayoutInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    payout: Payout | null;
    accountName?: string;
}

const getPayoutStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'warning';
        case 'requested': return 'info';
        case 'hold':       return 'warning';
        case 'failed':     return 'error';
        case 'rejected':   return 'subtle';
        default:           return 'neutral';
    }
};

function buildFinancialDocument(payout: Payout, accountName: string): FinancialDocument {
    const fee = payout.fee || 0;
    const total = payout.netSettlement ?? (payout.amount - fee);
    const ref = payout.reference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`;

    return {
        documentType: 'Settlement Receipt',
        referenceId: ref,
        date: formatDate(payout.processedAt || payout.requestedAt || new Date().toISOString()),
        status: payout.status,
        from: { name: 'Lynk-X', sub: 'Financial Operations, Nairobi, Kenya' },
        to: { name: accountName },
        eventTitle: payout.eventName,
        lineItems: [{
            description: `Ticket Revenue Settlement — Payout for Event: ${payout.eventName || 'System Adjustment'}`,
            amount: formatCurrency(payout.amount, payout.currency),
        }],
        subtotal: formatCurrency(payout.amount, payout.currency),
        fees: fee > 0 ? [{ label: 'Fees & Commissions', amount: formatCurrency(fee, payout.currency) }] : undefined,
        total: formatCurrency(total, payout.currency),
        currency: payout.currency || 'USD',
        footerNote: `This is a system-generated financial settlement statement. Funds are transferred securely using internal entries to the verified organizer wallet. If you have questions regarding this settlement, please contact support@lynk-x.com with reference ${ref}.`,
    };
}

const PayoutInvoiceModal: React.FC<PayoutInvoiceModalProps> = ({
    isOpen,
    onClose,
    payout,
    accountName = 'Lynk-X Organizer',
}) => {
    const { download, isGenerating } = useFinancialDocumentDownload();
    const { showToast } = useToast();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !payout) return null;

    const doc = buildFinancialDocument(payout, accountName);
    const fee = payout.fee || 0;
    const total = payout.netSettlement ?? (payout.amount - fee);

    const handleDownload = async () => {
        const ok = await download(doc, `settlement-receipt-${doc.referenceId}.pdf`);
        if (!ok) showToast('Failed to generate PDF.', 'error');
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.brand}>
                        <Image
                            src="/lynk-x_combined_logo.svg"
                            alt="Lynk-X"
                            width={110}
                            height={28}
                            style={{ objectFit: 'cover' }}
                            priority
                        />
                    </div>
                    <div className={styles.meta}>
                        <span className={styles.invoiceLabel}>SETTLEMENT RECEIPT</span>
                        <span className={styles.refNo}>{doc.referenceId}</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.body}>
                    {/* Status Banner */}
                    <div className={`${styles.statusBanner} ${styles[payout.status] || ''}`}>
                        <div className={styles.statusInfo}>
                            <span className={styles.statusLabel}>Status</span>
                            <Badge label={payout.status.toUpperCase()} variant={getPayoutStatusVariant(payout.status)} showDot />
                        </div>
                        <div className={styles.dateInfo}>
                            <span className={styles.dateLabel}>Date Settled</span>
                            <span className={styles.dateValue}>{doc.date}</span>
                        </div>
                    </div>

                    {/* Payee & Payment Details */}
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailsBlock}>
                            <h3 className={styles.blockTitle}>Payee / Organizer</h3>
                            <div className={styles.blockContent}>
                                <p className={styles.payeeName}>{accountName}</p>
                            </div>
                        </div>
                        <div className={styles.detailsBlock}>
                            <h3 className={styles.blockTitle}>Payment Method</h3>
                            <div className={styles.blockContent}>
                                <p className={styles.walletLabel}>Destination Wallet</p>
                                <p className={styles.walletAddress}>{payout.payableWallet || payout.wallet || '—'}</p>
                                <p className={styles.paymentType}>Internal Ledger Settlement</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.receiptDivider}></div>

                    {/* Itemized Table */}
                    <div className={styles.tableContainer}>
                        <table className={styles.itemTable}>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th className={styles.textRight}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <span className={styles.itemName}>Ticket Revenue Settlement</span>
                                        <span className={styles.itemDesc}>Payout for Event: {payout.eventName || 'System Adjustment'}</span>
                                    </td>
                                    <td className={styles.textRight}>
                                        {formatCurrency(payout.amount, payout.currency)}
                                    </td>
                                </tr>
                                {fee > 0 && (
                                    <tr>
                                        <td>
                                            <span className={styles.itemName}>Fees & Commissions</span>
                                            <span className={styles.itemDesc}>Platform commission and processing fees</span>
                                        </td>
                                        <td className={styles.textRight}>
                                            -{formatCurrency(fee, payout.currency)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Total Section */}
                    <div className={styles.totalSection}>
                        <div className={styles.totalRow}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(payout.amount, payout.currency)}</span>
                        </div>
                        <div className={styles.totalRow}>
                            <span>Fees & Commissions</span>
                            <span>{formatCurrency(fee, payout.currency)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total Settled</span>
                            <span className={styles.totalAmount}>{formatCurrency(total, payout.currency)}</span>
                        </div>
                    </div>

                    {/* Verification Note */}
                    <div className={styles.noteBox}>
                        <p className={styles.noteText}>
                            <strong>Security Note:</strong> {doc.footerNote}
                        </p>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.printBtn} onClick={handleDownload} disabled={isGenerating}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {isGenerating ? 'Generating...' : 'Download PDF'}
                    </button>
                    <button className={styles.closeActionBtn} onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayoutInvoiceModal;
