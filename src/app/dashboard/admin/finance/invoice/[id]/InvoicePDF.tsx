"use client";

import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
} from '@react-pdf/renderer';

// Register a clean system font stack
Font.registerHyphenationCallback(word => [word]);

const palette = {
    brand: '#7C3AED',
    dark: '#111827',
    mid: '#6B7280',
    light: '#F3F4F6',
    border: '#E5E7EB',
    white: '#FFFFFF',
    positive: '#059669',
};

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: palette.dark,
        paddingTop: 48,
        paddingBottom: 48,
        paddingHorizontal: 48,
        backgroundColor: palette.white,
    },
    // ── Header ──────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    brandName: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        color: palette.brand,
        letterSpacing: 1,
    },
    brandSub: {
        fontSize: 9,
        color: palette.mid,
        marginTop: 4,
    },
    invoiceTitle: {
        fontSize: 28,
        fontFamily: 'Helvetica-Bold',
        color: palette.dark,
        textAlign: 'right',
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    metaLabel: {
        color: palette.mid,
        marginRight: 4,
    },
    metaValue: {
        fontFamily: 'Helvetica-Bold',
    },
    statusBadge: {
        alignSelf: 'flex-end',
        marginTop: 6,
        paddingVertical: 3,
        paddingHorizontal: 10,
        borderRadius: 99,
        backgroundColor: palette.positive,
        color: palette.white,
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    // ── Divider ──────────────────────────────────────────────
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        marginBottom: 24,
    },
    // ── Info grid ───────────────────────────────────────────
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 28,
    },
    infoSection: {
        width: '46%',
    },
    infoSectionRight: {
        width: '46%',
        alignItems: 'flex-end',
    },
    infoTitle: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: palette.mid,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    infoText: {
        fontSize: 10,
        color: palette.dark,
        lineHeight: 1.6,
    },
    infoBold: {
        fontFamily: 'Helvetica-Bold',
    },
    monoSmall: {
        fontFamily: 'Courier',
        fontSize: 9,
        color: palette.mid,
    },
    // ── Table ───────────────────────────────────────────────
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: palette.light,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginBottom: 4,
    },
    tableHeaderText: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: palette.mid,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    colDesc: { flex: 1 },
    colAmt: { width: 100, textAlign: 'right' },
    // ── Totals ──────────────────────────────────────────────
    totalsArea: {
        alignItems: 'flex-end',
        marginTop: 16,
    },
    totalsTable: {
        width: 240,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginTop: 2,
    },
    grandTotalText: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 12,
        color: palette.brand,
    },
    // ── Footer ──────────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 32,
        left: 48,
        right: 48,
        borderTopWidth: 1,
        borderTopColor: palette.border,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    footerText: {
        fontSize: 8,
        color: palette.mid,
    },
});

interface InvoicePDFProps {
    id: string;
    date: string;
    referenceId: string;
    status: string;
    senderName: string;
    recipientName: string;
    eventTitle: string;
    type: string;
    description: string;
    amount: number;
    currency: string;
    formattedAmount: string;
}

export default function InvoicePDF({
    id,
    date,
    referenceId,
    status,
    senderName,
    recipientName,
    eventTitle,
    type,
    description,
    formattedAmount,
}: InvoicePDFProps) {
    return (
        <Document title={`Invoice ${referenceId}`} author="Lynk-X Financial Operations">
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>LYNK-X</Text>
                        <Text style={styles.brandSub}>Lynk-X Financial Operations{'\n'}Nairobi, Kenya</Text>
                    </View>
                    <View>
                        <Text style={styles.invoiceTitle}>Invoice</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Invoice ID:</Text>
                            <Text style={styles.metaValue}>{referenceId}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Date:</Text>
                            <Text>{date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statusBadge}>{status.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Billing info */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>Billing Details</Text>
                        <Text style={styles.infoText}>
                            <Text style={styles.infoBold}>From: </Text>{senderName}{'\n'}
                            <Text style={styles.infoBold}>To: </Text>{recipientName}{'\n'}
                            {eventTitle ? <Text><Text style={styles.infoBold}>Event: </Text>{eventTitle}{'\n'}</Text> : null}
                            <Text style={styles.infoBold}>Type: </Text>
                            {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                    </View>
                    <View style={styles.infoSectionRight}>
                        <Text style={styles.infoTitle}>Reference</Text>
                        <Text style={styles.infoText}>Platform Transaction ID:</Text>
                        <Text style={styles.monoSmall}>{id}</Text>
                    </View>
                </View>

                {/* Line items table */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
                    <Text style={[styles.tableHeaderText, styles.colAmt]}>Amount</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={[{ fontSize: 10 }, styles.colDesc]}>{description}</Text>
                    <Text style={[{ fontSize: 10 }, styles.colAmt]}>{formattedAmount}</Text>
                </View>

                {/* Totals */}
                <View style={styles.totalsArea}>
                    <View style={styles.totalsTable}>
                        <View style={styles.totalRow}>
                            <Text style={{ color: palette.mid }}>Subtotal</Text>
                            <Text>{formattedAmount}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={{ color: palette.mid }}>Tax (0%)</Text>
                            <Text>—</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalText}>Total Amount</Text>
                            <Text style={styles.grandTotalText}>{formattedAmount}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        This is a system-generated document. For inquiries, contact finance@lynk-x.com.
                    </Text>
                    <Text style={styles.footerText}>
                        Generated by Lynk-X Platform
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
