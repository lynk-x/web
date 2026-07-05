"use client";

import { useState } from 'react';
import type { FinancialDocument } from '@/types/financialDocument';

export function useFinancialDocumentDownload() {
    const [isGenerating, setIsGenerating] = useState(false);

    const download = async (doc: FinancialDocument, filename: string) => {
        setIsGenerating(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { default: FinancialDocumentPDF } = await import('@/components/shared/FinancialDocumentPDF');
            const blob = await pdf(<FinancialDocumentPDF doc={doc} />).toBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            return true;
        } catch {
            return false;
        } finally {
            setIsGenerating(false);
        }
    };

    return { download, isGenerating };
}
