'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Button from '@/components/shared/Button';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/error';
import { isPasskeySupported, listPasskeys, registerPasskey, type Passkey } from '@/utils/passkeys';

/**
 * Lists the person's passkeys and lets them add or remove one, shown under the authenticator app option in
 * MfaManager. A passkey is a second factor like the authenticator code: it asks for a fingerprint, face or device
 * PIN, and is used to confirm sensitive actions and to finish signing in.
 */
export function PasskeyManager() {
    const supabase = createClient();
    const { showToast } = useToast();

    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const supported = isPasskeySupported();

    const refresh = useCallback(async () => {
        setPasskeys(await listPasskeys(supabase));
        setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!supported) {
            setIsLoading(false);
            return;
        }
        refresh();
    }, [supported, refresh]);

    const handleAdd = async () => {
        setIsAdding(true);
        const result = await registerPasskey(supabase, name.trim() || 'My passkey');
        setIsAdding(false);

        if (result.ok) {
            setName('');
            showToast('Passkey added.', 'success');
            await refresh();
        } else if (!result.cancelled) {
            showToast(result.message, 'error');
        }
    };

    const handleRemove = async (passkey: Passkey) => {
        if (!confirm(`Remove the passkey "${passkey.name}"? You will no longer be able to use it to confirm actions or sign in.`)) return;
        try {
            const { error } = await supabase.auth.mfa.unenroll({ factorId: passkey.id });
            if (error) throw error;
            showToast('Passkey removed.', 'success');
            await refresh();
        } catch (err) {
            showToast(getErrorMessage(err) || 'Could not remove the passkey.', 'error');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 500, fontSize: '15px', color: 'var(--color-text-primary)' }}>Passkeys</h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8, color: 'var(--color-text-primary)' }}>
                    {supported
                        ? 'Confirm sensitive actions and sign in with your fingerprint, face or device PIN instead of a code.'
                        : 'This browser does not support passkeys. Use an authenticator app instead.'}
                </p>
            </div>

            {supported && !isLoading && passkeys.map((passkey) => (
                <div
                    key={passkey.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 14px', border: '1px solid var(--color-interface-outline)', borderRadius: '8px' }}
                >
                    <span style={{ fontSize: '14px', color: 'var(--color-text-primary)', overflowWrap: 'anywhere' }}>{passkey.name}</span>
                    <Button variant="danger" onClick={() => handleRemove(passkey)}>Remove</Button>
                </div>
            ))}

            {supported && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        maxLength={40}
                        placeholder="Name, for example My phone"
                        aria-label="Passkey name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-interface-outline)', backgroundColor: 'var(--color-background-surface)', color: 'var(--color-text-primary)', fontSize: '14px' }}
                    />
                    <Button variant="secondary" onClick={handleAdd} isLoading={isAdding} disabled={isLoading}>Add a passkey</Button>
                </div>
            )}
        </div>
    );
}
