"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Account {
    id: string;
    name: string;
    /** Extracted from accounts.media->>'logo' */
    logoUrl?: string;
    role: 'owner' | 'admin' | 'accountant' | 'editor' | 'staff' | 'reviewer' | 'moderator' | 'support_agent' | string;
    type: 'attendee' | 'organizer' | 'advertiser' | 'platform';
    wallet_balance?: number;
    wallet_currency?: string;
    payout_routing?: {
        method?: string;
        [key: string]: any;
    };
}

interface OrganizationContextType {
    accounts: Account[];
    activeAccount: Account | null;
    setActiveAccountId: (id: string) => void;
    isLoading: boolean;
    refreshAccounts: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient();
    const { user } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setStoredActiveAccountId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAccounts = async () => {
        if (!user) {
            setAccounts([]);
            setStoredActiveAccountId(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            console.log('[OrganizationContext] Fetching accounts for user:', user.id);
            // Fetch accounts the user is a member of
            const { data, error } = await supabase
                .from('account_members')
                .select(`
                    role_slug,
                    accounts:account_id (
                        id,
                        display_name,
                        type,
                        media,
                        payout_routing,
                        account_wallets(currency, balance)
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error("[OrganizationContext] Error fetching accounts:", error);
                return;
            }
            
            console.log('[OrganizationContext] Raw memberships found:', data?.length || 0);

            if (data && data.length > 0) {
                const mappedAccounts: Account[] = data.map((member: any) => {
                    const wallets: { currency: string; balance: number }[] = member.accounts.account_wallets || [];
                    // Pick the KES wallet first (primary market), fall back to first available
                    const primaryWallet = wallets.find((w) => w.currency === 'KES') || wallets[0];

                    return {
                        id: member.accounts.id,
                        name: member.accounts.display_name,
                        // Extract logo from the JSONB media column set during onboarding
                        logoUrl: (member.accounts.media as any)?.logo ?? undefined,
                        role: member.role_slug,
                        type: member.accounts.type,
                        wallet_balance: primaryWallet ? Number(primaryWallet.balance) : 0,
                        wallet_currency: primaryWallet?.currency ?? 'KES',
                        payout_routing: member.accounts.payout_routing ?? {},
                    };
                });

                setAccounts(mappedAccounts);

                // Check local storage for a previously selected account
                const savedId = localStorage.getItem('lynks_active_account_id');
                if (savedId && mappedAccounts.some(a => a.id === savedId)) {
                    setStoredActiveAccountId(savedId);
                } else {
                    // Default to first account
                    setStoredActiveAccountId(mappedAccounts[0].id);
                    localStorage.setItem('lynks_active_account_id', mappedAccounts[0].id);
                }
            } else {
                setAccounts([]);
                setStoredActiveAccountId(null);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [user]);

    const setActiveAccountId = (id: string) => {
        if (accounts.some(a => a.id === id)) {
            setStoredActiveAccountId(id);
            localStorage.setItem('lynks_active_account_id', id);
        }
    };

    const activeAccount = accounts.find(a => a.id === activeAccountId) || null;

    return (
        <OrganizationContext.Provider value={{
            accounts,
            activeAccount,
            setActiveAccountId,
            isLoading,
            refreshAccounts: fetchAccounts
        }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useOrganization must be used within an OrganizationProvider');
    }
    return context;
}
