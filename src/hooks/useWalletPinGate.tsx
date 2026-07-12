"use client";

import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { hashWalletPin } from '@/utils/walletPin';
import PinSetupModal from '@/components/features/finance/PinSetupModal';
import PinConfirmModal from '@/components/features/finance/PinConfirmModal';
import MfaStepUpModal from '@/components/features/finance/MfaStepUpModal';

/**
 * Gates a wallet-mutating action (withdraw, transfer) behind the caller's
 * wallet PIN — creating one first if they don't have one yet. Mirrors the
 * promise-based useConfirmModal pattern: call requestPinHash(), await the
 * hashed PIN (or null if the user cancelled), pass it straight into the RPC.
 *
 * Usage:
 *   const { requestPinHash, PinGateModals } = useWalletPinGate();
 *   const pinHash = await requestPinHash();
 *   if (!pinHash) return; // user cancelled
 *   await supabase.schema('api').rpc('request_account_payout', { ..., p_pin_hash: pinHash });
 *   // In JSX: {PinGateModals}
 */
export function useWalletPinGate() {
    const supabase = createClient();
    const [mode, setMode] = useState<'none' | 'setup' | 'confirm' | 'mfa-verify'>('none');
    const resolveRef = useRef<((hash: string | null) => void) | null>(null);

    const requestPinHash = useCallback(async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .schema('api')
            .from('v1_profiles')
            .select('wallet_pin_hash')
            .eq('id', user.id)
            .single();

        if (error) return null;

        const hasPin = data?.wallet_pin_hash != null;

        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setMode(hasPin ? 'confirm' : 'setup');
        });
    }, [supabase]);

    const handleSetupSubmit = useCallback(async (pin: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated.');

        const hash = await hashWalletPin(pin, user.id);
        const { error } = await supabase.schema('api').rpc('set_wallet_pin', { p_pin_hash: hash });
        if (error) throw error;

        setMode('none');
        resolveRef.current?.(hash);
        resolveRef.current = null;
    }, [supabase]);

    const handleConfirmSubmit = useCallback(async (pin: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated.');

        const hash = await hashWalletPin(pin, user.id);
        const { data: isValid, error } = await supabase.schema('api').rpc('verify_wallet_pin', { p_pin_hash: hash });
        if (error) throw error;
        if (!isValid) throw new Error('Incorrect PIN. Please try again.');

        setMode('none');
        resolveRef.current?.(hash);
        resolveRef.current = null;
    }, [supabase]);

    const handleCancel = useCallback(() => {
        setMode('none');
        resolveRef.current?.(null);
        resolveRef.current = null;
    }, []);

    // "Forgot PIN?" from the confirm step. finance.set_wallet_pin itself
    // enforces the MFA step-up server-side for accounts with MFA enrolled
    // (returning an error otherwise), but we check client-side first so
    // MFA-enrolled users get the verification prompt up front instead of a
    // failed submit after re-entering their new PIN.
    const handleForgotPin = useCallback(async () => {
        const { data, error } = await supabase.schema('api').rpc('get_mfa_status');
        const mfaEnrolled = !error && data === true;
        setMode(mfaEnrolled ? 'mfa-verify' : 'setup');
    }, [supabase]);

    const handleMfaVerified = useCallback(() => {
        setMode('setup');
    }, []);

    const PinGateModals = (
        <>
            <PinSetupModal isOpen={mode === 'setup'} onClose={handleCancel} onSubmit={handleSetupSubmit} />
            <PinConfirmModal isOpen={mode === 'confirm'} onClose={handleCancel} onSubmit={handleConfirmSubmit} onForgotPin={handleForgotPin} />
            <MfaStepUpModal isOpen={mode === 'mfa-verify'} onClose={handleCancel} onVerified={handleMfaVerified} />
        </>
    );

    return { requestPinHash, PinGateModals };
}
