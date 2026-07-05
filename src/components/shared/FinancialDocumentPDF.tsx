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
import type { FinancialDocument } from '@/types/financialDocument';

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
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
        marginBottom: 24,
    },
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

interface FinancialDocumentPDFProps {
    doc: FinancialDocument;
}

export default function FinancialDocumentPDF({ doc }: FinancialDocumentPDFProps) {
    const infoTitle = doc.documentType === 'Settlement Receipt' ? 'Settlement Details' : 'Billing Details';

    return (
        <Document title={`${doc.documentType} ${doc.referenceId}`} author="Lynk-X Financial Operations">
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brandName}>LYNK-X</Text>
                        <Text style={styles.brandSub}>{doc.from.name}{doc.from.sub ? `\n${doc.from.sub}` : ''}</Text>
                    </View>
                    <View>
                        <Text style={styles.invoiceTitle}>{doc.documentType}</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Reference:</Text>
                            <Text style={styles.metaValue}>{doc.referenceId}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Date:</Text>
                            <Text>{doc.date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.statusBadge}>{doc.status.toUpperCase()}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>{infoTitle}</Text>
                        <Text style={styles.infoText}>
                            <Text style={styles.infoBold}>From: </Text>{doc.from.name}{'\n'}
                            <Text style={styles.infoBold}>To: </Text>{doc.to.name}
                            {doc.to.email ? <Text>{' '}({doc.to.email})</Text> : null}{'\n'}
                            {doc.to.sub ? <Text>{doc.to.sub}{'\n'}</Text> : null}
                            {doc.eventTitle ? <Text><Text style={styles.infoBold}>Event: </Text>{doc.eventTitle}{'\n'}</Text> : null}
                        </Text>
                    </View>
                    <View style={styles.infoSectionRight}>
                        <Text style={styles.infoTitle}>Reference</Text>
                        <Text style={styles.infoText}>Platform Reference:</Text>
                        <Text style={styles.monoSmall}>{doc.referenceId}</Text>
                    </View>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
                    <Text style={[styles.tableHeaderText, styles.colAmt]}>Amount</Text>
                </View>
                {doc.lineItems.map((item, index) => (
                    <View style={styles.tableRow} key={index}>
                        <Text style={[{ fontSize: 10 }, styles.colDesc]}>{item.description}</Text>
                        <Text style={[{ fontSize: 10 }, styles.colAmt]}>{item.amount}</Text>
                    </View>
                ))}

                <View style={styles.totalsArea}>
                    <View style={styles.totalsTable}>
                        <View style={styles.totalRow}>
                            <Text style={{ color: palette.mid }}>Subtotal</Text>
                            <Text>{doc.subtotal}</Text>
                        </View>
                        {doc.fees?.map((fee, index) => (
                            <View style={styles.totalRow} key={index}>
                                <Text style={{ color: palette.mid }}>{fee.label}</Text>
                                <Text>{fee.amount}</Text>
                            </View>
                        ))}
                        {doc.tax !== undefined && (
                            <View style={styles.totalRow}>
                                <Text style={{ color: palette.mid }}>Tax</Text>
                                <Text>{doc.tax}</Text>
                            </View>
                        )}
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalText}>Total {doc.documentType === 'Settlement Receipt' ? 'Settled' : 'Due'}</Text>
                            <Text style={styles.grandTotalText}>{doc.total}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {doc.footerNote || 'This is a system-generated document. For inquiries, contact finance@lynk-x.com.'}
                    </Text>
                    <Text style={styles.footerText}>
                        Generated by Lynk-X Platform
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
