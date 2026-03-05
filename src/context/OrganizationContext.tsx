"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Account {
    id: string;
    name: string;
    thumbnailUrl?: string;
    role: 'owner' | 'admin' | 'finance_manager' | 'viewer'; // From account_role enum
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

            // Fetch accounts the user is a member of
            const { data, error } = await supabase
                .from('account_members')
                .select(`
                    role,
                    accounts:account_id (
                        id,
                        name,
                        thumbnail_url,
                        website,
                        description,
                        support_email,
                        phone_number,
                        default_currency,
                        account_wallets(currency, balance)
                    )
                `)
                .eq('user_id', user.id);

            if (error) {
                console.error("Error fetching accounts:", error);
                return;
            }

            if (data && data.length > 0) {
                const mappedAccounts: Account[] = data.map((member: any) => {
                    const defaultCurrency = member.accounts.default_currency || 'KES';
                    const wallets = member.accounts.account_wallets || [];
                    const primaryWallet = wallets.find((w: any) => w.currency === defaultCurrency) || wallets[0];
                    const walletBalance = primaryWallet ? Number(primaryWallet.balance) : 0;

                    return {
                        id: member.accounts.id,
                        name: member.accounts.name,
                        thumbnailUrl: member.accounts.thumbnail_url,
                        role: member.role,
                        website: member.accounts.website,
                        description: member.accounts.description,
                        support_email: member.accounts.support_email,
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
