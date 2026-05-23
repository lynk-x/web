'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/shared/Button';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';

export function MfaManager() {
    const supabase = createClient();
    const { showToast } = useToast();

    const [isMfaEnabled, setIsMfaEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolling, setIsEnrolling] = useState(false);
    
    // Enrollment state
    const [factorId, setFactorId] = useState<string | null>(null);
    const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');

    useEffect(() => {
        checkMfaStatus();
    }, []);

    const checkMfaStatus = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            
            const totpFactor = data.totp.find(f => f.status === 'verified');
            setIsMfaEnabled(!!totpFactor);
            if (totpFactor) {
                setFactorId(totpFactor.id);
            }
        } catch (err) {
            console.error('Failed to load MFA status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableMfa = async () => {
        try {
            setIsEnrolling(true);
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });
            if (error) throw error;
            
            setFactorId(data.id);
            setQrCodeSvg(data.totp.qr_code);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to start MFA enrollment', 'error');
            setIsEnrolling(false);
        }
    };

    const handleVerifyMfa = async () => {
        if (!factorId || !verifyCode) return;
        try {
            setIsLoading(true);
            
            // Challenge the factor
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;
            
            // Verify the code against the challenge
            const { data, error } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode
            });
            
            if (error) throw error;
            
            showToast('Two-Factor Authentication enabled successfully!', 'success');
            setIsMfaEnabled(true);
            setIsEnrolling(false);
            setQrCodeSvg(null);
            setVerifyCode('');
        } catch (err) {
            showToast(getErrorMessage(err) || 'Invalid code. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableMfa = async () => {
        if (!factorId) return;
        if (!confirm('Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.')) return;
        
        try {
            setIsLoading(true);
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;
            
            showToast('Two-Factor Authentication disabled.', 'success');
            setIsMfaEnabled(false);
            setFactorId(null);
        } catch (err) {
            showToast(getErrorMessage(err) || 'Failed to disable MFA', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && !isEnrolling) {
        return <div style={{ opacity: 0.7 }}>Loading security settings...</div>;
    }

    if (isEnrolling && qrCodeSvg) {
        return (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-background-elevated)', borderRadius: '8px', border: '1px solid var(--color-interface-outline)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Setup Two-Factor Authentication</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.8 }}>
                    Scan this QR code with your authenticator app (like Google Authenticator or Authy), then enter the 6-digit code below.
                </p>
                
                <div 
                    style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px', display: 'inline-block', marginBottom: '16px' }}
                    dangerouslySetInnerHTML={{ __html: qrCodeSvg }} 
                />

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                        type="text" 
                        maxLength={6}
                        placeholder="000000"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-interface-outline)', backgroundColor: 'var(--color-background-surface)', color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: '16px', width: '120px' }}
                    />
                    <Button onClick={handleVerifyMfa} isLoading={isLoading}>Verify & Enable</Button>
                    <Button variant="secondary" onClick={() => { setIsEnrolling(false); setQrCodeSvg(null); }}>Cancel</Button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', backgroundColor: 'var(--color-background-elevated)', borderRadius: '8px', border: '1px solid var(--color-interface-outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                    Two-Factor Authentication (MFA)
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {isMfaEnabled 
                        ? 'Your account is currently protected by an authenticator app.'
                        : 'Add an extra layer of security to your account using a time-based authenticator app.'}
                </p>
            </div>
            <div>
                {isMfaEnabled ? (
                    <Button variant="danger" onClick={handleDisableMfa} isLoading={isLoading}>Disable 2FA</Button>
                ) : (
                    <Button variant="secondary" onClick={handleEnableMfa} isLoading={isEnrolling}>Enable 2FA</Button>
                )}
            </div>
        </div>
    );
}
