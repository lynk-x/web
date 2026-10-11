"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';
import { isPasskeySupported, listPasskeys, verifyWithPasskey, type Passkey } from '@/utils/passkeys';

interface MfaStepUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
}

/**
 * MFA step-up: a passkey (fingerprint, face or device PIN) or an authenticator code, whichever the person has set
 * up. Reusing the same mfa.challenge/mfa.verify calls as the
 * login MFA challenge (web/src/app/(auth)/mfa-challenge/page.tsx). Verifying
 * elevates the current session to AAL2 — after onVerified() fires, any
 * subsequent RPC call in the same session already carries that elevated JWT,
 * no token needs to be threaded through manually.
 */
export default function MfaStepUpModal({ isOpen, onClose, onVerified }: MfaStepUpModalProps) {
    const supabase = createClient();
    const [factorId, setFactorId] = useState<string | null>(null);
    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCode('');
        setError('');
        let cancelled = false;

        Promise.all([supabase.auth.mfa.listFactors(), isPasskeySupported() ? listPasskeys(supabase) : Promise.resolve([])]).then(
            ([{ data, error }, keys]) => {
                if (cancelled) return;
                if (error) {
                    setError('Failed to load authentication factors.');
                    return;
                }
                const totpFactor = data.totp.find(f => f.status === 'verified');
                setFactorId(totpFactor?.id ?? null);
                setPasskeys(keys);
                if (!totpFactor && keys.length === 0) setError('No verified Two-Factor Authentication method found.');
            },
        );
        return () => { cancelled = true; };
    }, [isOpen, supabase.auth.mfa]);

    const handlePasskey = async (passkey: Passkey) => {
        setIsSubmitting(true);
        setError('');
        const result = await verifyWithPasskey(supabase, passkey.id);
        setIsSubmitting(false);
        if (result.ok) {
            onVerified();
        } else if (!result.cancelled) {
            setError(result.message);
        }
    };

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
                    Resetting your wallet PIN needs a second check.
                    {passkeys.length > 0 && factorId ? ' Use a passkey, or enter the 6-digit code from your authenticator app.' : ''}
                    {passkeys.length > 0 && !factorId ? ' Use a passkey.' : ''}
                    {passkeys.length === 0 ? ' Open your authenticator app and enter the 6-digit code.' : ''}
                </p>
                {passkeys.map((passkey) => (
                    <Button key={passkey.id} variant="primary" onClick={() => handlePasskey(passkey)} isLoading={isSubmitting}>
                        {passkeys.length > 1 ? `Use passkey: ${passkey.name}` : 'Use a passkey'}
                    </Button>
                ))}
                {factorId && (
                    <>
                        <Input
                            label="Authentication Code"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            autoFocus={passkeys.length === 0}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        />
                        <Button variant={passkeys.length > 0 ? 'secondary' : 'primary'} onClick={handleSubmit} isLoading={isSubmitting} style={{ marginTop: '8px' }}>
                            Verify
                        </Button>
                    </>
                )}
                {error && <p style={{ color: 'var(--color-interface-error)', fontSize: '13px', margin: 0 }}>{error}</p>}
            </div>
        </Modal>
    );
}
