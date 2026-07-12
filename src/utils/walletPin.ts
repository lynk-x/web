/**
 * Wallet PIN hashing — must exactly match the PWA's scheme
 * (dart/apps/pwa/lib/presentation/features/wallet/cubit/wallet_cubit.dart,
 * `_hashPin`), since both clients write/verify the same
 * identity.user_credentials.pin_hash row: sha256(pin + currentUserId),
 * lowercase hex.
 */
export async function hashWalletPin(pin: string, userId: string): Promise<string> {
    const bytes = new TextEncoder().encode(pin + userId);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

export function isValidWalletPin(pin: string): boolean {
    return /^\d{6}$/.test(pin);
}
