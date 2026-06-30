"use client";

import React, { useEffect } from 'react';
import Image from 'next/image';
import styles from './PayoutInvoiceModal.module.css';
import Badge, { BadgeVariant } from '@/components/shared/Badge';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Payout } from '@/types/organize';

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

const PayoutInvoiceModal: React.FC<PayoutInvoiceModalProps> = ({
    isOpen,
    onClose,
    payout,
    accountName = 'Lynk-X Organizer',
}) => {
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

    const handlePrint = () => {
        window.print();
    };

    const displayDate = formatDate(payout.processedAt || payout.requestedAt || new Date().toISOString());

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Print Header (Only visible in print mode) */}
                <div className={styles.printHeader}>
                    <h1>LYNK-X SETTLEMENT RECEIPT</h1>
                </div>

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
                        <span className={styles.refNo}>{payout.reference || `PAY-${payout.id.slice(0, 8).toUpperCase()}`}</span>
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
                            <span className={styles.dateValue}>{displayDate}</span>
                        </div>
                    </div>

                    {/* Payee & Payment Details */}
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailsBlock}>
                            <h3 className={styles.blockTitle}>Payee / Organizer</h3>
                            <div className={styles.blockContent}>
                                <p className={styles.payeeName}>{accountName}</p>
                                <p className={styles.payeeSub}>Lynk-X Authorized Partner</p>
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

                    {/* Divider Line */}
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
                                <tr>
                                    <td>
                                        <span className={styles.itemName}>Platform Commission Fee</span>
                                        <span className={styles.itemDesc}>Inclusive of standard service charges</span>
                                    </td>
                                    <td className={styles.textRight}>
                                        {formatCurrency(0, payout.currency)}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <span className={styles.itemName}>Payment Processing Fee</span>
                                        <span className={styles.itemDesc}>Settlement transaction fee</span>
                                    </td>
                                    <td className={styles.textRight}>
                                        {formatCurrency(0, payout.currency)}
                                    </td>
                                </tr>
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
                            <span>{formatCurrency(0, payout.currency)}</span>
                        </div>
                        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                            <span>Total Settled</span>
                            <span className={styles.totalAmount}>{formatCurrency(payout.amount, payout.currency)}</span>
                        </div>
                    </div>

                    {/* Verification Note */}
                    <div className={styles.noteBox}>
                        <p className={styles.noteText}>
                            <strong>Security Note:</strong> This is a system-generated financial settlement statement. Funds are transferred securely using internal entries to the verified organizer wallet. If you have questions regarding this settlement, please contact support@lynk-x.com with reference <strong>{payout.reference || payout.id}</strong>.
                        </p>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        Print / Download PDF
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
