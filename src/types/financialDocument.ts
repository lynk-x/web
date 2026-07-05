export interface FinancialDocumentLineItem {
    description: string;
    quantity?: number;
    rate?: string;
    amount: string;
}

export interface FinancialDocumentFee {
    label: string;
    amount: string;
}

export interface FinancialDocument {
    documentType: 'Settlement Receipt' | 'Invoice';
    referenceId: string;
    date: string;
    status: string;
    from: { name: string; sub?: string };
    to: { name: string; email?: string; sub?: string };
    eventTitle?: string;
    lineItems: FinancialDocumentLineItem[];
    subtotal: string;
    fees?: FinancialDocumentFee[];
    tax?: string;
    total: string;
    currency: string;
    footerNote?: string;
}
