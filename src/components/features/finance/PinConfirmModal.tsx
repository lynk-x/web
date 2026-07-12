"use client";

import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';
import { isValidWalletPin } from '@/utils/walletPin';

interface PinConfirmModalProps {
    isOpen: boolean;
    title?: string;
    onClose: () => void;
    onSubmit: (pin: string) => Promise<void>;
    onForgotPin?: () => void;
}

/**
 * Step-up PIN confirmation, shown at the moment of a wallet-mutating action
 * (withdraw/transfer) once a PIN already exists. Wrong PIN shows inline —
 * finance.verify_wallet_pin already rate-limits/locks server-side, so no
 * client-side attempt counter is needed here.
 */
export default function PinConfirmModal({ isOpen, title = 'Confirm Your PIN', onClose, onSubmit, onForgotPin }: PinConfirmModalProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClose = () => {
        setPin('');
        setError('');
        onClose();
    };

    const handleSubmit = async () => {
        if (!isValidWalletPin(pin)) {
            setError('Enter your 6-digit PIN.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onSubmit(pin);
            setPin('');
        } catch (err: any) {
            setError(err.message || 'Incorrect PIN. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ opacity: 0.8, fontSize: '14px' }}>
                    Enter your wallet PIN to continue.
                </p>
                <Input
                    label="6-Digit PIN"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                {error && <p style={{ color: 'var(--color-interface-error)', fontSize: '13px', margin: 0 }}>{error}</p>}
                <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} style={{ marginTop: '8px' }}>
                    Confirm
                </Button>
                {onForgotPin && (
                    <button
                        type="button"
                        onClick={onForgotPin}
                        style={{
                            background: 'none', border: 'none', padding: 0,
                            color: 'var(--color-utility-secondaryText, rgba(255,255,255,0.6))',
                            fontSize: '13px', textDecoration: 'underline', cursor: 'pointer',
                            alignSelf: 'center',
                        }}
                    >
                        Forgot PIN?
                    </button>
                )}
            </div>
        </Modal>
    );
}
