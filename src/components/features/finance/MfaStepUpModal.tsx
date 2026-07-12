"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';

interface MfaStepUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
}

/**
 * TOTP MFA step-up, reusing the same mfa.challenge/mfa.verify calls as the
 * login MFA challenge (web/src/app/(auth)/mfa-challenge/page.tsx). Verifying
 * elevates the current session to AAL2 — after onVerified() fires, any
 * subsequent RPC call in the same session already carries that elevated JWT,
 * no token needs to be threaded through manually.
 */
export default function MfaStepUpModal({ isOpen, onClose, onVerified }: MfaStepUpModalProps) {
    const supabase = createClient();
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCode('');
        setError('');
        supabase.auth.mfa.listFactors().then(({ data, error }) => {
            if (error) {
                setError('Failed to load authentication factors.');
                return;
            }
            const totpFactor = data.totp.find(f => f.status === 'verified');
            setFactorId(totpFactor?.id ?? null);
            if (!totpFactor) setError('No verified Two-Factor Authentication method found.');
        });
    }, [isOpen, supabase.auth.mfa]);

    const handleSubmit = async () => {
        if (!factorId || !code.trim()) return;

        setIsSubmitting(true);
        setError('');
        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: code.trim(),
            });
            if (verifyError) {
                setError('Invalid authentication code. Please try again.');
                return;
            }

            setCode('');
            onVerified();
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Verify It's You">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ opacity: 0.8, fontSize: '14px' }}>
                    Resetting your wallet PIN requires a two-factor authentication code. Open your authenticator app and enter the 6-digit code.
                </p>
                <Input
                    label="Authentication Code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                {error && <p style={{ color: 'var(--color-interface-error)', fontSize: '13px', margin: 0 }}>{error}</p>}
                <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} disabled={!factorId} style={{ marginTop: '8px' }}>
                    Verify
                </Button>
            </div>
        </Modal>
    );
}
