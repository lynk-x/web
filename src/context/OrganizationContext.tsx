"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Account {
    id: string;
    name: string;
    thumbnailUrl?: string;
    role: 'owner' | 'admin' | 'accountant' | 'viewer' | string; // From account_role text value
    type: 'attendee' | 'organizer' | 'advertiser' | 'platform';
    website?: string;
    description?: string;
    support_email?: string;
    phone_number?: string;
    wallet_balance?: number;
    default_currency?: string;
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
                        avatar_url,
                        description,
                        contact_email,
                        phone_number,
                        default_currency,
                        type,
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
                    const defaultCurrency = member.accounts.default_currency || 'KES';
                    const wallets = member.accounts.account_wallets || [];
                    const primaryWallet = wallets.find((w: any) => w.currency === defaultCurrency) || wallets[0];
                    const walletBalance = primaryWallet ? Number(primaryWallet.balance) : 0;

                    return {
                        id: member.accounts.id,
                        name: member.accounts.display_name,
                        thumbnailUrl: member.accounts.avatar_url,
                        role: member.role_slug,
                        type: member.accounts.type,
                        website: undefined, // removed from DB schema
                        description: member.accounts.description,
                        support_email: member.accounts.contact_email,
                        phone_number: member.accounts.phone_number,
                        default_currency: defaultCurrency,
                        wallet_balance: walletBalance,
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
