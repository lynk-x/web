"use client";

import { useState } from 'react';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';
import { isValidWalletPin } from '@/utils/walletPin';

interface PinSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pin: string) => Promise<void>;
}

/**
 * First-time wallet PIN creation. Shown lazily, the first time an organizer
 * attempts a wallet-mutating action (withdraw/transfer) on web with no PIN
 * set yet — not on wallet creation itself, since wallets are very often
 * auto-created by a backend trigger (event completion) with no user-facing
 * moment to hook into. See identity.user_credentials / finance.set_wallet_pin.
 */
export default function PinSetupModal({ isOpen, onClose, onSubmit }: PinSetupModalProps) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reset = () => {
        setPin('');
        setConfirmPin('');
        setError('');
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleSubmit = async () => {
        if (!isValidWalletPin(pin)) {
            setError('PIN must be exactly 6 digits.');
            return;
        }
        if (pin !== confirmPin) {
            setError('PINs do not match.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        try {
            await onSubmit(pin);
            reset();
        } catch (err: any) {
            setError(err.message || 'Failed to set PIN. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Set Up Your Wallet PIN">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ opacity: 0.8, fontSize: '14px' }}>
                    Choose a 6-digit PIN to confirm withdrawals and transfers. You&apos;ll be asked for it every time you move funds out of your wallet.
                </p>
                <Input
                    label="6-Digit PIN"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <Input
                    label="Confirm PIN"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                {error && <p style={{ color: 'var(--color-interface-error)', fontSize: '13px', margin: 0 }}>{error}</p>}
                <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting} style={{ marginTop: '8px' }}>
                    Set PIN
                </Button>
            </div>
        </Modal>
    );
}
