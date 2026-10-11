"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/shared/Modal';
import sharedStyles from './DashboardShared.module.css';

/**
 * Opens the create flow for an event or campaign, but on phones asks first.
 *
 * The create forms are long and built for larger screens, so below 640 px the "Create" button shows a short
 * choice instead: send the link to another device to finish there, or carry on here. On wider screens it goes
 * straight to the form. Returns the click handler and the modal to render.
 */
export function useCreateHandoff(href: string, noun: 'event' | 'campaign') {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const open = () => {
        if (window.matchMedia('(max-width: 639.98px)').matches) {
            setIsOpen(true);
        } else {
            router.push(href);
        }
    };

    const fullUrl = () => `${window.location.origin}${href}`;

    const sendLink = async () => {
        const url = fullUrl();
        // Phones can hand the link straight to a mail or chat app; elsewhere (or if sharing is dismissed) it is copied.
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: `Create ${noun}`, url });
                return;
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
            }
        }
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const modal = (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Create ${noun}`} size="small">
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, opacity: 0.8 }}>
                Setting up a {noun} has several steps and works best on a larger screen. Send yourself the link to
                finish on a laptop, or continue here.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
                <button type="button" className={sharedStyles.btnPrimary} onClick={sendLink}>
                    {copied ? 'Link copied' : 'Send me the link'}
                </button>
                <button
                    type="button"
                    className={sharedStyles.btnSecondary}
                    onClick={() => { setIsOpen(false); router.push(href); }}
                >
                    Continue on this phone
                </button>
            </div>
        </Modal>
    );

    return { open, modal };
}
