"use client";

import { useState } from 'react';
import { getErrorMessage } from '@/utils/error';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/shared/Modal';

interface ReportIssueModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Whatever the user typed as their sign-in identifier, if known — sent along so support can find their account without asking. */
    identifier?: string;
    /** e.g. 'Failed login (email OTP)' — mirrors the PWA's subject convention (auth_page.dart's _reportIssue). */
    subject: string;
}

/**
 * "Report an issue" — same mechanism as the PWA's login/signup screens
 * (auth_page.dart's _ReportLoginIssueDialog): collects an optional message,
 * inserts into api.v1_support_tickets. That table grants INSERT to `anon`
 * specifically so this works pre-session, from /login and /signup where no
 * authenticated user exists yet.
 */
export default function ReportIssueModal({ isOpen, onClose, identifier, subject }: ReportIssueModalProps) {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleClose = () => {
        setMessage('');
        setError(null);
        setSubmitted(false);
        onClose();
    };

    const handleSubmit = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            const supabase = createClient();
            const isEmail = identifier?.includes('@');
            const { error: insertError } = await supabase.schema('api').from('v1_support_tickets').insert({
                email: identifier && isEmail ? identifier : null,
                phone: identifier && !isEmail ? identifier : null,
                subject,
                message: message.trim() || 'User reported an issue with no additional details.',
            });
            if (insertError) throw insertError;
            setSubmitted(true);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to submit your report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Report an Issue" size="small">
            {submitted ? (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <p style={{ color: 'var(--color-interface-success)', fontSize: 14, marginBottom: 16 }}>
                        Thanks — our team will look into this.
                    </p>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{ background: 'var(--color-brand-primary)', color: '#000', border: 'none', borderRadius: 100, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                    >
                        Close
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {identifier && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
                            We&apos;ll include {identifier} so our team can look into your account.
                        </p>
                    )}
                    {error && (
                        <div style={{ color: 'var(--color-interface-error)', background: 'rgba(239,68,68,0.1)', padding: '10px 12px', borderRadius: 10, fontSize: 13 }}>
                            {error}
                        </div>
                    )}
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="What happened? (optional)"
                        rows={4}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            borderRadius: 8,
                            padding: 12,
                            color: 'white',
                            fontSize: 14,
                            fontFamily: 'inherit',
                            resize: 'vertical',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', padding: '10px 12px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            style={{ background: 'var(--color-brand-primary)', color: '#000', border: 'none', borderRadius: 100, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
