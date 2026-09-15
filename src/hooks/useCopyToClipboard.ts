import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

/** Copies text to the clipboard, flashing `copied` true for 2s and toasting confirmation. */
export function useCopyToClipboard() {
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);

    const copy = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2000);
    }, [showToast]);

    return { copied, copy };
}
